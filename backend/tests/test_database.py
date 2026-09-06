"""Unit & Integration Tests for Event Persistence and Repository Layer."""
import hashlib
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.repositories.event_repository import EventRepository
from app.models.event import EventModel
from app.services.processing_service import ULPFEngine


def test_persist_valid_json_event(db_session: Session, engine: ULPFEngine, sample_json_log: str):
    """1. Valid JSON event is stored in database."""
    res = engine.process_event(sample_json_log)
    assert res.status == "success"

    saved = EventRepository.create_from_processing_result(db_session, res)
    assert saved is not None
    assert saved.id is not None
    assert saved.event_id == res.event_id
    assert saved.detected_format == "json"
    assert saved.source_ip == "10.0.0.15"
    assert saved.destination_ip == "192.168.1.1"
    assert saved.action == "allow"
    assert saved.severity == "informational"


def test_persist_valid_cef_event(db_session: Session, engine: ULPFEngine, sample_cef_log: str):
    """2. Valid CEF event is stored in database."""
    res = engine.process_event(sample_cef_log)
    assert res.status == "success"

    saved = EventRepository.create_from_processing_result(db_session, res)
    assert saved is not None
    assert saved.detected_format == "cef"
    assert saved.action == "block"
    assert saved.severity == "high"
    assert saved.source_ip == "198.51.100.25"


def test_persist_valid_syslog_event(db_session: Session, engine: ULPFEngine, sample_syslog_rfc5424: str):
    """3. Valid Syslog event is stored in database."""
    res = engine.process_event(sample_syslog_rfc5424)
    assert res.status == "success"

    saved = EventRepository.create_from_processing_result(db_session, res)
    assert saved is not None
    assert saved.detected_format == "syslog"
    assert saved.raw_event == sample_syslog_rfc5424

    # Test syslog with embedded action and IP entities
    syslog_kv = "<134>Sep 6 10:30:00 fw1 kernel: IN=eth0 OUT=eth1 SRC=192.168.1.10 DST=8.8.8.8 PROTO=UDP SPT=53000 DPT=53 ACTION=ALLOW"
    res_kv = engine.process_event(syslog_kv)
    saved_kv = EventRepository.create_from_processing_result(db_session, res_kv)
    assert saved_kv is not None
    assert saved_kv.action == "allow"
    assert saved_kv.source_ip == "192.168.1.10"
    assert saved_kv.destination_ip == "8.8.8.8"


def test_uuid_event_id_preserved(db_session: Session, engine: ULPFEngine, sample_json_log: str):
    """4. UUID event_id from ULPF engine is strictly preserved."""
    res = engine.process_event(sample_json_log)
    saved = EventRepository.create_from_processing_result(db_session, res)
    assert saved.event_id == res.event_id
    assert len(saved.event_id) == 36


def test_sha256_hash_integrity_preserved(db_session: Session, engine: ULPFEngine, sample_json_log: str):
    """5. SHA-256 hash is preserved and matches sha256(raw_event)."""
    res = engine.process_event(sample_json_log)
    saved = EventRepository.create_from_processing_result(db_session, res)
    
    # Verify exact match with ULPF engine digest
    assert saved.sha256_hash == res.raw_event_hash
    # Verify cryptographic equality against pristine raw_event
    expected_hash = hashlib.sha256(saved.raw_event.encode("utf-8")).hexdigest()
    assert saved.sha256_hash == expected_hash


def test_exact_raw_event_preserved_losslessly(db_session: Session, engine: ULPFEngine):
    """6. Exact raw event is preserved byte-for-byte without mutation or trimming."""
    raw_with_spaces = "   <165>1 2026-09-06T10:14:00.000Z host app 1 - %ASA-4-106023: Deny tcp   "
    res = engine.process_event(raw_with_spaces)
    saved = EventRepository.create_from_processing_result(db_session, res)
    assert saved.raw_event == raw_with_spaces


def test_normalized_event_stored_separately(db_session: Session, engine: ULPFEngine, sample_json_log: str):
    """7. Normalized event is stored separately as structured dictionary."""
    res = engine.process_event(sample_json_log)
    saved = EventRepository.create_from_processing_result(db_session, res)
    assert isinstance(saved.normalized_event, dict)
    assert saved.normalized_event["source"]["ip"] == "10.0.0.15"
    # Ensure raw_event is a string, not overwritten by JSON
    assert isinstance(saved.raw_event, str)


def test_additional_vendor_fields_preserved(db_session: Session, engine: ULPFEngine, sample_json_log: str):
    """8. Additional vendor fields are preserved losslessly in additional_fields."""
    res = engine.process_event(sample_json_log)
    saved = EventRepository.create_from_processing_result(db_session, res)
    assert isinstance(saved.additional_fields, dict)
    assert saved.additional_fields.get("custom_threat_score") == 88
    assert saved.additional_fields.get("organization") == "NTRO"


def test_duplicate_event_id_handled_safely(db_session: Session, engine: ULPFEngine, sample_json_log: str):
    """9. Duplicate event_id triggers IntegrityError and rollback."""
    res = engine.process_event(sample_json_log)
    EventRepository.create_from_processing_result(db_session, res)

    # Attempt to insert identical event_id
    duplicate = EventModel(
        event_id=res.event_id,
        detected_format="json",
        raw_event=sample_json_log,
        sha256_hash=res.raw_event_hash,
    )
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
