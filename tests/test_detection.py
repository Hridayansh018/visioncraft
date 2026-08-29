"""Tests for Detection Engine (FR-012, FR-013, FR-017, FR-020)."""

from visioncraft.detection.engine import DetectionEngine
from visioncraft.detection.rules import DEFAULT_GUARDRAIL_RULES


def test_detect_aws_key():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    text = "The bucket key is AKIAIOSFODNN7EXAMPLE for deploy"
    spans = detector.detect(text)
    assert len(spans) == 1
    assert spans[0].rule_id == "rule-aws-key"
    assert spans[0].category == "api_keys"


def test_detect_github_token():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    text = "Here is token ghp_111122223333444455556666777788889999 for repo"
    spans = detector.detect(text)
    assert len(spans) == 1
    assert spans[0].rule_id == "rule-github-token"


def test_detect_openai_token():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    text = "Use key sk-proj-9A8b7C6d5E4f3G2h1I0jK9L8M7N6O5P4Q3R2S1T0 for the model"
    spans = detector.detect(text)
    assert len(spans) == 1
    assert spans[0].rule_id == "rule-openai-key"


def test_detect_spoken_secret_cue():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    text = "My password is SuperSecretSummer2026! and do not share it"
    spans = detector.detect(text)
    assert len(spans) == 1
    assert spans[0].rule_id == "rule-spoken-password"
    assert spans[0].category == "spoken_cue"


def test_detect_credit_card_with_luhn():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    valid_text = "Card number 4532 0150 0000 0007 is charged"
    invalid_text = "Card number 4532 0150 0000 0009 is charged"

    valid_spans = detector.detect(valid_text)
    assert len(valid_spans) == 1
    assert valid_spans[0].rule_id == "rule-credit-card"

    invalid_spans = detector.detect(invalid_text)
    assert len(invalid_spans) == 0


def test_allowlist_filtering():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    text = "Here is token ghp_111122223333444455556666777788889999 for repo"
    spans = detector.detect(text, allowlist=["ghp_111122223333444455556666777788889999"])
    assert len(spans) == 0
