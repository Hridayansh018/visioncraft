"""Tests for Audio, VAD, Chunker, and Diarization (FR-004, FR-005, FR-008)."""

import math
from visioncraft.transcription.vad import VoiceActivityDetector
from visioncraft.transcription.chunker import AudioChunker
from visioncraft.diarization.speaker import SpeakerDiarizer


def test_vad_silence_vs_energy():
    vad = VoiceActivityDetector(sample_rate=16000)
    silence = [0.0] * 16000
    assert vad.is_speech(silence) is False

    # Synthesize sine wave audio (speech-like energy)
    sine = [0.5 * math.sin(2 * math.pi * 440 * (i / 16000)) for i in range(16000)]
    assert vad.is_speech(sine) is True


def test_audio_chunker():
    chunker = AudioChunker(sample_rate=16000, min_chunk_duration=1.0, max_chunk_duration=2.0)
    silence = [0.0] * 8000
    chunks = chunker.add_audio(silence)
    assert len(chunks) == 0

    # Add 2 seconds of audio to trigger max latency boundary
    audio_block = [0.0] * 32000
    chunks = chunker.add_audio(audio_block)
    assert len(chunks) >= 1


def test_speaker_diarizer():
    diarizer = SpeakerDiarizer()
    dummy_audio = [0.0] * 16000

    mic_speaker = diarizer.attribute_speaker(dummy_audio, source="microphone")
    assert mic_speaker == "speaker_00"

    sys_speaker = diarizer.attribute_speaker(dummy_audio, source="system")
    assert sys_speaker == "speaker_01"

    diarizer.set_speaker_label("speaker_00", "Alice (Security Lead)")
    assert diarizer.speaker_map["speaker_00"] == "Alice (Security Lead)"
