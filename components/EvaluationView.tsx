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

interface EvaluationViewProps {
  rules: GuardrailRule[];
  activeLayers: { layer1: boolean; layer2: boolean; layer3: boolean };
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  rules,
  activeLayers,
}) => {
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

          // Check if any extra false detections
          if (detectedSpans.length > expectedSpans.length) {
            const extra = detectedSpans.length - expectedSpans.length;
            totalFalsePositives += extra;
          }
        }
      });

      const precision = totalTruePositives + totalFalsePositives > 0
        ? totalTruePositives / (totalTruePositives + totalFalsePositives)
        : 1.0;

      const recall = totalTruePositives + totalFalseNegatives > 0
        ? totalTruePositives / (totalTruePositives + totalFalseNegatives)
        : 1.0;

      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      const categoryBreakdown = Object.entries(categoryStats).map(([cat, stats]) => {
        const catPrec = stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 1.0;
        const catRec = stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 1.0;
        return {
          category: cat.toUpperCase(),
          precision: Math.round(catPrec * 100),
          recall: Math.round(catRec * 100),
          count: stats.count,
        };
      });

      setEvalResult({
        totalCases: dataset.length,
        truePositives: totalTruePositives,
        falsePositives: totalFalsePositives,
        falseNegatives: totalFalseNegatives,
        precision: Math.round(precision * 1000) / 10,
        recall: Math.round(recall * 1000) / 10,
        f1Score: Math.round(f1Score * 1000) / 10,
        avgLatencyMs: Math.round((totalLatency / dataset.length) * 10) / 10,
        categoryBreakdown,
        timestamp: Date.now(),
      });

      setIsRunning(false);
    }, 400);
  };

  // Generate Synthetic Faker Test Batch
  const handleGenerateSynthetic = (count: number) => {
    const syntheticBatch = generateSyntheticBatch(count);
    setDataset(syntheticBatch);
    setSelectedCase(syntheticBatch[0]);
    setEvalResult(null);
  };

  // Inspect single test case
  const inspectTestCase = (tc: EvalTestCase) => {
    setSelectedCase(tc);
    const scan = processGuardrailPipeline(tc.textWithSecrets, rules, 'eval-inspect', {
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
            <FlaskConical className="h-5 w-5 text-indigo-400" />
            Quality & Precision/Recall Evaluation Suite
          </h2>
          <p className="text-xs text-slate-400">
            Benchmark detection quality against ground-truth labeled synthetic meeting datasets with zero real data exposure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="run-benchmark-suite-btn"
            onClick={runEvaluationSuite}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors"
          >
            <Play className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Benchmarking...' : 'Run Benchmark Suite'}</span>
          </button>

          <button
            onClick={() => handleGenerateSynthetic(30)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Generate 30 Synthetic Cases</span>
          </button>
        </div>
      </div>

      {/* Subtab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setEvalSubTab('benchmark')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            evalSubTab === 'benchmark'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            evalSubTab === 'unit_tests'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <TestTube className="h-4 w-4" />
          <span>Automated Unit Tests</span>
          {unitTestReport && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              unitTestReport.failedTests === 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300'
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
              {/* Recall (Most critical as per Section 9) */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 shadow-sm">
                <div className="text-[11px] text-emerald-300 font-medium">RECALL (SECRETS CAUGHT)</div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {evalResult.recall}%
                </div>
                <div className="text-[10px] text-emerald-500 mt-0.5 font-mono">
                  {evalResult.truePositives} caught / {evalResult.falseNegatives} missed
                </div>
              </div>

              {/* Precision */}
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-4 shadow-sm">
                <div className="text-[11px] text-indigo-300 font-medium">PRECISION</div>
                <div className="text-2xl font-black font-mono text-indigo-400 mt-1">
                  {evalResult.precision}%
                </div>
                <div className="text-[10px] text-indigo-500 mt-0.5 font-mono">
                  {evalResult.falsePositives} false alarms
                </div>
              </div>

              {/* F1 Score */}
              <div className="rounded-xl border border-purple-500/40 bg-purple-950/40 p-4 shadow-sm">
                <div className="text-[11px] text-purple-300 font-medium">F1-SCORE</div>
                <div className="text-2xl font-black font-mono text-purple-400 mt-1">
                  {evalResult.f1Score}%
                </div>
                <div className="text-[10px] text-purple-500 mt-0.5">Harmonic balance</div>
              </div>

              {/* False Negatives (Leaks) */}
              <div className={`rounded-xl border p-4 shadow-sm ${
                evalResult.falseNegatives === 0
                  ? 'border-emerald-800 bg-slate-900 text-emerald-400'
                  : 'border-rose-500 bg-rose-950/50 text-rose-300'
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
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
                <div className="text-[11px] text-slate-400 font-medium">SCAN LATENCY</div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {evalResult.avgLatencyMs} <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Per transcript chunk</div>
              </div>
            </div>
          )}

          {/* Main Eval View: Test Cases List & Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dataset Test Cases (1 col) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <span className="font-bold text-slate-200">
                  Evaluation Dataset ({dataset.length} Cases)
                </span>
                <span className="text-slate-500 font-mono text-[11px]">Ground Truth</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
                {dataset.map((tc) => {
                  const isSelected = selectedCase?.id === tc.id;
                  return (
                    <div
                      key={tc.id}
                      onClick={() => inspectTestCase(tc)}
                      className={`rounded-lg border p-2.5 text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/60 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-200 truncate">{tc.scenarioName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                        {tc.textWithSecrets}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-300">
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
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      {selectedCase?.scenarioName || 'Test Case Inspector'}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      Ground Truth Verification & Offset Mapping
                    </span>
                  </div>
                  <button
                    onClick={() => selectedCase && inspectTestCase(selectedCase)}
                    className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors"
                  >
                    Scan Single Case
                  </button>
                </div>

                {selectedCase && (
                  <div className="space-y-4 text-xs">
                    {/* Raw Transcript with Injected Secret */}
                    <div>
                      <span className="text-slate-400 font-semibold mb-1 block">
                        Raw Transcript (Ephemeral Memory View with Injected Secrets):
                      </span>
                      <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 font-mono text-amber-200 text-xs leading-relaxed">
                        {selectedCase.textWithSecrets}
                      </div>
                    </div>

                    {/* Ground Truth Spans */}
                    <div>
                      <span className="text-slate-400 font-semibold mb-1 block">
                        Ground Truth Annotated Labels (Expected):
                      </span>
                      <div className="space-y-1.5">
                        {selectedCase.expectedSpans.length === 0 ? (
                          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-500">
                            Zero expected secrets (Clean talk baseline case).
                          </div>
                        ) : (
                          selectedCase.expectedSpans.map((sp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono"
                            >
                              <span className="text-indigo-400 font-bold">[{sp.label}]</span>
                              <span className="text-slate-500 text-[11px]">
                                Char Span: [{sp.start} → {sp.end}] | Category: {sp.category}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Redacted Output */}
                    <div>
                      <span className="text-slate-400 font-semibold mb-1 block">
                        Guardrail Redacted Output (Sanitized Stream Result):
                      </span>
                      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 font-sans text-emerald-200 text-xs leading-relaxed">
                        {caseScanResult ? caseScanResult.redactedText : 'Click "Scan Single Case" or run benchmark to view output.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category Breakdown Table */}
              {evalResult && evalResult.categoryBreakdown && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                    Recall & Precision by Category
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                          <th className="py-2 px-3">CATEGORY</th>
                          <th className="py-2 px-3">CASES</th>
                          <th className="py-2 px-3">RECALL %</th>
                          <th className="py-2 px-3">PRECISION %</th>
                          <th className="py-2 px-3">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {evalResult.categoryBreakdown.map((cat, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{cat.category}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{cat.count}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{cat.recall}%</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{cat.precision}%</td>
                            <td className="py-2.5 px-3">
                              {cat.recall >= 90 ? (
                                <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-800">
                                  PASS
                                </span>
                              ) : (
                                <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-800">
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
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/90">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TestTube className="h-4 w-4 text-indigo-400" />
                Automated Engine & Redactor Test Suite
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Executes core engine tests: Layer 1 AWS & GitHub regex, Luhn card verification, allowlist bypass, spoken normalizer, and zero-retention memory overwrite.
              </p>
            </div>
            <button
              onClick={handleRunUnitTests}
              disabled={isTestRunning}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isTestRunning ? 'animate-spin' : ''}`} />
              <span>{isTestRunning ? 'Running Tests...' : 'Re-Run Unit Tests'}</span>
            </button>
          </div>

          {unitTestReport ? (
            <div className="space-y-3">
              {/* Summary card */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div className="text-[11px] text-slate-400">Total Tests</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">{unitTestReport.totalTests}</div>
                </div>
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3">
                  <div className="text-[11px] text-emerald-400 font-medium">Passed</div>
                  <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">{unitTestReport.passedTests}</div>
                </div>
                <div className={`rounded-xl border p-3 ${
                  unitTestReport.failedTests === 0
                    ? 'border-slate-800 bg-slate-900'
                    : 'border-rose-900/60 bg-rose-950/40'
                }`}>
                  <div className={`text-[11px] font-medium ${unitTestReport.failedTests === 0 ? 'text-slate-400' : 'text-rose-400'}`}>Failed</div>
                  <div className={`text-xl font-bold font-mono mt-0.5 ${unitTestReport.failedTests === 0 ? 'text-slate-500' : 'text-rose-300'}`}>{unitTestReport.failedTests}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div className="text-[11px] text-slate-400">Total Execution Time</div>
                  <div className="text-xl font-bold font-mono text-indigo-400 mt-0.5">{unitTestReport.durationMs}ms</div>
                </div>
              </div>

              {/* Individual assertions list */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden divide-y divide-slate-800/60">
                {unitTestReport.results.map((res, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      {res.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className={`font-semibold ${res.passed ? 'text-slate-200' : 'text-rose-300'}`}>
                          {res.name}
                        </div>
                        {res.error && (
                          <div className="text-rose-400 text-[11px] font-mono mt-0.5">
                            {res.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{res.durationMs}ms</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {res.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs rounded-xl border border-slate-800 bg-slate-900/90">
              <TestTube className="h-8 w-8 mx-auto mb-2 text-indigo-400 opacity-60" />
              <p className="font-semibold text-slate-300">No Unit Tests Executed Yet</p>
              <p className="text-slate-500 mt-0.5">Click "Re-Run Unit Tests" to evaluate the engine assertions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
