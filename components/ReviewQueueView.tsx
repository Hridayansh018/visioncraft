'use client';

import React, { useState } from 'react';
import { 
  CheckSquare, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Lock, 
  Sliders, 
  PlusCircle, 
  Info,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { RedactionEvent, GuardrailRule } from '../lib/types';

interface ReviewQueueViewProps {
  events: RedactionEvent[];
  onUpdateEventStatus: (eventId: string, status: RedactionEvent['status']) => void;
  onAddAllowlist: (term: string) => void;
  onTuneThreshold: (ruleId: string, delta: number) => void;
  rules: GuardrailRule[];
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  events,
  onUpdateEventStatus,
  onAddAllowlist,
  onTuneThreshold,
  rules,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<RedactionEvent | null>(null);

  // Filter logic
  const filteredEvents = events.filter((evt) => {
    if (filterCategory !== 'all' && evt.category !== filterCategory) return false;
    if (filterStatus !== 'all' && evt.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.ruleName.toLowerCase().includes(q) ||
        evt.safeMaskedContext.toLowerCase().includes(q) ||
        evt.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = events.filter((e) => e.status === 'pending_review').length;
  const confirmedCount = events.filter((e) => e.status === 'confirmed_true_positive').length;
  const fpCount = events.filter((e) => e.status === 'marked_false_positive').length;

  return (
    <div className="space-y-6">
      {/* Header & Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-indigo-400" />
            Redaction Review Queue & Feedback Loop
          </h2>
          <p className="text-xs text-slate-400">
            Review caught redaction events to continuously calibrate recognizers and suppress false positives.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-1.5 font-medium text-amber-300">
            Pending: <strong className="font-mono">{pendingCount}</strong>
          </span>
          <span className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-1.5 font-medium text-emerald-300">
            Confirmed: <strong className="font-mono">{confirmedCount}</strong>
          </span>
          <span className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 font-medium text-rose-300">
            False Positives: <strong className="font-mono">{fpCount}</strong>
          </span>
        </div>
      </div>

      {/* Zero-Retention Privacy Banner */}
      <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
        <Lock className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
        <div>
          <strong className="font-semibold text-emerald-200">Zero-Retention Principle Enforced:</strong>{' '}
          In strict compliance with Section 1 & 10 mandates, raw secrets are never shown to human reviewers. Only anonymized metadata, rule IDs, and safe masked context windows are accessible.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="review-search-input"
            type="text"
            placeholder="Search by rule, context, or event ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            id="review-category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="api_keys">API Keys</option>
            <option value="credentials">Credentials</option>
            <option value="pii">PII</option>
            <option value="financial">Financial</option>
            <option value="spoken_cue">Spoken Cues</option>
          </select>

          {/* Status Filter */}
          <select
            id="review-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="confirmed_true_positive">Confirmed TP</option>
            <option value="marked_false_positive">False Positive</option>
          </select>
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400 opacity-60" />
            <p className="font-semibold text-slate-300">No Review Events Match Filter</p>
            <p className="text-slate-500 mt-0.5">Run a live meeting or simulation to generate new redaction events.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-4">EVENT ID / TIME</th>
                  <th className="py-3 px-4">RULE & LAYER</th>
                  <th className="py-3 px-4">CONFIDENCE</th>
                  <th className="py-3 px-4">SAFE MASKED CONTEXT</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">FEEDBACK ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* ID & Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-300 text-[11px]">{evt.id.slice(0, 14)}...</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </td>

                    {/* Rule & Layer */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{evt.ruleName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="rounded bg-indigo-950 px-1 py-0.2 text-[9px] font-mono text-indigo-400 border border-indigo-800">
                          Layer {evt.layer}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {evt.category.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-emerald-400">
                        {Math.round(evt.confidence * 100)}%
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">{evt.severity}</div>
                    </td>

                    {/* Safe Masked Context */}
                    <td className="py-3 px-4 max-w-xs md:max-w-md truncate font-mono text-slate-300 text-[11px]">
                      {evt.safeMaskedContext}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {evt.status === 'pending_review' && (
                        <span className="rounded bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-800">
                          Pending
                        </span>
                      )}
                      {evt.status === 'confirmed_true_positive' && (
                        <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-800">
                          Confirmed TP
                        </span>
                      )}
                      {evt.status === 'marked_false_positive' && (
                        <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-800">
                          False Positive
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      <button
                        onClick={() => onUpdateEventStatus(evt.id, 'confirmed_true_positive')}
                        className="rounded border border-emerald-800 bg-emerald-950/60 hover:bg-emerald-900 px-2 py-1 text-[11px] font-medium text-emerald-300 transition-colors inline-flex items-center gap-1"
                        title="Confirm as valid secret catch"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Confirm</span>
                      </button>

                      <button
                        onClick={() => onUpdateEventStatus(evt.id, 'marked_false_positive')}
                        className="rounded border border-rose-800 bg-rose-950/60 hover:bg-rose-900 px-2 py-1 text-[11px] font-medium text-rose-300 transition-colors inline-flex items-center gap-1"
                        title="Mark as over-redacted false positive"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>False Positive</span>
                      </button>

                      <button
                        onClick={() => onTuneThreshold(evt.ruleId, +0.05)}
                        className="rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors inline-flex items-center gap-1"
                        title="Tune confidence threshold higher for this rule"
                      >
                        <Sliders className="h-3 w-3" />
                        <span>Tune</span>
                      </button>
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
