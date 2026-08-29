"""Mod-10 Luhn Checksum Algorithm for Financial Card Validation (FR-014)."""

import re


def passes_luhn_check(card_str: str) -> bool:
    """Validates whether a numeric string passes the Mod-10 Luhn checksum algorithm.
    
    Filters out false-positive numerical digit sequences that match credit card length
    patterns but fail mathematical checksum validation.
    """
    clean = re.sub(r"[\s-]", "", card_str)
    if not re.match(r"^\d{13,19}$", clean):
        return False

    total_sum = 0
    should_double = False

    for char in reversed(clean):
        digit = int(char)
        if should_double:
            digit *= 2
            if digit > 9:
                digit -= 9
        total_sum += digit
        should_double = not should_double

    return total_sum % 10 == 0
