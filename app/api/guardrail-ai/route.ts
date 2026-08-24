import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, text, ruleName, ruleCategory, ruleDescription } = body;

    const ai = getGenAI();

    // If no API key is set, return a reliable structured fallback
    if (!ai) {
      if (action === 'generate_regex') {
        return NextResponse.json({
          pattern: `\\b${(ruleName || 'SECRET').toUpperCase()}_[a-zA-Z0-9]{16,32}\\b`,
          explanation: 'Generated deterministic regex rule for sensitive token pattern.',
          confidence: 0.9,
        });
      }
      return NextResponse.json({
        spans: [],
        analysis: 'Deterministic guardrail active. Set GEMINI_API_KEY to enable Layer 3 deep LLM semantic reasoning.',
      });
    }

    if (action === 'generate_regex') {
      const prompt = `You are a cybersecurity secret-scanning regex expert. Generate an optimal, high-precision Regular Expression pattern (PCRE/JavaScript compatible) for the following confidential data type:
Rule Name: "${ruleName}"
Category: "${ruleCategory}"
Description: "${ruleDescription}"

Respond ONLY with a JSON object in this format:
{
  "pattern": "the_regex_string",
  "explanation": "concise explanation of how the pattern works",
  "confidence": 0.95,
  "testExamples": ["example1", "example2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json(parsed);
    }

    if (action === 'semantic_audit') {
      const prompt = `Analyze this spoken meeting transcript excerpt for subtle, messy, or natural-speech disclosures of credentials, corporate secrets, or PII that fixed regexes might miss:
Transcript: "${text}"

Respond in JSON format:
{
  "detectedDisclosures": [
    {
      "snippet": "exact phrase",
      "category": "credentials" | "pii" | "financial" | "strategy",
      "reason": "why this is confidential",
      "suggestedLabel": "LABEL_NAME",
      "confidence": 0.85
    }
  ],
  "threatSummary": "brief one-sentence summary"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'API processing error' }, { status: 500 });
  }
}
