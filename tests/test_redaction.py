"""Tests for Redaction Engine (FR-021, FR-022)."""

from visioncraft.detection.engine import DetectionEngine
from visioncraft.redaction.engine import RedactionEngine
from visioncraft.detection.rules import DEFAULT_GUARDRAIL_RULES


def test_apply_redactions_label():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    redactor = RedactionEngine()

    text = "The bucket key is AKIAIOSFODNN7EXAMPLE for deploy"
    spans = detector.detect(text)
    redacted = redactor.apply_redactions(text, spans)

    assert "[AWS_ACCESS_KEY]" in redacted
    assert "AKIAIOSFODNN7EXAMPLE" not in redacted


def test_apply_redactions_multiple():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    redactor = RedactionEngine()

    text = "Email john.doe@gmail.com with key AKIAIOSFODNN7EXAMPLE today"
    spans = detector.detect(text)
    redacted = redactor.apply_redactions(text, spans)

    assert "[EMAIL]" in redacted
    assert "[AWS_ACCESS_KEY]" in redacted
    assert "john.doe@gmail.com" not in redacted
    assert "AKIAIOSFODNN7EXAMPLE" not in redacted
