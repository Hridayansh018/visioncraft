"""Voice Activity Detection (VAD) Layer (FR-005).

Detects speech boundaries and filters out silence before invoking local Whisper ASR.
"""

import math
from typing import List, Any, Sequence

try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None


class VoiceActivityDetector:
    """Voice Activity Detector independent of ASR implementation."""

    def __init__(self, sample_rate: int = 16000, aggressiveness: int = 2):
        self.sample_rate = sample_rate
        self.aggressiveness = aggressiveness
        self._vad = None
        try:
            # pyrefly: ignore [missing-import]
            import webrtcvad
            self._vad = webrtcvad.Vad(aggressiveness)
        except ImportError:
            self._vad = None

    def is_speech(self, audio_chunk: Any, energy_threshold: float = 0.01) -> bool:
        """Determines if the given audio chunk contains speech activity."""
        if audio_chunk is None or len(audio_chunk) == 0:
            return False

        # If webrtcvad is available, use frame-level classification (10, 20, or 30ms frames)
        if self._vad is not None and self.sample_rate in (8000, 16000, 32000, 48000) and np is not None:
            try:
                # Convert float32 [-1.0, 1.0] to int16 bytes
                int16_audio = (np.clip(audio_chunk, -1.0, 1.0) * 32767).astype(np.int16)
                frame_len = int(self.sample_rate * 0.03)  # 30ms frame
                num_frames = len(int16_audio) // frame_len

                if num_frames == 0:
                    return self._energy_is_speech(audio_chunk, energy_threshold)

                speech_frames = 0
                for i in range(num_frames):
                    frame_bytes = int16_audio[i * frame_len : (i + 1) * frame_len].tobytes()
                    if self._vad.is_speech(frame_bytes, self.sample_rate):
                        speech_frames += 1

                # If at least 30% of frames are speech, classify chunk as speech
                return (speech_frames / num_frames) >= 0.3
            except Exception:
                pass

        return self._energy_is_speech(audio_chunk, energy_threshold)

    @staticmethod
    def _energy_is_speech(audio_chunk: Any, threshold: float) -> bool:
        """Root Mean Square (RMS) energy threshold fallback."""
        if np is not None and isinstance(audio_chunk, np.ndarray):
            rms = float(np.sqrt(np.mean(np.square(audio_chunk))))
        else:
            total = sum(float(x) * float(x) for x in audio_chunk)
            rms = math.sqrt(total / len(audio_chunk)) if len(audio_chunk) > 0 else 0.0
        return rms > threshold
