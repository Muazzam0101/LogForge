"""High-Throughput Asynchronous Kafka Producer for Log Ingestion.

Publishes raw events losslessly to the distributed topic logforge.raw-events
with deterministic partition routing, delivery callbacks, and non-blocking buffering.
"""
from datetime import datetime, timezone
import json
from typing import Any, Callable, Dict, Optional, Tuple

try:
    from confluent_kafka import Producer
    CONFLUENT_KAFKA_AVAILABLE = True
except ImportError:
    CONFLUENT_KAFKA_AVAILABLE = False

from ..core.config import settings
from ..core.logging import logger


class KafkaProducerService:
    """Enterprise-grade, non-blocking Kafka producer for raw log event buffering."""

    def __init__(self) -> None:
        self._producer: Optional[Any] = None
        self._delivery_errors: int = 0
        self._published_count: int = 0

    def _get_producer(self) -> Optional[Any]:
        """Lazy-initializes Kafka Producer with optimized throughput settings."""
        if not settings.KAFKA_ENABLED or not CONFLUENT_KAFKA_AVAILABLE:
            return None

        if self._producer is None:
            config = {
                "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "client.id": settings.KAFKA_CLIENT_ID,
                "acks": "all",  # Strong durability
                "retries": 3,
                "retry.backoff.ms": 250,
                "compression.type": settings.KAFKA_COMPRESSION,  # Configurable high-throughput compression
                "linger.ms": 5,  # 5ms batching window to maximize throughput
                "batch.num.messages": settings.KAFKA_BATCH_SIZE,
                "queue.buffering.max.messages": 100000,
                "socket.timeout.ms": 5000,
            }
            if settings.KAFKA_SECURITY_PROTOCOL != "PLAINTEXT":
                config["security.protocol"] = settings.KAFKA_SECURITY_PROTOCOL

            try:
                self._producer = Producer(config)
                logger.info("Kafka Producer initialized for %s", settings.KAFKA_BOOTSTRAP_SERVERS)
            except Exception as exc:
                logger.error("Failed to initialize Kafka Producer: %s", exc)
                return None

        return self._producer

    def _delivery_callback(self, err: Any, msg: Any) -> None:
        """Asynchronous callback executed by librdkafka upon message delivery or permanent error."""
        if err is not None:
            self._delivery_errors += 1
            logger.error("Kafka delivery failed for message %s: %s", msg.key(), err)
        else:
            self._published_count += 1

    def produce_raw_event(
        self,
        event_id: str,
        raw_log: str,
        source_id: Optional[str] = None,
        source_hint: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[int]]:
        """Buffers raw event onto logforge.raw-events losslessly.
        
        Returns:
            Tuple of (success: bool, topic: Optional[str], partition: Optional[int])
        """
        producer = self._get_producer()
        if producer is None:
            return False, None, None

        payload = {
            "event_id": event_id,
            "source_id": source_id or "generic-agent",
            "source_hint": source_hint,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "raw_event": raw_log,
            "content_type": "text/plain",
            "retry_count": 0,
        }

        try:
            serialized_payload = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            # Partition key: use source_id to preserve per-source event ordering
            routing_key = (source_id or event_id).encode("utf-8")

            producer.produce(
                topic=settings.KAFKA_LOG_TOPIC,
                key=routing_key,
                value=serialized_payload,
                on_delivery=self._delivery_callback,
            )
            # Trigger quick callback poll without blocking
            producer.poll(0)
            return True, settings.KAFKA_LOG_TOPIC, None
        except BufferError:
            logger.warning("Kafka local queue buffer full; forcing flush")
            producer.flush(1.0)
            try:
                producer.produce(
                    topic=settings.KAFKA_LOG_TOPIC,
                    key=(source_id or event_id).encode("utf-8"),
                    value=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                    on_delivery=self._delivery_callback,
                )
                producer.poll(0)
                return True, settings.KAFKA_LOG_TOPIC, None
            except Exception as retry_exc:
                logger.error("Failed to produce event %s after buffer flush: %s", event_id, retry_exc)
                return False, None, None
        except Exception as exc:
            logger.error("Unexpected error producing event %s: %s", event_id, exc)
            return False, None, None

    def produce_dlq(
        self,
        event_id: str,
        raw_log: str,
        error_type: str,
        error_message: str,
        failed_stage: str,
        retry_count: int,
    ) -> bool:
        """Routes a permanently unprocessable event to the Dead Letter Queue."""
        producer = self._get_producer()
        if producer is None:
            return False

        dlq_payload = {
            "event_id": event_id,
            "raw_event": raw_log,
            "error_type": error_type,
            "error_message": error_message,
            "failed_stage": failed_stage,
            "retry_count": retry_count,
            "failed_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            producer.produce(
                topic=settings.KAFKA_DLQ_TOPIC,
                key=event_id.encode("utf-8"),
                value=json.dumps(dlq_payload, ensure_ascii=False).encode("utf-8"),
                on_delivery=self._delivery_callback,
            )
            producer.poll(0)
            logger.warning("Event %s routed to Dead Letter Queue (%s)", event_id, settings.KAFKA_DLQ_TOPIC)
            return True
        except Exception as exc:
            logger.error("Failed to route event %s to DLQ: %s", event_id, exc)
            return False

    def flush(self, timeout: float = 2.0) -> int:
        """Flushes buffered messages."""
        if self._producer:
            return self._producer.flush(timeout)
        return 0


kafka_producer_service = KafkaProducerService()
