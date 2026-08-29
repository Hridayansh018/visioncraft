"""Linux PulseAudio & PipeWire Loopback Monitor Capture (NFR-007).

Captures system audio on Linux by attaching to PulseAudio/PipeWire monitor sinks.
"""

import time
from typing import Generator, Optional, Any

try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None

from visioncraft.audio.base import BaseAudioCapture


class LinuxMonitorCapture(BaseAudioCapture):
    """Captures system-rendered audio on Linux using PulseAudio or PipeWire monitor streams."""

    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        super().__init__(sample_rate, channels)
        self._stream = None

    def start(self) -> None:
        self.is_recording = True
        try:
            # pyrefly: ignore [missing-import]
            import sounddevice as sd
            devices = sd.query_devices()
            target_idx = None
            for idx, dev in enumerate(devices):
                name = dev.get("name", "").lower()
                if ("monitor" in name or "pipewire" in name) and dev.get("max_input_channels", 0) > 0:
                    target_idx = idx
                    break

            self._stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype="float32",
                device=target_idx,
            )
            self._stream.start()
        except (ImportError, Exception):
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

    def read_chunk(self, chunk_duration_sec: float = 1.0) -> Optional[Any]:
        if not self.is_recording:
            return None

        num_samples = int(self.sample_rate * chunk_duration_sec)

        if self._stream is not None:
            try:
                data, _ = self._stream.read(num_samples)
                return data.flatten() if hasattr(data, "flatten") else data
            except Exception:
                pass

        time.sleep(chunk_duration_sec)
        return np.zeros(num_samples, dtype=np.float32) if np is not None else [0.0] * num_samples

    def stream_chunks(self, chunk_duration_sec: float = 1.0) -> Generator[Any, None, None]:
        while self.is_recording:
            chunk = self.read_chunk(chunk_duration_sec)
            if chunk is not None:
                yield chunk
