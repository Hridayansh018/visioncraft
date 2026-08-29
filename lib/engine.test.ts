import { processGuardrailPipeline } from './engine';
import { normalizeSpokenText } from './normalizer';
import { DEFAULT_GUARDRAIL_RULES } from './default-rules';
import { BENCHMARK_EVAL_DATASET } from './synthetic-data';

export interface TestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  results: {
    name: string;
    passed: boolean;
    error?: string;
    durationMs: number;
  }[];
}

export function runEngineUnitTests(): TestReport {
  const start = performance.now();
  const results: TestReport['results'] = [];

  function assert(name: string, fn: () => void) {
    const t0 = performance.now();
    try {
      fn();
      results.push({ name, passed: true, durationMs: Math.round(performance.now() - t0) });
    } catch (e: any) {
      results.push({ name, passed: false, error: e.message || String(e), durationMs: Math.round(performance.now() - t0) });
    }
  }

  // Test 1: Layer 1 AWS Key Detection
  assert('Layer 1: Detects standard AWS Access Key', () => {
    const input = 'My key is AKIAIOSFODNN7EXAMPLE for the deploy';
    const res = processGuardrailPipeline(input, DEFAULT_GUARDRAIL_RULES, 'test-session');
    if (!res.redactedText.includes('[AWS_ACCESS_KEY]')) {
      throw new Error(`Expected [AWS_ACCESS_KEY] in: "${res.redactedText}"`);
    }
    if (res.detectedSpans.length === 0) {
      throw new Error('Expected at least 1 detected span');
    }
    if (res.detectedSpans[0].category !== 'api_keys') {
      throw new Error(`Expected category api_keys, got ${res.detectedSpans[0].category}`);
    }
  });

  // Test 2: Layer 1 GitHub Token Detection
  assert('Layer 1: Detects GitHub PAT (ghp_)', () => {
    const input = 'Here is token ghp_111122223333444455556666777788889999 for repo';
    const res = processGuardrailPipeline(input, DEFAULT_GUARDRAIL_RULES, 'test-session');
    if (!res.redactedText.includes('[GITHUB_TOKEN]')) {
      throw new Error(`Expected [GITHUB_TOKEN] in: "${res.redactedText}"`);
    }
  });

  // Test 3: Layer 1 Credit Card with Luhn Validation
  assert('Layer 1: Luhn check validates genuine credit card and filters invalid numbers', () => {
    const validCard = 'Card is 4532 0150 0000 0007 for payment';
    const resValid = processGuardrailPipeline(validCard, DEFAULT_GUARDRAIL_RULES, 'test-session');
    if (!resValid.redactedText.includes('CREDIT_CARD')) {
      throw new Error(`Expected CREDIT_CARD redaction for valid card, got: "${resValid.redactedText}"`);
    }

    const invalidCard = 'Card is 4532 0150 0000 0009 for test';
    const resInvalid = processGuardrailPipeline(invalidCard, DEFAULT_GUARDRAIL_RULES, 'test-session');
    if (resInvalid.redactedText.includes('CREDIT_CARD')) {
      throw new Error(`Invalid card number should NOT pass Luhn check`);
    }
  });

  // Test 4: Layer 1 Allowlist mechanism
  assert('Layer 1: Allowlisted items are excluded from redaction', () => {
    const input = 'Testing with token ghp_111122223333444455556666777788889999 here';
    const res = processGuardrailPipeline(input, DEFAULT_GUARDRAIL_RULES, 'test-session', {
      allowlist: ['ghp_111122223333444455556666777788889999'],
    });
    if (res.redactedText.includes('[GITHUB_TOKEN]')) {
      throw new Error(`Allowlisted token should NOT be redacted`);
    }
  });

  // Test 5: Layer 0 Speech Normalizer
  assert('Layer 0: Normalizes spoken emails and punctuation', () => {
    const raw = 'Send to john dot doe at enterprise dot com please';
    const norm = normalizeSpokenText(raw);
    if (!norm.normalized.includes('john.doe@enterprise.com')) {
      throw new Error(`Expected "john.doe@enterprise.com", got "${norm.normalized}"`);
    }
  });

  // Test 6: Layer 0 Speech Normalizer Numbers
  assert('Layer 0: Converts spoken number sequences to digits', () => {
    const raw = 'The passcode is two zero two six';
    const norm = normalizeSpokenText(raw);
    if (!norm.normalized.includes('2026') && !norm.normalized.includes('2 0 2 6')) {
      throw new Error(`Expected digits in normalized text, got "${norm.normalized}"`);
    }
  });

  // Test 7: Layer 3 Spoken Password Cue
  assert('Layer 3: Detects spoken password lead-in cues', () => {
    const input = 'My password is SuperSecretSummer2026! and reset it';
    const res = processGuardrailPipeline(input, DEFAULT_GUARDRAIL_RULES, 'test-session');
    if (!res.redactedText.includes('[SPOKEN_SECRET]')) {
      throw new Error(`Expected [SPOKEN_SECRET] in: "${res.redactedText}"`);
    }
  });

  // Test 8: Zero-Retention RAM Buffer Overwrite Flag
  assert('Zero-Retention: processGuardrailPipeline returns rawTextOverwritten true', () => {
    const input = 'Safe communication without secrets';
    const res = processGuardrailPipeline(input, DEFAULT_GUARDRAIL_RULES, 'test-session');
    if (!res.rawTextOverwritten) {
      throw new Error('rawTextOverwritten flag must be true');
    }
  });

  // Test 9: Benchmark Dataset Verification
  assert('Benchmark: Evaluates standard test cases', () => {
    for (const testCase of BENCHMARK_EVAL_DATASET) {
      const res = processGuardrailPipeline(testCase.textWithSecrets, DEFAULT_GUARDRAIL_RULES, 'eval-session');
      if (testCase.expectedSpans.length > 0 && res.detectedSpans.length === 0) {
        throw new Error(`Failed to catch expected secrets in test case: ${testCase.scenarioName}`);
      }
    }
  });

  // Test 10: Cryptographic SHA-256 Integrity Verification (FR-024)
  assert('Audit Integrity: Redaction event hashes are valid 64-char hex SHA-256 strings', () => {
    const input = 'My key is AKIAIOSFODNN7EXAMPLE for the deploy';
    const res = processGuardrailPipeline(input, DEFAULT_GUARDRAIL_RULES, 'test-session');
    if (res.events.length === 0) {
      throw new Error('Expected at least 1 redaction event');
    }
    const hash = res.events[0].integrityHash;
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error(`Expected 64-char hex SHA-256 hash, got: "${hash}"`);
    }
  });

  const durationMs = Math.round(performance.now() - start);
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    durationMs,
    results,
  };
}
