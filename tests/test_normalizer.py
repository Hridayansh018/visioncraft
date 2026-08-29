"""Tests for Spoken Text Normalizer (FR-009, FR-010, FR-011)."""

from visioncraft.normalization.spoken import normalize_spoken_text


def test_normalize_spoken_email():
    raw = "Send the document to john dot doe at gmail dot com as soon as possible"
    res = normalize_spoken_text(raw)
    assert "john.doe@gmail.com" in res.normalized


def test_normalize_spoken_digits():
    raw = "The verification passcode is two zero two six"
    res = normalize_spoken_text(raw)
    assert "2026" in res.normalized


def test_normalize_spoken_symbols():
    raw = "navigate to api slash v1 slash users colon 8080"
    res = normalize_spoken_text(raw)
    assert "api/v1/users:8080" in res.normalized


def test_normalize_spelled_out_letters():
    raw = "The key starts with capital A capital K capital I capital A"
    res = normalize_spoken_text(raw)
    assert "AKIA" in res.normalized


def test_strip_fillers():
    raw = "So um the deployment like went well"
    res = normalize_spoken_text(raw)
    assert "So the deployment went well" == res.normalized
