"""Abstract Base Classes for Platform-Independent Audio Capture (FR-001, FR-002, FR-003)."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, Generator, Optional, Any, Sequence

try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None


class BaseAudioCapture(ABC):
    """Abstract interface for audio capture sources."""

    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self.sample_rate = sample_rate
        self.channels = channels
        self.is_recording = False

    @abstractmethod
    def start(self) -> None:
        """Starts capturing audio."""
        pass

    @abstractmethod
    def stop(self) -> None:
        """Stops capturing audio."""
        pass

    @abstractmethod
    def read_chunk(self, chunk_duration_sec: float = 1.0) -> Optional[np.ndarray]:
        """Reads a chunk of raw audio as float32 PCM numpy array normalized [-1.0, 1.0]."""
        pass

    @abstractmethod
    def stream_chunks(self, chunk_duration_sec: float = 1.0) -> Generator[np.ndarray, None, None]:
        """Yields audio chunks continuously while recording."""
        pass
