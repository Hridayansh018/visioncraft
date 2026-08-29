"""Markdown (.md) export formatter for safe transcripts (FR-038)."""

from typing import List
from visioncraft.types import TranscriptSegment


def export_to_markdown(
    segments: List[TranscriptSegment],
    session_title: str = "Meeting Transcript",
    session_id: str = "",
) -> str:
    """Formats safe transcript segments as formatted Markdown."""
    total_detections = sum(len(seg.detections) for seg in segments)

    lines = [
        f"# {session_title}",
        "",
        f"> **Session ID:** `{session_id or 'N/A'}`  ",
        f"> **Integrity Guardrail:** Redacted Safe Transcript  ",
        f"> **Total Redacted Spans:** {total_detections}",
        "",
        "---",
        "",
        "## Transcript",
        "",
    ]

    for seg in segments:
        mins = int(seg.start // 60)
        secs = int(seg.start % 60)
        lines.append(f"**`[{mins:02d}:{secs:02d}]` {seg.speaker}** *({seg.source})*:")
        lines.append(f"> {seg.safe_text}")
        if seg.detections:
            cats = ", ".join(f"`{d.get('category', 'unknown')}`" for d in seg.detections)
            lines.append(f"*Redactions applied: {cats}*")
        lines.append("")

    return "\n".join(lines)
