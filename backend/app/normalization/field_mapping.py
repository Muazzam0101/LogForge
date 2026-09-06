from typing import Dict, Set

# Source IP Synonyms
SOURCE_IP_FIELDS: Set[str] = {
    "src",
    "src_ip",
    "source_ip",
    "sourceaddress",
    "source_address",
    "saddr",
    "client_ip",
    "c_ip",
}

# Destination IP Synonyms
DEST_IP_FIELDS: Set[str] = {
    "dst",
    "dst_ip",
    "destination_ip",
    "destinationaddress",
    "destination_address",
    "daddr",
    "server_ip",
}

# Port Synonyms
SOURCE_PORT_FIELDS: Set[str] = {
    "spt",
    "src_port",
    "source_port",
    "source_port_number",
    "client_port",
}

DEST_PORT_FIELDS: Set[str] = {
    "dpt",
    "dst_port",
    "destination_port",
    "destination_port_number",
    "server_port",
}

# Protocol Synonyms
PROTOCOL_FIELDS: Set[str] = {
    "proto",
    "protocol",
    "app_proto",
    "transport",
}

# Action Canonicalization Mappings
ACTION_NORMALIZATION_MAP: Dict[str, str] = {
    # Allow / Permit
    "allow": "allow",
    "allowed": "allow",
    "accept": "allow",
    "accepted": "allow",
    "permit": "allow",
    "permitted": "allow",
    "pass": "allow",
    "passed": "allow",
    "success": "allow",
    "successful": "allow",
    # Block / Drop / Deny
    "block": "block",
    "blocked": "block",
    "drop": "block",
    "dropped": "block",
    "deny": "block",
    "denied": "block",
    "reject": "block",
    "rejected": "block",
    "fail": "block",
    "failed": "block",
    "failure": "block",
    # Auth actions
    "login": "login",
    "logon": "login",
    "logout": "logout",
    "logoff": "logout",
}

# Severity Normalization Mappings
SEVERITY_STRING_MAP: Dict[str, str] = {
    "emerg": "critical",
    "emergency": "critical",
    "alert": "critical",
    "crit": "critical",
    "critical": "critical",
    "err": "high",
    "error": "high",
    "high": "high",
    "warn": "medium",
    "warning": "medium",
    "medium": "medium",
    "notice": "low",
    "low": "low",
    "info": "informational",
    "informational": "informational",
    "debug": "informational",
}

# Syslog RFC Severity Code to canonical label (0=Emergency -> critical, 7=Debug -> informational)
SYSLOG_SEVERITY_CODE_MAP: Dict[int, str] = {
    0: "critical",  # Emergency
    1: "critical",  # Alert
    2: "critical",  # Critical
    3: "high",      # Error
    4: "medium",    # Warning
    5: "low",       # Notice
    6: "informational",  # Informational
    7: "informational",  # Debug
}
