"""JSON (.json) export formatter for safe transcripts (FR-038, Section 17)."""

import json
from typing import List, Dict, Any
from visioncraft.types import TranscriptSegment


def export_to_json(
    segments: List[TranscriptSegment],
    session_metadata: Dict[str, Any],
) -> str:
    """Exports safe transcript segments and session metadata as structured JSON (Section 17)."""
    payload = {
        "session_id": session_metadata.get("session_id", ""),
        "title": session_metadata.get("title", "Meeting Transcript"),
        "created_at": session_metadata.get("created_at", ""),
        "total_segments": len(segments),
        "segments": [seg.model_dump() for seg in segments],
    }
    return json.dumps(payload, indent=2)
