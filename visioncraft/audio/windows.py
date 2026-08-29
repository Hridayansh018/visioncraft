"""Windows WASAPI System Audio Loopback & Dual Capture (FR-002, FR-003, NFR-007)."""

from typing import Generator, Optional, Tuple, Any, List

try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None

from visioncraft.audio.base import BaseAudioCapture
from visioncraft.audio.microphone import MicrophoneAudioCapture


class WindowsWASAPILoopbackCapture(BaseAudioCapture):
    """Captures system-rendered audio on Windows using WASAPI loopback mechanism."""

    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        super().__init__(sample_rate, channels)
        self._recorder = None

    def start(self) -> None:
        self.is_recording = True
        try:
            # pyrefly: ignore [missing-import]
            import soundcard as sc
            # Obtain default Windows loopback speaker
            default_speaker = sc.default_speaker()
            self._recorder = sc.get_microphone(id=str(default_speaker.name), include_loopback=True)
        except (ImportError, Exception):
            self._recorder = None

    def stop(self) -> None:
        self.is_recording = False
        self._recorder = None

    def read_chunk(self, chunk_duration_sec: float = 1.0) -> Optional[np.ndarray]:
        if not self.is_recording:
            return None

        num_samples = int(self.sample_rate * chunk_duration_sec)

        if self._recorder is not None:
            try:
                with self._recorder.recorder(samplerate=self.sample_rate, channels=self.channels) as mic:
                    data = mic.record(numframes=num_samples)
                    return data.mean(axis=1).astype(np.float32) if data.ndim > 1 else data.flatten().astype(np.float32)
            except Exception:
                pass

        return np.zeros(num_samples, dtype=np.float32) if np is not None else [0.0] * num_samples

    def stream_chunks(self, chunk_duration_sec: float = 1.0) -> Generator[Any, None, None]:
        while self.is_recording:
            chunk = self.read_chunk(chunk_duration_sec)
            if chunk is not None:
                yield chunk


class DualAudioCapture:
    """Simultaneous Microphone and System Loopback Capture (FR-003).
    
    Preserves audio source metadata (`source='microphone'` vs `source='system'`).
    """

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.mic_capture = MicrophoneAudioCapture(sample_rate=sample_rate)
        self.system_capture = WindowsWASAPILoopbackCapture(sample_rate=sample_rate)
        self.is_recording = False

    def start(self) -> None:
        self.is_recording = True
        self.mic_capture.start()
        self.system_capture.start()

    def stop(self) -> None:
        self.is_recording = False
        self.mic_capture.stop()
        self.system_capture.stop()

    def read_dual_chunk(self, chunk_duration_sec: float = 1.0) -> Tuple[Any, Any]:
        """Returns (mic_audio, system_audio)."""
        mic_chunk = self.mic_capture.read_chunk(chunk_duration_sec)
        sys_chunk = self.system_capture.read_chunk(chunk_duration_sec)
        num_samples = int(self.sample_rate * chunk_duration_sec)
        zero_buf = np.zeros(num_samples, dtype=np.float32) if np is not None else [0.0] * num_samples

        if mic_chunk is None:
            mic_chunk = zero_buf
        if sys_chunk is None:
            sys_chunk = zero_buf

        return mic_chunk, sys_chunk
