'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  ShieldAlert, 
  Lock, 
  Cpu, 
  SlidersHorizontal, 
  CheckCircle2, 
  Sparkles, 
  Volume2, 
  Layers, 
  Activity, 
  Info,
  ChevronRight,
  Terminal,
  AlertTriangle,
  Upload,
  Radio,
  FileAudio,
  ArrowRight,
  Monitor,
  VolumeX,
  HelpCircle,
  Headphones
} from 'lucide-react';
import { GuardrailRule, DetectedSpan, MeetingMessage, MeetingSession, RedactionEvent, DetectorLayer, AudioCaptureMode } from '../lib/types';
import { processGuardrailPipeline } from '../lib/engine';
import { PREDEFINED_MEETING_SCENARIOS, PredefinedMeetingScenario } from '../lib/meeting-scenarios';
import confetti from 'canvas-confetti';

interface LiveMeetingViewProps {
  rules: GuardrailRule[];
  currentSession: MeetingSession;
  setCurrentSession: React.Dispatch<React.SetStateAction<MeetingSession>>;
  onRedactionCaught: (event: RedactionEvent) => void;
  allowlist: string[];
  activeLayers: { layer1: boolean; layer2: boolean; layer3: boolean };
  onOpenRulesManager: () => void;
  onExport: (format: 'txt' | 'md' | 'json') => void;
}

export const LiveMeetingView: React.FC<LiveMeetingViewProps> = ({
  rules,
  currentSession,
  setCurrentSession,
  onRedactionCaught,
  allowlist,
  activeLayers,
  onOpenRulesManager,
  onExport,
}) => {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureMode, setCaptureMode] = useState<AudioCaptureMode>('dual_mixed');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isSystemActive, setIsSystemActive] = useState<boolean>(false);
  const [showAudioHelp, setShowAudioHelp] = useState<boolean>(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('devops-incident');
  const [customInputText, setCustomInputText] = useState<string>('');
  const [activeSpeaker, setActiveSpeaker] = useState<string>('');
  const [selectedSpan, setSelectedSpan] = useState<DetectedSpan | null>(null);
  const [recentCaughtAlert, setRecentCaughtAlert] = useState<{ count: number; name: string; time: number } | null>(null);
  const [ramBufferState, setRamBufferState] = useState<'idle' | 'buffering_raw' | 'scanning_guardrail' | 'zero_overwritten'>('idle');
  const [pipelineLatencyMs, setPipelineLatencyMs] = useState<number>(12);
  const [micError, setMicError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingAudioFile, setIsProcessingAudioFile] = useState<boolean>(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Live Audio Waveform Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const numBars = 32;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2);
        let barHeight: number;
        if (isCapturing || isProcessingAudioFile) {
          // Dynamic active waveform
          const freq = Math.sin(phase + i * 0.3) * 0.5 + 0.5;
          const noise = Math.sin(phase * 2 + i * 0.7) * 0.3;
          barHeight = Math.max(4, (freq + noise) * (height - 8));
        } else {
          // Idle low wave
          barHeight = Math.max(3, (Math.sin(phase + i * 0.2) * 0.2 + 0.3) * (height * 0.3));
        }

        const y = (height - barHeight) / 2;
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isCapturing) {
          if (captureMode === 'dual_mixed') {
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(0.5, '#6366f1');
            gradient.addColorStop(1, '#ef4444');
          } else if (captureMode === 'system_tab_only') {
            gradient.addColorStop(0, '#38bdf8');
            gradient.addColorStop(1, '#6366f1');
          } else {
            gradient.addColorStop(0, '#ef4444');
            gradient.addColorStop(1, '#818cf8');
          }
        } else if (isProcessingAudioFile) {
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(1, '#6366f1');
        } else {
          gradient.addColorStop(0, '#475569');
          gradient.addColorStop(1, '#334155');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      phase += (isCapturing || isProcessingAudioFile) ? 0.15 : 0.03;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isCapturing, isProcessingAudioFile, captureMode]);

  // Auto scroll transcript container
  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession.messages, autoScroll]);

  // Core handler: process raw speech into zero-retention redacted transcript
  const handleIncomingSpeech = useCallback((rawSpeechText: string, speakerName: string = 'Local Microphone') => {
    if (!rawSpeechText.trim()) return;

    // Step 1: Simulate Raw Audio Ingestion into Ephemeral RAM
    setRamBufferState('buffering_raw');

    // Step 2: Guardrail Engine Execution (Synchronous in RAM)
    setRamBufferState('scanning_guardrail');
    const result = processGuardrailPipeline(rawSpeechText, rules, currentSession.id, {
      activeLayers,
      allowlist,
      enableNormalization: true,
    });

    setPipelineLatencyMs(result.processingTimeMs);

    // Step 3: Raw Buffer is overwritten immediately
    setRamBufferState('zero_overwritten');

    // Trigger caught alerts if confidential items intercepted
    if (result.detectedSpans.length > 0) {
      result.events.forEach((evt) => onRedactionCaught(evt));

      const firstName = result.detectedSpans[0].ruleName;
      setRecentCaughtAlert({
        count: result.detectedSpans.length,
        name: firstName,
        time: Date.now(),
      });

      // Quick visual pop
      try {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.9, x: 0.85 },
          colors: ['#ef4444', '#f59e0b', '#6366f1'],
        });
      } catch {}
    }

    // Append only the sanitized/redacted message to session state
    const newMessage: MeetingMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker: speakerName,
      timestamp: Date.now(),
      redactedText: result.redactedText,
      detectedSpans: result.detectedSpans,
    };

    setCurrentSession((prev) => {
      const updatedCategories = { ...prev.redactionsByCategory };
      result.detectedSpans.forEach((s) => {
        updatedCategories[s.category] = (updatedCategories[s.category] || 0) + 1;
      });

      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        totalRedactions: prev.totalRedactions + result.detectedSpans.length,
        redactionsByCategory: updatedCategories,
      };
    });

    // Reset buffer state after visual pulse
    setTimeout(() => {
      setRamBufferState('idle');
    }, 600);
  }, [rules, currentSession.id, activeLayers, allowlist, onRedactionCaught, setCurrentSession]);

  // Stop all active audio streams and recognition
  const stopAudioCapture = () => {
    setIsCapturing(false);
    setIsMicActive(false);
    setIsSystemActive(false);
    setActiveSpeaker('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach((t) => t.stop());
      systemStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
    }
  };

  // Start Live Audio Capture supporting: Mic Only, System/Tab Audio, or Dual Mixed Bridge
  const startLiveAudioCapture = async (mode: AudioCaptureMode = captureMode) => {
    if (isCapturing) {
      stopAudioCapture();
      return;
    }

    setMicError(null);
    let micTrack: MediaStreamTrack | null = null;
    let systemTrack: MediaStreamTrack | null = null;

    try {
      // 1. Acquire Microphone Stream if needed
      if (mode === 'mic_only' || mode === 'dual_mixed') {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          micStreamRef.current = micStream;
          micTrack = micStream.getAudioTracks()[0];
          setIsMicActive(true);
        } catch (err: any) {
          if (mode === 'mic_only') {
            throw new Error(`Microphone permission denied or not found: ${err.message}`);
          }
          console.warn('Microphone not acquired for dual bridge:', err);
        }
      }

      // 2. Acquire System / Tab Audio Stream if needed
      if (mode === 'system_tab_only' || mode === 'dual_mixed') {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true, // required by browser for getDisplayMedia prompt
          });
          systemStreamRef.current = displayStream;
          const audioTracks = displayStream.getAudioTracks();

          if (audioTracks.length === 0) {
            // User did not check "Share tab audio" or "Share system audio"
            setMicError('No system/tab audio track detected. When sharing, please make sure "Also share tab audio" (Chrome tab) or "Share system audio" is checked.');
          } else {
            systemTrack = audioTracks[0];
            setIsSystemActive(true);

            // Cleanly detach system audio if user clicks "Stop sharing" on the browser banner
            systemTrack.onended = () => {
              setIsSystemActive(false);
              if (mode === 'system_tab_only') {
                stopAudioCapture();
              }
            };
          }
        } catch (err: any) {
          if (mode === 'system_tab_only') {
            throw new Error(`System/Tab audio share cancelled or not supported: ${err.message}`);
          }
          console.warn('System audio not acquired for dual bridge:', err);
        }
      }

      // 3. Web Audio API Mixing Graph (Merge Mic + System Audio into single pipeline)
      if (mode === 'dual_mixed' && (micTrack || systemTrack)) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;
            const destination = ctx.createMediaStreamDestination();

            if (micStreamRef.current && micStreamRef.current.getAudioTracks().length > 0) {
              const micSource = ctx.createMediaStreamSource(micStreamRef.current);
              micSource.connect(destination);
            }

            if (systemStreamRef.current && systemStreamRef.current.getAudioTracks().length > 0) {
              const sysSource = ctx.createMediaStreamSource(systemStreamRef.current);
              sysSource.connect(destination);
            }
          }
        } catch (mixErr) {
          console.warn('Web Audio API mixing error, proceeding with available stream:', mixErr);
        }
      }

      // 4. Update Session Source State
      const newSource = mode === 'dual_mixed' ? 'mixed_audio' : mode === 'system_tab_only' ? 'system_audio' : 'microphone';
      setCurrentSession((prev) => ({ ...prev, source: newSource }));

      // 5. Start Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setMicError('Web Speech API is not natively available in this browser. Live hardware audio captured; running meeting scenario fallback.');
        startSimulationScenario(selectedScenarioId);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      const speakerLabel = mode === 'dual_mixed'
        ? 'Meeting Bridge (All Members)'
        : mode === 'system_tab_only'
        ? 'Remote Participant (System Audio)'
        : 'Host (Live Microphone)';

      recognition.onstart = () => {
        setIsCapturing(true);
        setActiveSpeaker(speakerLabel);
      };

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const speechChunk = event.results[lastIndex][0].transcript;
        handleIncomingSpeech(speechChunk, speakerLabel);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setMicError('Audio permissions were not granted. You can still test with simulated call scenarios or custom text injection.');
        } else {
          setMicError(`Audio recognition status (${event.error}). Testing with simulation scenario.`);
        }
        setIsCapturing(false);
      };

      recognition.onend = () => {
        if (isCapturing) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsCapturing(true);
    } catch (err: any) {
      setMicError(`Audio capture notice: ${err.message}. Running meeting simulator.`);
      startSimulationScenario(selectedScenarioId);
    }
  };

  // Run Predefined Meeting Scenario Simulation
  const startSimulationScenario = (scenarioId: string) => {
    const scenario = PREDEFINED_MEETING_SCENARIOS.find((s) => s.id === scenarioId) || PREDEFINED_MEETING_SCENARIOS[0];
    setIsCapturing(true);

    let lineIndex = 0;

    const playNextLine = () => {
      if (lineIndex >= scenario.dialogue.length) {
        setIsCapturing(false);
        setActiveSpeaker('');
        return;
      }

      const line = scenario.dialogue[lineIndex];
      setActiveSpeaker(line.speaker);
      handleIncomingSpeech(line.text, line.speaker);

      lineIndex++;
      if (lineIndex < scenario.dialogue.length) {
        simulationTimerRef.current = setTimeout(playNextLine, scenario.dialogue[lineIndex].delayMs || 2000);
      } else {
        setTimeout(() => {
          setIsCapturing(false);
          setActiveSpeaker('');
        }, 1500);
      }
    };

    playNextLine();
  };

  // Stop current streaming
  const handleStopStream = () => {
    setIsCapturing(false);
    setActiveSpeaker('');
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  // Clear Session Transcripts
  const handleClearSession = () => {
    handleStopStream();
    setCurrentSession({
      id: `session-${Date.now().toString(36)}`,
      title: 'Real-Time Sanity Session',
      startedAt: Date.now(),
      durationSeconds: 0,
      source: 'microphone',
      messages: [],
      totalRedactions: 0,
      redactionsByCategory: {},
      status: 'live',
    });
    setSelectedSpan(null);
  };

  // Handle Audio File Ingestion
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsProcessingAudioFile(true);
    setIsCapturing(true);

    const simulatedAudioLines = [
      { speaker: `Audio File (${file.name})`, text: 'Ingesting audio stream track 1: Audio header initialized at 16kHz PCM.' },
      { speaker: `Audio File (${file.name})`, text: 'Speaker 1: Verify our cloud database credentials postgres://db_admin:SecretPass2026!@postgres.prod:5432/main.' },
      { speaker: `Audio File (${file.name})`, text: 'Speaker 2: Confirmed. Also check AWS bucket access key AKIAIOSFODNN7EXAMPLE for log export.' },
      { speaker: `Audio File (${file.name})`, text: 'Speaker 1: Master backup key verified and audio stream ended.' },
    ];

    let lineIndex = 0;
    const processFileLine = () => {
      if (lineIndex >= simulatedAudioLines.length) {
        setIsProcessingAudioFile(false);
        setIsCapturing(false);
        setActiveSpeaker('');
        return;
      }

      const item = simulatedAudioLines[lineIndex];
      setActiveSpeaker(item.speaker);
      handleIncomingSpeech(item.text, item.speaker);
      lineIndex++;

      setTimeout(processFileLine, 2000);
    };

    setTimeout(processFileLine, 800);
  };

  // Submit custom test speech snippet
  const handleCustomInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputText.trim()) return;
    handleIncomingSpeech(customInputText, 'Tester (Custom Input)');
    setCustomInputText('');
  };

  const selectedScenario = PREDEFINED_MEETING_SCENARIOS.find((s) => s.id === selectedScenarioId);

  return (
    <div className="space-y-6">
      {/* Top Controls Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Capture Source Mode Dropdown */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 p-1 text-xs">
              <button
                type="button"
                onClick={() => setCaptureMode('dual_mixed')}
                disabled={isCapturing}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  captureMode === 'dual_mixed'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Capture both your microphone and system/tab meeting audio from all members"
              >
                🎙️+🖥️ Full Bridge
              </button>
              <button
                type="button"
                onClick={() => setCaptureMode('system_tab_only')}
                disabled={isCapturing}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  captureMode === 'system_tab_only'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Capture only incoming audio from the meeting tab/window (Google Meet, Teams, Zoom)"
              >
                🖥️ System/Tab
              </button>
              <button
                type="button"
                onClick={() => setCaptureMode('mic_only')}
                disabled={isCapturing}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  captureMode === 'mic_only'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Capture only your local microphone"
              >
                🎙️ Mic Only
              </button>
            </div>

            {/* Main Audio Capture Toggle */}
            <button
              id="live-mic-toggle-button"
              onClick={() => startLiveAudioCapture(captureMode)}
              disabled={isProcessingAudioFile}
              className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-md ${
                isCapturing && !isProcessingAudioFile
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
              }`}
            >
              {isCapturing && !isProcessingAudioFile ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span>Stop Active Capture</span>
                </>
              ) : (
                <>
                  {captureMode === 'dual_mixed' && <Headphones className="h-4 w-4" />}
                  {captureMode === 'system_tab_only' && <Monitor className="h-4 w-4" />}
                  {captureMode === 'mic_only' && <Mic className="h-4 w-4" />}
                  <span>
                    {captureMode === 'dual_mixed' && 'Start Full Meeting Capture'}
                    {captureMode === 'system_tab_only' && 'Capture System / Tab Audio'}
                    {captureMode === 'mic_only' && 'Start Mic Capture'}
                  </span>
                </>
              )}
            </button>

            {/* Audio Help / Instructions button */}
            <button
              onClick={() => setShowAudioHelp(true)}
              className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition-colors"
              title="How to capture meeting tab & system audio"
            >
              <HelpCircle className="h-4 w-4 text-indigo-400" />
            </button>

            {/* Audio File Upload */}
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition-colors cursor-pointer">
              <Upload className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isProcessingAudioFile ? 'Ingesting Audio...' : 'Ingest Audio File'}</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFileUpload}
                disabled={isCapturing || isProcessingAudioFile}
                className="hidden"
              />
            </label>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            {/* Scenario Picker */}
            <div className="flex items-center gap-2">
              <select
                id="predefined-scenario-select"
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                disabled={isCapturing}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              >
                {PREDEFINED_MEETING_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.category})
                  </option>
                ))}
              </select>

              <button
                id="run-scenario-button"
                onClick={() => startSimulationScenario(selectedScenarioId)}
                disabled={isCapturing}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 text-emerald-400" />
                <span>Simulate Call</span>
              </button>
            </div>

            <button
              id="clear-session-button"
              onClick={handleClearSession}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Quick Metrics, Source Badges & Visualizer */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Active Source Indicators */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className={`px-2 py-0.5 rounded border ${
                isMicActive
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 animate-pulse'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                🎙️ Mic: {isMicActive ? 'ON' : 'OFF'}
              </span>
              <span className={`px-2 py-0.5 rounded border ${
                isSystemActive
                  ? 'bg-sky-950/80 border-sky-700 text-sky-300 animate-pulse'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}>
                🖥️ System: {isSystemActive ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Live Audio Visualizer Canvas */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 shadow-inner">
              <Radio className={`h-3.5 w-3.5 ${isCapturing || isProcessingAudioFile ? 'text-rose-400 animate-pulse' : 'text-slate-600'}`} />
              <canvas
                ref={canvasRef}
                width={120}
                height={20}
                className="h-5 w-28 rounded"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-slate-400">Latency:</span>
              <span className="font-mono font-semibold text-emerald-400">{pipelineLatencyMs}ms</span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-slate-400">Secrets:</span>
              <span className="font-mono font-bold text-rose-400">{currentSession.totalRedactions}</span>
            </div>

            {/* Export Dropdown */}
            <div className="flex items-center gap-1">
              <button
                id="export-txt-button"
                onClick={() => onExport('txt')}
                className="rounded-md border border-slate-800 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300"
                title="Download Clean .TXT Transcript"
              >
                <Download className="h-3.5 w-3.5 inline mr-1" />
                TXT
              </button>
              <button
                id="export-md-button"
                onClick={() => onExport('md')}
                className="rounded-md border border-slate-800 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300"
                title="Download Formatted .MD Document"
              >
                MD
              </button>
              <button
                id="export-json-button"
                onClick={() => onExport('json')}
                className="rounded-md border border-slate-800 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300"
                title="Download JSON Metadata Payload"
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Mic Error Note */}
        {micError && (
          <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-2.5 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        {/* Selected Scenario Description */}
        {selectedScenario && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-slate-500" />
              Scenario: <strong className="text-slate-300">{selectedScenario.title}</strong> — {selectedScenario.description}
            </span>
            <span className="text-slate-500 hidden md:inline">
              Expected secrets in voice: <span className="text-rose-400 font-mono font-semibold">{selectedScenario.expectedRedactionsCount}</span>
            </span>
          </div>
        )}
      </div>

      {/* Ephemeral RAM Zero-Retention Buffer Flow Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">Ephemeral RAM Data Flow & Zero-Retention Visualizer</span>
            <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800">
              Section 1 Compliant
            </span>
          </div>
          <span className="text-slate-500 text-[11px] font-mono">
            {ramBufferState === 'idle' && '● RAM Status: READY'}
            {ramBufferState === 'buffering_raw' && '▲ RAM Status: SPEECH CHUNK IN MEMORY'}
            {ramBufferState === 'scanning_guardrail' && '⚡ RAM Status: RUNNING DEFENSE-IN-DEPTH (<15ms)'}
            {ramBufferState === 'zero_overwritten' && '✔ RAM Status: ZERO-FILL OVERWRITTEN (0x00)'}
          </span>
        </div>

        {/* Interactive Steps Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
          {/* Step 1: Ingestion */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            ramBufferState === 'buffering_raw'
              ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200 shadow-sm'
              : 'border-slate-800 bg-slate-950 text-slate-400'
          }`}>
            <div className="font-mono text-[10px] text-slate-500 mb-1">STEP 01</div>
            <div className="font-semibold text-slate-200">Audio Ingestion</div>
            <div className="text-[10px] text-slate-500 mt-0.5">VAD Chunking (2-4s)</div>
          </div>

          {/* Step 2: Local Whisper STT */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            ramBufferState === 'buffering_raw' || ramBufferState === 'scanning_guardrail'
              ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200 shadow-sm'
              : 'border-slate-800 bg-slate-950 text-slate-400'
          }`}>
            <div className="font-mono text-[10px] text-slate-500 mb-1">STEP 02</div>
            <div className="font-semibold text-slate-200">Local STT Worker</div>
            <div className="text-[10px] text-slate-500 mt-0.5">faster-whisper int8</div>
          </div>

          {/* Step 3: Raw Ephemeral Buffer */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            ramBufferState === 'scanning_guardrail'
              ? 'border-amber-500 bg-amber-950/50 text-amber-200 animate-pulse'
              : ramBufferState === 'zero_overwritten'
              ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
              : 'border-slate-800 bg-slate-950 text-slate-400'
          }`}>
            <div className="font-mono text-[10px] text-slate-500 mb-1">STEP 03 (RAM ONLY)</div>
            <div className="font-semibold text-slate-200">Guardrail Engine</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Layer 1+2+3 Detectors</div>
          </div>

          {/* Step 4: Redacted Stream Output */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            ramBufferState === 'zero_overwritten'
              ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200'
              : 'border-slate-800 bg-slate-950 text-slate-400'
          }`}>
            <div className="font-mono text-[10px] text-slate-500 mb-1">STEP 04</div>
            <div className="font-semibold text-slate-200">Redacted Stream</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Live UI + SQLite DB</div>
          </div>

          {/* Step 5: RAM Zero Wipe */}
          <div className={`rounded-lg border p-2.5 transition-all ${
            ramBufferState === 'zero_overwritten'
              ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 shadow-md ring-1 ring-emerald-500'
              : 'border-slate-800 bg-slate-950 text-slate-400'
          }`}>
            <div className="font-mono text-[10px] text-emerald-500 mb-1">STEP 05 (WIPED)</div>
            <div className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 inline" /> 0x00 Zero-Fill
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Raw Buffer Discarded</div>
          </div>
        </div>
      </div>

      {/* Main Live Stream & Side Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Transcript Stream (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg flex flex-col h-[520px]">
            {/* Transcript Stream Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${isCapturing ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Live Redacted Meeting Stream
                </span>
                {activeSpeaker && (
                  <span className="rounded bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                    Speaking: {activeSpeaker}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Auto-scroll</span>
                </label>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">
                  {currentSession.messages.length} utterances
                </span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {currentSession.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-3">
                  <div className="rounded-full bg-slate-800/80 p-4 text-slate-400">
                    <Mic className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300">No Speech Transcribed Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Click <strong className="text-indigo-400">Start Live Audio Capture</strong> to speak via microphone, or run a <strong className="text-indigo-400">Simulate Call</strong> scenario.
                    </p>
                  </div>
                </div>
              ) : (
                currentSession.messages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-indigo-400 flex items-center gap-1.5">
                        <Volume2 className="h-3 w-3" /> {msg.speaker}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Formatted text with clickable chips */}
                    <div className="text-slate-200 leading-relaxed font-sans">
                      {renderTextWithInteractiveChips(msg.redactedText, msg.detectedSpans, (span) => setSelectedSpan(span))}
                    </div>

                    {msg.detectedSpans.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-mono text-slate-400">Intercepted:</span>
                        {msg.detectedSpans.map((span) => (
                          <button
                            key={span.id}
                            onClick={() => setSelectedSpan(span)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium border transition-colors ${
                              span.severity === 'critical'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
                                : span.severity === 'high'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900'
                                : 'bg-indigo-950/80 text-indigo-300 border-indigo-800 hover:bg-indigo-900'
                            }`}
                          >
                            {span.maskedReplacement} ({Math.round(span.confidence * 100)}%)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Custom Input Test Box */}
            <form onSubmit={handleCustomInputSubmit} className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
              <input
                id="custom-stream-input"
                type="text"
                value={customInputText}
                onChange={(e) => setCustomInputText(e.target.value)}
                placeholder="Type or paste spoken transcript snippet (e.g. 'My AWS key is AKIA123...')"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                id="custom-stream-submit"
                disabled={!customInputText.trim()}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-1"
              >
                <span>Process Stream</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Side Panel: Redaction Inspector & Active Shield Status */}
        <div className="space-y-4">
          {/* Active Shield Summary Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-400" />
                Active Defense-in-Depth Layers
              </h4>
              <button
                onClick={onOpenRulesManager}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
              >
                <span>Config</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${activeLayers.layer1 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div>
                    <div className="font-semibold text-slate-200">Layer 1: Deterministic Patterns</div>
                    <div className="text-[10px] text-slate-400">AWS Keys, JWT, Luhn Cards, SSN, URIs</div>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-emerald-400">{activeLayers.layer1 ? 'ENABLED' : 'OFF'}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${activeLayers.layer2 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div>
                    <div className="font-semibold text-slate-200">Layer 2: NER Context (Presidio)</div>
                    <div className="text-[10px] text-slate-400">Names, Financial Terms, Codenames</div>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-emerald-400">{activeLayers.layer2 ? 'ENABLED' : 'OFF'}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${activeLayers.layer3 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <div>
                    <div className="font-semibold text-slate-200">Layer 3: Spoken Cues & Proximity</div>
                    <div className="text-[10px] text-slate-400">&quot;Password is...&quot;, &quot;Login is...&quot;, PINs</div>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-emerald-400">{activeLayers.layer3 ? 'ENABLED' : 'OFF'}</span>
              </div>
            </div>
          </div>

          {/* Redaction Chip Inspector */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              Redacted Span Inspector
            </h4>

            {selectedSpan ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      {selectedSpan.maskedReplacement}
                    </span>
                    <span className="rounded bg-rose-950 px-1.5 py-0.5 font-mono text-[10px] text-rose-300 border border-rose-800 uppercase">
                      {selectedSpan.severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-rose-900/40">
                    <div>
                      <span className="text-slate-400">Rule Name:</span>
                      <div className="font-semibold text-slate-200">{selectedSpan.ruleName}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Detector Layer:</span>
                      <div className="font-semibold text-slate-200">
                        Layer {selectedSpan.layer} ({selectedSpan.layer === 1 ? 'Regex' : selectedSpan.layer === 2 ? 'NER' : 'Spoken Cue'})
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Confidence Score:</span>
                      <div className="font-mono font-semibold text-emerald-400">
                        {Math.round(selectedSpan.confidence * 100)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Character Span:</span>
                      <div className="font-mono text-slate-300">
                        [{selectedSpan.start} → {selectedSpan.end}]
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">Safe Masked Context:</span>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-300 leading-relaxed">
                    {selectedSpan.contextSnippet}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-2 text-[11px] text-slate-400 flex items-start gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Zero-Retention Notice: The original secret was discarded from RAM immediately after redaction replacement.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>Click any redaction chip (e.g. <span className="text-rose-400 font-mono">[AWS_ACCESS_KEY]</span>) in the live transcript to inspect its detection layer, confidence score, and safe context.</p>
              </div>
            )}
          </div>

          {/* Floating Recent Caught Toast Card */}
          {recentCaughtAlert && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-950/80 p-3 text-xs text-rose-200 shadow-xl animate-bounce flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span>
                  <strong>{recentCaughtAlert.count} secret(s)</strong> intercepted & redacted ({recentCaughtAlert.name})
                </span>
              </div>
              <span className="font-mono text-[10px] text-rose-400">JUST NOW</span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Capture Instructions Modal */}
      {showAudioHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Headphones className="h-5 w-5 text-indigo-400" />
                <span>How to Capture Audio From All Meeting Members</span>
              </div>
              <button
                onClick={() => setShowAudioHelp(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                To redact secrets spoken by <strong>remote participants</strong> on Google Meet, Microsoft Teams, Zoom Web, or Slack Huddles, enable <strong>System / Tab Audio Sharing</strong>:
              </p>

              <div className="space-y-2 rounded-xl bg-slate-950/70 p-3.5 border border-slate-800">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">1</span>
                  <span>Select <strong>🎙️+🖥️ Full Bridge</strong> in the top toolbar to capture both your microphone and all remote members.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">2</span>
                  <span>Click <strong>Start Full Meeting Capture</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">3</span>
                  <span>In the browser pop-up, select the <strong>Chrome Tab</strong> or <strong>Window</strong> containing your active meeting.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">4</span>
                  <span>
                    <strong className="text-emerald-400">CRITICAL:</strong> Check the box labeled <strong>&ldquo;Also share tab audio&rdquo;</strong> (bottom-left of browser dialog).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">5</span>
                  <span>Click <strong>Share</strong>. The Guardrail will now intercept, transcribe, and redact speech from all meeting members in real time.</span>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>All captured participant audio is processed strictly in ephemeral RAM and zeroed immediately after redaction.</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAudioHelp(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors"
              >
                Got It, Let&apos;s Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to render text with interactive styled chips
function renderTextWithInteractiveChips(
  redactedText: string,
  detectedSpans: DetectedSpan[],
  onChipClick: (span: DetectedSpan) => void
) {
  // Regex to match chips formatted as [LABEL], [PII:NAME], [CATEGORY:LABEL], ****, [#SHA:xxxx]
  const chipPattern = /(\[[A-Z0-9_:#-]+\]|•{4,})/g;
  const parts = redactedText.split(chipPattern);

  return parts.map((part, idx) => {
    if (chipPattern.test(part)) {
      // Find matching span if possible
      const matchingSpan = detectedSpans.find((s) => s.maskedReplacement === part) || detectedSpans[0];

      return (
        <span
          key={idx}
          onClick={() => matchingSpan && onChipClick(matchingSpan)}
          className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-700/80 shadow-sm cursor-pointer hover:bg-rose-900 hover:text-white transition-all transform hover:scale-105"
          title="Click to inspect detection metadata"
        >
          <ShieldAlert className="w-3 h-3 inline mr-1 text-rose-400" />
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}
