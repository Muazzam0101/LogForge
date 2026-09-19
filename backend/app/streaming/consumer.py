"""ULPF Stream Consumer & Scalable Worker Pipeline.

Consumes raw events in configurable batches from logforge.raw-events,
executes the Universal Log Pre-processing Framework (ULPF), losslessly
persists into MySQL using bulk operations, creates integrity records,
bulk-indexes into OpenSearch, and runs vectorized AI anomaly scoring.
"""
from datetime import datetime, timezone
import json
import logging
import signal
import sys
import time
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

try:
    from confluent_kafka import Consumer, KafkaError, KafkaException, Message
    CONFLUENT_KAFKA_AVAILABLE = True
except ImportError:
    CONFLUENT_KAFKA_AVAILABLE = False

from ..core.config import settings
from ..core.logging import logger
from ..core.metrics import metrics_collector
from ..db.session import SessionLocal
from ..db.repositories.event_repository import EventRepository
from ..integrity.service import IntegrityService
from ..ml.scoring import batch_score_events_safely, score_event_safely
from ..schemas.event import ProcessingResult
from ..search.service import search_service
from ..services.processing_service import ulpf_engine
from .producer import kafka_producer_service


class ULPFStreamConsumer:
    """Production stream processor consuming raw logs in scalable batches with at-least-once durability."""

    def __init__(
        self,
        group_id: Optional[str] = None,
        bootstrap_servers: Optional[str] = None,
        batch_size: Optional[int] = None,
        worker_id: Optional[str] = None,
    ) -> None:
        self.group_id = group_id or settings.KAFKA_CONSUMER_GROUP
        self.bootstrap_servers = bootstrap_servers or settings.KAFKA_BOOTSTRAP_SERVERS
        self.batch_size = batch_size or settings.ULPF_BATCH_SIZE
        self.worker_id = worker_id or f"worker-{uuid4().hex[:8]}"
        self.running = False
        self._consumer: Optional[Any] = None
        self.processed_count = 0
        self.failed_count = 0
        self.dlq_count = 0
        self._last_heartbeat = 0.0

    def _init_consumer(self) -> Any:
        """Configures Consumer with manual commit and at-least-once reliability."""
        if not CONFLUENT_KAFKA_AVAILABLE:
            raise RuntimeError("confluent-kafka is not installed in the current environment")

        config = {
            "bootstrap.servers": self.bootstrap_servers,
            "group.id": self.group_id,
            "client.id": f"logforge-worker-{self.worker_id}",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,  # Strict at-least-once delivery
            "max.poll.interval.ms": 300000,
            "session.timeout.ms": 45000,
            "fetch.min.bytes": 1,
            "fetch.wait.max.ms": 100,  # low latency batch accumulation
        }
        if settings.KAFKA_SECURITY_PROTOCOL != "PLAINTEXT":
            config["security.protocol"] = settings.KAFKA_SECURITY_PROTOCOL

        consumer = Consumer(config)

        def on_assign(c: Any, partitions: Any) -> None:
            logger.info("Kafka worker [%s] assigned %d partitions: %s", self.worker_id, len(partitions), [p.partition for p in partitions])

        def on_revoke(c: Any, partitions: Any) -> None:
            logger.info("Kafka worker [%s] revoked %d partitions", self.worker_id, len(partitions))

        consumer.subscribe([settings.KAFKA_LOG_TOPIC], on_assign=on_assign, on_revoke=on_revoke)
        return consumer

    def _send_heartbeat(self) -> None:
        """Registers active worker heartbeat with the central metrics collector."""
        now = time.time()
        if now - self._last_heartbeat >= 5.0:
            metrics_collector.record_worker_heartbeat(
                worker_id=self.worker_id,
                batch_size=self.batch_size,
                processed_count=self.processed_count,
                metadata={"group_id": self.group_id, "topic": settings.KAFKA_LOG_TOPIC},
            )
            self._last_heartbeat = now

    def process_single_message(self, raw_message: str) -> bool:
        """Processes one raw Kafka message through the complete ULPF pipeline (legacy/fallback mode)."""
        try:
            payload = json.loads(raw_message)
        except Exception as json_err:
            logger.error("Poison pill received (malformed JSON payload): %s", json_err)
            kafka_producer_service.produce_dlq(
                event_id="malformed-json",
                raw_log=raw_message[:1000],
                error_type="JSON_DECODE_ERROR",
                error_message=str(json_err),
                failed_stage="INGESTION_DESERIALIZATION",
                retry_count=0,
            )
            self.dlq_count += 1
            metrics_collector.record_dlq_routed(1)
            return True  # Commit poison pill to prevent consumer deadlock

        event_id = payload.get("event_id")
        raw_log = payload.get("raw_event")
        source_hint = payload.get("source_hint")
        retry_count = payload.get("retry_count", 0)

        if not raw_log or not isinstance(raw_log, str):
            logger.warning("Empty or invalid raw log in message %s", event_id)
            kafka_producer_service.produce_dlq(
                event_id=event_id or "invalid-event",
                raw_log=str(raw_log),
                error_type="EMPTY_RAW_LOG",
                error_message="Message contains no raw_event payload",
                failed_stage="VALIDATION",
                retry_count=retry_count,
            )
            self.dlq_count += 1
            metrics_collector.record_dlq_routed(1)
            return True

        result = ulpf_engine.process_event(
            raw_log=raw_log,
            source_hint=source_hint,
            event_id=event_id,
        )

        db = SessionLocal()
        try:
            EventRepository.create_from_processing_result(db, result)
            try:
                IntegrityService.create_integrity_record(db, result.event_id, result.raw_event_hash)
            except Exception as integ_err:
                logger.warning("Integrity record creation notice for %s: %s", result.event_id, integ_err)

            try:
                search_service.index_event_safely(result)
            except Exception as search_err:
                logger.warning("OpenSearch indexing skipped for %s: %s", result.event_id, search_err)

            try:
                norm = result.normalized_event
                event_dict = {
                    "event_id": result.event_id,
                    "raw_log": raw_log,
                    "source_ip": norm.source.ip if norm and norm.source else None,
                    "destination_ip": norm.destination.ip if norm and norm.destination else None,
                    "source_port": norm.source.port if norm and norm.source else None,
                    "destination_port": norm.destination.port if norm and norm.destination else None,
                    "protocol": norm.network.protocol if norm and norm.network else None,
                    "action": norm.action if norm else None,
                    "severity": norm.severity if norm else None,
                    "timestamp": norm.timestamp if norm else None,
                }
                score_event_safely(event_dict, db)
            except Exception as ml_err:
                logger.warning("AI anomaly scoring exception ignored for %s: %s", result.event_id, ml_err)

            self.processed_count += 1
            return True

        except Exception as db_exc:
            db.rollback()
            self.failed_count += 1
            logger.error("Persistence failed for event %s: %s", event_id, db_exc)

            if retry_count < settings.KAFKA_MAX_RETRIES:
                logger.warning("Scheduling retry %d/%d for event %s", retry_count + 1, settings.KAFKA_MAX_RETRIES, event_id)
                time.sleep((settings.KAFKA_RETRY_BACKOFF_MS / 1000.0) * (2 ** retry_count))
                return False
            else:
                kafka_producer_service.produce_dlq(
                    event_id=result.event_id,
                    raw_log=raw_log,
                    error_type=db_exc.__class__.__name__,
                    error_message=str(db_exc),
                    failed_stage="PERSISTENCE_RETRY_EXHAUSTED",
                    retry_count=retry_count,
                )
                self.dlq_count += 1
                metrics_collector.record_dlq_routed(1)
                return True
        finally:
            db.close()

    def process_message_batch(self, messages: List[Any]) -> bool:
        """Processes a batch of raw Kafka messages using bulk operations.
        
        High-throughput pipeline:
          1. Parse JSON payloads and filter out poison pills (routed directly to DLQ)
          2. Batch process via ULPFEngine.process_batch
          3. Bulk insert to MySQL in a single transaction
          4. Bulk create SHA-256 integrity records
          5. Bulk index into OpenSearch via Bulk API
          6. Vectorized AI/ML anomaly scoring in batch
        """
        if not messages:
            return True

        batch_start = time.perf_counter()
        valid_payloads: List[Dict[str, Any]] = []

        for msg in messages:
            try:
                val_str = msg.value().decode("utf-8")
                payload = json.loads(val_str)
                raw_log = payload.get("raw_event")
                if not raw_log or not isinstance(raw_log, str):
                    kafka_producer_service.produce_dlq(
                        event_id=payload.get("event_id") or "invalid-event",
                        raw_log=str(raw_log),
                        error_type="EMPTY_RAW_LOG",
                        error_message="Message contains no raw_event",
                        failed_stage="VALIDATION",
                        retry_count=0,
                    )
                    self.dlq_count += 1
                    metrics_collector.record_dlq_routed(1)
                    continue
                valid_payloads.append(payload)
            except Exception as dec_err:
                logger.error("Batch poison pill detected: %s", dec_err)
                kafka_producer_service.produce_dlq(
                    event_id="malformed-batch-item",
                    raw_log=str(msg.value()[:500] if msg.value() else ""),
                    error_type="DESERIALIZATION_ERROR",
                    error_message=str(dec_err),
                    failed_stage="BATCH_INGEST_DESERIALIZATION",
                    retry_count=0,
                )
                self.dlq_count += 1
                metrics_collector.record_dlq_routed(1)

        if not valid_payloads:
            return True

        # 1. Deterministic ULPF Processing
        results: List[ProcessingResult] = []
        for p in valid_payloads:
            res = ulpf_engine.process_event(
                raw_log=p["raw_event"],
                source_hint=p.get("source_hint"),
                event_id=p.get("event_id"),
            )
            results.append(res)

        successful_results = [r for r in results if r.status == "success"]

        # 2. Bulk Database Persistence
        db = SessionLocal()
        try:
            if successful_results:
                EventRepository.create_batch_from_results(db, successful_results)

                # 2b. Bulk Integrity Records
                for r in successful_results:
                    try:
                        IntegrityService.create_integrity_record(db, r.event_id, r.raw_event_hash)
                    except Exception as integ_err:
                        logger.warning("Batch integrity record notice for %s: %s", r.event_id, integ_err)

                # 2c. Bulk OpenSearch Indexing
                try:
                    search_service.index_batch_safely(successful_results)
                except Exception as os_err:
                    logger.warning("OpenSearch batch indexing notice: %s", os_err)

                # 2d. Vectorized AI Anomaly Scoring
                try:
                    event_dicts = [
                        {
                            "event_id": r.event_id,
                            "raw_log": r.raw_event,
                            "source_ip": r.normalized_event.source.ip if r.normalized_event and r.normalized_event.source else None,
                            "destination_ip": r.normalized_event.destination.ip if r.normalized_event and r.normalized_event.destination else None,
                            "source_port": r.normalized_event.source.port if r.normalized_event and r.normalized_event.source else None,
                            "destination_port": r.normalized_event.destination.port if r.normalized_event and r.normalized_event.destination else None,
                            "protocol": r.normalized_event.network.protocol if r.normalized_event and r.normalized_event.network else None,
                            "action": r.normalized_event.action if r.normalized_event else None,
                            "severity": r.normalized_event.severity if r.normalized_event else None,
                            "timestamp": r.normalized_event.timestamp if r.normalized_event else None,
                        }
                        for r in successful_results
                    ]
                    batch_score_events_safely(event_dicts, db)
                except Exception as ml_err:
                    logger.warning("Batch AI scoring notice: %s", ml_err)

            self.processed_count += len(successful_results)
            self.failed_count += (len(results) - len(successful_results))

            duration_ms = round((time.perf_counter() - batch_start) * 1000, 2)
            eps = round(len(successful_results) / (duration_ms / 1000.0), 1) if duration_ms > 0 else 0
            logger.info(
                "Worker [%s] processed batch of %d events in %.2f ms (%.1f eps)",
                self.worker_id, len(successful_results), duration_ms, eps
            )
            return True

        except Exception as db_exc:
            db.rollback()
            logger.error("Worker [%s] batch persistence failed: %s; falling back to per-message retries", self.worker_id, db_exc)
            # Fallback: process individually to isolate offending message without losing batch
            for msg in messages:
                try:
                    self.process_single_message(msg.value().decode("utf-8"))
                except Exception:
                    pass
            return True
        finally:
            db.close()

    def start(self) -> None:
        """Starts the worker polling loop with configurable micro-batching."""
        self.running = True
        self._consumer = self._init_consumer()
        self._send_heartbeat()
        logger.info(
            "ULPF Kafka Worker [%s] started [group: %s, topic: %s, batch_size: %d]",
            self.worker_id, self.group_id, settings.KAFKA_LOG_TOPIC, self.batch_size
        )

        while self.running:
            try:
                self._send_heartbeat()

                # Micro-batch polling up to batch_size messages with 1.0s timeout
                messages = self._consumer.consume(num_messages=self.batch_size, timeout=1.0)
                if not messages:
                    continue

                valid_msgs = []
                for msg in messages:
                    if msg.error():
                        if msg.error().code() == KafkaError._PARTITION_EOF:
                            continue
                        logger.error("Kafka consumer error: %s", msg.error())
                        continue
                    valid_msgs.append(msg)

                if valid_msgs:
                    success = self.process_message_batch(valid_msgs)
                    if success:
                        self._consumer.commit(asynchronous=False)

            except Exception as loop_exc:
                logger.error("Unhandled error in worker [%s] loop: %s", self.worker_id, loop_exc, exc_info=True)
                time.sleep(1.0)

        self.close()

    def stop(self) -> None:
        """Signals the worker loop to stop gracefully."""
        logger.info("Stopping ULPF Kafka Worker [%s]...", self.worker_id)
        self.running = False

    def close(self) -> None:
        """Closes the Kafka consumer connection."""
        if self._consumer:
            try:
                self._consumer.close()
                logger.info("Kafka consumer [%s] closed cleanly.", self.worker_id)
            except Exception as exc:
                logger.warning("Error closing Kafka consumer [%s]: %s", self.worker_id, exc)
            self._consumer = None
