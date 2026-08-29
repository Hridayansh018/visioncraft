"""Tests for Cryptographic Audit & Hash Chain Integrity (FR-024, FR-025)."""

import re
from visioncraft.audit.hashing import compute_sha256, AuditHashChain
from visioncraft.types import RedactionEvent


def test_sha256_format():
    hash_val = compute_sha256("test_string")
    assert len(hash_val) == 64
    assert bool(re.match(r"^[a-f0-9]{64}$", hash_val))


def test_audit_hash_chain():
    chain = AuditHashChain(session_id="session-123")
    assert chain.verify_chain() is True

    event1 = RedactionEvent(
        id="evt-1",
        session_id="session-123",
        timestamp=100.0,
        rule_id="rule-aws-key",
        rule_name="AWS Key",
        category="api_keys",
        layer=1,
        confidence=0.99,
        severity="critical",
        safe_masked_context="context",
        status="pending_review",
        char_offset=10,
        integrity_hash=compute_sha256("evt1"),
    )
    chain.append_event(event1)
    assert chain.verify_chain() is True
    assert len(chain.chain_history) == 2

    event2 = RedactionEvent(
        id="evt-2",
        session_id="session-123",
        timestamp=105.0,
        rule_id="rule-email",
        rule_name="Email",
        category="pii",
        layer=1,
        confidence=0.95,
        severity="medium",
        safe_masked_context="context2",
        status="pending_review",
        char_offset=30,
        integrity_hash=compute_sha256("evt2"),
    )
    chain.append_event(event2)
    assert chain.verify_chain() is True
    assert len(chain.chain_history) == 3

    # Tampering test
    chain.chain_history[1]["payload"] = '{"tampered": true}'
    assert chain.verify_chain() is False
