import json
from typing import Any, Dict
from .base import BaseParser


class JSONParser(BaseParser):
    """Parser for JSON-formatted logs.
    
    Extracts attributes from top-level and nested JSON objects, preserving
    all original keys and types for lossless normalization.
    """

    parser_name = "json_parser"
    supported_format = "json"
    version = "1.0.0"

    def can_parse(self, raw_log: str) -> bool:
        if not raw_log or not isinstance(raw_log, str):
            return False
        cleaned = raw_log.strip()
        if cleaned.startswith("{") and cleaned.endswith("}"):
            try:
                data = json.loads(cleaned)
                return isinstance(data, dict)
            except Exception:
                return False
        return False

    def parse(self, raw_log: str) -> Dict[str, Any]:
        if not self.can_parse(raw_log):
            raise ValueError(f"Invalid JSON format for {self.parser_name}")

        data = json.loads(raw_log.strip())
        extracted: Dict[str, Any] = {}

        for key, value in data.items():
            # If value is nested dictionary, we extract both flattened and preserve
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    extracted[f"{key}.{sub_key}"] = sub_value
            extracted[key] = value

        return extracted
