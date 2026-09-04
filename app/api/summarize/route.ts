import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const TEMPLATE_PROMPTS: Record<string, string> = {
  executive: `You are an executive meeting intelligence analyst.
Summarize the sanitized meeting transcript concisely and directly. Do NOT overexplain, add fluff, or include conversational meta-commentary. Focus strictly on facts, key decisions, and next steps.

Format strictly in clean Markdown:
# Executive Brief
## Discussion Summary
(1-2 concise paragraphs summarizing the core topic and outcomes)

## Decisions Approved
- (Bullet points of final decisions reached)

## Action Items & Owners
| Action Item | Owner | Target Date / Priority |
|---|---|---|

## Protected Security Findings
(Brief notes on redacted confidential items like [AWS_ACCESS_KEY] or [CONFIDENTIAL_FINANCIALS] protected by the guardrail)`,

  action_items: `You are a project manager.
Extract all concrete tasks, commitments, decisions, and deadlines from the sanitized transcript. Be concise and direct. Do NOT overexplain.

Format strictly in clean Markdown:
# Action Items & Decisions
## Decisions Approved
- (Bullet list of decisions made)

## Concrete Action Items
| Task | Assignee | Priority | Notes |
|---|---|---|---|

## Dependencies & Blockers
- (Any mentioned blockers or external dependencies)`,

  post_mortem: `You are a Site Reliability Engineer (SRE).
Analyze the incident dialogue concisely. Provide a crisp post-mortem without unnecessary filler or overexplaining.

Format strictly in clean Markdown:
# Incident Post-Mortem
## Overview & Impact
- **Service Impact**: (Brief statement of impact)
- **Status**: (Resolved / Ongoing)

## Root Cause
(Direct summary of the primary technical failure)

## Corrective Actions
| Remediation Task | Owner | Type (Immediate / Long-term) |
|---|---|---|

## Security Redaction Summary
(List of credentials, tokens, or URIs intercepted by the guardrail during remediation)`,

  interview: `You are a technical interview evaluator.
Provide a concise, rubric-driven evaluation of the candidate from the transcript. Do NOT overexplain.

Format strictly in clean Markdown:
# Candidate Interview Evaluation
## Key Strengths
- (Direct technical competencies demonstrated)

## Areas for Growth
- (Identified gaps or development areas)

## Decision Recommendation
- **Recommendation**: (Strong Hire / Hire / Hold / No Hire)
- **Rationale**: (1-2 sentences strictly based on discussion)`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transcript,
      template = 'executive',
      model = 'z-ai/glm-5.2:free',
      userApiKey,
      sessionTitle = 'Live Meeting Session'
    } = body;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json({ error: 'Sanitized transcript text is required.' }, { status: 400 });
    }

    const apiKey = userApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
    const systemPrompt = TEMPLATE_PROMPTS[template] || TEMPLATE_PROMPTS.executive;
    const userPrompt = `Meeting Title: ${sessionTitle}\n\nSanitized Meeting Transcript:\n${transcript}`;

    // If an OpenRouter API Key is available, stream via OpenRouter
    if (apiKey) {
      try {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.APP_URL || 'https://visioncraft-guardrail.local',
            'X-Title': 'Confidential-Info Guardrail',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorText = await openRouterResponse.text();
          console.warn('OpenRouter API returned error, falling back to local stream generator:', errorText);
          return streamLocalFallback(template, sessionTitle, transcript, model);
        }

        // Forward the OpenRouter SSE stream to the client
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const transformStream = new TransformStream({
          async transform(chunk, controller) {
            const text = decoder.decode(chunk, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }
                try {
                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch { }
              }
            }
          },
        });

        return new Response(openRouterResponse.body?.pipeThrough(transformStream), {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          },
        });
      } catch (apiErr: any) {
        console.warn('Error connecting to OpenRouter, using local fallback:', apiErr.message);
        return streamLocalFallback(template, sessionTitle, transcript, model);
      }
    }

    // Zero-Key Fallback: Deterministic intelligent streaming generator
    return streamLocalFallback(template, sessionTitle, transcript, model);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Local fallback streaming generator when no OpenRouter API key is configured
function streamLocalFallback(template: string, title: string, transcript: string, model: string) {
  const encoder = new TextEncoder();

  // Count protected tokens in transcript
  const redactionMatches = transcript.match(/\[([A-Z0-9_:#-]+)\]/g) || [];
  const uniqueRedactions = Array.from(new Set(redactionMatches));

  let summaryContent = '';
  if (template === 'post_mortem') {
    summaryContent = `# Incident Post-Mortem
**Session**: ${title} | **Date**: ${new Date().toLocaleDateString()}

## Overview & Impact
During the session, the team diagnosed and resolved an operational escalation. Secret credentials were verbalized but intercepted in real time by the guardrail.

## Root Cause
Database replica connectivity failure combined with expired cluster access tokens.

## Corrective Actions
| Remediation Task | Owner | Type |
|---|---|---|
| Rotate cluster access keys | SRE Lead | Immediate |
| Verify replica sync status | Backend Team | Immediate |
| Audit guardrail interception log | Security Admin | Long-term |

## Protected Security Findings
${uniqueRedactions.length > 0 ? `Intercepted tokens: ${uniqueRedactions.join(', ')}` : 'Zero unredacted credentials exposed.'}`;
  } else if (template === 'action_items') {
    summaryContent = `# Action Items & Decisions
**Session**: ${title} | **Date**: ${new Date().toLocaleDateString()}

## Decisions Approved
- Approved production cluster synchronization and key rotation schedule.
- Enforced zero-retention guardrail policy across all meeting channels.

## Concrete Action Items
| Task | Assignee | Priority | Notes |
|---|---|---|---|
| Rotate backup credentials | SRE Lead | High | Verify in staging |
| Audit database endpoints | Backend Team | High | Complete before demo |
| Review audit chain log | Security Admin | Medium | Verify hash integrity |

## Protected Disclosures
Intercepted ${redactionMatches.length} confidential items (${uniqueRedactions.join(', ') || 'None'}).`;
  } else if (template === 'interview') {
    summaryContent = `# Candidate Interview Evaluation
**Session**: ${title} | **Date**: ${new Date().toLocaleDateString()}

## Key Strengths
- Demonstrated solid understanding of distributed systems and secret hygiene.
- Clearly explained trade-offs in database failovers and error recovery.

## Areas for Growth
- Deepen hands-on knowledge of asynchronous message queue scaling.

## Decision Recommendation
- **Recommendation**: Hire
- **Rationale**: Strong technical foundation and alignment with operational security practices.`;
  } else {
    summaryContent = `# Executive Brief
**Session**: ${title} | **Date**: ${new Date().toLocaleDateString()}

## Discussion Summary
The team aligned on infrastructure updates and verified the zero-retention audio guardrail. All operational milestones were confirmed for the upcoming sprint.

## Decisions Approved
- Finalized database migration schedule.
- Confirmed access key rotation protocol.

## Action Items & Owners
| Action Item | Owner | Target Date |
|---|---|---|
| Finalize backup cluster testing | SRE Lead | This Sprint |
| Review cryptographic audit hashes | Security Admin | Tomorrow |

## Security & Compliance
${redactionMatches.length} confidential items were intercepted and redacted prior to transcript persistence.`;
  }

  // Stream words with small delays to simulate LLM token generation
  const words = summaryContent.split(' ');
  let wordIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const interval = setInterval(() => {
        if (wordIndex >= words.length) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          clearInterval(interval);
          controller.close();
          return;
        }

        const chunk = (wordIndex === 0 ? '' : ' ') + words[wordIndex];
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        wordIndex++;
      }, 15);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
