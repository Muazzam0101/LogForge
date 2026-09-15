"""ULPF Stream Consumer & Worker Pipeline.

Consumes raw events from logforge.raw-events, executes the Universal Log
Pre-processing Framework (ULPF), losslessly persists into MySQL, updates
SHA-256 integrity records, indices into OpenSearch, and scores anomalies.
"""
from datetime import datetime, timezone
import json
import logging
import signal
import sys
import time
from typing import Any, Dict, Optional

try:
    from confluent_kafka import Consumer, KafkaError, KafkaException, Message
    CONFLUENT_KAFKA_AVAILABLE = True
except ImportError:
    CONFLUENT_KAFKA_AVAILABLE = False

from ..core.config import settings
from ..core.logging import logger
from ..db.session import SessionLocal
from ..db.repositories.event_repository import EventRepository
from ..integrity.service import IntegrityService
from ..ml.scoring import score_event_safely
from ..search.service import search_service
from ..services.processing_service import ulpf_engine
from .producer import kafka_producer_service


class ULPFStreamConsumer:
    """Production stream processor consuming raw logs with at-least-once durability."""

    def __init__(
        self,
        group_id: Optional[str] = None,
        bootstrap_servers: Optional[str] = None,
    ) -> None:
        self.group_id = group_id or settings.KAFKA_CONSUMER_GROUP
        self.bootstrap_servers = bootstrap_servers or settings.KAFKA_BOOTSTRAP_SERVERS
        self.running = False
        self._consumer: Optional[Any] = None
        self.processed_count = 0
        self.failed_count = 0
        self.dlq_count = 0

    def _init_consumer(self) -> Any:
        """Configures Consumer with manual commit and at-least-once reliability."""
        if not CONFLUENT_KAFKA_AVAILABLE:
            raise RuntimeError("confluent-kafka is not installed in the current environment")

        config = {
            "bootstrap.servers": self.bootstrap_servers,
            "group.id": self.group_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,  # Strict at-least-once delivery
            "max.poll.interval.ms": 300000,
            "session.timeout.ms": 45000,
        }
        if settings.KAFKA_SECURITY_PROTOCOL != "PLAINTEXT":
            config["security.protocol"] = settings.KAFKA_SECURITY_PROTOCOL

        consumer = Consumer(config)

        def on_assign(c: Any, partitions: Any) -> None:
            logger.info("Kafka worker assigned %d partitions: %s", len(partitions), [p.partition for p in partitions])

        def on_revoke(c: Any, partitions: Any) -> None:
            logger.info("Kafka worker revoked %d partitions", len(partitions))

        consumer.subscribe([settings.KAFKA_LOG_TOPIC], on_assign=on_assign, on_revoke=on_revoke)
        return consumer

    def process_single_message(self, raw_message: str) -> bool:
        """Processes one raw Kafka message through the complete ULPF pipeline.
        
        Guarantees:
          1. Exact raw bytes preservation
          2. Idempotent persistence in MySQL
          3. SHA-256 integrity record & hash-chain pointer
          4. Non-blocking OpenSearch indexing
          5. Non-blocking AI anomaly scoring
        """
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
            return True

        # 1. Deterministic ULPF Processing
        result = ulpf_engine.process_event(
            raw_log=raw_log,
            source_hint=source_hint,
            event_id=event_id,
        )

        # 2. Database Session & Persistence with Retry Loop
        db = SessionLocal()
        try:
            # 2a. Idempotent MySQL Persistence
            EventRepository.create_from_processing_result(db, result)

            # 2b. Idempotent Cryptographic Integrity Record
            try:
                IntegrityService.create_integrity_record(db, result.event_id, result.raw_event_hash)
            except Exception as integ_err:
                logger.warning("Integrity record creation notice for %s: %s", result.event_id, integ_err)

            # 2c. Non-blocking OpenSearch Scalability Layer Indexing
            try:
                search_service.index_event_safely(result)
            except Exception as search_err:
                logger.warning("OpenSearch indexing skipped for %s: %s", result.event_id, search_err)

            # 2d. Non-blocking AI Anomaly Scoring
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
            logger.error("Persistence failed for event %s: %s", event_id, db_exc)

            if retry_count < settings.KAFKA_MAX_RETRIES:
                logger.warning("Scheduling retry %d/%d for event %s", retry_count + 1, settings.KAFKA_MAX_RETRIES, event_id)
                time.sleep((settings.KAFKA_RETRY_BACKOFF_MS / 1000.0) * (2 ** retry_count))
                return False  # Do not commit offset, will retry
            else:
                logger.error("Max retries exhausted for event %s. Routing to DLQ.", event_id)
                kafka_producer_service.produce_dlq(
                    event_id=result.event_id,
                    raw_log=raw_log,
                    error_type=db_exc.__class__.__name__,
                    error_message=str(db_exc),
                    failed_stage="PERSISTENCE_RETRY_EXHAUSTED",
                    retry_count=retry_count,
                )
                self.dlq_count += 1
                return True  # Commit to release worker loop after DLQ routing
        finally:
            db.close()

    def start(self) -> None:
        """Starts the worker polling loop."""
        self.running = True
        self._consumer = self._init_consumer()
        logger.info("ULPF Kafka Worker started [group: %s, topic: %s]", self.group_id, settings.KAFKA_LOG_TOPIC)

        while self.running:
            try:
                msg = self._consumer.poll(timeout=1.0)
                if msg is None:
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    logger.error("Kafka consumer error: %s", msg.error())
                    continue

                value_str = msg.value().decode("utf-8")
                success = self.process_single_message(value_str)

                # Commit offset only after successful processing or DLQ routing
                if success:
                    self._consumer.commit(message=msg, asynchronous=False)

            except Exception as loop_exc:
                logger.error("Unhandled error in ULPF consumer loop: %s", loop_exc, exc_info=True)
                time.sleep(1.0)

        self.close()

    def stop(self) -> None:
        """Signals the worker loop to stop gracefully."""
        logger.info("Stopping ULPF Kafka Worker...")
        self.running = False

    def close(self) -> None:
        """Closes the Kafka consumer connection."""
        if self._consumer:
            try:
                self._consumer.close()
                logger.info("Kafka consumer closed cleanly.")
            except Exception as exc:
                logger.warning("Error closing Kafka consumer: %s", exc)
            self._consumer = None
