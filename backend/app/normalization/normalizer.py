from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Optional, Set, Tuple
from dateutil import parser as date_parser

from ..schemas.event import (
    DeviceContext,
    EndpointEntity,
    NetworkContext,
    NormalizedEvent,
    ParserMetadata,
    UserContext,
)
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


class EventNormalizer:
    """Normalizes heterogeneous intermediate parser outputs into the Universal Event Schema (UES).
    
    Adheres strictly to the NTRO Lossless Principle: all unmapped vendor-specific
    fields are retained in `additional_fields`. Supports case-insensitive attribute
    resolution across vendor formats.
    """

    @classmethod
    def _find_matching_entry(
        cls, extracted: Dict[str, Any], candidate_keys: Iterable[str]
    ) -> Tuple[Optional[str], Optional[Any]]:
        """Finds the first matching key from candidate_keys using exact then case-insensitive lookup."""
        # 1. Exact match pass
        for k in candidate_keys:
            if k in extracted and extracted[k] is not None and extracted[k] != "":
                return k, extracted[k]

        # 2. Case-insensitive pass
        lower_map = {orig_k.lower(): orig_k for orig_k in extracted.keys()}
        for k in candidate_keys:
            lk = k.lower()
            if lk in lower_map and extracted[lower_map[lk]] is not None and extracted[lower_map[lk]] != "":
                actual_k = lower_map[lk]
                return actual_k, extracted[actual_k]

        return None, None

    @classmethod
    def normalize(
        cls,
        extracted: Dict[str, Any],
        parser_name: str,
        format_detected: str,
        parse_time_ms: Optional[float] = None,
    ) -> NormalizedEvent:
        consumed_keys: Set[str] = set()

        # 1. Normalize Timestamp
        timestamp = cls._normalize_timestamp(extracted, consumed_keys)

        # 2. Normalize Source Endpoint
        source = cls._normalize_source(extracted, consumed_keys)

        # 3. Normalize Destination Endpoint
        destination = cls._normalize_destination(extracted, consumed_keys)

        # 4. Normalize Network Attributes
        network = cls._normalize_network(extracted, consumed_keys)

        # 5. Normalize Device Context
        device = cls._normalize_device(extracted, consumed_keys)

        # 6. Normalize User Context
        user = cls._normalize_user(extracted, consumed_keys)

        # 7. Normalize Action
        action = cls._normalize_action(extracted, consumed_keys)

        # 8. Normalize Severity
        severity, severity_code = cls._normalize_severity(extracted, consumed_keys)

        # 9. Normalize Message / Summary
        message = cls._extract_first_present(
            extracted, ["message", "msg", "name", "description"], consumed_keys
        )

        # 10. Normalize Event Type / Category
        event_type = cls._extract_first_present(
            extracted, ["event_type", "type", "device_event_class_id"], consumed_keys
        )
        event_category = cls._extract_first_present(
            extracted, ["event_category", "category", "cat"], consumed_keys
        )

        # 11. Lossless preservation: Retain all unmapped vendor fields
        additional_fields: Dict[str, Any] = {}
        for k, v in extracted.items():
            if k not in consumed_keys:
                additional_fields[k] = v

        parser_meta = ParserMetadata(
            parser_name=parser_name,
            format_detected=format_detected,
            parser_version="1.0.0",
            parse_time_ms=parse_time_ms,
        )

        return NormalizedEvent(
            timestamp=timestamp,
            event_type=str(event_type) if event_type is not None else None,
            event_category=str(event_category) if event_category is not None else None,
            action=action,
            severity=severity,
            severity_code=severity_code,
            message=str(message) if message is not None else None,
            source=source,
            destination=destination,
            network=network,
            device=device,
            user=user,
            parser=parser_meta,
            additional_fields=additional_fields,
        )

    @classmethod
    def _normalize_timestamp(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Optional[datetime]:
        matched_key, val = cls._find_matching_entry(
            extracted, ["timestamp", "time", "@timestamp", "rt", "event_time"]
        )
        if matched_key:
            consumed.add(matched_key)
            if isinstance(val, datetime):
                return val.astimezone(timezone.utc)
            if isinstance(val, (int, float)):
                if val > 1e11:  # milliseconds
                    val = val / 1000.0
                try:
                    return datetime.fromtimestamp(val, tz=timezone.utc)
                except Exception:
                    pass
            if isinstance(val, str):
                try:
                    dt = date_parser.parse(val)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except Exception:
                    pass
        return None

    @classmethod
    def _normalize_source(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Optional[EndpointEntity]:
        ip_key, ip_val = cls._find_matching_entry(extracted, SOURCE_IP_FIELDS)
        if ip_key:
            consumed.add(ip_key)

        port_key, port_val = cls._find_matching_entry(extracted, SOURCE_PORT_FIELDS)
        port: Optional[int] = None
        if port_key:
            consumed.add(port_key)
            try:
                port = int(port_val)
            except (ValueError, TypeError):
                pass

        user = cls._extract_first_present(
            extracted, ["suser", "suid", "src_user", "source_user"], consumed
        )
        mac = cls._extract_first_present(extracted, ["smac", "src_mac"], consumed)
        hostname = cls._extract_first_present(
            extracted, ["shost", "src_host", "source_hostname"], consumed
        )

        if any([ip_val, port, user, mac, hostname]):
            return EndpointEntity(
                ip=str(ip_val) if ip_val else None,
                port=port,
                user=str(user) if user else None,
                mac=str(mac) if mac else None,
                hostname=str(hostname) if hostname else None,
            )
        return None

    @classmethod
    def _normalize_destination(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Optional[EndpointEntity]:
        ip_key, ip_val = cls._find_matching_entry(extracted, DEST_IP_FIELDS)
        if ip_key:
            consumed.add(ip_key)

        port_key, port_val = cls._find_matching_entry(extracted, DEST_PORT_FIELDS)
        port: Optional[int] = None
        if port_key:
            consumed.add(port_key)
            try:
                port = int(port_val)
            except (ValueError, TypeError):
                pass

        user = cls._extract_first_present(
            extracted, ["duser", "duid", "dst_user", "dest_user"], consumed
        )
        mac = cls._extract_first_present(extracted, ["dmac", "dst_mac"], consumed)
        hostname = cls._extract_first_present(
            extracted, ["dhost", "dst_host", "dest_hostname"], consumed
        )

        if any([ip_val, port, user, mac, hostname]):
            return EndpointEntity(
                ip=str(ip_val) if ip_val else None,
                port=port,
                user=str(user) if user else None,
                mac=str(mac) if mac else None,
                hostname=str(hostname) if hostname else None,
            )
        return None

    @classmethod
    def _normalize_network(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Optional[NetworkContext]:
        proto_key, proto_val = cls._find_matching_entry(extracted, PROTOCOL_FIELDS)
        protocol: Optional[str] = None
        if proto_key:
            consumed.add(proto_key)
            protocol = str(proto_val).lower()

        transport = cls._extract_first_present(
            extracted, ["transport", "proto_transport"], consumed
        )
        direction = cls._extract_first_present(
            extracted, ["direction", "flow_direction"], consumed
        )
        session_id = cls._extract_first_present(
            extracted, ["session_id", "sess_id", "cn1"], consumed
        )

        if any([protocol, transport, direction, session_id]):
            return NetworkContext(
                protocol=protocol,
                transport=str(transport) if transport else None,
                direction=str(direction) if direction else None,
                session_id=str(session_id) if session_id else None,
            )
        return None

    @classmethod
    def _normalize_device(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Optional[DeviceContext]:
        hostname = cls._extract_first_present(
            extracted, ["hostname", "host", "dvchost", "device_name"], consumed
        )
        vendor = cls._extract_first_present(
            extracted, ["device_vendor", "vendor"], consumed
        )
        product = cls._extract_first_present(
            extracted, ["device_product", "product", "app_name"], consumed
        )
        version = cls._extract_first_present(
            extracted, ["device_version", "version", "syslog_version"], consumed
        )
        ip = cls._extract_first_present(
            extracted, ["device_ip", "dvc_ip", "dvc"], consumed
        )

        if any([hostname, vendor, product, version, ip]):
            return DeviceContext(
                hostname=str(hostname) if hostname else None,
                vendor=str(vendor) if vendor else None,
                product=str(product) if product else None,
                version=str(version) if version else None,
                ip=str(ip) if ip else None,
            )
        return None

    @classmethod
    def _normalize_user(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Optional[UserContext]:
        name = cls._extract_first_present(
            extracted, ["username", "user", "account", "login_user"], consumed
        )
        user_id = cls._extract_first_present(extracted, ["uid", "user_id"], consumed)
        domain = cls._extract_first_present(
            extracted, ["user_domain", "domain"], consumed
        )
        email = cls._extract_first_present(extracted, ["email", "user_email"], consumed)
        role = cls._extract_first_present(extracted, ["role", "user_role"], consumed)

        if any([name, user_id, domain, email, role]):
            return UserContext(
                name=str(name) if name else None,
                id=str(user_id) if user_id else None,
                domain=str(domain) if domain else None,
                email=str(email) if email else None,
                role=str(role) if role else None,
            )
        return None

    @classmethod
    def _normalize_action(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Optional[str]:
        act_key, act_val = cls._find_matching_entry(
            extracted, ["action", "act", "disposition", "status", "event_action"]
        )
        if act_key:
            consumed.add(act_key)
            val = str(act_val).strip().lower()
            return ACTION_NORMALIZATION_MAP.get(val, val)
        return None

    @classmethod
    def _normalize_severity(
        cls, extracted: Dict[str, Any], consumed: Set[str]
    ) -> Tuple[Optional[str], Optional[int]]:
        severity_label: Optional[str] = None
        severity_code: Optional[int] = None

        # 1. Check explicit severity code (e.g. from syslog RFC 5424/3164)
        code_key, code_val = cls._find_matching_entry(extracted, ["severity_code"])
        if code_key:
            consumed.add(code_key)
            try:
                code = int(code_val)
                severity_code = code
                if code in SYSLOG_SEVERITY_CODE_MAP:
                    severity_label = SYSLOG_SEVERITY_CODE_MAP[code]
            except (ValueError, TypeError):
                pass

        # 2. Check explicit severity string or 0-10 numeric scale
        sev_key, sev_val = cls._find_matching_entry(
            extracted, ["severity", "sev", "severity_level", "level"]
        )
        if sev_key:
            consumed.add(sev_key)
            val = str(sev_val).strip().lower()
            if val.isdigit():
                num = int(val)
                # Only overwrite if severity_code was not already set by syslog
                if severity_code is None:
                    severity_code = num
                if num >= 9:
                    severity_label = "critical"
                elif num >= 7:
                    severity_label = "high"
                elif num >= 4:
                    severity_label = "medium"
                elif num >= 1:
                    severity_label = "low"
                else:
                    severity_label = "informational"
            else:
                mapped = SEVERITY_STRING_MAP.get(val)
                if mapped:
                    severity_label = mapped

        return severity_label, severity_code

    @classmethod
    def _extract_first_present(
        cls, extracted: Dict[str, Any], keys: list[str], consumed: Set[str]
    ) -> Optional[Any]:
        matched_key, val = cls._find_matching_entry(extracted, keys)
        if matched_key:
            consumed.add(matched_key)
            return val
        return None
