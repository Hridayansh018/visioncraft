"""Audio capture package for VisionCraft (FR-001, FR-002, FR-003, NFR-007)."""

import sys
from typing import Optional

from visioncraft.audio.base import BaseAudioCapture
from visioncraft.audio.microphone import MicrophoneAudioCapture
from visioncraft.audio.windows import WindowsWASAPILoopbackCapture, DualAudioCapture
from visioncraft.audio.macos import MacOSLoopbackCapture
from visioncraft.audio.linux import LinuxMonitorCapture
from visioncraft.audio.file_stream import FileStreamAudioCapture


def get_system_audio_capture(sample_rate: int = 16000) -> BaseAudioCapture:
    """Factory function returning the appropriate system audio loopback capture for the host OS."""
    if sys.platform == "win32":
        return WindowsWASAPILoopbackCapture(sample_rate=sample_rate)
    elif sys.platform == "darwin":
        return MacOSLoopbackCapture(sample_rate=sample_rate)
    else:
        return LinuxMonitorCapture(sample_rate=sample_rate)


def get_audio_capture(
    source: str = "microphone",
    sample_rate: int = 16000,
    file_path: Optional[str] = None,
) -> BaseAudioCapture:
    """General factory function for creating audio capture instances."""
    if source == "system":
        return get_system_audio_capture(sample_rate=sample_rate)
    elif source == "file":
        return FileStreamAudioCapture(file_path=file_path, sample_rate=sample_rate)
    else:
        return MicrophoneAudioCapture(sample_rate=sample_rate)


__all__ = [
    "BaseAudioCapture",
    "MicrophoneAudioCapture",
    "WindowsWASAPILoopbackCapture",
    "DualAudioCapture",
    "MacOSLoopbackCapture",
    "LinuxMonitorCapture",
    "FileStreamAudioCapture",
    "get_system_audio_capture",
    "get_audio_capture",
]
