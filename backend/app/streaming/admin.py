"""Kafka Cluster Administration & Health Telemetry Service.

Manages topic creation, partition validation, cluster connectivity probes,
and health telemetry for the LogForge streaming pipeline.
"""
from typing import Any, Dict, List, Optional
import time

try:
    from confluent_kafka.admin import AdminClient, NewTopic
    from confluent_kafka import KafkaException
    CONFLUENT_KAFKA_AVAILABLE = True
except ImportError:
    CONFLUENT_KAFKA_AVAILABLE = False

from ..core.config import settings
from ..core.logging import logger


class KafkaAdminService:
    """Manages Kafka cluster administration, topic provisioning, and health diagnostics."""

    def __init__(self) -> None:
        self._admin_client: Optional[Any] = None
        self._last_health_check: float = 0.0
        self._cached_health: Optional[Dict[str, Any]] = None

    def _get_client(self) -> Optional[Any]:
        """Lazy-initializes Kafka AdminClient if Kafka is enabled."""
        if not settings.KAFKA_ENABLED or not CONFLUENT_KAFKA_AVAILABLE:
            return None

        if self._admin_client is None:
            config = {
                "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "socket.timeout.ms": 3000,
            }
            if settings.KAFKA_SECURITY_PROTOCOL != "PLAINTEXT":
                config["security.protocol"] = settings.KAFKA_SECURITY_PROTOCOL
            try:
                self._admin_client = AdminClient(config)
            except Exception as exc:
                logger.warning("Failed to initialize Kafka AdminClient: %s", exc)
                return None

        return self._admin_client

    def is_available(self) -> bool:
        """Verifies if the Kafka broker is reachable."""
        if not settings.KAFKA_ENABLED or not CONFLUENT_KAFKA_AVAILABLE:
            return False

        client = self._get_client()
        if client is None:
            return False

        try:
            metadata = client.list_topics(timeout=2.0)
            return bool(metadata and metadata.brokers)
        except Exception:
            return False

    def ensure_topics(self) -> bool:
        """Ensures that required streaming topics and partitions exist."""
        if not settings.KAFKA_ENABLED or not CONFLUENT_KAFKA_AVAILABLE:
            return False

        client = self._get_client()
        if client is None:
            return False

        try:
            metadata = client.list_topics(timeout=3.0)
            existing_topics = set(metadata.topics.keys())

            topics_to_create = []
            if settings.KAFKA_LOG_TOPIC not in existing_topics:
                topics_to_create.append(
                    NewTopic(
                        topic=settings.KAFKA_LOG_TOPIC,
                        num_partitions=settings.KAFKA_NUM_PARTITIONS,
                        replication_factor=settings.KAFKA_REPLICATION_FACTOR,
                    )
                )

            if settings.KAFKA_DLQ_TOPIC not in existing_topics:
                topics_to_create.append(
                    NewTopic(
                        topic=settings.KAFKA_DLQ_TOPIC,
                        num_partitions=1,
                        replication_factor=settings.KAFKA_REPLICATION_FACTOR,
                    )
                )

            if topics_to_create:
                fs = client.create_topics(topics_to_create, operation_timeout=5.0)
                for topic, f in fs.items():
                    try:
                        f.result()
                        logger.info("Kafka topic '%s' created successfully", topic)
                    except Exception as exc:
                        logger.warning("Kafka topic '%s' creation notice: %s", topic, exc)

            return True
        except Exception as exc:
            logger.warning("Kafka topic provisioning deferred: %s", exc)
            return False

    def get_cluster_health(self) -> Dict[str, Any]:
        """Returns structured Kafka cluster diagnostics and topic metadata."""
        if not settings.KAFKA_ENABLED:
            return {
                "status": "DISABLED",
                "enabled": False,
                "bootstrap_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "cluster_id": None,
                "brokers_count": 0,
                "topics": [],
                "consumer_group": settings.KAFKA_CONSUMER_GROUP,
                "message": "Kafka streaming layer disabled in configuration (KAFKA_ENABLED=False)",
            }

        if not CONFLUENT_KAFKA_AVAILABLE:
            return {
                "status": "UNAVAILABLE",
                "enabled": True,
                "bootstrap_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "cluster_id": None,
                "brokers_count": 0,
                "topics": [],
                "consumer_group": settings.KAFKA_CONSUMER_GROUP,
                "message": "confluent-kafka library is not installed",
            }

        client = self._get_client()
        if client is None:
            return {
                "status": "DISCONNECTED",
                "enabled": True,
                "bootstrap_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "cluster_id": None,
                "brokers_count": 0,
                "topics": [],
                "consumer_group": settings.KAFKA_CONSUMER_GROUP,
                "message": "Unable to initialize Kafka AdminClient",
            }

        try:
            metadata = client.list_topics(timeout=2.5)
            broker_ids = [f"{b.id}@{b.host}:{b.port}" for b in metadata.brokers.values()]

            topic_info = []
            for t_name in [settings.KAFKA_LOG_TOPIC, settings.KAFKA_DLQ_TOPIC]:
                if t_name in metadata.topics:
                    t_meta = metadata.topics[t_name]
                    topic_info.append({
                        "name": t_name,
                        "partitions": len(t_meta.partitions),
                        "status": "ACTIVE",
                    })

            lag = self.get_consumer_lag()
            return {
                "status": "CONNECTED",
                "enabled": True,
                "bootstrap_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "cluster_id": metadata.orig_broker_name,
                "brokers_count": len(broker_ids),
                "topics": topic_info,
                "consumer_group": settings.KAFKA_CONSUMER_GROUP,
                "consumer_lag": lag,
                "message": f"Connected to Kafka broker ({len(broker_ids)} active node)",
            }
        except Exception as exc:
            return {
                "status": "DISCONNECTED",
                "enabled": True,
                "bootstrap_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "cluster_id": None,
                "brokers_count": 0,
                "topics": [],
                "consumer_group": settings.KAFKA_CONSUMER_GROUP,
                "consumer_lag": None,
                "message": f"Kafka broker connection probe failed: {str(exc)}",
            }

    def get_consumer_lag(self, topic: Optional[str] = None, group_id: Optional[str] = None) -> Optional[int]:
        """Calculates real total consumer lag across partitions for the consumer group.
        
        Returns None if Kafka is disabled or unreachable.
        """
        if not settings.KAFKA_ENABLED or not CONFLUENT_KAFKA_AVAILABLE:
            return None

        target_topic = topic or settings.KAFKA_LOG_TOPIC
        target_group = group_id or settings.KAFKA_CONSUMER_GROUP

        try:
            from confluent_kafka import Consumer, TopicPartition
            config = {
                "bootstrap.servers": settings.KAFKA_BOOTSTRAP_SERVERS,
                "group.id": f"{target_group}-lag-monitor",
                "enable.auto.commit": False,
                "socket.timeout.ms": 2000,
            }
            if settings.KAFKA_SECURITY_PROTOCOL != "PLAINTEXT":
                config["security.protocol"] = settings.KAFKA_SECURITY_PROTOCOL

            consumer = Consumer(config)
            try:
                metadata = consumer.list_topics(target_topic, timeout=2.0)
                if not metadata or target_topic not in metadata.topics:
                    return None

                partitions = [
                    TopicPartition(target_topic, p_id)
                    for p_id in metadata.topics[target_topic].partitions.keys()
                ]

                committed = consumer.committed(partitions, timeout=2.0)
                total_lag = 0

                for tp in committed:
                    low, high = consumer.get_watermark_offsets(tp, timeout=2.0)
                    committed_offset = tp.offset if tp.offset >= 0 else low
                    lag = max(0, high - committed_offset)
                    total_lag += lag

                return total_lag
            finally:
                consumer.close()
        except Exception as exc:
            logger.debug("Could not calculate Kafka lag: %s", exc)
            return None


kafka_admin_service = KafkaAdminService()
