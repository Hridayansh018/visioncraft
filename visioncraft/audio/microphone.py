"""Microphone Audio Capture Implementation (FR-001)."""

import time
from typing import Generator, Optional, Any, List

try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None

from visioncraft.audio.base import BaseAudioCapture


class MicrophoneAudioCapture(BaseAudioCapture):
    """Captures microphone audio locally on Windows and other OS platforms."""

    def __init__(self, sample_rate: int = 16000, channels: int = 1, device_index: Optional[int] = None):
        super().__init__(sample_rate, channels)
        self.device_index = device_index
        self._stream = None

    def start(self) -> None:
        self.is_recording = True
        try:
            # pyrefly: ignore [missing-import]
            import sounddevice as sd
            self._stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype="float32",
                device=self.device_index,
            )
            self._stream.start()
        except (ImportError, Exception):
            # Graceful fallback for test/mock audio
            self._stream = None

    def stop(self) -> None:
        self.is_recording = False
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            self._stream = None

    def read_chunk(self, chunk_duration_sec: float = 1.0) -> Optional[np.ndarray]:
        if not self.is_recording:
            return None

        num_samples = int(self.sample_rate * chunk_duration_sec)

        if self._stream is not None:
            try:
                data, overflowed = self._stream.read(num_samples)
                return data.flatten()
            except Exception:
                pass

        # Return silence / simulated buffer if hardware stream is not initialized
        time.sleep(chunk_duration_sec)
        return np.zeros(num_samples, dtype=np.float32) if np is not None else [0.0] * num_samples

    def stream_chunks(self, chunk_duration_sec: float = 1.0) -> Generator[np.ndarray, None, None]:
        while self.is_recording:
            chunk = self.read_chunk(chunk_duration_sec)
            if chunk is not None:
                yield chunk
