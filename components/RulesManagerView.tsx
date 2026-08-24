'use client';

import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  Code, 
  Layers, 
  ShieldCheck, 
  AlertCircle, 
  Edit3, 
  Save, 
  RotateCcw,
  Search,
  Zap,
  Info
} from 'lucide-react';
import { GuardrailRule, RedactionStyle, DetectorLayer } from '../lib/types';
import { DEFAULT_GUARDRAIL_RULES } from '../lib/default-rules';

interface RulesManagerViewProps {
  rules: GuardrailRule[];
  setRules: React.Dispatch<React.SetStateAction<GuardrailRule[]>>;
  activeLayers: { layer1: boolean; layer2: boolean; layer3: boolean };
  setActiveLayers: React.Dispatch<React.SetStateAction<{ layer1: boolean; layer2: boolean; layer3: boolean }>>;
}

export const RulesManagerView: React.FC<RulesManagerViewProps> = ({
  rules,
  setRules,
  activeLayers,
  setActiveLayers,
}) => {
  const [selectedLayer, setSelectedLayer] = useState<'all' | '1' | '2' | '3'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Custom rule creation modal & AI generation state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRuleName, setNewRuleName] = useState<string>('');
  const [newRuleCategory, setNewRuleCategory] = useState<GuardrailRule['category']>('credentials');
  const [newRuleLayer, setNewRuleLayer] = useState<DetectorLayer>(1);
  const [newRulePattern, setNewRulePattern] = useState<string>('');
  const [newRuleDescription, setNewRuleDescription] = useState<string>('');
  const [newRuleStyle, setNewRuleStyle] = useState<RedactionStyle>('label');
  const [newRuleThreshold, setNewRuleThreshold] = useState<number>(0.9);
  
  // AI assistant state
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState<boolean>(false);
  const [aiPromptDesc, setAiPromptDesc] = useState<string>('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Live sandbox tester
  const [sandboxText, setSandboxText] = useState<string>('My AWS key is AKIA1234567890ABCDEF and temporary token is ghp_TestToken998877665544332211');
  const [sandboxMatches, setSandboxMatches] = useState<{ rule: string; match: string }[]>([]);

  // Toggle single rule
  const toggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Change threshold
  const changeThreshold = (ruleId: string, value: number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, confidenceThreshold: value } : r))
    );
  };

  // Change redaction style
  const changeStyle = (ruleId: string, style: RedactionStyle) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, redactionStyle: style } : r))
    );
  };

  // Delete custom rule
  const deleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  // Reset to default
  const resetToDefaults = () => {
    if (confirm('Reset all recognizers and thresholds to default factory configuration?')) {
      setRules(DEFAULT_GUARDRAIL_RULES);
    }
  };

  // Test sandbox
  const runSandboxTest = () => {
    const matches: { rule: string; match: string }[] = [];
    rules.filter(r => r.enabled && r.pattern).forEach((rule) => {
      try {
        const regex = new RegExp(rule.pattern!, 'gi');
        let m: RegExpExecArray | null;
        while ((m = regex.exec(sandboxText)) !== null) {
          matches.push({ rule: rule.name, match: m[0] });
        }
      } catch {}
    });
    setSandboxMatches(matches);
  };

  // Handle AI Regex Generation using Gemini API
  const generateRegexWithAI = async () => {
    if (!aiPromptDesc.trim()) return;
    setIsGeneratingWithAI(true);
    setAiFeedback(null);

    try {
      const res = await fetch('/api/guardrail-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_regex',
          ruleName: newRuleName || 'Custom Secret Rule',
          ruleCategory: newRuleCategory,
          ruleDescription: aiPromptDesc,
        }),
      });
      const data = await res.json();
      if (data.pattern) {
        setNewRulePattern(data.pattern);
        setAiFeedback(`Generated pattern: ${data.explanation || 'Optimized PCRE pattern ready'}`);
      }
    } catch (err: any) {
      setAiFeedback('AI generation failed: fallback pattern applied.');
      setNewRulePattern(`\\b${newRuleName.toUpperCase()}_[a-zA-Z0-9]{16,32}\\b`);
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  // Save new custom rule
  const handleSaveNewRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule: GuardrailRule = {
      id: `custom-rule-${Date.now().toString(36)}`,
      name: newRuleName.trim(),
      category: newRuleCategory,
      description: newRuleDescription.trim() || 'Custom user-defined recognizer rule',
      layer: newRuleLayer,
      pattern: newRulePattern.trim() || undefined,
      enabled: true,
      confidenceThreshold: newRuleThreshold,
      redactionStyle: newRuleStyle,
      builtIn: false,
      severity: 'high',
    };

    setRules((prev) => [newRule, ...prev]);
    setShowAddModal(false);

    // Reset form
    setNewRuleName('');
    setNewRulePattern('');
    setNewRuleDescription('');
    setAiPromptDesc('');
    setAiFeedback(null);
  };

  const filteredRules = rules.filter((r) => {
    if (selectedLayer !== 'all' && r.layer.toString() !== selectedLayer) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.pattern && r.pattern.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            Rules & Recognizers Manager
          </h2>
          <p className="text-xs text-slate-400">
            Configure pluggable recognizers, confidence scoring thresholds, and redaction formatting styles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Rule</span>
          </button>

          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Defaults</span>
          </button>
        </div>
      </div>

      {/* Global Defense-in-Depth Layer Master Switches */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-indigo-400" />
          Master Detection Layer Toggles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Layer 1 */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div>
              <div className="font-semibold text-slate-200">Layer 1: Deterministic (Regex & Checksums)</div>
              <div className="text-[10px] text-slate-400">Gitleaks & detect-secrets rule catalog</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.layer1}
                onChange={(e) => setActiveLayers((prev) => ({ ...prev, layer1: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Layer 2 */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div>
              <div className="font-semibold text-slate-200">Layer 2: NER Context (Presidio & spaCy)</div>
              <div className="text-[10px] text-slate-400">Pretrained entity recognition & scoring</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.layer2}
                onChange={(e) => setActiveLayers((prev) => ({ ...prev, layer2: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Layer 3 */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div>
              <div className="font-semibold text-slate-200">Layer 3: Spoken Cues & Proximity Window</div>
              <div className="text-[10px] text-slate-400">&quot;Password is...&quot;, &quot;The PIN is...&quot; cues</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activeLayers.layer3}
                onChange={(e) => setActiveLayers((prev) => ({ ...prev, layer3: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search recognizer rules by name, pattern, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', '1', '2', '3'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setSelectedLayer(layer)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedLayer === layer
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {layer === 'all' ? 'All Layers' : `Layer ${layer}`}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Catalog List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-xl border p-4 transition-all ${
              rule.enabled
                ? 'border-slate-800 bg-slate-900/90 shadow-sm'
                : 'border-slate-800/40 bg-slate-950/40 opacity-60'
            }`}
          >
            {/* Top row: Name, Layer, Toggle */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-200">{rule.name}</h4>
                  <span className="rounded bg-indigo-950 px-1.5 py-0.2 text-[9px] font-mono text-indigo-400 border border-indigo-800">
                    L{rule.layer}
                  </span>
                  {!rule.builtIn && (
                    <span className="rounded bg-emerald-950 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 border border-emerald-800">
                      CUSTOM
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{rule.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>

                {!rule.builtIn && (
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="Delete custom rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Pattern snippet */}
            {rule.pattern && (
              <div className="rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-[11px] text-slate-400 overflow-x-auto truncate mb-3">
                <Code className="h-3 w-3 inline mr-1 text-indigo-400" />
                {rule.pattern}
              </div>
            )}

            {/* Controls: Threshold Slider & Redaction Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
              {/* Confidence Threshold */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Confidence Threshold:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {Math.round(rule.confidenceThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={rule.confidenceThreshold}
                  onChange={(e) => changeThreshold(rule.id, parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Redaction Style */}
              <div>
                <div className="text-slate-400 mb-1">Redaction Style:</div>
                <select
                  value={rule.redactionStyle}
                  onChange={(e) => changeStyle(rule.id, e.target.value as RedactionStyle)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="label">Label Tag ([{rule.name.toUpperCase()}])</option>
                  <option value="mask">Mask (••••••••)</option>
                  <option value="hash">Hash ([#SHA:xxxx])</option>
                  <option value="category">Category ([PII:SSN])</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Live Regex Sandbox */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Live Regex & Recognizer Sandbox Tester
          </h3>
          <button
            onClick={runSandboxTest}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            Run Sandbox Scan
          </button>
        </div>

        <textarea
          rows={2}
          value={sandboxText}
          onChange={(e) => setSandboxText(e.target.value)}
          placeholder="Paste sample raw transcript to test active regexes against..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
        />

        {sandboxMatches.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs space-y-1.5">
            <div className="font-semibold text-slate-300">Matches Intercepted:</div>
            <div className="flex flex-wrap gap-2">
              {sandboxMatches.map((m, idx) => (
                <span
                  key={idx}
                  className="rounded bg-rose-950/80 border border-rose-800 px-2 py-1 font-mono text-[11px] text-rose-300"
                >
                  <strong>{m.rule}:</strong> {m.match}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-400" />
                Add Custom Recognizer Rule
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewRule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Internal Customer CRM ID"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="credentials">Credentials</option>
                    <option value="api_keys">API Keys</option>
                    <option value="pii">PII</option>
                    <option value="financial">Financial</option>
                    <option value="spoken_cue">Spoken Cue</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Detector Layer</label>
                  <select
                    value={newRuleLayer}
                    onChange={(e) => setNewRuleLayer(parseInt(e.target.value, 10) as DetectorLayer)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={1}>Layer 1 (Regex & Checksums)</option>
                    <option value={2}>Layer 2 (NER Context)</option>
                    <option value={3}>Layer 3 (Spoken Cue Phrase)</option>
                  </select>
                </div>
              </div>

              {/* AI Regex Generator Box */}
              <div className="rounded-lg border border-indigo-900/60 bg-indigo-950/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    AI-Assisted Regex Pattern Creator
                  </span>
                  <button
                    type="button"
                    onClick={generateRegexWithAI}
                    disabled={isGeneratingWithAI || !aiPromptDesc.trim()}
                    className="rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-2 py-1 text-[11px] font-medium text-white transition-colors"
                  >
                    {isGeneratingWithAI ? 'Generating...' : 'Generate with Gemini'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Describe pattern: 'Alphanumeric token starting with CUST- followed by 8 digits'"
                  value={aiPromptDesc}
                  onChange={(e) => setAiPromptDesc(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                {aiFeedback && (
                  <div className="text-[11px] text-emerald-400 font-mono">{aiFeedback}</div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Regex Pattern (PCRE compatible)</label>
                <input
                  type="text"
                  placeholder="e.g. \bCUST-[0-9]{8}\b"
                  value={newRulePattern}
                  onChange={(e) => setNewRulePattern(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Redaction Style</label>
                  <select
                    value={newRuleStyle}
                    onChange={(e) => setNewRuleStyle(e.target.value as RedactionStyle)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="label">Label Tag ([TAG])</option>
                    <option value="mask">Mask (••••••••)</option>
                    <option value="hash">Hash ([#SHA:xxxx])</option>
                    <option value="category">Category ([CATEGORY])</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Confidence Threshold</label>
                  <input
                    type="number"
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    value={newRuleThreshold}
                    onChange={(e) => setNewRuleThreshold(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 font-semibold text-white shadow-sm"
                >
                  Save Recognizer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
