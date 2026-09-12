"""Feature Engineering Layer for Security Log Anomaly Detection."""
from datetime import datetime
import hashlib
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

FEATURE_NAMES = [
    "src_port_num",
    "dst_port_num",
    "is_privileged_port",
    "is_common_web_port",
    "is_remote_access_port",
    "protocol_num",
    "action_num",
    "severity_num",
    "hour_of_day",
    "day_of_week",
    "is_internal_src",
    "is_internal_dst",
    "src_ip_hash_mod",
    "dst_ip_hash_mod",
]


def _hash_ip_to_int(ip: Optional[str], modulus: int = 1000) -> float:
    """Deterministically hashes an IP string into a bounded numerical bucket."""
    if not ip or not ip.strip():
        return 0.0
    digest = hashlib.md5(ip.strip().encode("utf-8")).hexdigest()
    return float(int(digest[:8], 16) % modulus)


def _is_private_ip(ip: Optional[str]) -> float:
    """Flags internal / RFC1918 private subnets."""
    if not ip:
        return 0.0
    s = ip.strip()
    if (
        s.startswith("10.")
        or s.startswith("192.168.")
        or s.startswith("172.16.")
        or s.startswith("172.17.")
        or s.startswith("172.18.")
        or s.startswith("172.19.")
        or s.startswith("172.2")
        or s.startswith("172.3")
        or s.startswith("127.")
    ):
        return 1.0
    return 0.0


def extract_features_from_dict(data: Dict[str, Any]) -> Tuple[List[float], Dict[str, Any]]:
    """Extracts a 14-dimensional numerical feature vector from an event dictionary or model."""
    src_port = float(data.get("source_port") or 0)
    dst_port = float(data.get("destination_port") or 0)

    # Privileged port (< 1024)
    is_priv = 1.0 if 0 < dst_port < 1024 else 0.0

    # Common web ports (80, 443, 8080, 8443)
    is_web = 1.0 if int(dst_port) in (80, 443, 8080, 8443) else 0.0

    # Remote access ports (22 SSH, 23 Telnet, 3389 RDP, 5900 VNC)
    is_remote = 1.0 if int(dst_port) in (22, 23, 3389, 5900) else 0.0

    # Protocol encoding: TCP=1, UDP=2, ICMP=3, other=0
    proto_raw = str(data.get("protocol") or "").lower()
    if "tcp" in proto_raw:
        proto_num = 1.0
    elif "udp" in proto_raw:
        proto_num = 2.0
    elif "icmp" in proto_raw:
        proto_num = 3.0
    else:
        proto_num = 0.0

    # Action encoding: Allow=0, Block/Deny/Drop/Reject=1, other=2
    act_raw = str(data.get("action") or "").lower()
    if any(a in act_raw for a in ("allow", "pass", "permit")):
        act_num = 0.0
    elif any(a in act_raw for a in ("block", "deny", "drop", "reject")):
        act_num = 1.0
    else:
        act_num = 2.0

    # Severity encoding: Info=0, Low=1, Medium=2, High=3, Critical=4
    sev_raw = str(data.get("severity") or "").lower()
    if "crit" in sev_raw or "fatal" in sev_raw:
        sev_num = 4.0
    elif "high" in sev_raw or "err" in sev_raw:
        sev_num = 3.0
    elif "med" in sev_raw or "warn" in sev_raw:
        sev_num = 2.0
    elif "low" in sev_raw:
        sev_num = 1.0
    else:
        sev_num = 0.0

    # Temporal features (UTC)
    ts = data.get("timestamp") or data.get("created_at")
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            ts = datetime.utcnow()
    elif not isinstance(ts, datetime):
        ts = datetime.utcnow()

    hour_val = float(ts.hour)
    day_val = float(ts.weekday())

    # IP features
    src_ip = data.get("source_ip")
    dst_ip = data.get("destination_ip")
    internal_src = _is_private_ip(src_ip)
    internal_dst = _is_private_ip(dst_ip)
    src_hash = _hash_ip_to_int(src_ip)
    dst_hash = _hash_ip_to_int(dst_ip)

    vector = [
        src_port,
        dst_port,
        is_priv,
        is_web,
        is_remote,
        proto_num,
        act_num,
        sev_num,
        hour_val,
        day_val,
        internal_src,
        internal_dst,
        src_hash,
        dst_hash,
    ]

    snapshot = {name: vector[i] for i, name in enumerate(FEATURE_NAMES)}
    return vector, snapshot


def build_feature_matrix(events: List[Any]) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
    """Builds a 2D numpy array [n_samples, n_features] from a list of EventModel records."""
    matrix = []
    snapshots = []
    for evt in events:
        data = {
            "source_port": getattr(evt, "source_port", None),
            "destination_port": getattr(evt, "destination_port", None),
            "protocol": getattr(evt, "protocol", None),
            "action": getattr(evt, "action", None),
            "severity": getattr(evt, "severity", None),
            "timestamp": getattr(evt, "timestamp", None),
            "created_at": getattr(evt, "created_at", None),
            "source_ip": getattr(evt, "source_ip", None),
            "destination_ip": getattr(evt, "destination_ip", None),
        }
        vec, snap = extract_features_from_dict(data)
        matrix.append(vec)
        snapshots.append(snap)

    if not matrix:
        return np.empty((0, len(FEATURE_NAMES))), []

    return np.array(matrix, dtype=np.float64), snapshots
