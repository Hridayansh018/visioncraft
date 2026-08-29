"""Unified Detection Engine & Deterministic Span Resolution (FR-019, FR-020)."""

from typing import List, Optional, Dict
from visioncraft.types import GuardrailRule, DetectedSpan
from visioncraft.detection.regex import scan_regex_rules
from visioncraft.detection.spoken_cues import scan_spoken_cues
from visioncraft.detection.presidio import scan_presidio_pii
from visioncraft.detection.semantic import scan_semantic_confidentiality

SEVERITY_WEIGHTS = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


def resolve_overlapping_spans(spans: List[DetectedSpan]) -> List[DetectedSpan]:
    """Resolves overlapping detections deterministically (FR-020).
    
    Sorting criteria:
    1. Start position ascending
    2. Severity weight descending (critical > high > medium > low)
    3. Confidence descending
    4. Span length descending
    """
    if len(spans) <= 1:
        return spans

    sorted_spans = sorted(
        spans,
        key=lambda s: (
            s.start,
            -SEVERITY_WEIGHTS.get(s.severity, 0),
            -s.confidence,
            -(s.end - s.start),
        ),
    )

    resolved: List[DetectedSpan] = []
    last_end = -1

    for span in sorted_spans:
        if span.start >= last_end:
            resolved.append(span)
            last_end = span.end
        else:
            prev = resolved[-1]
            # Replace previous if current has higher severity or higher confidence at identical severity
            prev_sev = SEVERITY_WEIGHTS.get(prev.severity, 0)
            curr_sev = SEVERITY_WEIGHTS.get(span.severity, 0)
            if curr_sev > prev_sev or (curr_sev == prev_sev and span.confidence > prev.confidence):
                resolved[-1] = span
                last_end = span.end

    return resolved


class DetectionEngine:
    """Unified Guardrail Detection Engine orchestrating multi-layer scanning."""

    def __init__(self, rules: Optional[List[GuardrailRule]] = None):
        from visioncraft.detection.rules import DEFAULT_GUARDRAIL_RULES
        self.rules = rules if rules is not None else DEFAULT_GUARDRAIL_RULES

    def detect(
        self,
        text: str,
        active_layers: Optional[Dict[str, bool]] = None,
        allowlist: Optional[List[str]] = None,
    ) -> List[DetectedSpan]:
        """Runs all enabled layers and returns resolved, non-overlapping spans."""
        layers = active_layers or {"layer1": True, "layer2": True, "layer3": True, "layer4": False}
        all_spans: List[DetectedSpan] = []

        # Layer 1: Deterministic Regex & Luhn
        if layers.get("layer1", True):
            all_spans.extend(scan_regex_rules(text, self.rules, allowlist))

        # Layer 2: PII (Presidio / spaCy)
        if layers.get("layer2", True):
            all_spans.extend(scan_presidio_pii(text, self.rules, allowlist))

        # Layer 3: Spoken Cues
        if layers.get("layer3", True):
            all_spans.extend(scan_spoken_cues(text, self.rules, allowlist))

        # Layer 4: Semantic Classifier (Optional)
        if layers.get("layer4", False):
            all_spans.extend(scan_semantic_confidentiality(text, self.rules, allowlist))

        return resolve_overlapping_spans(all_spans)
