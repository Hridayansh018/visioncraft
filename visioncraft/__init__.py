"""VisionCraft: Local-First Meeting Transcription & Confidential-Information Guardrail Engine."""

from visioncraft.pipeline import GuardrailPipeline
from visioncraft.types import (
    GuardrailRule,
    DetectedSpan,
    RedactionEvent,
    TranscriptSegment,
    ProcessTranscriptResult,
)
from visioncraft.detection.rules import DEFAULT_GUARDRAIL_RULES

__version__ = "0.1.0"

__all__ = [
    "GuardrailPipeline",
    "GuardrailRule",
    "DetectedSpan",
    "RedactionEvent",
    "TranscriptSegment",
    "ProcessTranscriptResult",
    "DEFAULT_GUARDRAIL_RULES",
]
