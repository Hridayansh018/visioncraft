'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  X, 
  FileText, 
  ShieldCheck, 
  Cpu, 
  Key, 
  Sliders, 
  RotateCcw, 
  AlertCircle,
  FileCode,
  Layers,
  Clock,
  Zap,
  Lock,
  CheckSquare,
  AlertTriangle,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { MeetingSession, SummaryTemplate, OpenRouterModel } from '../lib/types';

interface MeetingSummaryModalProps {
  session: MeetingSession;
  onClose: () => void;
}

const OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Fast, high-throughput meeting analysis' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'High reasoning precision & concise action items' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', description: 'Top-tier open-weight model' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast, multimodal reasoning engine' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', description: 'Deep context processing & code analysis' },
];

const TEMPLATE_CONFIG = [
  { id: 'executive', label: 'Executive Brief', icon: FileText, desc: 'High-level business brief & decisions' },
  { id: 'action_items', label: 'Action Items', icon: CheckSquare, desc: 'Concrete tasks, owners & deadlines' },
  { id: 'post_mortem', label: 'Incident Post-Mortem', icon: AlertTriangle, desc: 'Root cause & operational mitigations' },
  { id: 'interview', label: 'Candidate Assessment', icon: UserCheck, desc: 'Technical competencies & rubric' },
];

export const MeetingSummaryModal: React.FC<MeetingSummaryModalProps> = ({ session, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<SummaryTemplate>('executive');
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');
  const [customModelId, setCustomModelId] = useState<string>('');
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  
  const [summaryText, setSummaryText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll as text streams in
  useEffect(() => {
    if (isStreaming && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [summaryText, isStreaming]);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Construct Sanitized Transcript
  const getSanitizedTranscript = () => {
    return session.messages
      .map((m) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.speaker}:\n${m.redactedText}`)
      .join('\n\n');
  };

  // Start Streaming Summary from OpenRouter API
  const handleGenerateSummary = async () => {
    if (isStreaming) return;
    setSummaryText('');
    setStreamError(null);
    setIsStreaming(true);

    const sanitizedTranscript = getSanitizedTranscript();
    if (!sanitizedTranscript.trim()) {
      setStreamError('No meeting messages recorded yet. Record audio or run a simulation first.');
      setIsStreaming(false);
      return;
    }

    const activeModel = customModelId.trim() || selectedModel;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: sanitizedTranscript,
          template: selectedTemplate,
          model: activeModel,
          userApiKey: userApiKey.trim() || undefined,
          sessionTitle: session.title,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              setIsStreaming(false);
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                setSummaryText((prev) => prev + parsed.content);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStreamError(err.message || 'Failed to stream summary from OpenRouter.');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  // Copy Summary to Clipboard
  const handleCopySummary = async () => {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Download Summary as Markdown (.md)
  const handleDownloadMarkdown = () => {
    if (!summaryText) return;
    const blob = new Blob([summaryText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-summary-${selectedTemplate}-${session.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download Summary as Plain Text (.txt)
  const handleDownloadPlainText = () => {
    if (!summaryText) return;
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-summary-${selectedTemplate}-${session.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-white/10 bg-[#0c0d12] shadow-2xl overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">AI Meeting Summarizer</h3>
                <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-indigo-300">
                  OpenRouter Streaming
                </span>
              </div>
              <p className="text-xs text-white/50">
                Session: <span className="font-semibold text-white/80">{session.title}</span> • {session.messages.length} messages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Redactions Protected Badge */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{session.totalRedactions} Secrets Protected</span>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar: Templates & OpenRouter Models */}
        <div className="border-b border-white/10 bg-white/[0.01] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Template Selector with Icons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-white/50 font-medium mr-1 flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                Template:
              </span>
              {TEMPLATE_CONFIG.map((tpl) => {
                const IconComponent = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id as SummaryTemplate)}
                    disabled={isStreaming}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-semibold shadow-md'
                        : 'bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    <IconComponent className={`h-3.5 w-3.5 ${isSelected ? 'text-indigo-600' : 'text-white/60'}`} />
                    <span>{tpl.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Model Selector & Action Trigger */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-white/40" />
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setCustomModelId('');
                  }}
                  disabled={isStreaming}
                  className="rounded-lg border border-white/10 bg-[#07080a] px-2.5 py-1.5 text-xs text-white focus:border-white/30 focus:outline-none disabled:opacity-50"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#07080a] text-white">
                      {m.provider} • {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`rounded-lg border p-2 text-xs transition-colors cursor-pointer ${
                  userApiKey ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/[0.05] text-white/60 hover:text-white'
                }`}
                title="Custom OpenRouter API Key (Optional)"
              >
                <Key className="h-3.5 w-3.5" />
              </button>

              {isStreaming ? (
                <button
                  onClick={handleStopStreaming}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition-all animate-pulse cursor-pointer"
                >
                  <span>Stop Streaming</span>
                </button>
              ) : (
                <button
                  onClick={handleGenerateSummary}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-500/30 ring-1 ring-purple-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate AI Summary</span>
                </button>
              )}
            </div>
          </div>

          {/* Optional API Key & Custom Model input drawer */}
          {showKeyInput && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-xs">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="password"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="OpenRouter API Key (sk-or-v1-...) or leave blank to use server key"
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/30 focus:outline-none font-mono"
                />
              </div>
              <div className="w-56">
                <input
                  type="text"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  placeholder="Custom Model ID (e.g. meta-llama/llama-3-8b)"
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/30 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Streaming Content Display Area with Rich Markdown Rendering */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-sm text-white/90 bg-[#08090d]"
        >
          {streamError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong>Streaming Notice:</strong> {streamError}
              </div>
            </div>
          )}

          {summaryText ? (
            <div className="space-y-4 text-white/90 leading-relaxed font-sans">
              <MarkdownRenderer content={summaryText} isStreaming={isStreaming} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 text-white/40 space-y-3">
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-white/60">
                <FileCode className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-sm font-semibold text-white/90">Ready to Generate Concise Summary</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Select a template and click <strong>&ldquo;Generate AI Summary&rdquo;</strong> above to stream an executive brief, action item register, or post-mortem directly from OpenRouter models.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 rounded-full">
                <Lock className="h-3 w-3" />
                <span>Zero-Retention: Redacted transcript only</span>
              </div>
            </div>
          )}
        </div>

        {/* Separate Summary Download & Export Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#07080a] px-6 py-3.5 text-xs">
          <div className="flex items-center gap-2 text-white/50">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px]">
              {summaryText ? `${summaryText.split(/\s+/).filter(Boolean).length} words generated` : 'Awaiting generation'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopySummary}
              disabled={!summaryText || isStreaming}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/10 px-3 py-1.5 text-white/80 font-medium transition-colors disabled:opacity-30 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-white/50" />}
              <span>{copied ? 'Copied Summary' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleDownloadPlainText}
              disabled={!summaryText || isStreaming}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/10 px-3 py-1.5 text-white/80 font-medium transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-white/50" />
              <span>Download Summary (.TXT)</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              disabled={!summaryText || isStreaming}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-white font-semibold shadow-md transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Summary (.MD)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
