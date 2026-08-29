"""Redaction Engine for Generating Safe Transcripts (FR-021, FR-022, FR-023)."""

from typing import List, Tuple
from visioncraft.types import DetectedSpan


class RedactionEngine:
    """Applies detection span replacements to construct sanitized safe transcripts."""

    @staticmethod
    def apply_redactions(text: str, spans: List[DetectedSpan]) -> str:
        """Replaces sensitive detected spans with safe placeholder labels or masks.
        
        Examples:
            "My key is AKIA..." -> "My key is [AWS_ACCESS_KEY]"
            "Card 4532..." -> "Card [FINANCIAL:CREDIT_CARD]"
        """
        if not spans:
            return text

        # Sort spans by start index
        sorted_spans = sorted(spans, key=lambda s: s.start)

        safe_parts = []
        cursor = 0

        for span in sorted_spans:
            # Append non-sensitive text before this span
            safe_parts.append(text[cursor:span.start])
            # Append safe masked replacement
            safe_parts.append(span.masked_replacement)
            cursor = span.end

        # Append remaining text after the last span
        safe_parts.append(text[cursor:])

        return "".join(safe_parts)
