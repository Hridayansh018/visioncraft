"""Core data types and models for VisionCraft Guardrail Engine.

Complies with FR-012, FR-019, FR-020, FR-021, FR-022, FR-023, FR-025, and FR-035.
"""

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


RedactionStyle = Literal["label", "mask", "hash", "category"]
DetectorLayer = Literal[0, 1, 2, 3, 4]
RuleCategory = Literal["credentials", "api_keys", "pii", "financial", "spoken_cue", "custom"]
SeverityLevel = Literal["critical", "high", "medium", "low"]


class GuardrailRule(BaseModel):
    """Configuration model for detection rules (FR-012)."""
    id: str
    name: str
    category: RuleCategory
    description: str = ""
    layer: DetectorLayer = 1
    pattern: Optional[str] = None
    trigger_phrases: Optional[List[str]] = None
    enabled: bool = True
    confidence_threshold: float = Field(default=0.9, ge=0.0, le=1.0)
    redaction_style: RedactionStyle = "label"
    custom_label: Optional[str] = None
    built_in: bool = True
    severity: SeverityLevel = "high"


class DetectedSpan(BaseModel):
    """Detection span representation (FR-019)."""
    id: str
    rule_id: str
    rule_name: str
    category: RuleCategory
    layer: DetectorLayer
    start: int
    end: int
    raw_text_preview_masked: str
    masked_replacement: str
    confidence: float
    severity: SeverityLevel
    context_snippet: str = ""


class RedactionEvent(BaseModel):
    """Audit redaction event with cryptographic SHA-256 verification (FR-024, FR-025)."""
    id: str
    session_id: str
    timestamp: float
    rule_id: str
    rule_name: str
    category: RuleCategory
    layer: DetectorLayer
    confidence: float
    severity: SeverityLevel
    safe_masked_context: str
    status: Literal["pending_review", "confirmed_true_positive", "marked_false_positive", "allowlisted"] = "pending_review"
    char_offset: int
    integrity_hash: str


class TranscriptSegment(BaseModel):
    """Timestamped transcript segment model (FR-007, FR-008, Section 17)."""
    id: str
    start: float = 0.0
    end: float = 0.0
    speaker: str = "speaker_00"
    source: Literal["microphone", "system", "mixed", "file", "text"] = "microphone"
    safe_text: str
    detections: List[Dict[str, Any]] = Field(default_factory=list)


class ProcessTranscriptResult(BaseModel):
    """Result of processing transcript text through the guardrail pipeline."""
    redacted_text: str
    detected_spans: List[DetectedSpan]
    events: List[RedactionEvent]
    processing_time_ms: float
    ephemeral_memory_cleared: bool = True
