'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Mic, 
  LayoutDashboard, 
  CheckSquare, 
  Sliders, 
  FlaskConical, 
  FileText, 
  Cloud,
  Lock,
  Radio
} from 'lucide-react';

export type ActiveTab = 'live' | 'dashboard' | 'review' | 'rules' | 'eval' | 'audit' | 'architecture';
export type AppDeploymentTier = 'local_mvp' | 'cloud_saas' | 'enterprise_vpc';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  deploymentTier: AppDeploymentTier;
  setDeploymentTier: (tier: AppDeploymentTier) => void;
  isCapturing: boolean;
  caughtCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  deploymentTier,
  setDeploymentTier,
  isCapturing,
  caughtCount,
}) => {
  const tabs = [
    { id: 'live', label: 'Live Meeting', icon: Mic, badge: isCapturing ? 'LIVE' : undefined },
    { id: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
    { id: 'review', label: 'Review Queue', icon: CheckSquare, count: caughtCount },
    { id: 'rules', label: 'Rules Manager', icon: Sliders },
    { id: 'eval', label: 'Quality & Eval', icon: FlaskConical },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'architecture', label: 'SaaS Architecture & Cost', icon: Cloud },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262a34] bg-[#0A0E17]/95 backdrop-blur-md text-[#dfe2ef]">
      {/* Top Banner: Zero-Retention Status & Deployment Tier */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs border-b border-[#262a34]/80 bg-[#181b25]/80">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4fdbc8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4fdbc8]"></span>
          </span>
          <span className="font-mono font-medium text-[#4fdbc8] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 inline" /> ZERO-RETENTION INVARIANT:
          </span>
          <span className="text-[#c2c6d6] hidden sm:inline">
            Raw transcribed audio/text lives transiently in RAM (<span className="text-[#71f8e4] font-mono">0x00</span> zero-fill wipe), never persisted to disk or cloud.
          </span>
        </div>

        {/* Tier Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[#8c909f] font-medium">Deployment Mode:</span>
          <select
            id="deployment-tier-select"
            value={deploymentTier}
            onChange={(e) => setDeploymentTier(e.target.value as AppDeploymentTier)}
            className="rounded-lg border border-[#424754] bg-[#1c1f29] px-3 py-1 text-xs font-medium text-[#dfe2ef] focus:border-[#4d8eff] focus:ring-1 focus:ring-[#4d8eff] focus:outline-none cursor-pointer"
          >
            <option value="local_mvp">Phase 0: Fully Local On-Prem (faster-whisper + Presidio)</option>
            <option value="cloud_saas">Phase 2: Multi-Tenant Cloud SaaS (Zero-Retention Data Plane)</option>
            <option value="enterprise_vpc">Phase 3: Enterprise Dedicated Single-Tenant VPC</option>
          </select>
        </div>
      </div>

      {/* Main Header & Nav Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4d8eff]/15 border border-[#4d8eff]/30 text-[#4d8eff] shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-[#dfe2ef]">
                VisionCraft Guardrail
              </h1>
              <span className="rounded-md bg-[#181b25] px-2 py-0.5 text-[10px] font-mono font-semibold text-[#adc6ff] border border-[#3e495d]">
                v2.0 Core
              </span>
            </div>
            <p className="text-xs text-[#8c909f]">
              Real-time PII, Secrets & Credentials Redaction for Meeting Transcripts
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#4d8eff] text-[#00285d] font-semibold shadow-md shadow-[#4d8eff]/20'
                    : 'text-[#c2c6d6] hover:bg-[#262a34] hover:text-[#dfe2ef]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#00285d]' : 'text-[#8c909f]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 flex items-center gap-1 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase animate-pulse">
                    <Radio className="w-2.5 h-2.5" />
                    {tab.badge}
                  </span>
                )}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-[#1c1f29] px-2 py-0.5 text-[10px] font-semibold text-[#4d8eff] border border-[#4d8eff]/30">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
