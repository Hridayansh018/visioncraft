"""Tests for Audio Adapters & Cross-Platform Factory (NFR-007)."""

from visioncraft.audio.base import BaseAudioCapture
from visioncraft.audio.microphone import MicrophoneAudioCapture
from visioncraft.audio.windows import WindowsWASAPILoopbackCapture, DualAudioCapture
from visioncraft.audio.macos import MacOSLoopbackCapture
from visioncraft.audio.linux import LinuxMonitorCapture
from visioncraft.audio.file_stream import FileStreamAudioCapture
from visioncraft.audio import get_audio_capture, get_system_audio_capture


def test_microphone_adapter():
    mic = MicrophoneAudioCapture(sample_rate=16000)
    assert isinstance(mic, BaseAudioCapture)
    mic.start()
    assert mic.is_recording is True
    chunk = mic.read_chunk(chunk_duration_sec=0.05)
    assert chunk is not None
    assert len(chunk) == int(16000 * 0.05)
    mic.stop()
    assert mic.is_recording is False


def test_windows_loopback_adapter():
    loopback = WindowsWASAPILoopbackCapture(sample_rate=16000)
    assert isinstance(loopback, BaseAudioCapture)
    loopback.start()
    assert loopback.is_recording is True
    chunk = loopback.read_chunk(chunk_duration_sec=0.05)
    assert chunk is not None
    assert len(chunk) == int(16000 * 0.05)
    loopback.stop()
    assert loopback.is_recording is False


def test_dual_audio_capture():
    dual = DualAudioCapture(sample_rate=16000)
    dual.start()
    assert dual.is_recording is True
    mic_chunk, sys_chunk = dual.read_dual_chunk(chunk_duration_sec=0.05)
    assert mic_chunk is not None
    assert sys_chunk is not None
    assert len(mic_chunk) == int(16000 * 0.05)
    assert len(sys_chunk) == int(16000 * 0.05)
    dual.stop()
    assert dual.is_recording is False


def test_macos_loopback_adapter():
    mac = MacOSLoopbackCapture(sample_rate=16000)
    assert isinstance(mac, BaseAudioCapture)
    mac.start()
    assert mac.is_recording is True
    chunk = mac.read_chunk(chunk_duration_sec=0.05)
    assert chunk is not None
    mac.stop()
    assert mac.is_recording is False


def test_linux_monitor_adapter():
    linux = LinuxMonitorCapture(sample_rate=16000)
    assert isinstance(linux, BaseAudioCapture)
    linux.start()
    assert linux.is_recording is True
    chunk = linux.read_chunk(chunk_duration_sec=0.05)
    assert chunk is not None
    linux.stop()
    assert linux.is_recording is False


def test_file_stream_audio_capture():
    streamer = FileStreamAudioCapture(file_path=None, sample_rate=16000)
    assert isinstance(streamer, BaseAudioCapture)
    streamer.start()
    assert streamer.is_recording is True
    chunks = list(streamer.stream_chunks(chunk_duration_sec=1.0))
    assert len(chunks) == 5  # 5 seconds
    streamer.stop()
    assert streamer.is_recording is False


def test_audio_factory():
    mic_cap = get_audio_capture("microphone")
    assert isinstance(mic_cap, MicrophoneAudioCapture)

    file_cap = get_audio_capture("file")
    assert isinstance(file_cap, FileStreamAudioCapture)

    sys_cap = get_system_audio_capture()
    assert isinstance(sys_cap, BaseAudioCapture)
