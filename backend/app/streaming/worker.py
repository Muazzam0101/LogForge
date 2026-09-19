"""Standalone ULPF Stream Consumer Worker Entrypoint.

Usage:
    python -m app.streaming.worker [--worker-id ID] [--batch-size N] [--group-id GROUP]

Runs the high-throughput Kafka consumer worker loop, consuming raw log messages
from 'logforge.raw-events', running the ULPF processing pipeline, and persisting
idempotently to MySQL, OpenSearch, and Integrity hash chains.
"""
import argparse
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
    parser = argparse.ArgumentParser(description="LogForge ULPF Kafka Stream Worker")
    parser.add_argument("--worker-id", type=str, default=None, help="Unique worker identifier")
    parser.add_argument("--batch-size", type=int, default=None, help="Micro-batch size for Kafka consumption")
    parser.add_argument("--group-id", type=str, default=None, help="Kafka consumer group ID")
    args = parser.parse_args()

    batch_sz = args.batch_size or settings.ULPF_BATCH_SIZE
    grp_id = args.group_id or settings.KAFKA_CONSUMER_GROUP

    logger.info("=" * 60)
    logger.info("Starting LogForge ULPF Kafka Stream Worker...")
    logger.info("Worker ID        : %s", args.worker_id or "auto-generated")
    logger.info("Bootstrap Servers: %s", settings.KAFKA_BOOTSTRAP_SERVERS)
    logger.info("Consumer Group   : %s", grp_id)
    logger.info("Batch Size       : %d", batch_sz)
    logger.info("Target Topic     : %s", settings.KAFKA_LOG_TOPIC)
    logger.info("DLQ Topic        : %s", settings.KAFKA_DLQ_TOPIC)
    logger.info("=" * 60)

    # Ensure required topics exist
    try:
        kafka_admin_service.ensure_topics()
    except Exception as exc:
        logger.warning("Topic provisioning check failed: %s", exc)

    consumer = ULPFStreamConsumer(
        group_id=grp_id,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        batch_size=batch_sz,
        worker_id=args.worker_id,
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
        logger.info("Worker [%s] Process Terminated.", consumer.worker_id)
        logger.info("Total Successfully Processed: %d", consumer.processed_count)
        logger.info("Total Failed / Retried      : %d", consumer.failed_count)
        logger.info("Total Routed to DLQ         : %d", consumer.dlq_count)
        logger.info("=" * 60)


if __name__ == "__main__":
    main()
