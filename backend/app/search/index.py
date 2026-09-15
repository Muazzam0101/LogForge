"""OpenSearch Index & Mapping Lifecycle Management.

Defines the explicit OpenSearch schema for normalized security events and maintains
index aliases for zero-downtime index migration.
"""
from typing import Any, Dict
from opensearchpy import OpenSearch
from opensearchpy.exceptions import OpenSearchException

from ..core.config import settings
from ..core.logging import logger

BASE_INDEX_NAME = "logforge-events-v1"
DEFAULT_ALIAS_NAME = settings.OPENSEARCH_INDEX or "logforge-events"

# Explicit OpenSearch index settings and mapping
# Uses dynamic: "false" to prevent uncontrolled field explosion from arbitrary vendor logs
EVENT_INDEX_BODY: Dict[str, Any] = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "index.mapping.total_fields.limit": 1000,
        "index.refresh_interval": "1s",
    },
    "mappings": {
        "dynamic": "false",
        "properties": {
            "event_id": {
                "type": "keyword",
                "doc_values": True,
            },
            "timestamp": {
                "type": "date",
                "format": "strict_date_optional_time||epoch_millis||yyyy-MM-dd'T'HH:mm:ss.SSSSSS||yyyy-MM-dd'T'HH:mm:ss",
            },
            "created_at": {
                "type": "date",
                "format": "strict_date_optional_time||epoch_millis||yyyy-MM-dd'T'HH:mm:ss.SSSSSS||yyyy-MM-dd'T'HH:mm:ss",
            },
            "detected_format": {
                "type": "keyword",
            },
            "event_type": {
                "type": "keyword",
            },
            "event_category": {
                "type": "keyword",
            },
            "action": {
                "type": "keyword",
            },
            "severity": {
                "type": "keyword",
            },
            "severity_code": {
                "type": "integer",
                "ignore_malformed": True,
            },
            "source_ip": {
                "type": "ip",
                "ignore_malformed": True,
            },
            "destination_ip": {
                "type": "ip",
                "ignore_malformed": True,
            },
            "source_port": {
                "type": "integer",
                "ignore_malformed": True,
            },
            "destination_port": {
                "type": "integer",
                "ignore_malformed": True,
            },
            "protocol": {
                "type": "keyword",
            },
            "transport": {
                "type": "keyword",
            },
            "direction": {
                "type": "keyword",
            },
            "message": {
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword",
                        "ignore_above": 512,
                    }
                },
            },
            "raw_event": {
                "type": "text",
            },
            "sha256_hash": {
                "type": "keyword",
            },
            "source_hostname": {
                "type": "keyword",
            },
            "destination_hostname": {
                "type": "keyword",
            },
            "source_user": {
                "type": "keyword",
            },
            "destination_user": {
                "type": "keyword",
            },
            "device_vendor": {
                "type": "keyword",
            },
            "device_product": {
                "type": "keyword",
            },
            "parser_name": {
                "type": "keyword",
            },
            # Stored losslessly in _source but NOT dynamically indexed to prevent field explosion
            "additional_fields": {
                "type": "object",
                "dynamic": False,
            },
        },
    },
}


def ensure_index_and_alias(
    client: OpenSearch,
    index_name: str = BASE_INDEX_NAME,
    alias_name: str = DEFAULT_ALIAS_NAME,
) -> bool:
    """Ensures the base index exists with explicit mappings and that the alias points to it."""
    try:
        # 1. Create base index if missing
        if not client.indices.exists(index=index_name):
            logger.info("Creating OpenSearch index '%s' with explicit schema", index_name)
            client.indices.create(index=index_name, body=EVENT_INDEX_BODY)
            logger.info("OpenSearch index '%s' created successfully", index_name)

        # 2. Ensure alias points to index
        alias_exists = client.indices.exists_alias(name=alias_name, index=index_name)
        if not alias_exists:
            logger.info("Mapping OpenSearch alias '%s' -> '%s'", alias_name, index_name)
            client.indices.put_alias(index=index_name, name=alias_name)
            logger.info("OpenSearch alias '%s' configured successfully", alias_name)

        return True
    except OpenSearchException as exc:
        logger.error("Failed to ensure OpenSearch index/alias: %s", exc)
        return False
    except Exception as exc:
        logger.error("Unexpected error ensuring OpenSearch index: %s", exc)
        return False
