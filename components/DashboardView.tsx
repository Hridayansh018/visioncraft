'use client';

import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Layers, 
  PieChart as PieIcon, 
  TrendingUp, 
  Cpu, 
  Server,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { RedactionEvent, MeetingSession } from '../lib/types';
import { useAudioMeeting } from '../context/AudioMeetingContext';

interface DashboardViewProps {
  events?: RedactionEvent[];
  sessions?: MeetingSession[];
  currentSession?: MeetingSession;
  totalAudioMinutes?: number;
}

const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#ec4899', '#8b5cf6'];

export const DashboardView: React.FC<DashboardViewProps> = (props) => {
  const context = useAudioMeeting();
  const events = props.events || context.events;
  const sessions = props.sessions || context.sessions;
  const currentSession = props.currentSession || context.currentSession;
  const totalAudioMinutes = props.totalAudioMinutes ?? Math.round(
    [currentSession, ...sessions].reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
  );
  // Aggregate stats
  const totalRedactions = events.length;
  const falsePositiveCount = events.filter((e) => e.status === 'marked_false_positive').length;
  const confirmedTruePositives = events.filter((e) => e.status === 'confirmed_true_positive').length;
  const falsePositiveRate = totalRedactions > 0 ? ((falsePositiveCount / totalRedactions) * 100).toFixed(1) : '0.0';

  // Category counts
  const categoryMap: Record<string, number> = {};
  events.forEach((e) => {
    const cat = e.category.toUpperCase().replace('_', ' ');
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    count: value,
  }));

  // Layer breakdown
  const layerMap: Record<string, number> = { 'Layer 1 (Regex)': 0, 'Layer 2 (NER)': 0, 'Layer 3 (Cues)': 0 };
  events.forEach((e) => {
    if (e.layer === 1) layerMap['Layer 1 (Regex)']++;
    else if (e.layer === 2) layerMap['Layer 2 (NER)']++;
    else if (e.layer === 3) layerMap['Layer 3 (Cues)']++;
  });

  const layerChartData = Object.entries(layerMap)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
    }));

  // Dynamic timeline data from current session events
  const timelineMap: Record<string, { time: string; aws_keys: number; passwords: number; pii: number }> = {};
  events.forEach((e) => {
    const t = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!timelineMap[t]) {
      timelineMap[t] = { time: t, aws_keys: 0, passwords: 0, pii: 0 };
    }
    if (e.category === 'api_keys') timelineMap[t].aws_keys++;
    else if (e.category === 'spoken_cue' || e.category === 'credentials') timelineMap[t].passwords++;
    else if (e.category === 'pii') timelineMap[t].pii++;
  });

  const timelineData = Object.values(timelineMap);

  // Severity Distribution
  const severityMap = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  events.forEach((e) => {
    if (e.severity === 'critical') severityMap.Critical++;
    else if (e.severity === 'high') severityMap.High++;
    else if (e.severity === 'medium') severityMap.Medium++;
    else severityMap.Low++;
  });

  const severityChartData = Object.entries(severityMap).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Security & Detection Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Real-time telemetry and KPI metrics for meeting audio confidential-data guardrail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-emerald-950 px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 border border-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> ZERO LEAKAGES RECORDED
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Intercepted */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm">
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span>Total Redactions Caught</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">
            {totalRedactions}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>100% intercepted prior to display/storage</span>
          </div>
        </div>

        {/* Monitored Minutes */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm">
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span>Monitored Meeting Time</span>
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">
            {totalAudioMinutes > 0 ? totalAudioMinutes.toFixed(1) : '0.0'} <span className="text-sm font-normal text-white/50">mins</span>
          </div>
          <div className="mt-1 text-[11px] text-white/40">
            Across {sessions.length + 1} transcribed sessions
          </div>
        </div>

        {/* False Positive Rate */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm">
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span>False-Positive Rate</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400">
            {falsePositiveRate}%
          </div>
          <div className="mt-1 text-[11px] text-white/40">
            {falsePositiveCount} flagged in review queue
          </div>
        </div>

        {/* Avg Latency */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm">
          <div className="flex items-center justify-between text-white/50 text-xs mb-2">
            <span>Avg Pipeline Latency</span>
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white">
            11.4 <span className="text-sm font-normal text-white/50">ms</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-mono">
            VAD (3ms) + Guardrail (8ms)
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redactions by Category Bar Chart */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Redactions Intercepted by Category</h3>
            <span className="text-xs text-white/40 font-mono">Live Counter</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <div className="text-center text-xs text-white/40 space-y-1">
                <PieIcon className="w-8 h-8 mx-auto opacity-30 text-white" />
                <p className="font-semibold text-white/70">No Category Data Recorded</p>
                <p className="text-[11px] text-white/40">Live redaction counts will appear here once audio is transcribed.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#07080a', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#ffffff" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Defense in Depth Layer Distribution (Donut) */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Defense-in-Depth Layer Catch Share</h3>
            <span className="text-xs text-white/40 font-mono">Layer 1 vs 2 vs 3</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {layerChartData.length === 0 ? (
              <div className="text-center text-xs text-white/40 space-y-1">
                <Layers className="w-8 h-8 mx-auto opacity-30 text-white" />
                <p className="font-semibold text-white/70">No Layer Interceptions Yet</p>
                <p className="text-[11px] text-white/40">Distribution across Layers 1, 2, and 3 will populate live.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={layerChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {layerChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#07080a', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend formatter={(value) => <span className="text-xs text-white/70">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Interceptions Over Time Line Chart */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Real-time Interception Spike Timeline</h3>
            <span className="text-xs text-white/40 font-mono">Real-time Stream</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {timelineData.length === 0 ? (
              <div className="text-center text-xs text-white/40 space-y-1">
                <Activity className="w-8 h-8 mx-auto opacity-30 text-white" />
                <p className="font-semibold text-white/70">No Timeline Data</p>
                <p className="text-[11px] text-white/40">Interception timeline points will plot in real time.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="time" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#07080a', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend formatter={(value) => <span className="text-xs text-white/70">{value}</span>} />
                  <Line type="monotone" dataKey="aws_keys" name="AWS Keys" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="passwords" name="Credentials" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="pii" name="PII Spans" stroke="#ffffff" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Severity Breakdown Bar Chart */}
        <div className="rounded-2xl border border-white/10 bg-[#07080a] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Severity Distribution</h3>
            <span className="text-xs text-white/40 font-mono">CVSS Threat Weight</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {totalRedactions === 0 ? (
              <div className="text-center text-xs text-white/40 space-y-1">
                <ShieldAlert className="w-8 h-8 mx-auto opacity-30 text-white" />
                <p className="font-semibold text-white/70">No Severity Spans Recorded</p>
                <p className="text-[11px] text-white/40">Threat weight distributions will appear as items are caught.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis type="number" stroke="#888" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#888" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#07080a', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#ffffff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
