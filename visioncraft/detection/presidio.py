"""Microsoft Presidio & spaCy PII Analyzer Integration (Layer 2) (FR-015, NFR-004).

Provides PII entity recognition with graceful heuristic fallback if presidio-analyzer
is not installed in the lightweight core environment.
"""

import uuid
import re
from typing import List, Optional
from visioncraft.types import GuardrailRule, DetectedSpan
from visioncraft.detection.regex import format_masked_preview, format_redacted_replacement, create_safe_context

# Common names for heuristic fallback when Presidio is not loaded
HEURISTIC_NAMES = {
    "alice", "bob", "charlie", "david", "emma", "frank", "grace", "hridayansh",
    "john", "jane", "sarah", "michael", "robert", "jessica", "william",
    "alexander", "emily", "daniel", "sophia", "matthew", "olivia", "james",
    "elizabeth", "lucas", "mia", "benjamin", "ava", "henry", "charlotte",
    "sundar", "satya", "sam", "elon", "tim", "mark", "jensen",
}


def scan_presidio_pii(
    text: str,
    rules: List[GuardrailRule],
    allowlist: Optional[List[str]] = None,
) -> List[DetectedSpan]:
    """Scans text for PII entities using Presidio if available, falling back to heuristics."""
    allowlist = [a.lower() for a in (allowlist or [])]
    spans: List[DetectedSpan] = []

    person_rule = next((r for r in rules if r.id == "rule-ner-person" and r.enabled), None)
    if not person_rule:
        return spans

    try:
        # Attempt to import presidio_analyzer if installed
        # pyrefly: ignore [missing-import]
        from presidio_analyzer import AnalyzerEngine
        analyzer = AnalyzerEngine()
        results = analyzer.analyze(text=text, language="en", entities=["PERSON"])
        for result in results:
            entity_text = text[result.start:result.end]
            if any(allowed in entity_text.lower() for allowed in allowlist):
                continue

            preview = format_masked_preview(entity_text)
            replacement = format_redacted_replacement(person_rule, entity_text)

            spans.append(
                DetectedSpan(
                    id=f"span-{uuid.uuid4().hex[:8]}",
                    rule_id=person_rule.id,
                    rule_name=person_rule.name,
                    category=person_rule.category,
                    layer=2,
                    start=result.start,
                    end=result.end,
                    raw_text_preview_masked=preview,
                    masked_replacement=replacement,
                    confidence=result.score,
                    severity=person_rule.severity,
                    context_snippet=create_safe_context(text, result.start, result.end, replacement),
                )
            )
        return spans
    except ImportError:
        # Fallback to conversational heuristic scanning
        words = re.split(r"(\s+)", text)
        running_idx = 0
        word_list = [w for w in words if w.strip()]

        for i, word in enumerate(word_list):
            clean_word = re.sub(r"[.,!?;:]", "", word)
            clean_lower = clean_word.lower()
            word_offset = text.find(clean_word, running_idx)
            if word_offset >= 0:
                running_idx = word_offset + len(clean_word)

            prev_word = word_list[i - 1].lower() if i > 0 else ""
            is_name_cue = prev_word in {"with", "from", "called", "contact", "assignee", "manager", "lead", "speaking"}
            is_known_name = clean_lower in HEURISTIC_NAMES

            if (is_name_cue or is_known_name) and len(clean_word) >= 3 and clean_word[0].isupper():
                if any(allowed in clean_word.lower() for allowed in allowlist):
                    continue

                preview = format_masked_preview(clean_word)
                replacement = format_redacted_replacement(person_rule, clean_word)

                spans.append(
                    DetectedSpan(
                        id=f"span-{uuid.uuid4().hex[:8]}",
                        rule_id=person_rule.id,
                        rule_name=person_rule.name,
                        category=person_rule.category,
                        layer=2,
                        start=word_offset,
                        end=word_offset + len(clean_word),
                        raw_text_preview_masked=preview,
                        masked_replacement=replacement,
                        confidence=person_rule.confidence_threshold,
                        severity=person_rule.severity,
                        context_snippet=create_safe_context(text, word_offset, word_offset + len(clean_word), replacement),
                    )
                )

    return spans
