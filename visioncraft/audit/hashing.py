"""Cryptographic SHA-256 Integrity Hashing & Audit Hash Chain (FR-024, FR-025)."""

import hashlib
import json
from typing import Any, Dict, List, Optional
from visioncraft.types import RedactionEvent


def compute_sha256(data: str) -> str:
    """Computes standard FIPS 180-4 SHA-256 cryptographic hash (FR-024)."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


class AuditHashChain:
    """Deterministic verifiable cryptographic audit hash chain (FR-025).
    
    H0 = SHA256(genesis)
    H1 = SHA256(H0 + event1)
    H2 = SHA256(H1 + event2)
    """

    def __init__(self, session_id: str, genesis_seed: Optional[str] = None):
        self.session_id = session_id
        genesis_str = genesis_seed or f"VISIONCRAFT_GENESIS_SESSION_{session_id}"
        self.current_hash = compute_sha256(genesis_str)
        self.chain_history: List[Dict[str, Any]] = [
            {
                "index": 0,
                "event_type": "GENESIS",
                "previous_hash": "0" * 64,
                "current_hash": self.current_hash,
            }
        ]

    def append_event(self, event: RedactionEvent) -> str:
        """Appends an event to the chain and returns the new block hash."""
        payload = json.dumps(
            {
                "id": event.id,
                "session_id": event.session_id,
                "rule_id": event.rule_id,
                "timestamp": event.timestamp,
                "char_offset": event.char_offset,
                "category": event.category,
                "confidence": event.confidence,
            },
            sort_keys=True,
        )
        prev_hash = self.current_hash
        block_data = f"{prev_hash}{payload}"
        self.current_hash = compute_sha256(block_data)

        self.chain_history.append(
            {
                "index": len(self.chain_history),
                "event_type": "REDACTION",
                "event_id": event.id,
                "previous_hash": prev_hash,
                "current_hash": self.current_hash,
                "payload": payload,
            }
        )
        return self.current_hash

    def verify_chain(self) -> bool:
        """Verifies integrity of all links in the cryptographic hash chain."""
        if not self.chain_history:
            return False

        for i in range(1, len(self.chain_history)):
            prev_block = self.chain_history[i - 1]
            curr_block = self.chain_history[i]

            if curr_block["previous_hash"] != prev_block["current_hash"]:
                return False

            expected_hash = compute_sha256(f"{curr_block['previous_hash']}{curr_block['payload']}")
            if curr_block["current_hash"] != expected_hash:
                return False

        return True
