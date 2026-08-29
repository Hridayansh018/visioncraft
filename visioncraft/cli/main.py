"""Command-Line Interface (CLI) for VisionCraft (FR-031, FR-032)."""

import argparse
import sys
import os
import json
import time
from typing import List

from visioncraft.pipeline import GuardrailPipeline
from visioncraft.types import TranscriptSegment
from visioncraft.export.txt import export_to_txt
from visioncraft.export.markdown import export_to_markdown
from visioncraft.export.json import export_to_json


def scan_cmd(args: argparse.Namespace) -> None:
    """Scans text or file for confidential data and produces safe transcript."""
    if not os.path.exists(args.file):
        print(f"Error: File '{args.file}' not found.", file=sys.stderr)
        sys.exit(1)

    with open(args.file, "r", encoding="utf-8") as f:
        content = f.read()

    pipeline = GuardrailPipeline()
    result = pipeline.process(content, session_id="cli-scan")

    print(f"Scanned {len(content)} characters in {result.processing_time_ms}ms")
    print(f"Detections found: {len(result.detected_spans)}")
    for span in result.detected_spans:
        print(f"  • [{span.category.upper()}] {span.rule_name} ({span.severity}) -> {span.masked_replacement}")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(result.redacted_text)
        print(f"Safe redacted transcript saved to: {args.out}")
    else:
        print("\n--- Safe Transcript Output ---")
        print(result.redacted_text)


def transcribe_cmd(args: argparse.Namespace) -> None:
    """Transcribes an audio file and processes it through the guardrail pipeline."""
    if not os.path.exists(args.audio_file):
        print(f"Error: Audio file '{args.audio_file}' not found.", file=sys.stderr)
        sys.exit(1)

    from visioncraft.transcription.whisper import WhisperASR

    print(f"Loading Whisper ({args.model})...")
    asr = WhisperASR(model_size=args.model)
    raw_segments = asr.transcribe_file(args.audio_file, language=args.language)

    pipeline = GuardrailPipeline()
    safe_segments: List[TranscriptSegment] = []

    for i, seg in enumerate(raw_segments):
        res = pipeline.process(seg["text"], session_id="cli-transcribe")
        safe_segments.append(
            TranscriptSegment(
                id=f"seg_{i:03d}",
                start=seg["start"],
                end=seg["end"],
                speaker="speaker_00",
                source="file",
                safe_text=res.redacted_text,
                detections=[d.model_dump() for d in res.detected_spans],
            )
        )

    # Format output
    if args.format == "markdown" or args.format == "md":
        output = export_to_markdown(safe_segments, session_title=os.path.basename(args.audio_file))
    elif args.format == "json":
        output = export_to_json(safe_segments, {"session_id": "cli-transcribe", "title": args.audio_file})
    else:
        output = export_to_txt(safe_segments, session_title=os.path.basename(args.audio_file))

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Output exported to {args.out}")
    else:
        print(output)


def serve_cmd(args: argparse.Namespace) -> None:
    """Starts the FastAPI WebSocket and REST server."""
    try:
        import uvicorn
        from server.main import app
        print(f"Starting VisionCraft FastAPI server on {args.host}:{args.port}...")
        uvicorn.run(app, host=args.host, port=args.port)
    except ImportError:
        print("Error: uvicorn and fastapi must be installed to run the server. Run `pip install fastapi uvicorn websockets`.", file=sys.stderr)
        sys.exit(1)


def record_cmd(args: argparse.Namespace) -> None:
    """Records live meeting audio from microphone and/or system audio, transcribes, and redacts in real time."""
    from visioncraft.audio.microphone import MicrophoneAudioCapture
    from visioncraft.audio.windows import WindowsWASAPILoopbackCapture, DualAudioCapture
    from visioncraft.transcription.chunker import AudioChunker
    from visioncraft.transcription.whisper import WhisperASR
    from visioncraft.diarization.speaker import SpeakerDiarizer
    from visioncraft.audit.hashing import AuditHashChain

    print("\n========================================================")
    print(" 🎙️  VisionCraft Live Meeting Guardrail Active")
    print("========================================================")
    print(f" • Audio Source: {'Dual (Mic + System)' if (args.mic and args.system) or not (args.mic or args.system) else ('Mic Only' if args.mic else 'System Only')}")
    print(f" • Whisper Model: {args.model}")
    print(f" • Output File: {args.out or 'live_meeting.md'}")
    print(" • Press Ctrl+C at any time to stop and save the safe transcript.\n")

    asr = WhisperASR(model_size=args.model)
    pipeline = GuardrailPipeline()
    chunker = AudioChunker(sample_rate=16000, min_chunk_duration=2.0, max_chunk_duration=4.0)
    diarizer = SpeakerDiarizer()
    chain = AuditHashChain(session_id="live-meeting")

    # Select capture source
    if args.mic and not args.system:
        capture = MicrophoneAudioCapture(sample_rate=16000)
    elif args.system and not args.mic:
        capture = WindowsWASAPILoopbackCapture(sample_rate=16000)
    else:
        capture = DualAudioCapture(sample_rate=16000)

    capture.start()
    segments: List[TranscriptSegment] = []
    session_start = time.time()

    try:
        while True:
            # Read 1-second audio chunk
            if isinstance(capture, DualAudioCapture):
                mic_c, sys_c = capture.read_dual_chunk(chunk_duration_sec=1.0)
                ready_chunks = chunker.add_audio(mic_c)
                source_label = "microphone"
            else:
                raw_c = capture.read_chunk(chunk_duration_sec=1.0)
                ready_chunks = chunker.add_audio(raw_c) if raw_c is not None else []
                source_label = "system" if args.system else "microphone"

            for audio_block in ready_chunks:
                # Transcribe with Whisper
                asr_results = asr.transcribe_chunk(audio_block, language=args.language)
                for seg in asr_results:
                    raw_text = seg.get("text", "").strip()
                    if not raw_text:
                        continue

                    # Process through Guardrail
                    guardrail_res = pipeline.process(raw_text, session_id="live-meeting", hash_chain=chain)
                    speaker_id = diarizer.attribute_speaker(audio_block, source=source_label)

                    t_offset = round(time.time() - session_start, 1)
                    segment = TranscriptSegment(
                        id=f"seg_{len(segments):03d}",
                        start=t_offset,
                        end=t_offset + 3.0,
                        speaker=speaker_id,
                        source=source_label,
                        safe_text=guardrail_res.redacted_text,
                        detections=[d.model_dump() for d in guardrail_res.detected_spans],
                    )
                    segments.append(segment)

                    # Display real-time safe transcript
                    detected_tags = f" 🔒 [{len(guardrail_res.detected_spans)} redacted]" if guardrail_res.detected_spans else ""
                    print(f"[{time.strftime('%H:%M:%S')}] {speaker_id}: {guardrail_res.redacted_text}{detected_tags}")

    except KeyboardInterrupt:
        print("\n\n⏹️ Stopping meeting recording...")
    finally:
        capture.stop()
        out_path = args.out or "live_meeting.md"
        if out_path.endswith(".json") or args.format == "json":
            out_content = export_to_json(segments, {"session_id": "live-meeting", "title": "Live Meeting Transcript"})
        elif out_path.endswith(".txt") or args.format == "txt":
            out_content = export_to_txt(segments, session_title="Live Meeting Transcript")
        else:
            out_content = export_to_markdown(segments, session_title="Live Meeting Transcript", session_id="live-meeting")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(out_content)

        print(f"✅ Safe transcript successfully saved to: {os.path.abspath(out_path)}")
        print(f"🛡️ Cryptographic SHA-256 Audit Chain Verified: {chain.verify_chain()}\n")


def main() -> None:
    parser = argparse.ArgumentParser(prog="visioncraft", description="VisionCraft Guardrail CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # record (Live Meeting Capture)
    record_p = subparsers.add_parser("record", help="Record and guardrail a live meeting in real time")
    record_p.add_argument("--mic", action="store_true", help="Capture microphone audio")
    record_p.add_argument("--system", action="store_true", help="Capture system/meeting audio (WASAPI Loopback)")
    record_p.add_argument("--model", default="base", help="Whisper model size (tiny, base, small, medium)")
    record_p.add_argument("--language", default="en", help="Language code (default: en)")
    record_p.add_argument("--format", default="md", choices=["txt", "md", "markdown", "json"], help="Export format")
    record_p.add_argument("--out", "-o", help="Path to save safe transcript (default: live_meeting.md)")
    record_p.set_defaults(func=record_cmd)

    # scan
    scan_p = subparsers.add_parser("scan", help="Scan a transcript file for confidential data")
    scan_p.add_argument("file", help="Path to transcript file")
    scan_p.add_argument("--out", "-o", help="Path to save safe transcript")
    scan_p.set_defaults(func=scan_cmd)

    # transcribe
    trans_p = subparsers.add_parser("transcribe", help="Transcribe audio file locally with Whisper and guardrail")
    trans_p.add_argument("audio_file", help="Path to WAV/MP3 audio file")
    trans_p.add_argument("--model", default="base", help="Whisper model size (tiny, base, small, medium, large-v3)")
    trans_p.add_argument("--language", default="en", help="Language code (default: en)")
    trans_p.add_argument("--format", default="txt", choices=["txt", "md", "markdown", "json"], help="Export format")
    trans_p.add_argument("--out", "-o", help="Path to save output")
    trans_p.set_defaults(func=transcribe_cmd)

    # serve
    serve_p = subparsers.add_parser("serve", help="Run the FastAPI local server")
    serve_p.add_argument("--host", default="127.0.0.1", help="Host address")
    serve_p.add_argument("--port", type=int, default=8000, help="Port number")
    serve_p.set_defaults(func=serve_cmd)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
