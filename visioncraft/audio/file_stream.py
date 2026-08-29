"""Audio File Streaming Adapter for Testing, Evaluation, and Replay (FR-045, FR-047)."""

import time
import os
from typing import Generator, Optional, Any, List

try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None

from visioncraft.audio.base import BaseAudioCapture


class FileStreamAudioCapture(BaseAudioCapture):
    """Simulates live streaming from a pre-recorded audio file (.wav/.raw)."""

    def __init__(
        self,
        file_path: Optional[str] = None,
        sample_rate: int = 16000,
        channels: int = 1,
        realtime_pacing: bool = False,
    ):
        super().__init__(sample_rate, channels)
        self.file_path = file_path
        self.realtime_pacing = realtime_pacing
        self._cursor = 0
        self._samples: List[float] = []

    def start(self) -> None:
        self.is_recording = True
        self._cursor = 0
        if self.file_path and os.path.exists(self.file_path):
            try:
                import wave
                with wave.open(self.file_path, "rb") as wf:
                    n_frames = wf.getnframes()
                    raw_bytes = wf.readframes(n_frames)
                    # Simple 16-bit PCM to float conversion
                    int16_vals = [
                        int.from_bytes(raw_bytes[i : i + 2], byteorder="little", signed=True)
                        for i in range(0, len(raw_bytes), 2)
                    ]
                    self._samples = [v / 32768.0 for v in int16_vals]
            except Exception:
                self._samples = [0.0] * (self.sample_rate * 5)
        else:
            # Generate 5 seconds of synthetic test audio
            self._samples = [0.0] * (self.sample_rate * 5)

    def stop(self) -> None:
        self.is_recording = False
        self._cursor = 0

    def read_chunk(self, chunk_duration_sec: float = 1.0) -> Optional[Any]:
        if not self.is_recording:
            return None

        num_samples = int(self.sample_rate * chunk_duration_sec)
        if self._cursor >= len(self._samples):
            return None

        chunk = self._samples[self._cursor : self._cursor + num_samples]
        self._cursor += num_samples

        if len(chunk) < num_samples:
            chunk.extend([0.0] * (num_samples - len(chunk)))

        if self.realtime_pacing:
            time.sleep(chunk_duration_sec)

        return np.array(chunk, dtype=np.float32) if np is not None else chunk

    def stream_chunks(self, chunk_duration_sec: float = 1.0) -> Generator[Any, None, None]:
        while self.is_recording:
            chunk = self.read_chunk(chunk_duration_sec)
            if chunk is not None:
                yield chunk
            else:
                break
