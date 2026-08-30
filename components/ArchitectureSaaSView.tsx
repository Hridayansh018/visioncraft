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
import { useAudioMeeting, AppDeploymentTier } from '../context/AudioMeetingContext';

interface ArchitectureSaaSViewProps {
  deploymentTier?: AppDeploymentTier;
  setDeploymentTier?: (tier: AppDeploymentTier) => void;
}

export const ArchitectureSaaSView: React.FC<ArchitectureSaaSViewProps> = (props) => {
  const context = useAudioMeeting();
  const deploymentTier = props.deploymentTier || context.deploymentTier;
  const setDeploymentTier = props.setDeploymentTier || context.setDeploymentTier;

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
            <Cloud className="h-5 w-5 text-white" />
            SaaS Cloud Architecture & Unit Economics
          </h2>
          <p className="text-xs text-white/50">
            Design principles, multi-tenant Data Plane vs Control Plane isolation, and GPU cost model.
          </p>
        </div>

        {/* Tier Buttons */}
        <div className="flex items-center gap-1.5 bg-[#07080a] border border-white/10 p-1 rounded-full text-xs">
          <button
            onClick={() => setDeploymentTier('local_mvp')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              deploymentTier === 'local_mvp'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Phase 0: Local MVP
          </button>
          <button
            onClick={() => setDeploymentTier('cloud_saas')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              deploymentTier === 'cloud_saas'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Phase 2: Cloud SaaS
          </button>
          <button
            onClick={() => setDeploymentTier('enterprise_vpc')}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
              deploymentTier === 'enterprise_vpc'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Phase 3: Dedicated VPC
          </button>
        </div>
      </div>

      {/* Target Architecture Diagram (Control Plane vs Data Plane) */}
      <div className="rounded-2xl border border-white/10 bg-[#07080a] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-white" />
            Multi-Tenant Zero-Retention Cloud Architecture
          </h3>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-mono text-white/70 border border-white/15">
            Control Plane / Data Plane Split
          </span>
        </div>

        {/* Visual Architecture Schematic */}
        <div className="space-y-3 font-mono text-xs">
          {/* Control Plane */}
          <div className="rounded-2xl border border-white/15 bg-[#000000] p-4 space-y-2">
            <div className="flex items-center justify-between font-bold text-white">
              <span>CONTROL PLANE (Zero Raw Audio/Text Content Access)</span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                Metadata & Billing Only
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="rounded-xl border border-white/10 bg-[#07080a] p-2.5 text-white/80">
                Web App / Dashboard (React + Tailwind)
              </div>
              <div className="rounded-xl border border-white/10 bg-[#07080a] p-2.5 text-white/80">
                Auth & SSO (SAML / OIDC)
              </div>
              <div className="rounded-xl border border-white/10 bg-[#07080a] p-2.5 text-white/80">
                Tenant Config & Rules Engine
              </div>
              <div className="rounded-xl border border-white/10 bg-[#07080a] p-2.5 text-white/80">
                Billing & Quota Metering (Stripe)
              </div>
            </div>
          </div>

          <div className="flex justify-center text-white/40 text-sm">
            │ (Config, Rule Definitions, Public Keys) ▼
          </div>

          {/* Data Plane */}
          <div className="rounded-2xl border border-emerald-500/30 bg-[#000000] p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-emerald-300">
              <span>DATA PLANE (Ephemeral, Locked Down, Zero-Retention)</span>
              <span className="text-[10px] bg-emerald-500/15 px-2.5 py-0.5 rounded-full text-emerald-300 border border-emerald-500/30">
                Self-Hosted Compute (No 3rd Party AI)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-[11px]">
              {/* Media Ingestion */}
              <div className="rounded-xl border border-emerald-500/20 bg-[#07080a] p-3 text-white space-y-1">
                <div className="text-emerald-400 font-bold">1. Media Ingestion</div>
                <div className="text-[10px] text-white/40">WebRTC SFU (LiveKit) / WSS</div>
              </div>

              {/* STT Worker Pool */}
              <div className="rounded-xl border border-emerald-500/20 bg-[#07080a] p-3 text-white space-y-1">
                <div className="text-emerald-400 font-bold">2. Self-Hosted STT</div>
                <div className="text-[10px] text-white/40">Autoscaling faster-whisper int8</div>
              </div>

              {/* Guardrail Service */}
              <div className="rounded-xl border border-emerald-500/20 bg-[#07080a] p-3 text-white space-y-1">
                <div className="text-emerald-400 font-bold">3. Guardrail Engine</div>
                <div className="text-[10px] text-white/40">Presidio + Regex (RAM Only)</div>
              </div>

              {/* Redacted Outputs */}
              <div className="rounded-xl border border-emerald-500/20 bg-[#07080a] p-3 text-white space-y-1">
                <div className="text-emerald-400 font-bold">4. Redacted Output</div>
                <div className="text-[10px] text-white/40">Encrypted Store + Audit Trail</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GPU Unit Economics & Margin Calculator */}
      <div className="rounded-2xl border border-white/10 bg-[#07080a] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Interactive GPU Cost Model & Margin Calculator
            </h3>
            <p className="text-xs text-white/50">
              Simulate unit economics: GPU instances for self-hosted Whisper vs transcription pricing.
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/30">
            Projected Margin: <strong>{grossMarginPercent}%</strong>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Monthly Transcribed Hours */}
          <div className="space-y-2">
            <div className="flex justify-between text-white/70">
              <span>Monthly Meeting Audio:</span>
              <span className="font-mono font-bold text-white">
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
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Pricing Per Transcribed Minute */}
          <div className="space-y-2">
            <div className="flex justify-between text-white/70">
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
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Concurrent Streams per GPU */}
          <div className="space-y-2">
            <div className="flex justify-between text-white/70">
              <span>Streams per GPU (AWS G5):</span>
              <span className="font-mono font-bold text-white">
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
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>

        {/* Economic Output Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
          <div className="rounded-xl border border-white/10 bg-[#000000] p-4">
            <span className="text-white/50">Monthly Revenue:</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              ${Math.round(totalRevenue).toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#000000] p-4">
            <span className="text-white/50">GPU + Cloud Infra Cost:</span>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              ${Math.round(totalInfraCost).toLocaleString()}
            </div>
            <div className="text-[10px] text-white/40 mt-0.5 font-mono">
              ${costPerTranscribedMinute} / min
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#000000] p-4">
            <span className="text-white/50">Estimated Gross Profit:</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              ${Math.round(grossProfit).toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#000000] p-4">
            <span className="text-white/50">Peak GPU Workers:</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {gpusRequired} instances
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">
              Autoscaled with scale-to-zero
            </div>
          </div>
        </div>
      </div>

      {/* Security, Compliance & Phased Roadmap Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Checklist */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm space-y-3 text-xs">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Security & Compliance Checklist
          </h4>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#000000] p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Zero-Retention Architecture</strong>
                <p className="text-white/50 text-[11px]">Raw audio and transcripts exist only in RAM, overwritten with 0x00.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#000000] p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Self-Hosted Compute (No 3rd Party AI)</strong>
                <p className="text-white/50 text-[11px]">Whisper and Presidio run on isolated cloud compute.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#000000] p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">SOC 2 Type II & GDPR Alignment</strong>
                <p className="text-white/50 text-[11px]">Tamper-evident audit logs, TLS 1.3, KMS envelope encryption.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phased Roadmap */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm space-y-3 text-xs">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-white" />
            Phased Architecture Roadmap
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-[#000000] p-3">
              <div>
                <div className="font-semibold text-emerald-300">Phase 0: Local MVP (Current)</div>
                <div className="text-[10px] text-white/40">faster-whisper + Presidio + SQLite audit log</div>
              </div>
              <span className="font-mono text-emerald-400 text-[10px] font-bold">COMPLETED</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#000000] p-3">
              <div>
                <div className="font-semibold text-white">Phase 1: Single-Tenant Hosted Pilot</div>
                <div className="text-[10px] text-white/40">Design partner pilot in isolated instance/VPC</div>
              </div>
              <span className="font-mono text-white/70 text-[10px]">4-8 WEEKS</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#000000] p-3">
              <div>
                <div className="font-semibold text-white">Phase 2: Multi-Tenant Zero-Retention SaaS</div>
                <div className="text-[10px] text-white/40">SSO, Stripe billing, autoscaling GPU pool</div>
              </div>
              <span className="font-mono text-white/40 text-[10px]">2-4 MONTHS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
