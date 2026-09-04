'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShieldCheck, 
  Mic, 
  LayoutDashboard, 
  CheckSquare, 
  Sliders, 
  FlaskConical, 
  FileText, 
  Cloud,
  Radio,
  Home
} from 'lucide-react';
import { useAudioMeeting } from '../context/AudioMeetingContext';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { isCapturing, events } = useAudioMeeting();

  const pendingReviewsCount = events.filter((e) => e.status === 'pending_review').length;

  const navItems = [
    { href: '/', label: 'Overview', icon: Home },
    { href: '/live', label: 'Live Meeting', icon: Mic, badge: isCapturing ? 'LIVE' : undefined },
    { href: '/dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard },
    { href: '/review', label: 'Review Queue', icon: CheckSquare, count: pendingReviewsCount },
    { href: '/rules', label: 'Rules Manager', icon: Sliders },
    { href: '/eval', label: 'Quality & Eval', icon: FlaskConical },
    { href: '/audit', label: 'Audit Log', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#000000]/95 backdrop-blur-2xl text-[#f1f3f9]">
      {/* Main Header & Nav Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 max-w-7xl mx-auto">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white shadow-sm backdrop-blur-md">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white">
                VisionCraft
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium text-white/70 border border-white/15">
                Guardrail
              </span>
            </div>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-black' : 'text-white/60'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 flex items-center gap-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase animate-pulse">
                    <Radio className="w-2 h-2" />
                    {tab.badge}
                  </span>
                )}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive ? 'bg-black/15 text-black font-bold' : 'bg-white/10 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Global Live Background Recording Pill */}
        {isCapturing && (
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] bg-white/[0.05] px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>RECORDING ACTIVE</span>
          </div>
        )}
      </div>
    </header>
  );
};
