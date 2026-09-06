import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from dateutil import parser as date_parser
from .base import BaseParser

RFC5424_PATTERN = re.compile(
    r"^<(?P<pri>\d{1,3})>1\s+"
    r"(?P<timestamp>[^\s]+)\s+"
    r"(?P<hostname>[^\s]+)\s+"
    r"(?P<appname>[^\s]+)\s+"
    r"(?P<procid>[^\s]+)\s+"
    r"(?P<msgid>[^\s]+)\s*"
    r"(?P<rest>.*)$",
    re.DOTALL,
)

RFC3164_PATTERN = re.compile(
    r"^(?:<(?P<pri>\d{1,3})>)?\s*"
    r"(?P<timestamp>[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+"
    r"(?P<hostname>[^\s:]+)\s+"
    r"(?:(?P<tag>[^:\[\s]+)(?:\[(?P<pid>\d+)\])?:\s*)?"
    r"(?P<message>.*)$",
    re.DOTALL,
)

KV_TOKEN_PATTERN = re.compile(
    r"(?P<key>[a-zA-Z0-9_.-]+)=(?:\"(?P<quoted>[^\"]*)\"|'(?P<single>[^']*)'|(?P<raw>[^\s]+))"
)


class SyslogParser(BaseParser):
    """Parser for Syslog messages conforming to RFC 5424 and RFC 3164 (BSD).
    
    Extracts priority, facility, severity code, timestamp, hostname, tag/program,
    and intelligently parses embedded key-value pairs from the log body.
    """

    parser_name = "syslog_parser"
    supported_format = "syslog"
    version = "1.0.0"

    def can_parse(self, raw_log: str) -> bool:
        if not raw_log or not isinstance(raw_log, str):
            return False
        cleaned = raw_log.strip()
        return bool(RFC5424_PATTERN.match(cleaned) or RFC3164_PATTERN.match(cleaned) or (cleaned.startswith("<") and ">" in cleaned[:6]))

    def parse(self, raw_log: str) -> Dict[str, Any]:
        cleaned = raw_log.strip()
        extracted: Dict[str, Any] = {}

        # 1. Try RFC 5424
        match_5424 = RFC5424_PATTERN.match(cleaned)
        if match_5424:
            data = match_5424.groupdict()
            pri = int(data["pri"])
            extracted["priority"] = pri
            extracted["facility"] = pri // 8
            extracted["severity_code"] = pri % 8
            extracted["syslog_version"] = 1
            extracted["timestamp"] = data["timestamp"]
            extracted["hostname"] = data["hostname"]
            extracted["app_name"] = data["appname"]
            extracted["process_id"] = data["procid"]
            extracted["msg_id"] = data["msgid"]

            message = data["rest"]
            # Handle structured data if present
            if message.startswith("[") and "]" in message:
                close_bracket = message.find("]")
                extracted["structured_data"] = message[1:close_bracket]
                message = message[close_bracket + 1:].strip()

            extracted["message"] = message
            self._extract_embedded_kv(message, extracted)
            return extracted

        # 2. Try RFC 3164
        match_3164 = RFC3164_PATTERN.match(cleaned)
        if match_3164:
            data = match_3164.groupdict()
            if data["pri"]:
                pri = int(data["pri"])
                extracted["priority"] = pri
                extracted["facility"] = pri // 8
                extracted["severity_code"] = pri % 8

            extracted["timestamp"] = data["timestamp"]
            extracted["hostname"] = data["hostname"]
            if data.get("tag"):
                extracted["app_name"] = data["tag"]
            if data.get("pid"):
                extracted["process_id"] = data["pid"]

            message = data["message"] or ""
            extracted["message"] = message
            self._extract_embedded_kv(message, extracted)
            return extracted

        # 3. Fallback generic syslog with PRI header
        if cleaned.startswith("<") and ">" in cleaned[:6]:
            close_idx = cleaned.index(">")
            pri_str = cleaned[1:close_idx]
            if pri_str.isdigit():
                pri = int(pri_str)
                extracted["priority"] = pri
                extracted["facility"] = pri // 8
                extracted["severity_code"] = pri % 8
                extracted["message"] = cleaned[close_idx + 1:].strip()
                self._extract_embedded_kv(extracted["message"], extracted)
                return extracted

        raise ValueError(f"Unrecognized syslog format for {self.parser_name}")

    def _extract_embedded_kv(self, message: str, extracted: Dict[str, Any]) -> None:
        """Extracts key=value tokens frequently found in firewall and kernel logs."""
        if not message:
            return
        for match in KV_TOKEN_PATTERN.finditer(message):
            k = match.group("key").lower()
            val = match.group("quoted") or match.group("single") or match.group("raw")
            # Don't overwrite existing primary keys
            if k not in extracted:
                extracted[k] = val
