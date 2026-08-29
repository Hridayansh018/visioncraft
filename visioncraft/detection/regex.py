"""Deterministic Regex Detection Engine (Layer 1) for VisionCraft (FR-013, FR-014)."""

import re
import uuid
from typing import List, Optional
from visioncraft.types import GuardrailRule, DetectedSpan
from visioncraft.detection.luhn import passes_luhn_check


def format_masked_preview(matched_text: str) -> str:
    """Computes safe masked preview (e.g. 'AKI••••LE') without persisting full secret."""
    if len(matched_text) > 6:
        return f"{matched_text[:3]}••••{matched_text[-2:]}"
    return "••••••"


def format_redacted_replacement(rule: GuardrailRule, matched_text: str) -> str:
    """Generates the replacement token based on the rule's redaction style."""
    label = rule.custom_label or re.sub(r"[^A-Z0-9]", "_", rule.name.upper())

    if rule.redaction_style == "mask":
        return "••••••••"
    elif rule.redaction_style == "hash":
        import hashlib
        short_hash = hashlib.sha256(matched_text.encode("utf-8")).hexdigest()[:6]
        return f"[#SHA:{short_hash}]"
    elif rule.redaction_style == "category":
        return f"[{rule.category.upper()}:{label}]"
    else:  # label
        return f"[{label}]"


def create_safe_context(text: str, start: int, end: int, replacement: str, window: int = 24) -> str:
    """Creates a sanitized context snippet around the detected span."""
    prefix = text[max(0, start - window):start]
    suffix = text[end:min(len(text), end + window)]
    return f"...{prefix}{replacement}{suffix}..."


def scan_regex_rules(
    text: str,
    rules: List[GuardrailRule],
    allowlist: Optional[List[str]] = None,
) -> List[DetectedSpan]:
    """Scans text against all active Layer 1 regex rules."""
    allowlist = [a.lower() for a in (allowlist or [])]
    spans: List[DetectedSpan] = []

    for rule in rules:
        if not rule.enabled or rule.layer != 1 or not rule.pattern:
            continue

        try:
            for match in re.finditer(rule.pattern, text, re.IGNORECASE):
                matched_text = match.group(0)
                start, end = match.span()

                # Check Luhn algorithm for credit card rules
                if rule.id == "rule-credit-card" and not passes_luhn_check(matched_text):
                    continue

                # Check allowlist
                if any(allowed in matched_text.lower() for allowed in allowlist):
                    continue

                preview = format_masked_preview(matched_text)
                replacement = format_redacted_replacement(rule, matched_text)

                spans.append(
                    DetectedSpan(
                        id=f"span-{uuid.uuid4().hex[:8]}",
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        layer=1,
                        start=start,
                        end=end,
                        raw_text_preview_masked=preview,
                        masked_replacement=replacement,
                        confidence=rule.confidence_threshold,
                        severity=rule.severity,
                        context_snippet=create_safe_context(text, start, end, replacement),
                    )
                )
        except re.error:
            continue

    return spans
