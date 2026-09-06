import json
import re
from typing import Optional

# Regex for ArcSight CEF format header: CEF:Version|Device Vendor|Device Product|Device Version|Device Event Class ID|Name|Severity|
CEF_REGEX = re.compile(
    r"^CEF:\s*0\s*\|(?P<vendor>[^|\\]*(?:\\.[^|\\]*)*)\|(?P<product>[^|\\]*(?:\\.[^|\\]*)*)\|"
    r"(?P<version>[^|\\]*(?:\\.[^|\\]*)*)\|(?P<device_event_class_id>[^|\\]*(?:\\.[^|\\]*)*)\|"
    r"(?P<name>[^|\\]*(?:\\.[^|\\]*)*)\|(?P<severity>[^|\\]*(?:\\.[^|\\]*)*)\|",
    re.IGNORECASE,
)

# Regex for Syslog RFC 5424 (IETF): <PRI>1 TIMESTAMP HOSTNAME APP-NAME PROCID MSGID ...
SYSLOG_RFC5424_REGEX = re.compile(
    r"^<(?P<pri>\d{1,3})>1\s+(?P<timestamp>[^\s]+)\s+(?P<hostname>[^\s]+)\s+"
    r"(?P<appname>[^\s]+)\s+(?P<procid>[^\s]+)\s+(?P<msgid>[^\s]+)",
)

# Regex for Syslog RFC 3164 (BSD): <PRI>Mmm dd hh:mm:ss hostname tag: msg
# OR without PRI: Mmm dd hh:mm:ss hostname tag: msg
SYSLOG_RFC3164_REGEX = re.compile(
    r"^(?:<(?P<pri>\d{1,3})>)?(?P<timestamp>[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+"
    r"(?P<hostname>[^\s:]+)\s+(?P<tag>[^:\s]+)?(?::\s*|\s+)",
)


class FormatDetector:
    """Deterministic, explainable log format detector.
    
    Classifies raw log lines into 'json', 'cef', 'syslog', or 'unknown'.
    Zero non-deterministic AI guessing.
    """

    @classmethod
    def detect(cls, raw_log: str) -> str:
        if not raw_log or not isinstance(raw_log, str):
            return "unknown"

        cleaned = raw_log.strip()
        if not cleaned:
            return "unknown"

        # 1. JSON Detection
        if cleaned.startswith("{") and cleaned.endswith("}"):
            try:
                parsed = json.loads(cleaned)
                if isinstance(parsed, dict):
                    return "json"
            except (ValueError, TypeError):
                pass

        # 2. CEF (Common Event Format) Detection
        if cleaned.startswith("CEF:") or cleaned.startswith("cef:"):
            if CEF_REGEX.match(cleaned):
                return "cef"
            # Fallback for lenient CEF starts
            parts = cleaned.split("|")
            if len(parts) >= 7 and parts[0].upper().startswith("CEF:"):
                return "cef"

        # 3. Syslog Detection (RFC 5424 & RFC 3164)
        if SYSLOG_RFC5424_REGEX.match(cleaned):
            return "syslog"

        if SYSLOG_RFC3164_REGEX.match(cleaned):
            return "syslog"

        # Fallback syslog check: starts with <PRI> e.g. <134> or <34>
        if cleaned.startswith("<") and ">" in cleaned[:6]:
            pri_part = cleaned[1:cleaned.index(">")]
            if pri_part.isdigit():
                return "syslog"

        return "unknown"
