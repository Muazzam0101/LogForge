"""Normalization layer for canonical field mapping and UES standardization."""

from .field_mapping import (
    ACTION_NORMALIZATION_MAP,
    DEST_IP_FIELDS,
    DEST_PORT_FIELDS,
    PROTOCOL_FIELDS,
    SEVERITY_STRING_MAP,
    SOURCE_IP_FIELDS,
    SOURCE_PORT_FIELDS,
    SYSLOG_SEVERITY_CODE_MAP,
)
from .normalizer import EventNormalizer

__all__ = [
    "EventNormalizer",
    "ACTION_NORMALIZATION_MAP",
    "DEST_IP_FIELDS",
    "DEST_PORT_FIELDS",
    "PROTOCOL_FIELDS",
    "SEVERITY_STRING_MAP",
    "SOURCE_IP_FIELDS",
    "SOURCE_PORT_FIELDS",
    "SYSLOG_SEVERITY_CODE_MAP",
]
