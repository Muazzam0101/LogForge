import json
import re
from typing import Any, Dict
from .base import BaseParser


class JSONParser(BaseParser):
    """Parser for JSON-formatted logs.
    
    Extracts attributes from top-level and nested JSON objects, preserving
    all original keys and types for lossless normalization.
    Intelligently unpacks embedded/stringified logs (JSON, CEF, Syslog)
    found inside standard envelope fields (raw_log, message, log, payload, etc.).
    """

    parser_name = "json_parser"
    supported_format = "json"
    version = "1.1.0"

    ENVELOPE_KEYS = ("raw_log", "log", "message", "msg", "payload", "event", "data", "record", "raw")

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

        # 1. First pass: extract all top-level and nested dict values
        for key, value in data.items():
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    extracted[f"{key}.{sub_key}"] = sub_value
            extracted[key] = value

        # 2. Check for embedded logs in envelope keys or single-key wrappers
        candidate_keys = [k for k in self.ENVELOPE_KEYS if k in data]
        if not candidate_keys and len(data) == 1:
            candidate_keys = list(data.keys())

        for env_key in candidate_keys:
            val = data[env_key]

            # Case A: Value is already a dict (nested envelope)
            if isinstance(val, dict):
                for in_k, in_v in val.items():
                    if in_k not in extracted:
                        extracted[in_k] = in_v
                    if isinstance(in_v, dict):
                        for sub_k, sub_v in in_v.items():
                            if f"{in_k}.{sub_k}" not in extracted:
                                extracted[f"{in_k}.{sub_k}"] = sub_v
                continue

            # Case B: Value is a string containing embedded structured data
            if isinstance(val, str):
                inner_str = val.strip()
                if not inner_str:
                    continue

                # B1: Stringified JSON object
                if (inner_str.startswith("{") and inner_str.endswith("}")) or (inner_str.startswith("[") and inner_str.endswith("]")):
                    try:
                        inner_parsed = json.loads(inner_str)
                        if isinstance(inner_parsed, dict):
                            for in_k, in_v in inner_parsed.items():
                                if in_k not in extracted:
                                    extracted[in_k] = in_v
                                if isinstance(in_v, dict):
                                    for sub_k, sub_v in in_v.items():
                                        if f"{in_k}.{sub_k}" not in extracted:
                                            extracted[f"{in_k}.{sub_k}"] = sub_v
                            break
                    except Exception:
                        pass

                # B2: Embedded ArcSight CEF log
                if inner_str.upper().startswith("CEF:"):
                    try:
                        from .cef_parser import CEFParser
                        cef_p = CEFParser()
                        if cef_p.can_parse(inner_str):
                            cef_extracted = cef_p.parse(inner_str)
                            for c_k, c_v in cef_extracted.items():
                                if c_k not in extracted:
                                    extracted[c_k] = c_v
                            break
                    except Exception:
                        pass

                # B3: Embedded Syslog message
                if inner_str.startswith("<") or re.match(r"^[A-Z][a-z]{2}\s+\d{1,2}\s+", inner_str):
                    try:
                        from .syslog_parser import SyslogParser
                        sys_p = SyslogParser()
                        if sys_p.can_parse(inner_str):
                            sys_extracted = sys_p.parse(inner_str)
                            for s_k, s_v in sys_extracted.items():
                                if s_k not in extracted:
                                    extracted[s_k] = s_v
                            break
                    except Exception:
                        pass

        return extracted
