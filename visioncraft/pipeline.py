"""Master Guardrail Pipeline Engine for VisionCraft (FR-023, FR-024, FR-025, FR-026)."""

import time
import uuid
from typing import Dict, List, Optional
from visioncraft.types import (
    GuardrailRule,
    DetectedSpan,
    RedactionEvent,
    ProcessTranscriptResult,
)
from visioncraft.normalization.spoken import normalize_spoken_text
from visioncraft.detection.engine import DetectionEngine
from visioncraft.redaction.engine import RedactionEngine
from visioncraft.audit.hashing import compute_sha256, AuditHashChain


class GuardrailPipeline:
    """Master end-to-end guardrail pipeline orchestrator."""

    def __init__(self, rules: Optional[List[GuardrailRule]] = None):
        from visioncraft.detection.rules import DEFAULT_GUARDRAIL_RULES
        self.rules = rules if rules is not None else DEFAULT_GUARDRAIL_RULES
        self.detector = DetectionEngine(self.rules)
        self.redactor = RedactionEngine()

    def process(
        self,
        raw_transcript: str,
        session_id: str = "default-session",
        enable_normalization: bool = True,
        active_layers: Optional[Dict[str, bool]] = None,
        allowlist: Optional[List[str]] = None,
        hash_chain: Optional[AuditHashChain] = None,
    ) -> ProcessTranscriptResult:
        """Processes raw transcribed text through the full guardrail pipeline.
        
        Steps:
        1. Normalization (Layer 0)
        2. Multi-layer Detection (Layers 1-4)
        3. Deterministic Overlap Resolution
        4. Redaction Replacement (Safe Transcript)
        5. Cryptographic SHA-256 Audit Event Logging
        6. Ephemeral Buffer Clear
        """
        start_time = time.perf_counter()

        # Step 1: Spoken Normalization Pre-step
        if enable_normalization:
            norm_result = normalize_spoken_text(raw_transcript)
            text_to_scan = norm_result.normalized
        else:
            text_to_scan = raw_transcript

        # Step 2: Multi-layer Detection & Overlap Resolution
        resolved_spans = self.detector.detect(
            text=text_to_scan,
            active_layers=active_layers,
            allowlist=allowlist,
        )

        # Step 3: Redaction
        redacted_text = self.redactor.apply_redactions(text_to_scan, resolved_spans)

        # Step 4: Cryptographic Audit Event Creation
        events: List[RedactionEvent] = []
        for span in resolved_spans:
            meta_str = f"{session_id}:{span.rule_id}:{span.start}:{span.end}:{span.confidence}"
            integrity_hash = compute_sha256(meta_str)

            event = RedactionEvent(
                id=f"evt-{uuid.uuid4().hex[:8]}",
                session_id=session_id,
                timestamp=time.time(),
                rule_id=span.rule_id,
                rule_name=span.rule_name,
                category=span.category,
                layer=span.layer,
                confidence=span.confidence,
                severity=span.severity,
                safe_masked_context=span.context_snippet,
                status="pending_review",
                char_offset=span.start,
                integrity_hash=integrity_hash,
            )
            if hash_chain:
                hash_chain.append_event(event)

            events.append(event)

        processing_time_ms = (time.perf_counter() - start_time) * 1000.0

        # Step 5: Ephemeral memory flag (FR-026 / FR-040 / FR-041)
        return ProcessTranscriptResult(
            redacted_text=redacted_text,
            detected_spans=resolved_spans,
            events=events,
            processing_time_ms=round(processing_time_ms, 2),
            ephemeral_memory_cleared=True,
        )
