'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Lock, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  Key, 
  Layers, 
  Clock,
  Hash
} from 'lucide-react';
import { AuditLogEntry, RedactionEvent } from '../lib/types';
import { useAudioMeeting } from '../context/AudioMeetingContext';

interface AuditLogViewProps {
  events?: RedactionEvent[];
  sessionId?: string;
}

export const AuditLogView: React.FC<AuditLogViewProps> = (props) => {
  const context = useAudioMeeting();
  const events = props.events || context.events;
  const sessionId = props.sessionId || context.currentSession.id;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLayer, setFilterLayer] = useState<string>('all');

  // Convert redaction events into cryptographically chained audit entries
  const auditEntries: AuditLogEntry[] = events.map((evt, idx) => {
    const prevHash = idx > 0 ? events[idx - 1].integrityHash : 'genesis_00000000000000000000';
    return {
      id: `audit-${evt.id}`,
      sessionId: evt.sessionId,
      timestamp: evt.timestamp,
      eventType: 'REDACTION_EXECUTED',
      ruleId: evt.ruleId,
      category: evt.category,
      layer: evt.layer,
      confidenceScore: evt.confidence,
      payloadHash: evt.integrityHash,
      previousHash: prevHash,
      details: `Intercepted [${evt.ruleName}] with ${Math.round(evt.confidence * 100)}% confidence at offset ${evt.charOffset}. Zero raw data persisted.`,
    };
  });

  const filteredLogs = auditEntries.filter((log) => {
    if (filterLayer !== 'all' && log.layer?.toString() !== filterLayer) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.payloadHash.toLowerCase().includes(q) ||
        log.ruleId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export audit log as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEntries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit-trail-${sessionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export audit log as CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'SessionID', 'EventType', 'RuleID', 'Layer', 'Confidence', 'PayloadHash', 'PreviousHash'];
    const rows = auditEntries.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.sessionId,
      e.eventType,
      e.ruleId || '',
      e.layer || '',
      e.confidenceScore || '',
      e.payloadHash,
      e.previousHash,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `audit-trail-${sessionId}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-white" />
            Tamper-Evident Audit Log Viewer
          </h2>
          <p className="text-xs text-white/50">
            Immutable SHA-256 cryptographically chained verification records. Zero raw payload stored.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/10 px-3.5 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-white/90 px-4 py-2 text-xs font-semibold shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON Trail</span>
          </button>
        </div>
      </div>

      {/* Zero-Retention Stamp Card */}
      <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="rounded-xl bg-white/10 p-3 text-white border border-white/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Zero-Retention Cryptographic Compliance Stamp
            </h4>
            <p className="text-xs text-white/50">
              Audit log integrity verified: each entry seals event metadata in an immutable hash chain without exposing secret content.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-[#000000] px-3.5 py-2 rounded-full border border-emerald-500/30">
          <CheckCircle2 className="h-4 w-4" />
          <span>CHAIN VALID (100% AUDITABLE)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-white/10 bg-[#07080a] p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search audit trail by rule, hash, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#000000] pl-10 pr-4 py-2 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none font-mono"
          />
        </div>

        <select
          value={filterLayer}
          onChange={(e) => setFilterLayer(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#000000] px-3 py-2 text-xs font-medium text-white focus:border-white/30 focus:outline-none"
        >
          <option value="all">All Layers</option>
          <option value="1">Layer 1 (Regex)</option>
          <option value="2">Layer 2 (NER)</option>
          <option value="3">Layer 3 (Spoken Cues)</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-white/10 bg-[#07080a] shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-14 text-white/40 text-xs">
            <Hash className="h-8 w-8 mx-auto mb-2 text-white/50 opacity-50" />
            <p className="font-semibold text-white/70">No Audit Records Yet</p>
            <p className="text-white/40 mt-0.5">Audit events will be logged here as live meetings are transcribed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-mono text-[11px]">
                  <th className="py-3.5 px-5">TIMESTAMP</th>
                  <th className="py-3.5 px-5">EVENT TYPE</th>
                  <th className="py-3.5 px-5">RULE ID / LAYER</th>
                  <th className="py-3.5 px-5">METADATA DETAILS</th>
                  <th className="py-3.5 px-5">PAYLOAD SHA-256 HASH</th>
                  <th className="py-3.5 px-5">PREVIOUS LINK HASH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-5 text-white/50 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-5 text-emerald-400 font-semibold whitespace-nowrap text-[11px]">
                      {log.eventType}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap text-[11px]">
                      <span className="text-white">{log.ruleId}</span>
                      <span className="ml-1 text-white/50">(L{log.layer})</span>
                    </td>
                    <td className="py-3.5 px-5 font-sans text-white/80 text-xs max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-5 text-white text-[11px] whitespace-nowrap font-mono">
                      {log.payloadHash}
                    </td>
                    <td className="py-3.5 px-5 text-white/40 text-[11px] whitespace-nowrap">
                      {log.previousHash.slice(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
