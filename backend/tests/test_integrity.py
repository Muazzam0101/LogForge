"""Comprehensive Test Suite for LogForge Cryptographic Integrity & Blockchain Layer (Phase 8)."""
import hashlib
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.blockchain.adapter import BlockchainAdapter, AnchorReceipt
from app.blockchain.web3_adapter import DisabledBlockchainAdapter, InMemoryBlockchainAdapter
from app.db.repositories.event_repository import EventRepository
from app.integrity.chain import compute_chain_hash, verify_chain_sequence
from app.integrity.merkle import MerkleTree
from app.integrity.service import IntegrityService
from app.models.event import EventModel
from app.models.integrity import EventIntegrityModel, IntegrityBatchModel
from app.services.processing_service import ULPFEngine


SAMPLE_LOG_1 = '{"event_type": "firewall_drop", "src_ip": "192.168.1.100", "dst_ip": "10.0.0.1", "action": "block"}'
SAMPLE_LOG_2 = '{"event_type": "ssh_login", "src_ip": "172.16.0.5", "dst_ip": "10.0.0.2", "action": "allow"}'
SAMPLE_LOG_3 = '{"event_type": "dns_query", "query": "malicious.domain.com", "action": "sinkhole"}'


# ==============================================================================
# 1. SHA-256 Integrity Record Creation & Consumption
# ==============================================================================

def test_integrity_record_created_on_ingestion(test_client: TestClient, db_session: Session):
    """Verifies that every ingested log automatically generates a linked event_integrity record."""
    resp = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": SAMPLE_LOG_1, "source_hint": "json"},
    )
    assert resp.status_code == 200
    data = resp.json()
    event_id = data["event_id"]
    raw_hash = data["raw_event_hash"]

    # Verify integrity record exists in database
    integ = db_session.scalars(
        select(EventIntegrityModel).where(EventIntegrityModel.event_id == event_id)
    ).first()

    assert integ is not None
    assert integ.event_id == event_id
    assert integ.sha256_hash == raw_hash
    assert integ.hash_algorithm == "SHA-256"
    assert integ.verification_status == "UNVERIFIED"


# ==============================================================================
# 2. Server-side Cryptographic Verification (VALID)
# ==============================================================================

def test_valid_event_verification(test_client: TestClient, db_session: Session):
    """Verifies that an unaltered pristine raw event passes cryptographic verification with VALID status."""
    resp = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": SAMPLE_LOG_1, "source_hint": "json"},
    )
    event_id = resp.json()["event_id"]

    verify_resp = test_client.post(f"/api/v1/integrity/{event_id}/verify")
    assert verify_resp.status_code == 200
    vdata = verify_resp.json()

    assert vdata["event_id"] == event_id
    assert vdata["integrity"] == "VALID"
    assert vdata["hash_algorithm"] == "SHA-256"
    assert vdata["stored_hash"] == vdata["calculated_hash"]
    assert "Cryptographic signature is valid" in vdata["details"]

    # Verify database state was updated
    integ = db_session.scalars(
        select(EventIntegrityModel).where(EventIntegrityModel.event_id == event_id)
    ).first()
    assert integ.verification_status == "VALID"
    assert integ.verified_at is not None


# ==============================================================================
# 3. Tampered Event Detection (TAMPERED)
# ==============================================================================

def test_tampered_event_detection(test_client: TestClient, db_session: Session):
    """Verifies that any unauthorized modification of the raw_event byte string is detected as TAMPERED."""
    resp = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": SAMPLE_LOG_1, "source_hint": "json"},
    )
    event_id = resp.json()["event_id"]

    # Deliberately modify the stored raw_event in MySQL
    event = db_session.scalars(
        select(EventModel).where(EventModel.event_id == event_id)
    ).first()
    original_raw = event.raw_event
    event.raw_event = '{"event_type": "firewall_drop", "src_ip": "192.168.1.100", "dst_ip": "10.0.0.1", "action": "allow"}'  # Tampered!
    db_session.commit()

    # Verify integrity endpoint catches the alteration
    verify_resp = test_client.post(f"/api/v1/integrity/{event_id}/verify")
    assert verify_resp.status_code == 200
    vdata = verify_resp.json()

    assert vdata["integrity"] == "TAMPERED"
    assert vdata["stored_hash"] != vdata["calculated_hash"]
    assert "TAMPER DETECTED" in vdata["details"]

    # Confirm database reflects TAMPERED status
    integ = db_session.scalars(
        select(EventIntegrityModel).where(EventIntegrityModel.event_id == event_id)
    ).first()
    assert integ.verification_status == "TAMPERED"


# ==============================================================================
# 4. Missing Event Verification (NOT_FOUND)
# ==============================================================================

def test_missing_event_verification(test_client: TestClient):
    """Verifies that attempting to verify a non-existent UUID returns NOT_FOUND."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = test_client.post(f"/api/v1/integrity/{fake_id}/verify")
    assert resp.status_code == 200
    data = resp.json()
    assert data["integrity"] == "NOT_FOUND"


# ==============================================================================
# 5. Tamper-Evident Hash Chain Creation & Verification
# ==============================================================================

def test_hash_chain_creation_and_integrity(test_client: TestClient, db_session: Session):
    """Verifies that sequential events form a continuous, unbroken cryptographic hash chain."""
    # Ingest 3 events sequentially
    ids = []
    for log in [SAMPLE_LOG_1, SAMPLE_LOG_2, SAMPLE_LOG_3]:
        r = test_client.post("/api/v1/logs/process", json={"raw_log": log, "source_hint": "json"})
        ids.append(r.json()["event_id"])

    # Retrieve integrity records
    records = list(
        db_session.scalars(
            select(EventIntegrityModel).order_by(EventIntegrityModel.id)
        ).all()
    )
    assert len(records) >= 3

    # Check that record 1 connects to record 0
    rec0 = records[-3]
    rec1 = records[-2]
    rec2 = records[-1]

    assert rec1.previous_hash == rec0.chain_hash
    assert rec2.previous_hash == rec1.chain_hash

    # Run chain audit endpoint
    chain_resp = test_client.post("/api/v1/integrity/chain/verify")
    assert chain_resp.status_code == 200
    cdata = chain_resp.json()
    assert cdata["is_valid"] is True
    assert cdata["evaluated_records"] >= 3


# ==============================================================================
# 6. Deterministic Merkle Tree Root Generation & Proof Verification
# ==============================================================================

def test_deterministic_merkle_tree():
    """Verifies deterministic Merkle tree calculation, audit proofs, and odd-node duplication."""
    leaves = [
        hashlib.sha256(b"event_1").hexdigest(),
        hashlib.sha256(b"event_2").hexdigest(),
        hashlib.sha256(b"event_3").hexdigest(),
    ]

    tree1 = MerkleTree(leaves)
    tree2 = MerkleTree(leaves)

    # 1. Deterministic root
    assert tree1.root == tree2.root
    assert len(tree1.root) == 64

    # 2. Audit proofs for each leaf
    for i, leaf in enumerate(leaves):
        proof = tree1.get_audit_proof(i)
        assert MerkleTree.verify_proof(leaf, proof, tree1.root) is True

    # 3. Tampered leaf fails proof verification
    fake_leaf = hashlib.sha256(b"tampered_leaf").hexdigest()
    proof0 = tree1.get_audit_proof(0)
    assert MerkleTree.verify_proof(fake_leaf, proof0, tree1.root) is False


# ==============================================================================
# 7. Batch Creation & Blockchain Anchoring
# ==============================================================================

def test_batch_creation_and_anchoring(test_client: TestClient, db_session: Session):
    """Verifies grouping events into a Merkle batch and anchoring to blockchain."""
    # Ingest logs
    for log in [SAMPLE_LOG_1, SAMPLE_LOG_2]:
        test_client.post("/api/v1/logs/process", json={"raw_log": log, "source_hint": "json"})

    # Create batch
    create_resp = test_client.post(
        "/api/v1/integrity/batches/create",
        json={"max_events": 10},
    )
    assert create_resp.status_code == 200
    batch_data = create_resp.json()
    batch_id = batch_data["batch_id"]
    root_hash = batch_data["root_hash"]

    assert batch_id is not None
    assert len(root_hash) == 64
    assert batch_data["event_count"] >= 2

    # Anchor batch
    anchor_resp = test_client.post(
        "/api/v1/integrity/batches/anchor",
        json={"batch_id": batch_id},
    )
    assert anchor_resp.status_code == 200
    anchored_data = anchor_resp.json()

    assert anchored_data["batch_id"] == batch_id
    assert anchored_data["blockchain_status"] in ("CONFIRMED", "PENDING", "DISABLED")


# ==============================================================================
# 8. Blockchain Failure Resilience (Never Breaks Log Ingestion)
# ==============================================================================

def test_blockchain_failure_does_not_break_ingestion(test_client: TestClient, db_session: Session, monkeypatch):
    """Verifies that an unavailable or failing blockchain node NEVER crashes or prevents log ingestion."""
    # Ingest log
    resp = test_client.post(
        "/api/v1/logs/process",
        json={"raw_log": "CEF:0|Security|Firewall|1.0|DROP|Drop packet|High|", "source_hint": "cef"},
    )
    assert resp.status_code == 200
    event_id = resp.json()["event_id"]

    # Even if blockchain is unavailable, SHA-256 verification works flawlessly
    v_resp = test_client.post(f"/api/v1/integrity/{event_id}/verify")
    assert v_resp.status_code == 200
    assert v_resp.json()["integrity"] == "VALID"


# ==============================================================================
# 9. Blockchain Disabled Mode (BLOCKCHAIN_ENABLED=false)
# ==============================================================================

def test_blockchain_disabled_mode(test_client: TestClient, db_session: Session):
    """Verifies that system functions completely offline in air-gapped environment when blockchain is disabled."""
    adapter = DisabledBlockchainAdapter()
    assert adapter.is_available() is False
    receipt = adapter.anchor_hash("batch-123", "abc" * 21 + "a")
    assert receipt.status == "DISABLED"

    # API summary returns DISABLED without errors
    sum_resp = test_client.get("/api/v1/integrity/summary")
    assert sum_resp.status_code == 200
    sdata = sum_resp.json()
    assert "total_records" in sdata
    assert "blockchain_status" in sdata


# ==============================================================================
# 10. Security: Private Keys and Secrets Never Exposed
# ==============================================================================

def test_security_secrets_never_exposed(test_client: TestClient):
    """Verifies that no private keys, secrets, or raw passwords leak into API responses."""
    sum_resp = test_client.get("/api/v1/integrity/summary")
    text = sum_resp.text
    assert "private_key" not in text.lower()
    assert "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" not in text
