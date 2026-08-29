export type RedactionStyle = 'label' | 'mask' | 'hash' | 'category';

export type DetectorLayer = 1 | 2 | 3;

export interface GuardrailRule {
  id: string;
  name: string;
  category: 'credentials' | 'api_keys' | 'pii' | 'financial' | 'spoken_cue' | 'custom';
  description: string;
  layer: DetectorLayer;
  pattern?: string; // Regex string for layer 1
  triggerPhrases?: string[]; // For layer 3 spoken cues
  enabled: boolean;
  confidenceThreshold: number; // 0.0 to 1.0
  redactionStyle: RedactionStyle;
  customLabel?: string;
  builtIn: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DetectedSpan {
  id: string;
  ruleId: string;
  ruleName: string;
  category: GuardrailRule['category'];
  layer: DetectorLayer;
  start: number;
  end: number;
  rawTextPreviewMasked: string; // e.g. "AKIA...7X" - raw is not kept
  maskedReplacement: string;
  confidence: number;
  severity: GuardrailRule['severity'];
  contextSnippet: string; // sanitized context
}

export interface RedactionEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  ruleId: string;
  ruleName: string;
  category: GuardrailRule['category'];
  layer: DetectorLayer;
  confidence: number;
  severity: GuardrailRule['severity'];
  safeMaskedContext: string;
  status: 'pending_review' | 'confirmed_true_positive' | 'marked_false_positive' | 'allowlisted';
  charOffset: number;
  integrityHash: string; // SHA-256 hash of metadata
}

export type AudioCaptureMode = 'mic_only' | 'system_tab_only' | 'dual_mixed';

export interface MeetingMessage {
  id: string;
  speaker: string;
  timestamp: number;
  redactedText: string;
  detectedSpans: DetectedSpan[];
  isRealtimeChunk?: boolean;
}

export interface MeetingSession {
  id: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  source: 'microphone' | 'system_audio' | 'mixed_audio' | 'simulation' | 'text_stream';
  messages: MeetingMessage[];
  totalRedactions: number;
  redactionsByCategory: Record<string, number>;
  status: 'live' | 'completed';
}

export interface AuditLogEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  eventType: 'REDACTION_EXECUTED' | 'SESSION_STARTED' | 'SESSION_TERMINATED' | 'RULE_UPDATED' | 'MEMORY_BUFFER_OVERWRITTEN';
  ruleId?: string;
  category?: string;
  layer?: number;
  confidenceScore?: number;
  payloadHash: string;
  previousHash: string;
  details: string;
}

export interface EvalTestCase {
  id: string;
  textWithSecrets: string;
  expectedSpans: {
    start: number;
    end: number;
    label: string;
    category: string;
  }[];
  scenarioName: string;
}

export interface EvalResult {
  totalCases: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgLatencyMs: number;
  categoryBreakdown: {
    category: string;
    precision: number;
    recall: number;
    count: number;
  }[];
  timestamp: number;
}
