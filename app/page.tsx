'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Mic, 
  ArrowRight, 
  Lock, 
  Zap, 
  Activity, 
  Layers, 
  EyeOff, 
  FileCheck, 
  CheckCircle2, 
  Radio, 
  Cpu, 
  Sparkles,
  Sliders,
  FlaskConical,
  LayoutDashboard,
  Cloud,
  FileText,
  Terminal,
  Check,
  X,
  ChevronRight,
  Headphones,
  Key,
  ShieldAlert,
  Server,
  Play
} from 'lucide-react';
import { processGuardrailPipeline } from '../lib/engine';
import { DEFAULT_GUARDRAIL_RULES } from '../lib/default-rules';

const DEMO_PRESETS = [
  {
    label: 'AWS Secret Key',
    text: 'Use my emergency AWS access key AKIA3X5Z8K9M2L1P0Q7R right now to inspect the production bucket logs.',
    category: 'Cloud Credentials',
  },
  {
    label: 'Luhn Credit Card',
    text: 'Please bill corporate card 4532 0150 0000 0007 for the monthly AWS cluster subscription.',
    category: 'Financial PII',
  },
  {
    label: 'Spelled-out Password',
    text: 'Your temporary bastion host passcode is capital S, u, n, 2, 0, 2, 6, exclamation.',
    category: 'Speech Normalizer',
  },
  {
    label: 'Postgres DB URI',
    text: 'Emergency failover database URI is postgres://admin_user:SuperSecret2026!@pg-cluster.internal:5432/main_db.',
    category: 'Database Keys',
  },
];

export default function LandingPage() {
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);
  const [inputText, setInputText] = useState<string>(DEMO_PRESETS[0].text);

  const activePreset = DEMO_PRESETS[activePresetIndex];
  const scanResult = processGuardrailPipeline(
    inputText,
    DEFAULT_GUARDRAIL_RULES,
    'landing-preview',
    { enableNormalization: true }
  );

  return (
    <div className="min-h-screen bg-[#000000] text-[#f1f3f9] selection:bg-white selection:text-black font-sans">
      {/* Hero Container with Atmospheric Mountain Dusk Horizon */}
      <div className="relative overflow-hidden bg-[#000000]">
        {/* Mountain Horizon Background Image with Gradient Overlay */}
        <div 
          className="absolute top-0 left-0 right-0 h-[640px] bg-cover bg-center bg-no-repeat pointer-events-none opacity-45"
          style={{ backgroundImage: "url('/mountain_horizon_dusk.jpg')" }}
        />
        <div className="absolute top-0 left-0 right-0 h-[640px] bg-gradient-to-b from-[#000000]/25 via-[#000000]/70 to-[#000000] pointer-events-none" />

        {/* Top Minimal Navigation Bar */}
        <header className="relative z-20 flex items-center justify-between py-6 max-w-6xl mx-auto px-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white shadow-sm backdrop-blur-md group-hover:bg-white/20 transition-all">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              VisionCraft <span className="text-white/40 font-normal">Guardrail</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs text-white/70 font-medium tracking-wide">
            <Link href="/live" className="hover:text-white transition-colors">Live Meeting</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Telemetry</Link>
            <Link href="/rules" className="hover:text-white transition-colors">Rules Manager</Link>
            <Link href="/eval" className="hover:text-white transition-colors">Quality & Eval</Link>
            <Link href="/architecture" className="hover:text-white transition-colors">Architecture</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs text-white/70 hover:text-white transition-colors hidden sm:inline"
            >
              Dashboard
            </Link>
            <Link
              href="/live"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black font-semibold text-xs shadow-md hover:bg-white/90 transition-all transform hover:-translate-y-0.5"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Hero Content Section */}
        <section className="relative z-10 text-center max-w-4xl mx-auto pt-14 pb-20 px-6 space-y-7">
          {/* Subtle Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 border border-white/15 text-[11px] font-mono text-white/85 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CONFIDENTIAL VOICE GUARDRAIL</span>
          </div>

          {/* Hero Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
              Run Confidential <br />
              <span className="text-white/90">
                Meeting Streams, 24/7
              </span>
            </h1>
            <p className="text-sm sm:text-base text-[#94a3b8] max-w-2xl mx-auto font-normal leading-relaxed">
              Zero-retention voice guardrail that intercepts credentials, API keys, credit cards, and spoken passwords in volatile RAM within <strong className="text-white">&lt;15ms</strong> before display or storage.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href="/live"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-xs sm:text-sm shadow-xl hover:bg-white/90 transition-all transform hover:-translate-y-0.5"
            >
              <Mic className="w-4 h-4" />
              <span>Start Live Guardrail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/architecture"
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.08] border border-white/15 text-white font-medium text-xs sm:text-sm hover:bg-white/15 backdrop-blur-md transition-all"
            >
              <span>See Architecture & Economics</span>
            </Link>
          </div>

          {/* Hero Key Metrics Bar */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-6 text-xs text-[#94a3b8] font-mono">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-white" />
              <span>&lt; 15ms Pipeline Latency</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-white" />
              <span>0x00 RAM Memory Wipe</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-white" />
              <span>4 Defense-in-Depth Layers</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-white" />
              <span>100% Local On-Prem Ready</span>
            </div>
          </div>
        </section>

        {/* Floating Glassmorphic Interactive Product Showcase */}
        <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
          <div className="rounded-3xl border border-white/[0.14] bg-[#07080a]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-6">
            {/* Showcase Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-white/80 uppercase tracking-wider font-semibold">
                  Zero-Retention Live Telemetry
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-[#94a3b8]">
                <span>LATENCY: <strong className="text-white">{scanResult.processingTimeMs}ms</strong></span>
                <span>·</span>
                <span>SECRETS MASKED: <strong className="text-rose-400">{scanResult.detectedSpans.length}</strong></span>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono text-[#64748b] uppercase tracking-wider">
                Select Interactive Threat Scenario
              </label>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESETS.map((p, idx) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setActivePresetIndex(idx);
                      setInputText(p.text);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activePresetIndex === idx
                        ? 'bg-white text-black font-semibold shadow-md'
                        : 'bg-white/[0.05] border border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/[0.1]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Screen Sandbox: Input vs Output */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              {/* Left: Input Textarea */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-[#64748b] uppercase tracking-wider">
                  Raw Speech Audio Stream (Utterance)
                </label>
                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#000000] px-4 py-3 text-xs sm:text-sm text-white focus:border-white/30 focus:outline-none resize-none font-mono placeholder:text-white/30"
                  placeholder="Type or paste any spoken speech text..."
                />
              </div>

              {/* Right: Sanitized Output with Intercept Chips */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sanitized Transcript (Safe for UI & Logs)
                </label>
                <div className="rounded-2xl border border-white/10 bg-[#000000] p-4 text-xs sm:text-sm text-white/90 font-mono leading-relaxed min-h-[104px]">
                  {scanResult.redactedText}
                </div>
              </div>
            </div>

            {/* Intercepted Badges */}
            {scanResult.detectedSpans.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs border-t border-white/[0.08]">
                <span className="text-[#64748b] text-[11px] font-mono">Intercepted Rules:</span>
                {scanResult.detectedSpans.map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/15 text-white font-mono text-[11px] flex items-center gap-1.5"
                  >
                    <EyeOff className="w-3 h-3 text-rose-400" />
                    <span>{s.ruleName}</span>
                    <span className="text-[#64748b]">({Math.round(s.confidence * 100)}%)</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Editorial Narrative Section */}
      <section className="max-w-4xl mx-auto py-24 px-6 text-center space-y-7 border-t border-b border-white/[0.08] bg-[#000000]">
        <div className="space-y-3">
          <p className="text-xl sm:text-3xl text-white font-serif leading-relaxed">
            Engineering wants to troubleshoot outages freely over voice.
          </p>
          <p className="text-xl sm:text-3xl text-white font-serif leading-relaxed">
            Security requires zero credentials or customer PII leaked to disk.
          </p>
          <p className="text-xl sm:text-3xl text-[#64748b] font-serif leading-relaxed italic">
            Traditional meeting bots expose both.
          </p>
          <p className="text-xl sm:text-3xl text-emerald-400 font-serif leading-relaxed font-semibold">
            VisionCraft solves both simultaneously.
          </p>
        </div>
      </section>

      {/* 3-Column Architectural Feature Cards */}
      <section className="max-w-5xl mx-auto py-20 px-6 space-y-12 bg-[#000000]">
        <div className="text-center space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b]">
            Four-Layer Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Comprehensive Defense-in-Depth
          </h2>
          <p className="text-xs text-[#94a3b8] max-w-lg mx-auto">
            Combining phonetic speech normalizers, deterministic DFA regex grammars, and contextual spoken cue detectors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Layer 0 */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#07080a] p-6 space-y-4 hover:border-white/20 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-white">
              <Mic className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[11px] text-[#64748b]">LAYER 0</div>
              <h3 className="text-base font-bold text-white">Speech Normalizer</h3>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Transforms spelled-out characters (&ldquo;capital S, u, n&rdquo;), verbal punctuation (&ldquo;dot&rdquo;, &ldquo;at&rdquo;), and conversational fillers into canonical regex forms.
            </p>
          </div>

          {/* Layer 1 */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#07080a] p-6 space-y-4 hover:border-white/20 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[11px] text-[#64748b]">LAYER 1</div>
              <h3 className="text-base font-bold text-white">DFA Regex & Luhn Check</h3>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Deterministic DFA patterns covering AWS, GitHub, OpenAI keys, DB connection strings, and Mod-10 Luhn checksum algorithm for financial credentials.
            </p>
          </div>

          {/* Layer 3 */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#07080a] p-6 space-y-4 hover:border-white/20 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[11px] text-[#64748b]">LAYER 3</div>
              <h3 className="text-base font-bold text-white">Conversational Secret Cues</h3>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Detects verbal lead-in triggers like &ldquo;the password is&rdquo;, &ldquo;temporary code&rdquo;, or &ldquo;root key&rdquo; to mask high-entropy secrets without strict syntax.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="max-w-4xl mx-auto py-16 px-6 space-y-8 bg-[#000000]">
        <div className="text-center space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#64748b]">
            Comparison Matrix
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Built For How Voice Actually Leaks
          </h2>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#07080a] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[#94a3b8] font-mono text-[11px]">
                  <th className="py-4 px-6">SECURITY & PRIVACY CAPABILITY</th>
                  <th className="py-4 px-6 text-center text-[#64748b]">TRADITIONAL RECORDING BOTS</th>
                  <th className="py-4 px-6 text-center text-white font-bold">VISIONCRAFT GUARDRAIL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-[#e2e8f0]">
                <tr>
                  <td className="py-3.5 px-6 font-medium">Volatile RAM Only (Zero-Disk Retention)</td>
                  <td className="py-3.5 px-6 text-center text-rose-400">Persisted to Disk</td>
                  <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">0x00 RAM Wipe</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium">Real-Time Latency</td>
                  <td className="py-3.5 px-6 text-center text-[#64748b]">5 - 15 Seconds</td>
                  <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">&lt; 15 Milliseconds</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium">Spelled-Out Passwords & Punctuation</td>
                  <td className="py-3.5 px-6 text-center text-rose-400">Ignored / Leaked</td>
                  <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">Layer 0 Normalized</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium">Luhn Mod-10 Checksum Filtering</td>
                  <td className="py-3.5 px-6 text-center text-rose-400">High False Positives</td>
                  <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">Zero False Escapes</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-medium">Cryptographic Audit Trail</td>
                  <td className="py-3.5 px-6 text-center text-[#64748b]">Plain Text Logs</td>
                  <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">SHA-256 Chained Hashes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Module Navigation Grid */}
      <section className="max-w-5xl mx-auto py-16 px-6 space-y-8 bg-[#000000]">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Explore Guardrail Modules</h2>
          <p className="text-xs text-[#94a3b8]">Direct access to operational tools and analytics</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/live"
            className="rounded-2xl border border-white/[0.08] bg-[#07080a] p-5 hover:border-white/20 hover:bg-[#0e1014] transition-all flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-xl bg-white/[0.05] text-white border border-white/10">
              <Mic className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>Live Meeting Stream</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-[#94a3b8]">Dual microphone and system audio bridge with real-time waveform</p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/[0.08] bg-[#07080a] p-5 hover:border-white/20 hover:bg-[#0e1014] transition-all flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-xl bg-white/[0.05] text-white border border-white/10">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>Security Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-[#94a3b8]">Real-time KPI metrics, threat distributions, and latency telemetry</p>
            </div>
          </Link>

          <Link
            href="/review"
            className="rounded-2xl border border-white/[0.08] bg-[#07080a] p-5 hover:border-white/20 hover:bg-[#0e1014] transition-all flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-xl bg-white/[0.05] text-white border border-white/10">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>Review Queue</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-[#94a3b8]">Human-in-the-loop feedback with safe masked context windows</p>
            </div>
          </Link>

          <Link
            href="/rules"
            className="rounded-2xl border border-white/[0.08] bg-[#07080a] p-5 hover:border-white/20 hover:bg-[#0e1014] transition-all flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-xl bg-white/[0.05] text-white border border-white/10">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>Rules Manager</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-[#94a3b8]">Configure regex recognizers, allowlists, and confidence thresholds</p>
            </div>
          </Link>

          <Link
            href="/eval"
            className="rounded-2xl border border-white/[0.08] bg-[#07080a] p-5 hover:border-white/20 hover:bg-[#0e1014] transition-all flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-xl bg-white/[0.05] text-white border border-white/10">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>Quality & Evaluation</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-[#94a3b8]">Automated benchmark suites and synthetic dataset generator</p>
            </div>
          </Link>

          <Link
            href="/audit"
            className="rounded-2xl border border-white/[0.08] bg-[#07080a] p-5 hover:border-white/20 hover:bg-[#0e1014] transition-all flex items-start gap-4 group"
          >
            <div className="p-2.5 rounded-xl bg-white/[0.05] text-white border border-white/10">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>Audit Trail</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-[#94a3b8]">Cryptographically chained SHA-256 immutable audit records</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Bottom Horizon CTA Section with Mountain Dusk Artwork */}
      <section className="relative max-w-5xl mx-auto my-16 px-6 bg-[#000000]">
        <div className="relative rounded-3xl border border-white/[0.12] bg-[#07080a] p-10 sm:p-14 text-center overflow-hidden shadow-2xl space-y-6">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
            style={{ backgroundImage: "url('/mountain_horizon_dusk.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-[#07080a]/70 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-3 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Protect Your Meeting Audio?
            </h2>
            <p className="text-xs sm:text-sm text-[#94a3b8]">
              Deploy locally on-premises or into your enterprise private cloud. Zero data persistence, zero third-party leakage.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/live"
              className="px-6 py-3 rounded-full bg-white text-black font-semibold text-xs sm:text-sm shadow-xl hover:bg-white/90 transition-all transform hover:-translate-y-0.5"
            >
              Start Live Guardrail
            </Link>
            <Link
              href="/architecture"
              className="px-5 py-3 rounded-full bg-white/[0.08] border border-white/15 text-white font-medium text-xs sm:text-sm hover:bg-white/15 transition-all"
            >
              View SaaS Architecture
            </Link>
          </div>
        </div>

        {/* Large Watermark Brand */}
        <div className="pt-16 pb-8 text-center select-none pointer-events-none">
          <span className="font-extrabold text-6xl sm:text-8xl md:text-9xl text-white/[0.04] tracking-widest uppercase">
            VisionCraft
          </span>
        </div>
      </section>
    </div>
  );
}
