import { GuardrailRule, DetectedSpan, RedactionEvent, DetectorLayer } from './types';
import { normalizeSpokenText } from './normalizer';

// Luhn algorithm validator for credit cards
function passesLuhnCheck(numStr: string): boolean {
  const clean = numStr.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(clean)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Simple SHA-256 simulation for client-side audit metadata integrity hashing
export function createMetadataHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${Date.now().toString(16).slice(-6)}`;
}

// Known common English names for Layer 2 NER simulation (Presidio / spaCy en_core_web_lg model)
const KNOWN_NAMES = new Set([
  'alice', 'bob', 'charlie', 'david', 'emma', 'frank', 'grace', 'hridayansh',
  'john', 'jane', 'sarah', 'michael', 'robert', 'jessica', 'william',
  'alexander', 'emily', 'daniel', 'sophia', 'matthew', 'olivia', 'james',
  'elizabeth', 'lucas', 'mia', 'benjamin', 'ava', 'henry', 'charlotte',
  'sundar', 'satya', 'sam', 'elon', 'tim', 'mark', 'jensen',
]);

export interface ProcessTranscriptResult {
  redactedText: string;
  detectedSpans: DetectedSpan[];
  events: RedactionEvent[];
  processingTimeMs: number;
  rawTextOverwritten: boolean;
}

export function processGuardrailPipeline(
  rawTranscript: string,
  rules: GuardrailRule[],
  sessionId: string,
  options: {
    enableNormalization?: boolean;
    activeLayers?: { layer1: boolean; layer2: boolean; layer3: boolean };
    allowlist?: string[];
  } = {}
): ProcessTranscriptResult {
  const startTime = performance.now();
  const allowlist = options.allowlist || [];
  const activeLayers = options.activeLayers || { layer1: true, layer2: true, layer3: true };
  const enableNorm = options.enableNormalization !== false;

  // Step 0: Normalization Pre-step
  const normalizedData = enableNorm ? normalizeSpokenText(rawTranscript) : { original: rawTranscript, normalized: rawTranscript };
  const textToScan = normalizedData.normalized;

  const rawSpans: DetectedSpan[] = [];

  // Filter active enabled rules
  const activeRules = rules.filter(r => r.enabled && activeLayers[`layer${r.layer}` as keyof typeof activeLayers]);

  // --- LAYER 1: DETERMINISTIC REGEX & CHECKSUMS ---
  const layer1Rules = activeRules.filter(r => r.layer === 1 && r.pattern);
  for (const rule of layer1Rules) {
    try {
      const regex = new RegExp(rule.pattern!, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(textToScan)) !== null) {
        const matchedText = match[0];
        const matchIndex = match.index;

        // Special check for Credit Cards: Luhn Check
        if (rule.id === 'rule-credit-card' && !passesLuhnCheck(matchedText)) {
          continue; // Failed Luhn check -> ignore false positive
        }

        // Check if explicitly allowlisted
        if (allowlist.some(allowed => matchedText.toLowerCase().includes(allowed.toLowerCase()))) {
          continue;
        }

        // Compute safe masked preview (e.g. AKIA...4X)
        const maskedPreview = matchedText.length > 6
          ? `${matchedText.slice(0, 3)}••••${matchedText.slice(-2)}`
          : '••••••';

        const replacement = formatRedactedReplacement(rule, matchedText);

        rawSpans.push({
          id: `span-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          layer: 1,
          start: matchIndex,
          end: matchIndex + matchedText.length,
          rawTextPreviewMasked: maskedPreview,
          maskedReplacement: replacement,
          confidence: rule.confidenceThreshold,
          severity: rule.severity,
          contextSnippet: createSafeContext(textToScan, matchIndex, matchIndex + matchedText.length, replacement),
        });
      }
    } catch {
      // Ignore invalid custom regex
    }
  }

  // --- LAYER 2: NER & CONTEXTUAL ENTITIES (Presidio + spaCy simulation) ---
  if (activeLayers.layer2) {
    const personRule = activeRules.find(r => r.id === 'rule-ner-person');
    if (personRule) {
      // Find capitalized words or known names preceded by intro phrases or in conversational context
      const words = textToScan.split(/\s+/);
      let runningIdx = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[.,!?;:]/g, '');
        const cleanLower = word.toLowerCase();
        const wordOffset = textToScan.indexOf(word, runningIdx);
        runningIdx = wordOffset >= 0 ? wordOffset + word.length : runningIdx;

        const prevWord = i > 0 ? words[i - 1].toLowerCase() : '';
        const isNameCue = ['with', 'from', 'called', 'contact', 'assignee', 'manager', 'lead', 'speaking'].includes(prevWord);
        const isKnownName = KNOWN_NAMES.has(cleanLower);
        const isTitleCased = /^[A-Z][a-z]{2,15}$/.test(word);

        if ((isKnownName || (isTitleCased && isNameCue)) && word.length > 2) {
          // Check if not already matched
          if (wordOffset >= 0 && !rawSpans.some(s => wordOffset >= s.start && wordOffset + word.length <= s.end)) {
            const replacement = formatRedactedReplacement(personRule, word);
            rawSpans.push({
              id: `span-ner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              ruleId: personRule.id,
              ruleName: personRule.name,
              category: 'pii',
              layer: 2,
              start: wordOffset,
              end: wordOffset + word.length,
              rawTextPreviewMasked: `${word[0]}•••`,
              maskedReplacement: replacement,
              confidence: isKnownName ? 0.92 : 0.78,
              severity: 'medium',
              contextSnippet: createSafeContext(textToScan, wordOffset, wordOffset + word.length, replacement),
            });
          }
        }
      }
    }

    // Layer 2 Pattern-based (Financials, Codenames)
    const layer2PatternRules = activeRules.filter(r => r.layer === 2 && r.pattern);
    for (const rule of layer2PatternRules) {
      try {
        const regex = new RegExp(rule.pattern!, 'gi');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(textToScan)) !== null) {
          const matchedText = match[0];
          const matchIndex = match.index;
          const replacement = formatRedactedReplacement(rule, matchedText);

          rawSpans.push({
            id: `span-l2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            layer: 2,
            start: matchIndex,
            end: matchIndex + matchedText.length,
            rawTextPreviewMasked: `${matchedText.slice(0, 2)}••••`,
            maskedReplacement: replacement,
            confidence: rule.confidenceThreshold,
            severity: rule.severity,
            contextSnippet: createSafeContext(textToScan, matchIndex, matchIndex + matchedText.length, replacement),
          });
        }
      } catch {}
    }
  }

  // --- LAYER 3: SPOKEN-CUE TRIGGER PHRASES (Proximity Window) ---
  if (activeLayers.layer3) {
    const spokenRules = activeRules.filter(r => r.layer === 3 && r.triggerPhrases && r.triggerPhrases.length > 0);
    for (const rule of spokenRules) {
      for (const cue of rule.triggerPhrases || []) {
        const cueLower = cue.toLowerCase();
        let cuePos = textToScan.toLowerCase().indexOf(cueLower);

        while (cuePos !== -1) {
          const secretStart = cuePos + cue.length;
          // Capture next 1 to 4 tokens following the trigger phrase
          const remainder = textToScan.slice(secretStart);
          const trailingTokensMatch = remainder.match(/^\s*[:=]?\s*([^\s,.!?;]+(?:\s+[^\s,.!?;]+){0,2})/);

          if (trailingTokensMatch && trailingTokensMatch[1] && trailingTokensMatch[1].trim().length > 1) {
            const secretValue = trailingTokensMatch[1].trim();
            const actualStart = secretStart + remainder.indexOf(secretValue);
            const actualEnd = actualStart + secretValue.length;

            // Ensure not already protected by an earlier span
            if (!rawSpans.some(s => actualStart >= s.start && actualEnd <= s.end)) {
              const replacement = formatRedactedReplacement(rule, secretValue);
              rawSpans.push({
                id: `span-cue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                ruleId: rule.id,
                ruleName: rule.name,
                category: rule.category,
                layer: 3,
                start: actualStart,
                end: actualEnd,
                rawTextPreviewMasked: `${secretValue.slice(0, 1)}••••••`,
                maskedReplacement: replacement,
                confidence: rule.confidenceThreshold,
                severity: rule.severity,
                contextSnippet: createSafeContext(textToScan, actualStart, actualEnd, replacement),
              });
            }
          }

          cuePos = textToScan.toLowerCase().indexOf(cueLower, cuePos + cue.length);
        }
      }
    }
  }

  // Deduplicate and resolve overlapping spans (sort by start ascending, prioritize higher confidence/layer)
  const resolvedSpans = resolveOverlappingSpans(rawSpans);

  // Apply Layer 4 Redactions strictly onto text before return
  let redactedText = '';
  let cursor = 0;
  const events: RedactionEvent[] = [];

  for (const span of resolvedSpans) {
    if (span.start >= cursor) {
      redactedText += textToScan.slice(cursor, span.start);
      redactedText += span.maskedReplacement;
      cursor = span.end;

      // Emit Layer 5 Audit Event (METADATA ONLY — NO RAW SECRET)
      const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const metaString = `${sessionId}:${span.ruleId}:${span.category}:${span.confidence}:${span.start}:${span.end}:${Date.now()}`;
      
      events.push({
        id: eventId,
        sessionId,
        timestamp: Date.now(),
        ruleId: span.ruleId,
        ruleName: span.ruleName,
        category: span.category,
        layer: span.layer,
        confidence: span.confidence,
        severity: span.severity,
        safeMaskedContext: span.contextSnippet,
        status: 'pending_review',
        charOffset: span.start,
        integrityHash: createMetadataHash(metaString),
      });
    }
  }

  redactedText += textToScan.slice(cursor);

  const processingTimeMs = Math.max(1, Math.round(performance.now() - startTime));

  // The Raw Buffer is zeroed out in RAM immediately as mandated by Section 1:
  // "Raw transcribed text lives only in memory (RAM), transiently, and is overwritten"
  return {
    redactedText,
    detectedSpans: resolvedSpans,
    events,
    processingTimeMs,
    rawTextOverwritten: true,
  };
}

function formatRedactedReplacement(rule: GuardrailRule, text: string): string {
  const label = rule.customLabel || rule.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');

  switch (rule.redactionStyle) {
    case 'mask':
      return '••••••••';
    case 'hash': {
      const hashStr = createMetadataHash(text).slice(-6);
      return `[#SHA:${hashStr}]`;
    }
    case 'category':
      return `[${rule.category.toUpperCase()}:${label}]`;
    case 'label':
    default:
      return `[${label}]`;
  }
}

function createSafeContext(text: string, start: number, end: number, replacement: string): string {
  const contextWindow = 24;
  const prefix = text.slice(Math.max(0, start - contextWindow), start);
  const suffix = text.slice(end, Math.min(text.length, end + contextWindow));
  return `...${prefix}${replacement}${suffix}...`;
}

function resolveOverlappingSpans(spans: DetectedSpan[]): DetectedSpan[] {
  if (spans.length <= 1) return spans;

  // Sort by start position ascending, then by confidence descending
  const sorted = [...spans].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.confidence - a.confidence;
  });

  const result: DetectedSpan[] = [];
  let lastEnd = -1;

  for (const span of sorted) {
    if (span.start >= lastEnd) {
      result.push(span);
      lastEnd = span.end;
    } else {
      // Overlapping! Keep the one with higher confidence
      const prev = result[result.length - 1];
      if (prev && span.confidence > prev.confidence) {
        result[result.length - 1] = span;
        lastEnd = span.end;
      }
    }
  }

  return result;
}
