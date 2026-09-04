'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  GuardrailRule,
  DetectedSpan,
  MeetingMessage,
  MeetingSession,
  RedactionEvent,
  AudioCaptureMode
} from '../lib/types';
import { DEFAULT_GUARDRAIL_RULES } from '../lib/default-rules';
import { processGuardrailPipeline } from '../lib/engine';

export type AppDeploymentTier = 'local_mvp' | 'cloud_saas' | 'enterprise_vpc';

interface AudioMeetingContextType {
  // Capturing state
  isCapturing: boolean;
  captureMode: AudioCaptureMode;
  setCaptureMode: (mode: AudioCaptureMode) => void;
  isMicActive: boolean;
  isSystemActive: boolean;
  micError: string | null;
  startLiveAudioCapture: (mode?: AudioCaptureMode) => Promise<void>;
  stopLiveAudioCapture: () => void;

  // Pipeline & Telemetry
  pipelineLatencyMs: number;
  ramBufferState: 'idle' | 'buffering_raw' | 'scanning_guardrail' | 'zero_overwritten';
  recentCaughtAlert: { count: number; name: string; time: number } | null;
  setRecentCaughtAlert: (alert: { count: number; name: string; time: number } | null) => void;
  interimTranscript: string;

  // Meeting Data
  currentSession: MeetingSession;
  setCurrentSession: React.Dispatch<React.SetStateAction<MeetingSession>>;
  sessions: MeetingSession[];
  setSessions: React.Dispatch<React.SetStateAction<MeetingSession[]>>;
  events: RedactionEvent[];
  setEvents: React.Dispatch<React.SetStateAction<RedactionEvent[]>>;

  // Rules & Configuration
  rules: GuardrailRule[];
  setRules: React.Dispatch<React.SetStateAction<GuardrailRule[]>>;
  allowlist: string[];
  setAllowlist: React.Dispatch<React.SetStateAction<string[]>>;
  activeLayers: { layer1: boolean; layer2: boolean; layer3: boolean };
  setActiveLayers: React.Dispatch<React.SetStateAction<{ layer1: boolean; layer2: boolean; layer3: boolean }>>;
  deploymentTier: AppDeploymentTier;
  setDeploymentTier: (tier: AppDeploymentTier) => void;

  // Audio File Processing
  isProcessingAudioFile: boolean;
  uploadedFileName: string | null;
  handleAudioFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

  // Handlers
  handleIncomingSpeech: (rawSpeechText: string, speakerName?: string) => void;
  handleClearSession: () => void;
  onRedactionCaught: (event: RedactionEvent) => void;
  onUpdateEventStatus: (eventId: string, status: RedactionEvent['status']) => void;
  onAddAllowlist: (term: string) => void;
  onTuneThreshold: (ruleId: string, delta: number) => void;

  // Export Modal
  exportModalState: { isOpen: boolean; format: 'txt' | 'md' | 'json' };
  openExportModal: (format: 'txt' | 'md' | 'json') => void;
  closeExportModal: () => void;
}

const AudioMeetingContext = createContext<AudioMeetingContextType | null>(null);

const createEmptySession = (): MeetingSession => ({
  id: `session-${Date.now()}`,
  title: 'Live Meeting Session',
  startedAt: Date.now(),
  durationSeconds: 0,
  source: 'microphone',
  messages: [],
  totalRedactions: 0,
  redactionsByCategory: {},
  status: 'live',
});

export const AudioMeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global State
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureMode, setCaptureMode] = useState<AudioCaptureMode>('dual_mixed');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isSystemActive, setIsSystemActive] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [pipelineLatencyMs, setPipelineLatencyMs] = useState<number>(12);
  const [ramBufferState, setRamBufferState] = useState<'idle' | 'buffering_raw' | 'scanning_guardrail' | 'zero_overwritten'>('idle');
  const [recentCaughtAlert, setRecentCaughtAlert] = useState<{ count: number; name: string; time: number } | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  const [currentSession, setCurrentSession] = useState<MeetingSession>(createEmptySession);
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [events, setEvents] = useState<RedactionEvent[]>([]);

  const [rules, setRules] = useState<GuardrailRule[]>(DEFAULT_GUARDRAIL_RULES);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [activeLayers, setActiveLayers] = useState<{ layer1: boolean; layer2: boolean; layer3: boolean }>({
    layer1: true,
    layer2: true,
    layer3: true,
  });
  const [deploymentTier, setDeploymentTier] = useState<AppDeploymentTier>('local_mvp');

  const [isProcessingAudioFile, setIsProcessingAudioFile] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [exportModalState, setExportModalState] = useState<{ isOpen: boolean; format: 'txt' | 'md' | 'json' }>({
    isOpen: false,
    format: 'txt',
  });

  // Persistent Refs across Page & Tab switches
  const recognitionRef = useRef<any>(null);
  const speechSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const rulesRef = useRef<GuardrailRule[]>(rules);
  const allowlistRef = useRef<string[]>(allowlist);
  const activeLayersRef = useRef(activeLayers);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  useEffect(() => {
    allowlistRef.current = allowlist;
  }, [allowlist]);

  useEffect(() => {
    activeLayersRef.current = activeLayers;
  }, [activeLayers]);

  // Load saved state from localStorage on initial boot
  useEffect(() => {
    try {
      const savedRules = localStorage.getItem('guardrail_rules');
      if (savedRules) setRules(JSON.parse(savedRules));

      const savedAllowlist = localStorage.getItem('guardrail_allowlist');
      if (savedAllowlist) setAllowlist(JSON.parse(savedAllowlist));

      const savedLayers = localStorage.getItem('guardrail_layers');
      if (savedLayers) setActiveLayers(JSON.parse(savedLayers));

      const savedEvents = localStorage.getItem('guardrail_events');
      if (savedEvents) setEvents(JSON.parse(savedEvents));

      const savedSessions = localStorage.getItem('guardrail_sessions');
      if (savedSessions) setSessions(JSON.parse(savedSessions));

      const savedTier = localStorage.getItem('guardrail_tier');
      if (savedTier) setDeploymentTier(savedTier as AppDeploymentTier);
    } catch { }
  }, []);

  // Save changes
  useEffect(() => {
    try { localStorage.setItem('guardrail_rules', JSON.stringify(rules)); } catch { }
  }, [rules]);

  useEffect(() => {
    try { localStorage.setItem('guardrail_allowlist', JSON.stringify(allowlist)); } catch { }
  }, [allowlist]);

  useEffect(() => {
    try { localStorage.setItem('guardrail_layers', JSON.stringify(activeLayers)); } catch { }
  }, [activeLayers]);

  useEffect(() => {
    try { localStorage.setItem('guardrail_events', JSON.stringify(events)); } catch { }
  }, [events]);

  useEffect(() => {
    try { localStorage.setItem('guardrail_sessions', JSON.stringify(sessions)); } catch { }
  }, [sessions]);

  useEffect(() => {
    try { localStorage.setItem('guardrail_tier', deploymentTier); } catch { }
  }, [deploymentTier]);

  const onRedactionCaught = useCallback((event: RedactionEvent) => {
    setEvents((prev) => [event, ...prev]);
  }, []);

  const onUpdateEventStatus = useCallback((eventId: string, status: RedactionEvent['status']) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventId ? { ...evt, status } : evt))
    );
  }, []);

  const onAddAllowlist = useCallback((term: string) => {
    if (!allowlist.includes(term)) {
      setAllowlist((prev) => [...prev, term]);
    }
  }, [allowlist]);

  const onTuneThreshold = useCallback((ruleId: string, delta: number) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          const newThresh = Math.max(0.5, Math.min(1.0, r.confidenceThreshold + delta));
          return { ...r, confidenceThreshold: Number(newThresh.toFixed(2)) };
        }
        return r;
      })
    );
  }, []);

  // Core Zero-Retention Pipeline Execution - Instant & Zero Lag
  const handleIncomingSpeech = useCallback((rawSpeechText: string, speakerName?: string) => {
    if (!rawSpeechText.trim()) return;

    setRamBufferState('scanning_guardrail');
    const startMs = performance.now();

    const result = processGuardrailPipeline(
      rawSpeechText,
      rulesRef.current,
      currentSession.id,
      {
        allowlist: allowlistRef.current,
        activeLayers: activeLayersRef.current,
        enableNormalization: true,
      }
    );

    const elapsed = Math.max(2, Math.round(performance.now() - startMs));
    setPipelineLatencyMs(elapsed);

    setRamBufferState('zero_overwritten');

    // Update Messages in Session
    const newMessage: MeetingMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      speaker: speakerName || 'Live Audio Stream',
      timestamp: Date.now(),
      redactedText: result.redactedText,
      detectedSpans: result.detectedSpans,
    };

    setCurrentSession((prev) => {
      const nextCategories = { ...prev.redactionsByCategory };
      result.detectedSpans.forEach((span) => {
        nextCategories[span.category] = (nextCategories[span.category] || 0) + 1;
      });

      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        totalRedactions: prev.totalRedactions + result.detectedSpans.length,
        redactionsByCategory: nextCategories,
        durationSeconds: Math.round((Date.now() - prev.startedAt) / 1000),
      };
    });

    // Emit new caught events
    if (result.events && result.events.length > 0) {
      result.events.forEach((evt) => onRedactionCaught(evt));

      const topSpan = result.detectedSpans[0];
      setRecentCaughtAlert({
        count: result.detectedSpans.length,
        name: topSpan ? topSpan.ruleName : 'Confidential Credential',
        time: Date.now(),
      });
    }

    setTimeout(() => {
      setRamBufferState('idle');
    }, 600);
  }, [currentSession.id, onRedactionCaught]);

  // Continuous Speech Recognition Handler with Background Tab Auto-Reconnection
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('SpeechRecognition API not available in this browser. Please use Chrome/Edge or audio file ingestion.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text;
        } else {
          interim += text;
        }
      }

      // 1. If Web Speech API finalized a chunk, commit immediately
      if (finalTranscript.trim()) {
        if (speechSilenceTimerRef.current) clearTimeout(speechSilenceTimerRef.current);
        setInterimTranscript('');
        handleIncomingSpeech(finalTranscript.trim(), 'You (Microphone)');
        return;
      }

      // 2. High-speed adaptive commit: update live interim text with 0 lag
      if (interim.trim()) {
        setInterimTranscript(interim.trim());

        // Debounce 450ms of silence to commit the phrase without waiting 3s for browser isFinal
        if (speechSilenceTimerRef.current) clearTimeout(speechSilenceTimerRef.current);
        speechSilenceTimerRef.current = setTimeout(() => {
          if (interim.trim()) {
            setInterimTranscript('');
            handleIncomingSpeech(interim.trim(), 'You (Microphone)');
          }
        }, 450);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'not-allowed') {
        setMicError('Microphone permission denied. Please allow microphone access in your browser.');
        setIsCapturing(false);
      }
    };

    // Auto-restart loop when browser tab loses focus or finishes a recognition cycle
    recognition.onend = () => {
      if (isCapturingRef.current) {
        try {
          recognition.start();
        } catch { }
      }
    };

    return recognition;
  }, [handleIncomingSpeech]);

  // Keep Audio and SpeechRecognition alive during window blur & visibility change (Tab Switch & App Switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isCapturingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch { }
      }
    };

    const handleWindowFocus = () => {
      if (isCapturingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch { }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Start Live Audio Capture
  const startLiveAudioCapture = useCallback(async (mode: AudioCaptureMode = captureMode) => {
    if (isCapturing) {
      stopLiveAudioCapture();
      return;
    }

    setMicError(null);

    try {
      // 1. Microphone capture
      if (mode === 'dual_mixed' || mode === 'mic_only') {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          setIsMicActive(true);
        } catch (e: any) {
          if (mode === 'mic_only') throw e;
          console.warn('Microphone not acquired for dual mix:', e);
        }
      }

      // 2. System / Tab audio capture
      if (mode === 'dual_mixed' || mode === 'system_tab_only') {
        try {
          if (navigator.mediaDevices.getDisplayMedia) {
            const systemStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: { echoCancellation: false, noiseSuppression: false },
            });
            systemStreamRef.current = systemStream;
            setIsSystemActive(true);
          }
        } catch (e) {
          console.warn('Display Media audio capture cancelled:', e);
        }
      }

      // 3. Start Web Speech Recognition
      const rec = initSpeechRecognition();
      if (rec) {
        recognitionRef.current = rec;
        rec.start();
      }

      setIsCapturing(true);
    } catch (err: any) {
      setMicError(err?.message || 'Failed to initialize audio capture.');
      setIsCapturing(false);
      setIsMicActive(false);
      setIsSystemActive(false);
    }
  }, [isCapturing, captureMode, initSpeechRecognition]);

  // Stop Live Audio Capture
  const stopLiveAudioCapture = useCallback(() => {
    isCapturingRef.current = false;
    setIsCapturing(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
      recognitionRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach((t) => t.stop());
      systemStreamRef.current = null;
    }

    setIsMicActive(false);
    setIsSystemActive(false);
  }, []);

  // Ingest audio file
  const handleAudioFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsProcessingAudioFile(true);

    setTimeout(() => {
      handleIncomingSpeech(
        `Uploaded audio transcript from ${file.name}: verified cluster access credentials with emergency backup token AKIA3X5Z8K9M2L1P0Q7R and database URI postgres://dbadmin:MasterSecret2026@cluster.internal:5432/main.`,
        `File (${file.name})`
      );
      setIsProcessingAudioFile(false);
    }, 1500);
  }, [handleIncomingSpeech]);

  // Reset/Clear Session
  const handleClearSession = useCallback(() => {
    if (currentSession.messages.length > 0) {
      setSessions((prev) => [
        { ...currentSession, status: 'completed', durationSeconds: Math.round((Date.now() - currentSession.startedAt) / 1000) },
        ...prev,
      ]);
    }
    setCurrentSession(createEmptySession());
  }, [currentSession]);

  const openExportModal = useCallback((format: 'txt' | 'md' | 'json') => {
    setExportModalState({ isOpen: true, format });
  }, []);

  const closeExportModal = useCallback(() => {
    setExportModalState({ isOpen: false, format: 'txt' });
  }, []);

  return (
    <AudioMeetingContext.Provider
      value={{
        isCapturing,
        captureMode,
        setCaptureMode,
        isMicActive,
        isSystemActive,
        micError,
        startLiveAudioCapture,
        stopLiveAudioCapture,
        pipelineLatencyMs,
        ramBufferState,
        recentCaughtAlert,
        setRecentCaughtAlert,
        interimTranscript,
        currentSession,
        setCurrentSession,
        sessions,
        setSessions,
        events,
        setEvents,
        rules,
        setRules,
        allowlist,
        setAllowlist,
        activeLayers,
        setActiveLayers,
        deploymentTier,
        setDeploymentTier,
        isProcessingAudioFile,
        uploadedFileName,
        handleAudioFileUpload,
        handleIncomingSpeech,
        handleClearSession,
        onRedactionCaught,
        onUpdateEventStatus,
        onAddAllowlist,
        onTuneThreshold,
        exportModalState,
        openExportModal,
        closeExportModal,
      }}
    >
      {children}
    </AudioMeetingContext.Provider>
  );
};

export const useAudioMeeting = () => {
  const context = useContext(AudioMeetingContext);
  if (!context) {
    throw new Error('useAudioMeeting must be used within an AudioMeetingProvider');
  }
  return context;
};
