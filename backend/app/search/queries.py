"""OpenSearch Query Builder.

Constructs parameterized, safe OpenSearch Query DSL without exposing raw DSL
to external clients or the web interface.
"""
from datetime import datetime
import json
from typing import Any, Dict, List, Optional, Union
import base64


def encode_search_after(sort_values: List[Any]) -> str:
    """Encodes OpenSearch sort values into an opaque base64 string for client pagination."""
    json_bytes = json.dumps(sort_values).encode("utf-8")
    return base64.urlsafe_b64encode(json_bytes).decode("utf-8")


def decode_search_after(cursor: str) -> Optional[List[Any]]:
    """Decodes an opaque base64 string into OpenSearch sort values."""
    if not cursor:
        return None
    try:
        json_bytes = base64.urlsafe_b64decode(cursor.encode("utf-8"))
        return json.loads(json_bytes.decode("utf-8"))
    except Exception:
        return None


class OpenSearchQueryBuilder:
    """Builds optimized OpenSearch search and aggregation queries."""

    @classmethod
    def build_search_query(
        cls,
        q: Optional[str] = None,
        event_id: Optional[str] = None,
        source_ip: Optional[str] = None,
        destination_ip: Optional[str] = None,
        source_port: Optional[int] = None,
        destination_port: Optional[int] = None,
        protocol: Optional[str] = None,
        action: Optional[str] = None,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        detected_format: Optional[str] = None,
        start_time: Optional[Union[datetime, str]] = None,
        end_time: Optional[Union[datetime, str]] = None,
        limit: int = 50,
        offset: int = 0,
        search_after: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Builds a bool query combining full-text search, exact filters, and pagination."""
        must_clauses: List[Dict[str, Any]] = []
        filter_clauses: List[Dict[str, Any]] = []

        # 1. Full-text search across textual and identifier fields
        if q and q.strip():
            clean_q = q.strip()
            must_clauses.append({
                "multi_match": {
                    "query": clean_q,
                    "fields": [
                        "message^2",
                        "raw_event",
                        "event_id",
                        "source_hostname",
                        "destination_hostname",
                        "source_user",
                        "destination_user",
                        "device_vendor",
                        "device_product",
                    ],
                    "type": "best_fields",
                    "lenient": True,
                }
            })

        # 2. Exact keyword / term filters
        if event_id:
            filter_clauses.append({"term": {"event_id": event_id.strip()}})

        if detected_format:
            filter_clauses.append({"term": {"detected_format": detected_format.strip().lower()}})

        if severity:
            filter_clauses.append({"term": {"severity": severity.strip().lower()}})

        if action:
            filter_clauses.append({"term": {"action": action.strip().lower()}})

        if protocol:
            filter_clauses.append({"term": {"protocol": protocol.strip().lower()}})

        if event_type:
            filter_clauses.append({"term": {"event_type": event_type.strip()}})

        if source_ip:
            filter_clauses.append({"term": {"source_ip": source_ip.strip()}})

        if destination_ip:
            filter_clauses.append({"term": {"destination_ip": destination_ip.strip()}})

        if source_port is not None:
            filter_clauses.append({"term": {"source_port": int(source_port)}})

        if destination_port is not None:
            filter_clauses.append({"term": {"destination_port": int(destination_port)}})

        # 3. Time range filtering
        if start_time or end_time:
            time_range: Dict[str, Any] = {}
            if start_time:
                time_range["gte"] = start_time.isoformat() if isinstance(start_time, datetime) else str(start_time)
            if end_time:
                time_range["lte"] = end_time.isoformat() if isinstance(end_time, datetime) else str(end_time)
            filter_clauses.append({"range": {"timestamp": time_range}})

        # Build bool query structure
        query: Dict[str, Any] = {"bool": {}}
        if must_clauses:
            query["bool"]["must"] = must_clauses
        else:
            query["bool"]["must"] = [{"match_all": {}}]

        if filter_clauses:
            query["bool"]["filter"] = filter_clauses

        # Sort order: newest timestamp first, tied by event_id for deterministic search_after
        sort_order = [
            {"timestamp": {"order": "desc", "unmapped_type": "date"}},
            {"event_id": {"order": "desc", "unmapped_type": "keyword"}},
        ]

        body: Dict[str, Any] = {
            "query": query,
            "sort": sort_order,
            "size": min(max(1, limit), 500),
            "track_total_hits": True,
        }

        # Deep pagination via search_after cursor, or shallow pagination via from offset
        decoded_cursor = decode_search_after(search_after) if search_after else None
        if decoded_cursor:
            body["search_after"] = decoded_cursor
        elif offset > 0:
            body["from"] = min(offset, 10000)

        return body

    @classmethod
    def build_analytics_aggregations(
        cls,
        time_range: str = "24h",
        interval: str = "1h",
    ) -> Dict[str, Any]:
        """Builds aggregations for dashboard KPIs, categorical distributions, and time series."""
        # Calculate time range constraint
        now_range = f"now-{time_range}" if time_range in ["24h", "7d", "30d"] else "now-24h"

        return {
            "size": 0,
            "query": {
                "range": {
                    "timestamp": {
                        "gte": now_range,
                        "lte": "now",
                    }
                }
            },
            "aggs": {
                "events_over_time": {
                    "date_histogram": {
                        "field": "timestamp",
                        "calendar_interval": interval,
                        "min_doc_count": 0,
                    }
                },
                "format_distribution": {
                    "terms": {
                        "field": "detected_format",
                        "size": 10,
                    }
                },
                "severity_distribution": {
                    "terms": {
                        "field": "severity",
                        "size": 10,
                    }
                },
                "action_distribution": {
                    "terms": {
                        "field": "action",
                        "size": 10,
                    }
                },
                "protocol_distribution": {
                    "terms": {
                        "field": "protocol",
                        "size": 10,
                    }
                },
                "top_source_ips": {
                    "terms": {
                        "field": "source_ip",
                        "size": 5,
                    }
                },
                "top_destination_ips": {
                    "terms": {
                        "field": "destination_ip",
                        "size": 5,
                    }
                },
            },
        }
