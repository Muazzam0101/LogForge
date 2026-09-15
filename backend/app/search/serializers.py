"""OpenSearch Document Serializer.

Transforms ULPF ProcessingResult or MySQL EventModel instances into standardized,
type-safe OpenSearch document representations conforming to explicit index mappings.
"""
from datetime import datetime, timezone
import ipaddress
from typing import Any, Dict, Optional, Union

from ..models.event import EventModel
from ..schemas.event import ProcessingResult


def _sanitize_ip(val: Optional[str]) -> Optional[str]:
    """Sanitizes an IP string, returning None if not a valid IPv4 or IPv6."""
    if not val:
        return None
    val = str(val).strip()
    try:
        ipaddress.ip_address(val)
        return val
    except ValueError:
        return None


def _sanitize_port(val: Any) -> Optional[int]:
    """Converts a port value to valid integer [0, 65535] or None."""
    if val is None:
        return None
    try:
        port = int(val)
        return port if 0 <= port <= 65535 else None
    except (ValueError, TypeError):
        return None


def _to_iso_str(dt: Optional[datetime]) -> Optional[str]:
    """Converts a datetime to UTC ISO-8601 formatted string."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


class EventDocumentSerializer:
    """Serializes heterogeneous security events into OpenSearch document payloads."""

    @classmethod
    def serialize_processing_result(cls, result: ProcessingResult) -> Dict[str, Any]:
        """Serializes a successful ULPF ProcessingResult into an OpenSearch document."""
        norm = result.normalized_event
        now_iso = datetime.now(timezone.utc).isoformat()

        src_ip = norm.source.ip if norm and norm.source else None
        dst_ip = norm.destination.ip if norm and norm.destination else None
        src_port = norm.source.port if norm and norm.source else None
        dst_port = norm.destination.port if norm and norm.destination else None

        return {
            "event_id": result.event_id,
            "timestamp": _to_iso_str(norm.timestamp) if norm and norm.timestamp else now_iso,
            "created_at": now_iso,
            "detected_format": (result.format_detected or "unknown").lower(),
            "event_type": norm.event_type if norm else None,
            "event_category": norm.event_category if norm else None,
            "action": norm.action.lower() if norm and norm.action else None,
            "severity": norm.severity.lower() if norm and norm.severity else "informational",
            "severity_code": norm.severity_code if norm else None,
            "source_ip": _sanitize_ip(src_ip),
            "destination_ip": _sanitize_ip(dst_ip),
            "source_port": _sanitize_port(src_port),
            "destination_port": _sanitize_port(dst_port),
            "protocol": norm.network.protocol.lower() if norm and norm.network and norm.network.protocol else None,
            "transport": norm.network.transport if norm and norm.network else None,
            "direction": norm.network.direction if norm and norm.network else None,
            "message": norm.message if norm and norm.message else "",
            "raw_event": result.raw_event,
            "sha256_hash": result.raw_event_hash,
            "source_hostname": norm.source.hostname if norm and norm.source else None,
            "destination_hostname": norm.destination.hostname if norm and norm.destination else None,
            "source_user": norm.source.user if norm and norm.source else None,
            "destination_user": norm.destination.user if norm and norm.destination else None,
            "device_vendor": norm.device.vendor if norm and norm.device else None,
            "device_product": norm.device.product if norm and norm.device else None,
            "parser_name": norm.parser.parser_name if norm and norm.parser else None,
            "additional_fields": norm.additional_fields if norm and norm.additional_fields else {},
        }

    @classmethod
    def serialize_event_model(cls, model: EventModel) -> Dict[str, Any]:
        """Serializes an authoritative MySQL EventModel into an OpenSearch document."""
        norm = model.normalized_event or {}
        additional = model.additional_fields or {}

        # Extract nested attributes if present in normalized_event JSON
        source_dict = norm.get("source") or {}
        dest_dict = norm.get("destination") or {}
        net_dict = norm.get("network") or {}
        dev_dict = norm.get("device") or {}
        parser_dict = norm.get("parser") or {}

        return {
            "event_id": model.event_id,
            "timestamp": _to_iso_str(model.timestamp) or _to_iso_str(model.created_at),
            "created_at": _to_iso_str(model.created_at),
            "detected_format": (model.detected_format or "unknown").lower(),
            "event_type": norm.get("event_type"),
            "event_category": norm.get("event_category"),
            "action": model.action.lower() if model.action else None,
            "severity": model.severity.lower() if model.severity else "informational",
            "severity_code": norm.get("severity_code"),
            "source_ip": _sanitize_ip(model.source_ip or source_dict.get("ip")),
            "destination_ip": _sanitize_ip(model.destination_ip or dest_dict.get("ip")),
            "source_port": _sanitize_port(model.source_port or source_dict.get("port")),
            "destination_port": _sanitize_port(model.destination_port or dest_dict.get("port")),
            "protocol": (model.protocol or net_dict.get("protocol") or "").lower() or None,
            "transport": net_dict.get("transport"),
            "direction": net_dict.get("direction"),
            "message": norm.get("message") or "",
            "raw_event": model.raw_event,
            "sha256_hash": model.sha256_hash,
            "source_hostname": source_dict.get("hostname"),
            "destination_hostname": dest_dict.get("hostname"),
            "source_user": source_dict.get("user"),
            "destination_user": dest_dict.get("user"),
            "device_vendor": dev_dict.get("vendor"),
            "device_product": dev_dict.get("product"),
            "parser_name": parser_dict.get("parser_name"),
            "additional_fields": additional,
        }
