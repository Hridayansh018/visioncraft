"""Plain text (.txt) export formatter for safe transcripts (FR-038)."""

from typing import List
from visioncraft.types import TranscriptSegment


def export_to_txt(segments: List[TranscriptSegment], session_title: str = "Meeting Transcript") -> str:
    """Formats safe transcript segments as plain text."""
    lines = [
        f"=== {session_title} ===",
        "Confidential Data Protection: Enabled (Safe / Redacted Transcript)",
        "----------------------------------------------------------------",
        "",
    ]
    for seg in segments:
        mins = int(seg.start // 60)
        secs = int(seg.start % 60)
        lines.append(f"[{mins:02d}:{secs:02d}] {seg.speaker} ({seg.source}):")
        lines.append(f"  {seg.safe_text}")
        lines.append("")

    return "\n".join(lines)
