"""Standalone ULPF Stream Consumer Worker Entrypoint.

Usage:
    python -m app.streaming.worker

Runs the high-throughput Kafka consumer worker loop, consuming raw log messages
from 'logforge.raw-events', running the ULPF processing pipeline, and persisting
idempotently to MySQL, OpenSearch, and Integrity hash chains.
"""
import logging
import signal
import sys
import time

from .consumer import ULPFStreamConsumer
from ..core.config import settings
from ..core.logging import logger
from .admin import kafka_admin_service


def main() -> None:
    """Initializes and runs the Kafka stream worker loop with graceful termination."""
    logger.info("=" * 60)
    logger.info("Starting LogForge ULPF Kafka Stream Worker...")
    logger.info("Bootstrap Servers: %s", settings.KAFKA_BOOTSTRAP_SERVERS)
    logger.info("Consumer Group   : %s", settings.KAFKA_CONSUMER_GROUP)
    logger.info("Target Topic     : %s", settings.KAFKA_LOG_TOPIC)
    logger.info("DLQ Topic        : %s", settings.KAFKA_DLQ_TOPIC)
    logger.info("=" * 60)

    # Ensure required topics exist
    try:
        kafka_admin_service.ensure_topics()
    except Exception as exc:
        logger.warning("Topic provisioning check failed: %s", exc)

    consumer = ULPFStreamConsumer(
        group_id=settings.KAFKA_CONSUMER_GROUP,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
    )

    def shutdown_handler(signum: int, frame: object) -> None:
        logger.info("Shutdown signal received (%s). Gracefully stopping worker...", signum)
        consumer.stop()

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    try:
        consumer.start()
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received.")
        consumer.stop()
    except Exception as err:
        logger.error("Fatal exception in worker loop: %s", err, exc_info=True)
    finally:
        consumer.close()
        logger.info("=" * 60)
        logger.info("Worker Process Terminated.")
        logger.info("Total Successfully Processed: %d", consumer.processed_count)
        logger.info("Total Failed / Retried      : %d", consumer.failed_count)
        logger.info("Total Routed to DLQ         : %d", consumer.dlq_count)
        logger.info("=" * 60)


if __name__ == "__main__":
    main()
