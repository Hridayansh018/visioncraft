"""Layer 3 Spoken Secret Proximity Detection for VisionCraft (FR-017).

Detects spoken introductory cues (e.g., "my password is...", "the secret key is...")
and identifies the sensitive token window immediately following the cue.
"""

import re
import uuid
from typing import List, Optional
from visioncraft.types import GuardrailRule, DetectedSpan
from visioncraft.detection.regex import format_masked_preview, format_redacted_replacement, create_safe_context


def scan_spoken_cues(
    text: str,
    rules: List[GuardrailRule],
    allowlist: Optional[List[str]] = None,
) -> List[DetectedSpan]:
    """Scans text for spoken secret trigger phrases and redacts following token window."""
    allowlist = [a.lower() for a in (allowlist or [])]
    spans: List[DetectedSpan] = []

    for rule in rules:
        if not rule.enabled or rule.layer != 3 or not rule.trigger_phrases:
            continue

        for phrase in rule.trigger_phrases:
            clean_phrase = phrase.strip().rstrip(":=-, ")
            if not clean_phrase:
                continue
            pattern = rf"\b{re.escape(clean_phrase)}\b\s*[:=,-]?\s*(?:is|are|was|were|equals|to|be|:|=|-|->)?\s*([A-Za-z0-9!@#$%^&*_\-+=\[\]{{}}~`'\"]+)"
            try:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    secret_token = match.group(1)
                    # Start/end of the secret token itself (excluding the lead-in trigger phrase)
                    full_start = match.start()
                    secret_start = match.start(1)
                    secret_end = match.end(1)

                    # For codename rules (like "Project Titan"), match the whole phrase if it includes the name
                    if rule.id == "rule-confidential-mna":
                        target_text = match.group(0)
                        start_idx = full_start
                        end_idx = match.end(0)
                    else:
                        target_text = secret_token
                        start_idx = secret_start
                        end_idx = secret_end

                    # Check allowlist
                    if any(allowed in target_text.lower() for allowed in allowlist):
                        continue

                    # Filter trivial conversational stop words if accidentally matched
                    STOP_WORDS = {
                        "a", "an", "the", "that", "this", "it", "to", "for", "in", "on", 
                        "at", "by", "with", "from", "and", "or", "but", "is", "are", 
                        "was", "were", "my", "your", "his", "her", "our", "their", 
                        "not", "today", "tomorrow", "yesterday", "here", "there", "good", "great"
                    }
                    if target_text.lower() in STOP_WORDS or len(target_text.strip()) <= 1:
                        continue

                    preview = format_masked_preview(target_text)
                    replacement = format_redacted_replacement(rule, target_text)

                    spans.append(
                        DetectedSpan(
                            id=f"span-{uuid.uuid4().hex[:8]}",
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            layer=3,
                            start=start_idx,
                            end=end_idx,
                            raw_text_preview_masked=preview,
                            masked_replacement=replacement,
                            confidence=rule.confidence_threshold,
                            severity=rule.severity,
                            context_snippet=create_safe_context(text, start_idx, end_idx, replacement),
                        )
                    )
            except re.error:
                continue

    return spans
