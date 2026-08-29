"""Integration Tests for VisionCraft Master Pipeline (FR-044)."""

from visioncraft.pipeline import GuardrailPipeline
from visioncraft.audit.hashing import AuditHashChain
from visioncraft.export.txt import export_to_txt
from visioncraft.export.markdown import export_to_markdown
from visioncraft.export.json import export_to_json
from visioncraft.types import TranscriptSegment


def test_pipeline_end_to_end_aws_key():
    pipeline = GuardrailPipeline()
    chain = AuditHashChain(session_id="session-pipeline-1")

    raw_speech = "Please check bucket with capital A capital K capital I capital A I O S F O D N N 7 E X A M P L E before deploying"
    result = pipeline.process(raw_speech, session_id="session-pipeline-1", hash_chain=chain)

    assert "[AWS_ACCESS_KEY]" in result.redacted_text
    assert len(result.detected_spans) == 1
    assert len(result.events) == 1
    assert len(result.events[0].integrity_hash) == 64
    assert chain.verify_chain() is True
    assert result.ephemeral_memory_cleared is True


def test_pipeline_end_to_end_credit_card():
    pipeline = GuardrailPipeline()
    raw_speech = "The card number is four five three two zero one five zero zero zero zero zero zero zero zero seven for payment"
    result = pipeline.process(raw_speech, session_id="session-pipeline-2")

    assert "[FINANCIAL:CREDIT_CARD]" in result.redacted_text or "CREDIT_CARD" in result.redacted_text
    assert len(result.detected_spans) == 1


def test_pipeline_export_formats():
    pipeline = GuardrailPipeline()
    raw = "Contact john dot doe at enterprise dot com with key AKIAIOSFODNN7EXAMPLE"
    result = pipeline.process(raw, session_id="export-session")

    segment = TranscriptSegment(
        id="seg-1",
        start=0.0,
        end=4.5,
        speaker="speaker_00",
        source="microphone",
        safe_text=result.redacted_text,
        detections=[s.model_dump() for s in result.detected_spans],
    )

    txt = export_to_txt([segment], session_title="Security Incident Sync")
    assert "[00:00] speaker_00" in txt
    assert "[EMAIL]" in txt

    md = export_to_markdown([segment], session_title="Security Incident Sync", session_id="export-session")
    assert "# Security Incident Sync" in md
    assert "[EMAIL]" in md

    js = export_to_json([segment], {"session_id": "export-session", "title": "Security Incident Sync"})
    assert '"session_id": "export-session"' in js
    assert "john.doe@enterprise.com" not in js
