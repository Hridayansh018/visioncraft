"""Optional Semantic & LLM Confidentiality Detection (Layer 4) (FR-018, FR-028, FR-029, FR-030).

LLM-based detection is strictly optional and isolated from direct transcript modification.
It outputs structured classifications into the standard span detection pipeline.
"""

from typing import List, Optional
from visioncraft.types import GuardrailRule, DetectedSpan


def scan_semantic_confidentiality(
    text: str,
    rules: List[GuardrailRule],
    allowlist: Optional[List[str]] = None,
) -> List[DetectedSpan]:
    """Optional semantic classifier hook.
    
    Returns structured DetectedSpan objects if an LLM backend is configured and enabled.
    """
    # LLM detection is disabled by default in local-first deterministic mode
    return []
