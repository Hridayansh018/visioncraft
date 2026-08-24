'use client';

import React, { useState } from 'react';
import { 
  Cloud, 
  Server, 
  Lock, 
  DollarSign, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Key, 
  ArrowRight,
  TrendingUp,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { AppDeploymentTier } from './Navbar';

interface ArchitectureSaaSViewProps {
  deploymentTier: AppDeploymentTier;
  setDeploymentTier: (tier: AppDeploymentTier) => void;
}

export const ArchitectureSaaSView: React.FC<ArchitectureSaaSViewProps> = ({
  deploymentTier,
  setDeploymentTier,
}) => {
  // Interactive Cloud Economics Calculator State
  const [meetingHoursPerMonth, setMeetingHoursPerMonth] = useState<number>(5000);
  const [pricePerMinute, setPricePerMinute] = useState<number>(0.06);
  const [gpuHourlyRate, setGpuHourlyRate] = useState<number>(1.006); // AWS G5.xlarge
  const [concurrentStreamsPerGpu, setConcurrentStreamsPerGpu] = useState<number>(12); // faster-whisper int8 concurrency

  // Economic calculations
  const totalMinutes = meetingHoursPerMonth * 60;
  const totalRevenue = totalMinutes * pricePerMinute;
  
  // Assuming 20 working days, 8 hours peak distribution
  const peakConcurrency = Math.ceil(meetingHoursPerMonth / 160);
  const gpusRequired = Math.max(1, Math.ceil(peakConcurrency / concurrentStreamsPerGpu));
  const totalGpuHours = meetingHoursPerMonth / concurrentStreamsPerGpu;
  const gpuInfraCost = totalGpuHours * gpuHourlyRate;
  const auxiliaryCloudCost = totalRevenue * 0.08; // DB, API gateway, egress
  const totalInfraCost = gpuInfraCost + auxiliaryCloudCost;
  const grossProfit = totalRevenue - totalInfraCost;
  const grossMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const costPerTranscribedMinute = (totalInfraCost / totalMinutes).toFixed(4);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Cloud className="h-5 w-5 text-indigo-400" />
            SaaS Cloud Architecture & Unit Economics
          </h2>
          <p className="text-xs text-slate-400">
            Design principles, multi-tenant Data Plane vs Control Plane isolation, and GPU cost model.
          </p>
        </div>

        {/* Tier Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setDeploymentTier('local_mvp')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              deploymentTier === 'local_mvp'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 0: Local MVP
          </button>
          <button
            onClick={() => setDeploymentTier('cloud_saas')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              deploymentTier === 'cloud_saas'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 2: Zero-Retention Cloud SaaS
          </button>
          <button
            onClick={() => setDeploymentTier('enterprise_vpc')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              deploymentTier === 'enterprise_vpc'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Phase 3: Enterprise VPC
          </button>
        </div>
      </div>

      {/* Target Architecture Diagram (Control Plane vs Data Plane) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" />
            Multi-Tenant Zero-Retention Cloud Architecture
          </h3>
          <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-mono text-indigo-400 border border-indigo-800">
            Control Plane / Data Plane Split
          </span>
        </div>

        {/* Visual Architecture Schematic */}
        <div className="space-y-3 font-mono text-xs">
          {/* Control Plane */}
          <div className="rounded-lg border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between font-bold text-indigo-300">
              <span>┌─── CONTROL PLANE (Zero Raw Audio/Text Content Access) ───┐</span>
              <span className="text-[10px] bg-indigo-900/50 px-2 py-0.5 rounded text-indigo-300">
                Metadata & Billing Only
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="rounded border border-indigo-800 bg-slate-950 p-2 text-slate-200">
                Web App / Dashboard (React + Tailwind)
              </div>
              <div className="rounded border border-indigo-800 bg-slate-950 p-2 text-slate-200">
                Auth & SSO (SAML / OIDC)
              </div>
              <div className="rounded border border-indigo-800 bg-slate-950 p-2 text-slate-200">
                Tenant Config & Rules Engine
              </div>
              <div className="rounded border border-indigo-800 bg-slate-950 p-2 text-slate-200">
                Billing & Quota Metering (Stripe)
              </div>
            </div>
          </div>

          <div className="flex justify-center text-slate-600 text-sm">
            │ (Config, Rule Definitions, Public Keys) ▼
          </div>

          {/* Data Plane */}
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-emerald-300">
              <span>┌─── DATA PLANE (Ephemeral, Locked Down, Zero-Retention) ───┐</span>
              <span className="text-[10px] bg-emerald-900/50 px-2 py-0.5 rounded text-emerald-300">
                Self-Hosted Compute (No 3rd Party AI)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-[11px]">
              {/* Media Ingestion */}
              <div className="rounded border border-emerald-800 bg-slate-950 p-2.5 text-slate-200 space-y-1">
                <div className="text-emerald-400 font-bold">1. Media Ingestion</div>
                <div className="text-[10px] text-slate-400">WebRTC SFU (LiveKit) / WSS</div>
              </div>

              {/* STT Worker Pool */}
              <div className="rounded border border-emerald-800 bg-slate-950 p-2.5 text-slate-200 space-y-1">
                <div className="text-emerald-400 font-bold">2. Self-Hosted STT</div>
                <div className="text-[10px] text-slate-400">Autoscaling faster-whisper int8</div>
              </div>

              {/* Guardrail Service */}
              <div className="rounded border border-emerald-800 bg-slate-950 p-2.5 text-slate-200 space-y-1">
                <div className="text-emerald-400 font-bold">3. Guardrail Engine</div>
                <div className="text-[10px] text-slate-400">Presidio + Regex (RAM Only)</div>
              </div>

              {/* Redacted Outputs */}
              <div className="rounded border border-emerald-800 bg-slate-950 p-2.5 text-slate-200 space-y-1">
                <div className="text-emerald-400 font-bold">4. Redacted Output</div>
                <div className="text-[10px] text-slate-400">Encrypted Store + Audit Trail</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GPU Unit Economics & Margin Calculator */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Interactive GPU Cost Model & Margin Calculator (SaaS Addendum §9)
            </h3>
            <p className="text-xs text-slate-400">
              Simulate unit economics: GPU instances for self-hosted Whisper vs transcription pricing.
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-800">
            Projected Margin: <strong>{grossMarginPercent}%</strong>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          {/* Monthly Transcribed Hours */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Monthly Meeting Audio:</span>
              <span className="font-mono font-bold text-indigo-400">
                {meetingHoursPerMonth.toLocaleString()} hrs ({totalMinutes.toLocaleString()} mins)
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="50000"
              step="500"
              value={meetingHoursPerMonth}
              onChange={(e) => setMeetingHoursPerMonth(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Pricing Per Transcribed Minute */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Customer Price / Minute:</span>
              <span className="font-mono font-bold text-emerald-400">
                ${pricePerMinute.toFixed(2)} / min
              </span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.20"
              step="0.01"
              value={pricePerMinute}
              onChange={(e) => setPricePerMinute(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Concurrent Streams per GPU */}
          <div className="space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Streams per GPU (AWS G5):</span>
              <span className="font-mono font-bold text-amber-400">
                {concurrentStreamsPerGpu} streams
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="24"
              step="2"
              value={concurrentStreamsPerGpu}
              onChange={(e) => setConcurrentStreamsPerGpu(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* Economic Output Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400">Monthly Revenue:</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              ${Math.round(totalRevenue).toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400">GPU + Cloud Infra Cost:</span>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              ${Math.round(totalInfraCost).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              ${costPerTranscribedMinute} / min
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400">Estimated Gross Profit:</span>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
              ${Math.round(grossProfit).toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400">Peak GPU Workers:</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {gpusRequired} instances
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Autoscaled with scale-to-zero
            </div>
          </div>
        </div>
      </div>

      {/* Security, Compliance & Phased Roadmap Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Checklist */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm space-y-3 text-xs">
          <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Security & Compliance Checklist (SaaS Addendum §6)
          </h4>

          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">Zero-Retention Architecture</strong>
                <p className="text-slate-400 text-[11px]">Raw audio and transcripts exist only in RAM, overwritten with 0x00.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">Self-Hosted Compute (No 3rd Party AI)</strong>
                <p className="text-slate-400 text-[11px]">Whisper and Presidio run on isolated cloud compute.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">SOC 2 Type II & GDPR Alignment</strong>
                <p className="text-slate-400 text-[11px]">Tamper-evident audit logs, TLS 1.3, KMS envelope encryption.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phased Roadmap */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm space-y-3 text-xs">
          <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-indigo-400" />
            Phased Roadmap (SaaS Addendum §11)
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-indigo-900/60 bg-indigo-950/40 p-2.5">
              <div>
                <div className="font-semibold text-indigo-300">Phase 0: Local MVP (Current)</div>
                <div className="text-[10px] text-slate-400">faster-whisper + Presidio + SQLite audit log</div>
              </div>
              <span className="font-mono text-emerald-400 text-[10px] font-bold">COMPLETED</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <div>
                <div className="font-semibold text-slate-200">Phase 1: Single-Tenant Hosted Pilot</div>
                <div className="text-[10px] text-slate-400">Design partner pilot in isolated instance/VPC</div>
              </div>
              <span className="font-mono text-indigo-400 text-[10px]">4-8 WEEKS</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <div>
                <div className="font-semibold text-slate-200">Phase 2: Multi-Tenant Zero-Retention SaaS</div>
                <div className="text-[10px] text-slate-400">SSO, Stripe billing, autoscaling GPU pool</div>
              </div>
              <span className="font-mono text-slate-500 text-[10px]">2-4 MONTHS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
