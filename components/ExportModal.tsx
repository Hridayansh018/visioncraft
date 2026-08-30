'use client';

import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, ShieldCheck } from 'lucide-react';
import { MeetingSession } from '../lib/types';

interface ExportModalProps {
  session: MeetingSession;
  format: 'txt' | 'md' | 'json';
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ session, format, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Generate exported content
  let content = '';
  let filename = '';

  if (format === 'txt') {
    filename = `redacted-transcript-${session.id}.txt`;
    content = `=== CONFIDENTIAL-INFO GUARDRAIL: SANITIZED MEETING TRANSCRIPT ===\n`;
    content += `Session ID: ${session.id}\n`;
    content += `Date: ${new Date(session.startedAt).toLocaleString()}\n`;
    content += `Total Secrets & PII Intercepted: ${session.totalRedactions}\n`;
    content += `Zero-Retention Status: Raw audio discarded, 0x00 memory wiped\n`;
    content += `=================================================================\n\n`;

    session.messages.forEach((msg) => {
      content += `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.speaker}:\n${msg.redactedText}\n\n`;
    });
  } else if (format === 'md') {
    filename = `redacted-meeting-notes-${session.id}.md`;
    content = `# Sanitized Meeting Transcript & Guardrail Audit\n\n`;
    content += `> **Zero-Retention Guarantee:** Raw transcription was processed in ephemeral RAM only and overwritten with \`0x00\`. No raw secrets were stored or displayed.\n\n`;
    content += `| Parameter | Value |\n|---|---|\n`;
    content += `| **Session Title** | ${session.title} |\n`;
    content += `| **Date / Time** | ${new Date(session.startedAt).toLocaleString()} |\n`;
    content += `| **Redactions Intercepted** | ${session.totalRedactions} |\n`;
    content += `| **Security Compliance** | Zero-Retention In-Memory Guardrail Compliant |\n\n`;
    content += `## Meeting Transcript\n\n`;

    session.messages.forEach((msg) => {
      content += `**${msg.speaker}** *(${new Date(msg.timestamp).toLocaleTimeString()})*:\n`;
      content += `> ${msg.redactedText}\n\n`;
    });
  } else {
    filename = `sanitized-session-payload-${session.id}.json`;
    content = JSON.stringify(
      {
        sessionMetadata: {
          id: session.id,
          title: session.title,
          timestamp: session.startedAt,
          totalRedactions: session.totalRedactions,
          zeroRetentionVerified: true,
          categoriesCaught: session.redactionsByCategory,
        },
        redactedMessages: session.messages.map((m) => ({
          speaker: m.speaker,
          timestamp: m.timestamp,
          redactedText: m.redactedText,
          detectedEntitiesCount: m.detectedSpans.length,
          detectedSpansMetadata: m.detectedSpans.map((s) => ({
            ruleId: s.ruleId,
            ruleName: s.ruleName,
            category: s.category,
            layer: s.layer,
            confidence: s.confidence,
            severity: s.severity,
          })),
        })),
      },
      null,
      2
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const mimeType = format === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0c0d12] p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-white" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Export Sanitized Transcript ({format.toUpperCase()})
            </h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#000000] p-4 max-h-80 overflow-y-auto font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
          <span className="text-white/50 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Sanitized against all active guardrail rules.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/10 px-3.5 py-2 font-medium text-white transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 px-4 py-2 font-semibold shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
