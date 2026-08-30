'use client';

import React, { useState } from 'react';
import { 
  FlaskConical, 
  Play, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp, 
  Layers, 
  RotateCw, 
  Check, 
  FileCheck, 
  Zap, 
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  TestTube
} from 'lucide-react';
import { EvalTestCase, EvalResult, GuardrailRule } from '../lib/types';
import { BENCHMARK_EVAL_DATASET, generateSyntheticBatch } from '../lib/synthetic-data';
import { processGuardrailPipeline } from '../lib/engine';
import { runEngineUnitTests, TestReport } from '../lib/engine.test';
import { useAudioMeeting } from '../context/AudioMeetingContext';

interface EvaluationViewProps {
  rules?: GuardrailRule[];
  activeLayers?: { layer1: boolean; layer2: boolean; layer3: boolean };
}

export const EvaluationView: React.FC<EvaluationViewProps> = (props) => {
  const context = useAudioMeeting();
  const rules = props.rules || context.rules;
  const activeLayers = props.activeLayers || context.activeLayers;
  const [evalSubTab, setEvalSubTab] = useState<'benchmark' | 'unit_tests'>('benchmark');
  const [dataset, setDataset] = useState<EvalTestCase[]>(BENCHMARK_EVAL_DATASET);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<EvalTestCase | null>(BENCHMARK_EVAL_DATASET[0]);
  const [caseScanResult, setCaseScanResult] = useState<any>(null);
  const [unitTestReport, setUnitTestReport] = useState<TestReport | null>(null);
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);

  // Run Unit Tests
  const handleRunUnitTests = () => {
    setIsTestRunning(true);
    setTimeout(() => {
      const report = runEngineUnitTests();
      setUnitTestReport(report);
      setIsTestRunning(false);
    }, 250);
  };

  // Run Benchmark Engine over the evaluation dataset
  const runEvaluationSuite = () => {
    setIsRunning(true);
    const startTime = performance.now();

    setTimeout(() => {
      let totalTruePositives = 0;
      let totalFalsePositives = 0;
      let totalFalseNegatives = 0;
      let totalLatency = 0;

      const categoryStats: Record<string, { tp: number; fp: number; fn: number; count: number }> = {};

      dataset.forEach((testCase) => {
        const scan = processGuardrailPipeline(testCase.textWithSecrets, rules, 'eval-session', {
          activeLayers,
          enableNormalization: true,
        });

        totalLatency += scan.processingTimeMs;

        const expectedSpans = testCase.expectedSpans;
        const detectedSpans = scan.detectedSpans;

        if (expectedSpans.length === 0) {
          // Clean test case: any detection is a false positive
          if (detectedSpans.length > 0) {
            totalFalsePositives += detectedSpans.length;
          }
        } else {
          // Check each expected secret
          expectedSpans.forEach((exp) => {
            const cat = exp.category || 'general';
            if (!categoryStats[cat]) categoryStats[cat] = { tp: 0, fp: 0, fn: 0, count: 0 };
            categoryStats[cat].count++;

            // Match if a detected span overlaps expected range
            const matched = detectedSpans.some(
              (det) => (det.start <= exp.end && det.end >= exp.start) || det.ruleName.toUpperCase().includes(exp.label)
            );

            if (matched) {
              totalTruePositives++;
              categoryStats[cat].tp++;
            } else {
              totalFalseNegatives++;
              categoryStats[cat].fn++;
            }
          });

          // Check if any detected span was spurious (false positive)
          detectedSpans.forEach((det) => {
            const isSpurious = !expectedSpans.some(
              (exp) => (det.start <= exp.end && det.end >= exp.start) || det.ruleName.toUpperCase().includes(exp.label)
            );
            if (isSpurious) {
              totalFalsePositives++;
              const cat = det.category || 'general';
              if (categoryStats[cat]) categoryStats[cat].fp++;
            }
          });
        }
      });

      const precision =
        totalTruePositives + totalFalsePositives > 0
          ? Math.round((totalTruePositives / (totalTruePositives + totalFalsePositives)) * 100)
          : 100;

      const recall =
        totalTruePositives + totalFalseNegatives > 0
          ? Math.round((totalTruePositives / (totalTruePositives + totalFalseNegatives)) * 100)
          : 100;

      const f1Score =
        precision + recall > 0 ? Math.round((2 * (precision * recall)) / (precision + recall)) : 0;

      const avgLatencyMs = Math.round(totalLatency / dataset.length);

      const categoryBreakdown = Object.entries(categoryStats).map(([cat, stats]) => {
        const p = stats.tp + stats.fp > 0 ? Math.round((stats.tp / (stats.tp + stats.fp)) * 100) : 100;
        const r = stats.tp + stats.fn > 0 ? Math.round((stats.tp / (stats.tp + stats.fn)) * 100) : 100;
        return {
          category: cat,
          precision: p,
          recall: r,
          count: stats.count,
        };
      });

      setEvalResult({
        precision,
        recall,
        f1Score,
        truePositives: totalTruePositives,
        falsePositives: totalFalsePositives,
        falseNegatives: totalFalseNegatives,
        avgLatencyMs,
        categoryBreakdown,
      });

      setIsRunning(false);
    }, 600);
  };

  // Generate Synthetic Data using Section 9 Generator
  const handleGenerateSynthetic = () => {
    const newCases = generateSyntheticBatch(10);
    setDataset((prev) => [...prev, ...newCases]);
  };

  // Inspect single test case
  const inspectTestCase = (testCase: EvalTestCase) => {
    setSelectedCase(testCase);
    const scan = processGuardrailPipeline(testCase.textWithSecrets, rules, 'eval-inspect', {
      activeLayers,
      enableNormalization: true,
    });
    setCaseScanResult(scan);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-white" />
            Quality, Evaluation & Benchmark Suite
          </h2>
          <p className="text-xs text-white/50">
            Comprehensive testing with recall, precision, F1-scores, and automated unit test assertions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="run-evaluation-button"
            onClick={runEvaluationSuite}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 px-4 py-2 text-xs font-semibold shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            {isRunning ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span>{isRunning ? 'Benchmarking Suite...' : 'Run Benchmark Suite'}</span>
          </button>

          <button
            onClick={handleGenerateSynthetic}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/10 px-3.5 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Generate 30 Synthetic Cases</span>
          </button>
        </div>
      </div>

      {/* Subtab navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setEvalSubTab('benchmark')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            evalSubTab === 'benchmark'
              ? 'bg-white text-black shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          <span>Benchmark Dataset & F1 Metrics</span>
        </button>
        <button
          onClick={() => {
            setEvalSubTab('unit_tests');
            if (!unitTestReport) handleRunUnitTests();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            evalSubTab === 'unit_tests'
              ? 'bg-white text-black shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <TestTube className="h-4 w-4" />
          <span>Automated Unit Tests</span>
          {unitTestReport && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
              unitTestReport.failedTests === 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {unitTestReport.passedTests}/{unitTestReport.totalTests}
            </span>
          )}
        </button>
      </div>

      {evalSubTab === 'benchmark' ? (
        <>
          {/* Results Scorecards */}
          {evalResult && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Recall */}
              <div className="rounded-2xl border border-emerald-500/30 bg-[#07080a] p-4 shadow-sm">
                <div className="text-[11px] text-emerald-400 font-medium">RECALL (SECRETS CAUGHT)</div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {evalResult.recall}%
                </div>
                <div className="text-[10px] text-white/40 mt-0.5 font-mono">
                  {evalResult.truePositives} caught / {evalResult.falseNegatives} missed
                </div>
              </div>

              {/* Precision */}
              <div className="rounded-2xl border border-white/10 bg-[#07080a] p-4 shadow-sm">
                <div className="text-[11px] text-white/70 font-medium">PRECISION</div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {evalResult.precision}%
                </div>
                <div className="text-[10px] text-white/40 mt-0.5 font-mono">
                  {evalResult.falsePositives} false alarms
                </div>
              </div>

              {/* F1 Score */}
              <div className="rounded-2xl border border-white/10 bg-[#07080a] p-4 shadow-sm">
                <div className="text-[11px] text-white/70 font-medium">F1-SCORE</div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {evalResult.f1Score}%
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">Harmonic balance</div>
              </div>

              {/* False Negatives (Leaks) */}
              <div className={`rounded-2xl border p-4 shadow-sm ${
                evalResult.falseNegatives === 0
                  ? 'border-emerald-500/30 bg-[#07080a] text-emerald-400'
                  : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
              }`}>
                <div className="text-[11px] font-medium">MISSED LEAKS (FN)</div>
                <div className="text-2xl font-black font-mono mt-1">
                  {evalResult.falseNegatives}
                </div>
                <div className="text-[10px] mt-0.5">
                  {evalResult.falseNegatives === 0 ? 'Zero secrets leaked!' : 'Threshold tuning advised'}
                </div>
              </div>

              {/* Avg Scan Latency */}
              <div className="rounded-2xl border border-white/10 bg-[#07080a] p-4 shadow-sm">
                <div className="text-[11px] text-white/50 font-medium">SCAN LATENCY</div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {evalResult.avgLatencyMs} <span className="text-xs font-normal text-white/50">ms</span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">Per transcript chunk</div>
              </div>
            </div>
          )}

          {/* Main Eval View: Test Cases List & Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dataset Test Cases (1 col) */}
            <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <span className="font-bold text-white">
                  Evaluation Dataset ({dataset.length} Cases)
                </span>
                <span className="text-white/40 font-mono text-[11px]">Ground Truth</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
                {dataset.map((tc) => {
                  const isSelected = selectedCase?.id === tc.id;
                  return (
                    <div
                      key={tc.id}
                      onClick={() => inspectTestCase(tc)}
                      className={`rounded-xl border p-3 text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-white/40 bg-white/10 text-white shadow-sm'
                          : 'border-white/[0.06] bg-[#000000] text-white/60 hover:bg-white/[0.03] hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-white truncate">{tc.scenarioName}</div>
                      <div className="text-[11px] text-white/40 font-mono mt-1 truncate">
                        {tc.textWithSecrets}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="rounded-full bg-white/10 px-2 py-0.2 text-[9px] font-mono text-white/70 border border-white/15">
                          {tc.expectedSpans.length} Expected Secret(s)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Test Case Inspector & Ground Truth Diff (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#07080a] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedCase?.scenarioName || 'Test Case Inspector'}
                    </h3>
                    <span className="text-xs text-white/40 font-mono">
                      Ground Truth Verification & Offset Mapping
                    </span>
                  </div>
                  <button
                    onClick={() => selectedCase && inspectTestCase(selectedCase)}
                    className="rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    Scan Single Case
                  </button>
                </div>

                {selectedCase && (
                  <div className="space-y-4 text-xs">
                    {/* Raw Transcript with Injected Secret */}
                    <div>
                      <span className="text-white/50 font-semibold mb-1 block">
                        Raw Transcript (Ephemeral Memory View with Injected Secrets):
                      </span>
                      <div className="rounded-xl border border-amber-500/30 bg-[#000000] p-3.5 font-mono text-amber-200 text-xs leading-relaxed">
                        {selectedCase.textWithSecrets}
                      </div>
                    </div>

                    {/* Ground Truth Spans */}
                    <div>
                      <span className="text-white/50 font-semibold mb-1 block">
                        Ground Truth Annotated Labels (Expected):
                      </span>
                      <div className="space-y-1.5">
                        {selectedCase.expectedSpans.length === 0 ? (
                          <div className="rounded-xl border border-white/10 bg-[#000000] p-2.5 text-white/40">
                            Zero expected secrets (Clean talk baseline case).
                          </div>
                        ) : (
                          selectedCase.expectedSpans.map((sp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#000000] p-2.5 font-mono"
                            >
                              <span className="text-white font-bold">[{sp.label}]</span>
                              <span className="text-white/40 text-[11px]">
                                Char Span: [{sp.start} → {sp.end}] | Category: {sp.category}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Redacted Output */}
                    <div>
                      <span className="text-white/50 font-semibold mb-1 block">
                        Guardrail Redacted Output (Sanitized Stream Result):
                      </span>
                      <div className="rounded-xl border border-emerald-500/30 bg-[#000000] p-3.5 font-sans text-emerald-200 text-xs leading-relaxed">
                        {caseScanResult ? caseScanResult.redactedText : 'Click "Scan Single Case" or run benchmark to view output.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category Breakdown Table */}
              {evalResult && evalResult.categoryBreakdown && (
                <div className="rounded-2xl border border-white/10 bg-[#07080a] p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">
                    Recall & Precision by Category
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 font-mono text-[11px]">
                          <th className="py-2.5 px-3">CATEGORY</th>
                          <th className="py-2.5 px-3">CASES</th>
                          <th className="py-2.5 px-3">RECALL %</th>
                          <th className="py-2.5 px-3">PRECISION %</th>
                          <th className="py-2.5 px-3">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {evalResult.categoryBreakdown.map((cat, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.03]">
                            <td className="py-2.5 px-3 font-semibold text-white">{cat.category}</td>
                            <td className="py-2.5 px-3 font-mono text-white/50">{cat.count}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{cat.recall}%</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-white">{cat.precision}%</td>
                            <td className="py-2.5 px-3">
                              {cat.recall >= 90 ? (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">
                                  PASS
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30">
                                  TUNE NEEDED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Automated Unit Tests View */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-[#07080a]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TestTube className="h-4 w-4 text-white" />
                Automated Engine & Redactor Test Suite
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Executes core engine tests: Layer 1 AWS & GitHub regex, Luhn card verification, allowlist bypass, spoken normalizer, and zero-retention memory overwrite.
              </p>
            </div>
            <button
              onClick={handleRunUnitTests}
              disabled={isTestRunning}
              className="flex items-center gap-2 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 px-4 py-2 text-xs font-semibold shadow-md transition-all"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isTestRunning ? 'animate-spin' : ''}`} />
              <span>{isTestRunning ? 'Running Tests...' : 'Re-Run Unit Tests'}</span>
            </button>
          </div>

          {unitTestReport ? (
            <div className="space-y-3">
              {/* Summary card */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#07080a] p-4">
                  <div className="text-[11px] text-white/50">Total Tests</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">{unitTestReport.totalTests}</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-[#07080a] p-4">
                  <div className="text-[11px] text-emerald-400 font-medium">Passed</div>
                  <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">{unitTestReport.passedTests}</div>
                </div>
                <div className={`rounded-2xl border p-4 ${
                  unitTestReport.failedTests === 0
                    ? 'border-white/10 bg-[#07080a]'
                    : 'border-rose-500/30 bg-rose-950/20'
                }`}>
                  <div className={`text-[11px] font-medium ${unitTestReport.failedTests === 0 ? 'text-white/50' : 'text-rose-400'}`}>Failed</div>
                  <div className={`text-xl font-bold font-mono mt-0.5 ${unitTestReport.failedTests === 0 ? 'text-white/40' : 'text-rose-300'}`}>{unitTestReport.failedTests}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#07080a] p-4">
                  <div className="text-[11px] text-white/50">Execution Time</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">{unitTestReport.durationMs}ms</div>
                </div>
              </div>

              {/* Individual assertions list */}
              <div className="rounded-2xl border border-white/10 bg-[#07080a] overflow-hidden divide-y divide-white/[0.06]">
                {unitTestReport.results.map((res, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      {res.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className={`font-semibold ${res.passed ? 'text-white' : 'text-rose-300'}`}>
                          {res.name}
                        </div>
                        {res.error && (
                          <div className="text-rose-400 text-[11px] font-mono mt-0.5">
                            {res.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-white/40">
                      <Clock className="h-3 w-3" />
                      <span>{res.durationMs}ms</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        res.passed ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                      }`}>
                        {res.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-14 text-white/40 text-xs rounded-2xl border border-white/10 bg-[#07080a]">
              <TestTube className="h-8 w-8 mx-auto mb-2 text-white/60 opacity-60" />
              <p className="font-semibold text-white/70">No Unit Tests Executed Yet</p>
              <p className="text-white/40 mt-0.5">Click "Re-Run Unit Tests" to evaluate the engine assertions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
