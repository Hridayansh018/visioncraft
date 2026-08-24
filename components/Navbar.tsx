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
  Cpu
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md text-slate-100">
      {/* Top Banner: Zero-Retention Status & Deployment Tier */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono font-medium text-emerald-400 flex items-center gap-1">
            <Lock className="w-3 h-3 inline" /> ZERO-RETENTION GUARANTEE:
          </span>
          <span className="text-slate-300 hidden sm:inline">
            Raw transcribed audio/text lives transiently in RAM (<span className="text-emerald-300 font-mono">0x00</span> zero-fill wipe), never persisted to disk or cloud.
          </span>
        </div>

        {/* Tier Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Deployment Mode:</span>
          <select
            id="deployment-tier-select"
            value={deploymentTier}
            onChange={(e) => setDeploymentTier(e.target.value as AppDeploymentTier)}
            className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white">
                Confidential-Info Guardrail
              </h1>
              <span className="rounded bg-indigo-950 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-800">
                v1.2 MVP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time PII, Secrets & Credentials Redaction for Meeting Transcripts
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-800">
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
