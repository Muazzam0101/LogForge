import uuid


def generate_event_id() -> str:
    """Generates a globally unique, collision-resistant UUIDv4 identifier for an event."""
    return str(uuid.uuid4())


def is_valid_uuid(val: str) -> bool:
    """Validates whether a given string is a valid UUID."""
    if not isinstance(val, str):
        return False
    try:
        uuid.UUID(val, version=4)
        return True
    except (ValueError, AttributeError):
        return False
