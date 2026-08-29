"""Audio Chunking with Speech Boundaries and Latency Management (FR-004)."""

from typing import Generator, List, Optional, Any

try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None

from visioncraft.transcription.vad import VoiceActivityDetector


class AudioChunker:
    """Buffers continuous incoming audio streams and partitions into speech segments."""

    def __init__(
        self,
        sample_rate: int = 16000,
        min_chunk_duration: float = 2.0,
        max_chunk_duration: float = 5.0,
        silence_cutoff_duration: float = 0.6,
    ):
        self.sample_rate = sample_rate
        self.min_chunk_samples = int(sample_rate * min_chunk_duration)
        self.max_chunk_samples = int(sample_rate * max_chunk_duration)
        self.silence_cutoff_samples = int(sample_rate * silence_cutoff_duration)
        self.vad = VoiceActivityDetector(sample_rate=sample_rate)

        self._buffer: List[float] = []
        self._consecutive_silence_samples = 0

    def add_audio(self, audio_data: Any) -> List[Any]:
        """Appends new audio data and returns completed speech chunks if ready."""
        ready_chunks: List[Any] = []
        if hasattr(audio_data, "tolist"):
            self._buffer.extend(audio_data.tolist())
        else:
            self._buffer.extend(list(audio_data))

        # Check if buffer exceeded minimum size
        if len(self._buffer) >= self.min_chunk_samples:
            sample_slice = self._buffer[-int(self.sample_rate * 0.2):]
            recent_chunk = np.array(sample_slice, dtype=np.float32) if np is not None else sample_slice
            has_speech = self.vad.is_speech(recent_chunk)

            if not has_speech:
                self._consecutive_silence_samples += len(sample_slice)
            else:
                self._consecutive_silence_samples = 0

            # Trigger chunk boundary on silence pause or max latency threshold
            if self._consecutive_silence_samples >= self.silence_cutoff_samples or len(self._buffer) >= self.max_chunk_samples:
                chunk = np.array(self._buffer, dtype=np.float32) if np is not None else list(self._buffer)
                ready_chunks.append(chunk)
                self._buffer = []
                self._consecutive_silence_samples = 0

        return ready_chunks

    def flush(self) -> Optional[Any]:
        """Flushes remaining audio in buffer when session stops."""
        if len(self._buffer) > 0:
            chunk = np.array(self._buffer, dtype=np.float32) if np is not None else list(self._buffer)
            self._buffer = []
            return chunk
        return None
