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


def test_detect_short_form_spoken_cues():
    detector = DetectionEngine(DEFAULT_GUARDRAIL_RULES)
    
    # "the pass is" / "the pass"
    spans1 = detector.detect("The pass is AlphaDelta999! for root access")
    assert len(spans1) == 1
    assert spans1[0].rule_id == "rule-spoken-password"
    
    # "pass: ..."
    spans2 = detector.detect("Production pass: Secr3tP@ssw0rd please login")
    assert len(spans2) == 1
    assert spans2[0].rule_id == "rule-spoken-password"

    # "the creds are" / "creds:"
    spans3 = detector.detect("The creds are admin/MasterPass2026")
    assert len(spans3) == 1
    assert spans3[0].rule_id == "rule-spoken-password"

    # "the pw is" / "pwd is"
    spans4 = detector.detect("The pw is TopSecretPwd123")
    assert len(spans4) == 1
    assert spans4[0].rule_id == "rule-spoken-password"

    # "conn str is"
    spans5 = detector.detect("The conn str is postgres://admin:pass123@prod-db:5432/main")
    assert len(spans5) >= 1

