"""Local Whisper Speech-to-Text Pipeline using faster-whisper (FR-006, FR-007, FR-050)."""

from typing import Any, Dict, List, Optional
try:
    # pyrefly: ignore [missing-import]
    import numpy as np
except ImportError:
    np = None


class WhisperASR:
    """Local ASR engine executing faster-whisper on CPU/GPU."""

    def __init__(
        self,
        model_size: str = "base",
        device: str = "auto",
        compute_type: str = "int8",
    ):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model = None

    def _ensure_model_loaded(self) -> None:
        """Lazy loader for faster-whisper model."""
        if self._model is None:
            try:
                # pyrefly: ignore [missing-import]
                from faster_whisper import WhisperModel
                self._model = WhisperModel(
                    self.model_size,
                    device=self.device if self.device != "auto" else "cpu",
                    compute_type=self.compute_type,
                )
            except (ImportError, Exception):
                self._model = None

    def transcribe_chunk(
        self,
        audio_chunk: np.ndarray,
        language: Optional[str] = "en",
        beam_size: int = 5,
    ) -> List[Dict[str, Any]]:
        """Transcribes a raw float32 audio chunk and returns timestamped segments (FR-007)."""
        self._ensure_model_loaded()

        if self._model is not None:
            try:
                segments, info = self._model.transcribe(
                    audio_chunk,
                    language=language,
                    beam_size=beam_size,
                    vad_filter=True,
                )
                results = []
                for seg in segments:
                    results.append(
                        {
                            "start": seg.start,
                            "end": seg.end,
                            "text": seg.text.strip(),
                            "confidence": seg.avg_logprob,
                        }
                    )
                return results
            except Exception:
                pass

        # Return empty if silence or ASR not available
        return []

    def transcribe_file(self, audio_file_path: str, language: Optional[str] = "en") -> List[Dict[str, Any]]:
        """Transcribes an entire audio file on disk."""
        self._ensure_model_loaded()
        if self._model is not None:
            segments, info = self._model.transcribe(audio_file_path, language=language)
            return [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text.strip(),
                    "confidence": seg.avg_logprob,
                }
                for seg in segments
            ]
        return []
