"""Tests for Luhn Algorithm Checksum Validation (FR-014)."""

from visioncraft.detection.luhn import passes_luhn_check


def test_valid_credit_cards():
    # Valid Visa, MasterCard, Amex
    assert passes_luhn_check("4532 0150 0000 0007") is True
    assert passes_luhn_check("4532-0150-0000-0007") is True
    assert passes_luhn_check("4532015000000007") is True


def test_invalid_credit_cards():
    # Invalid check digits
    assert passes_luhn_check("4532 0150 0000 0009") is False
    assert passes_luhn_check("1234 5678 9012 3456") is False
    assert passes_luhn_check("12345") is False
