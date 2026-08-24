'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab, AppDeploymentTier } from '../components/Navbar';
import { LiveMeetingView } from '../components/LiveMeetingView';
import { DashboardView } from '../components/DashboardView';
import { ReviewQueueView } from '../components/ReviewQueueView';
import { RulesManagerView } from '../components/RulesManagerView';
import { EvaluationView } from '../components/EvaluationView';
import { AuditLogView } from '../components/AuditLogView';
import { ArchitectureSaaSView } from '../components/ArchitectureSaaSView';
import { ExportModal } from '../components/ExportModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GuardrailRule, RedactionEvent, MeetingSession } from '../lib/types';
import { DEFAULT_GUARDRAIL_RULES } from '../lib/default-rules';
import { createMetadataHash } from '../lib/engine';

const STATIC_NOW = 1715000000000;

const INITIAL_EVENTS: RedactionEvent[] = [
  {
    id: 'evt-init-001',
    sessionId: 'session-main-01',
    timestamp: STATIC_NOW - 1000 * 60 * 10,
    ruleId: 'rule-aws-key',
    ruleName: 'AWS Access Key ID',
    category: 'api_keys',
    layer: 1,
    confidence: 0.95,
    severity: 'critical',
    safeMaskedContext: '...reading the backup AWS key [AWS_ACCESS_KEY] to inspect...',
    status: 'pending_review',
    charOffset: 35,
    integrityHash: createMetadataHash('session-main-01:rule-aws-key:api_keys:0.95:35:51'),
  },
  {
    id: 'evt-init-002',
    sessionId: 'session-archived-99',
    timestamp: STATIC_NOW - 1000 * 60 * 45,
    ruleId: 'rule-db-uri',
    ruleName: 'Database Connection String',
    category: 'credentials',
    layer: 1,
    confidence: 0.95,
    severity: 'critical',
    safeMaskedContext: '...connection URI is [DATABASE_CONN_URI] please reset...',
    status: 'confirmed_true_positive',
    charOffset: 24,
    integrityHash: createMetadataHash('session-archived-99:rule-db-uri:credentials:0.95:24:60'),
  },
  {
    id: 'evt-init-003',
    sessionId: 'session-archived-99',
    timestamp: STATIC_NOW - 1000 * 60 * 40,
    ruleId: 'rule-spoken-password',
    ruleName: 'Spoken Password Lead-in',
    category: 'spoken_cue',
    layer: 3,
    confidence: 0.85,
    severity: 'critical',
    safeMaskedContext: '...the master password is [SPOKEN_SECRET] for root...',
    status: 'confirmed_true_positive',
    charOffset: 28,
    integrityHash: createMetadataHash('session-archived-99:rule-spoken-password:spoken_cue:0.85:28:44'),
  },
  {
    id: 'evt-init-004',
    sessionId: 'session-archived-98',
    timestamp: STATIC_NOW - 1000 * 60 * 120,
    ruleId: 'rule-credit-card',
    ruleName: 'Credit Card Number (Luhn-checked)',
    category: 'financial',
    layer: 1,
    confidence: 0.9,
    severity: 'critical',
    safeMaskedContext: '...corporate card [CREDIT_CARD] for subscription...',
    status: 'confirmed_true_positive',
    charOffset: 18,
    integrityHash: createMetadataHash('session-archived-98:rule-credit-card:financial:0.9:18:36'),
  },
];

const INITIAL_SESSION: MeetingSession = {
  id: 'session-main-01',
  title: 'Live Executive Incident Bridge',
  startedAt: STATIC_NOW - 1000 * 60 * 14,
  durationSeconds: 840,
  source: 'microphone',
  messages: [
    {
      id: 'msg-init-1',
      speaker: 'Sarah (SRE Lead)',
      timestamp: STATIC_NOW - 1000 * 60 * 12,
      redactedText: 'Starting emergency sync for cluster us-east-1. Please do not post raw credentials in slack.',
      detectedSpans: [],
    },
    {
      id: 'msg-init-2',
      speaker: 'Alex (Backend Eng)',
      timestamp: STATIC_NOW - 1000 * 60 * 10,
      redactedText: 'I am reading the backup AWS key [AWS_ACCESS_KEY] to inspect the dead-letter queue.',
      detectedSpans: [
        {
          id: 'span-init-1',
          ruleId: 'rule-aws-key',
          ruleName: 'AWS Access Key ID',
          category: 'api_keys',
          layer: 1,
          start: 35,
          end: 51,
          rawTextPreviewMasked: 'AKIA••••7X',
          maskedReplacement: '[AWS_ACCESS_KEY]',
          confidence: 0.95,
          severity: 'critical',
          contextSnippet: '...reading the backup AWS key [AWS_ACCESS_KEY] to inspect...',
        },
      ],
    },
  ],
  totalRedactions: 1,
  redactionsByCategory: { api_keys: 1 },
  status: 'live',
};

export default function Page() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  const [deploymentTier, setDeploymentTier] = useState<AppDeploymentTier>('local_mvp');
  const [rules, setRules] = useState<GuardrailRule[]>(DEFAULT_GUARDRAIL_RULES);
  const [allowlist, setAllowlist] = useState<string[]>(['sample_harmless_token_test']);
  const [activeLayers, setActiveLayers] = useState<{ layer1: boolean; layer2: boolean; layer3: boolean }>({
    layer1: true,
    layer2: true,
    layer3: true,
  });

  // Current Active Meeting Session
  const [currentSession, setCurrentSession] = useState<MeetingSession>(INITIAL_SESSION);

  // Past Sessions
  const [sessions, setSessions] = useState<MeetingSession[]>([]);

  // Redaction Review Events Catalog
  const [events, setEvents] = useState<RedactionEvent[]>(INITIAL_EVENTS);

  // Export Modal State
  const [exportModalState, setExportModalState] = useState<{
    isOpen: boolean;
    format: 'txt' | 'md' | 'json';
  }>({
    isOpen: false,
    format: 'txt',
  });

  // Load state from localStorage on mount
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

      const savedTier = localStorage.getItem('guardrail_tier') as AppDeploymentTier;
      if (savedTier) setDeploymentTier(savedTier);
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('guardrail_rules', JSON.stringify(rules));
    } catch {}
  }, [rules]);

  useEffect(() => {
    try {
      localStorage.setItem('guardrail_allowlist', JSON.stringify(allowlist));
    } catch {}
  }, [allowlist]);

  useEffect(() => {
    try {
      localStorage.setItem('guardrail_layers', JSON.stringify(activeLayers));
    } catch {}
  }, [activeLayers]);

  useEffect(() => {
    try {
      localStorage.setItem('guardrail_events', JSON.stringify(events));
    } catch {}
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('guardrail_sessions', JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem('guardrail_tier', deploymentTier);
    } catch {}
  }, [deploymentTier]);

  // Handler when new redaction caught during live meeting
  const handleRedactionCaught = useCallback((event: RedactionEvent) => {
    setEvents((prev) => [event, ...prev]);
  }, []);

  // Review Queue actions
  const handleUpdateEventStatus = useCallback((eventId: string, status: RedactionEvent['status']) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status } : e))
    );
  }, []);

  const handleAddAllowlist = useCallback((term: string) => {
    if (!term.trim()) return;
    setAllowlist((prev) => (prev.includes(term.trim()) ? prev : [...prev, term.trim()]));
  }, []);

  const handleTuneThreshold = useCallback((ruleId: string, delta: number) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          const newThresh = Math.min(1.0, Math.max(0.5, Math.round((r.confidenceThreshold + delta) * 100) / 100));
          return { ...r, confidenceThreshold: newThresh };
        }
        return r;
      })
    );
  }, []);

  const handleOpenExport = useCallback((format: 'txt' | 'md' | 'json') => {
    setExportModalState({ isOpen: true, format });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        deploymentTier={deploymentTier}
        setDeploymentTier={setDeploymentTier}
        isCapturing={currentSession.status === 'live' && currentSession.messages.length > 0}
        caughtCount={events.filter((e) => e.status === 'pending_review').length}
      />

      {/* Main App Content View Container wrapped in ErrorBoundary */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <ErrorBoundary>
          {activeTab === 'live' && (
            <LiveMeetingView
              rules={rules}
              currentSession={currentSession}
              setCurrentSession={setCurrentSession}
              onRedactionCaught={handleRedactionCaught}
              allowlist={allowlist}
              activeLayers={activeLayers}
              onOpenRulesManager={() => setActiveTab('rules')}
              onExport={handleOpenExport}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              events={events}
              sessions={sessions}
              currentSession={currentSession}
              totalAudioMinutes={14.0 + sessions.reduce((acc, s) => acc + s.durationSeconds / 60, 0)}
            />
          )}

          {activeTab === 'review' && (
            <ReviewQueueView
              events={events}
              onUpdateEventStatus={handleUpdateEventStatus}
              onAddAllowlist={handleAddAllowlist}
              onTuneThreshold={handleTuneThreshold}
              rules={rules}
            />
          )}

          {activeTab === 'rules' && (
            <RulesManagerView
              rules={rules}
              setRules={setRules}
              activeLayers={activeLayers}
              setActiveLayers={setActiveLayers}
            />
          )}

          {activeTab === 'eval' && (
            <EvaluationView
              rules={rules}
              activeLayers={activeLayers}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogView
              events={events}
              sessionId={currentSession.id}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureSaaSView
              deploymentTier={deploymentTier}
              setDeploymentTier={setDeploymentTier}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Export Modal */}
      {exportModalState.isOpen && (
        <ExportModal
          session={currentSession}
          format={exportModalState.format}
          onClose={() => setExportModalState({ isOpen: false, format: 'txt' })}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Confidential-Info Guardrail · Zero-Retention Architecture · Defense-in-Depth
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            faster-whisper (RAM only) · Microsoft Presidio · Gitleaks regex catalog
          </span>
        </div>
      </footer>
    </div>
  );
}

