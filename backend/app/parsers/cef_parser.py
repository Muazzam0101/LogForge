import re
from typing import Any, Dict, List
from .base import BaseParser

# Regex to extract key=value pairs from the CEF extension part
CEF_EXT_REGEX = re.compile(
    r"(?P<key>[a-zA-Z0-9_.-]+)=(?P<value>.*?)(?=(?:\s+[a-zA-Z0-9_.-]+=)|\Z)"
)


class CEFParser(BaseParser):
    """Parser for ArcSight Common Event Format (CEF) security logs.
    
    Extracts 7 standard header fields:
      - cef_version, device_vendor, device_product, device_version,
      - device_event_class_id, name, severity
    And parses all key=value attributes from the extension block.
    """

    parser_name = "cef_parser"
    supported_format = "cef"
    version = "1.0.0"

    def _split_header_fields(self, raw_log: str) -> List[str]:
        """Splits CEF header fields respecting escaped pipes (\\|)."""
        fields: List[str] = []
        current: List[str] = []
        escaped = False

        for char in raw_log:
            if escaped:
                current.append(char)
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == "|" and len(fields) < 7:
                fields.append("".join(current))
                current = []
            else:
                current.append(char)

        fields.append("".join(current))
        return fields

    def can_parse(self, raw_log: str) -> bool:
        if not raw_log or not isinstance(raw_log, str):
            return False
        cleaned = raw_log.strip()
        if not cleaned.upper().startswith("CEF:"):
            return False
        parts = self._split_header_fields(cleaned)
        return len(parts) >= 8

    def parse(self, raw_log: str) -> Dict[str, Any]:
        cleaned = raw_log.strip()
        parts = self._split_header_fields(cleaned)
        if len(parts) < 8:
            raise ValueError(f"Invalid CEF log structure: expected 8 segments, got {len(parts)}")

        # Extract header
        cef_prefix = parts[0]
        version_match = re.search(r"CEF:\s*(\d+)", cef_prefix, re.IGNORECASE)
        cef_version = version_match.group(1) if version_match else "0"

        extracted: Dict[str, Any] = {
            "cef_version": cef_version,
            "device_vendor": parts[1],
            "device_product": parts[2],
            "device_version": parts[3],
            "device_event_class_id": parts[4],
            "name": parts[5],
            "message": parts[5],
            "severity": parts[6],
        }

        # Extract extension key-value pairs
        extension_str = parts[7]
        for match in CEF_EXT_REGEX.finditer(extension_str):
            key = match.group("key")
            value = match.group("value").strip()

            # Unescape standard CEF escape sequences
            value = value.replace("\\=", "=").replace("\\|", "|").replace("\\\\", "\\")
            value = value.replace("\\n", "\n").replace("\\r", "\r")

            extracted[key] = value

        return extracted
