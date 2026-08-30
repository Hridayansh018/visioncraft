'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AudioMeetingProvider, useAudioMeeting } from '../context/AudioMeetingContext';
import { Navbar } from './Navbar';
import { ExportModal } from './ExportModal';
import { ErrorBoundary } from './ErrorBoundary';

const InnerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { currentSession, exportModalState, closeExportModal } = useAudioMeeting();

  const isLandingPage = pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#f1f3f9] selection:bg-white selection:text-black">
      {/* Persistent Global Navbar on all app pages except root landing page */}
      {!isLandingPage && <Navbar />}

      {/* Page Content */}
      <main className={`flex-1 w-full mx-auto ${isLandingPage ? 'max-w-full px-0 py-0' : 'max-w-7xl px-4 py-8 sm:px-6'}`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Global Export Modal */}
      {exportModalState.isOpen && (
        <ExportModal
          session={currentSession}
          format={exportModalState.format}
          onClose={closeExportModal}
        />
      )}

      {/* App Footer for internal pages */}
      {!isLandingPage && (
        <footer className="border-t border-white/[0.08] bg-[#000000] py-6 px-6 text-center text-xs text-[#64748b]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>
              VisionCraft Confidential-Info Guardrail · Zero-Retention Architecture · Defense-in-Depth
            </span>
            <span className="font-mono text-[11px] text-[#94a3b8]">
              faster-whisper (RAM only) · Microsoft Presidio · Gitleaks regex catalog
            </span>
          </div>
        </footer>
      )}
    </div>
  );
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AudioMeetingProvider>
      <InnerShell>{children}</InnerShell>
    </AudioMeetingProvider>
  );
};
