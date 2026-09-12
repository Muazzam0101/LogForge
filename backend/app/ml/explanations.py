"""Explainability Engine for AI/ML Security Log Anomalies."""
from typing import Any, Dict, List, Optional


def generate_anomaly_explanation(
    score: float,
    classification: str,
    features: Dict[str, Any],
    raw_event: Optional[str] = None,
    source_ip: Optional[str] = None,
    destination_ip: Optional[str] = None,
    action: Optional[str] = None,
    protocol: Optional[str] = None,
) -> str:
    """Generates a human-readable, domain-specific explanation of why an event was flagged."""
    if classification == "Normal":
        return "Event aligns with standard operational baseline and typical network traffic patterns."

    reasons: List[str] = []

    dst_port = int(features.get("dst_port_num") or 0)
    is_remote = features.get("is_remote_access_port", 0.0) == 1.0
    action_num = features.get("action_num", 0.0)
    severity_num = features.get("severity_num", 0.0)
    hour = int(features.get("hour_of_day", 12))
    internal_src = features.get("is_internal_src", 0.0) == 1.0
    internal_dst = features.get("is_internal_dst", 0.0) == 1.0

    # 1. Action & Security Enforcement
    if action_num == 1.0:  # Block / Deny / Drop
        if source_ip:
            reasons.append(f"Repeated perimeter enforcement (BLOCK/DENY/DROP) recorded against source '{source_ip}'")
        else:
            reasons.append("Perimeter enforcement action (BLOCK/DENY/DROP) detected")

    # 2. Remote Access and Sensitive Ports
    if is_remote:
        port_desc = "SSH (22)" if dst_port == 22 else "RDP (3389)" if dst_port == 3389 else f"port {dst_port}"
        reasons.append(f"Remote administration service targeted on {port_desc}")
    elif dst_port > 0 and not features.get("is_common_web_port", 0.0):
        if dst_port < 1024:
            reasons.append(f"Uncommon privileged system destination port ({dst_port})")
        elif dst_port > 49152:
            reasons.append(f"Ephemeral high-range destination port ({dst_port}) deviated from baseline")

    # 3. Network Direction & External Boundary
    if not internal_src and internal_dst:
        reasons.append("External inbound ingress packet crossing private network boundary")

    # 4. Elevated Severity
    if severity_num >= 3.0:
        reasons.append("Elevated high/critical severity level flagged by ULPF schema parser")

    # 5. Off-Hours Temporal Deviation
    if hour < 5 or hour >= 22:
        reasons.append(f"Off-hours transmission timing ({hour:02d}:00 UTC) outside typical activity window")

    # 6. Communication Pattern
    if source_ip and destination_ip:
        proto_str = protocol.upper() if protocol else "IP"
        reasons.append(f"Unusual {proto_str} communication flow from {source_ip} to {destination_ip}")

    # Synthesize concise, professional explanation
    if not reasons:
        return (
            f"Statistical deviation detected by Isolation Forest across multi-dimensional features "
            f"(Score: {score:.2f})."
        )

    # Combine top 2-3 most salient reasons
    selected = reasons[:3]
    return ". ".join(selected) + "."
