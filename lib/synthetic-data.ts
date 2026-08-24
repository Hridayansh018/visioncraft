import { EvalTestCase } from './types';

export const BENCHMARK_EVAL_DATASET: EvalTestCase[] = [
  {
    id: 'eval-01',
    scenarioName: 'DevOps Incident AWS Key Leak',
    textWithSecrets: 'Can you quickly check the production S3 bucket with AKIAIOSFODNN7EXAMPLE before deploying the new container image?',
    expectedSpans: [
      {
        start: 48,
        end: 68,
        label: 'AWS_ACCESS_KEY',
        category: 'api_keys',
      },
    ],
  },
  {
    id: 'eval-02',
    scenarioName: 'Database Connection String in Incident Sync',
    textWithSecrets: 'The replica DB is throwing connection timeouts at postgres://admin_user:P@ssw0rd123!@db-prod.internal.corp:5432/primary_db so please restart the pod.',
    expectedSpans: [
      {
        start: 49,
        end: 122,
        label: 'DATABASE_CONN_URI',
        category: 'credentials',
      },
    ],
  },
  {
    id: 'eval-03',
    scenarioName: 'GitHub Token Shared in Voice Call',
    textWithSecrets: 'I generated a temporary repo token ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8 for the CI/CD pipeline to clone the private submodules.',
    expectedSpans: [
      {
        start: 35,
        end: 75,
        label: 'GITHUB_TOKEN',
        category: 'api_keys',
      },
    ],
  },
  {
    id: 'eval-04',
    scenarioName: 'FinTech Credit Card Verification (Luhn Valid)',
    textWithSecrets: 'The customer confirmed their corporate card ending in 4532 0150 0000 0005 for the enterprise subscription renewal.',
    expectedSpans: [
      {
        start: 54,
        end: 73,
        label: 'CREDIT_CARD',
        category: 'financial',
      },
    ],
  },
  {
    id: 'eval-05',
    scenarioName: 'HR Social Security Number Voice Verification',
    textWithSecrets: 'Please update the background check file for the new hire with SSN 456-78-9012 in the encrypted portal.',
    expectedSpans: [
      {
        start: 66,
        end: 77,
        label: 'US_SSN',
        category: 'pii',
      },
    ],
  },
  {
    id: 'eval-06',
    scenarioName: 'Spoken Password Lead-in Cue',
    textWithSecrets: 'If you get locked out of the staging dashboard, the temporary login is AdminSummer2026! and remember to reset it.',
    expectedSpans: [
      {
        start: 64,
        end: 80,
        label: 'SPOKEN_SECRET',
        category: 'spoken_cue',
      },
    ],
  },
  {
    id: 'eval-07',
    scenarioName: 'Spoken PII Email & Phone Number',
    textWithSecrets: 'You can forward the signed vendor agreement directly to sarah.connor@cyberdyne.systems or call 415-555-0199 directly.',
    expectedSpans: [
      {
        start: 57,
        end: 87,
        label: 'EMAIL',
        category: 'pii',
      },
      {
        start: 96,
        end: 108,
        label: 'PHONE_NUMBER',
        category: 'pii',
      },
    ],
  },
  {
    id: 'eval-08',
    scenarioName: 'Executive Strategy & Acquisition Codename',
    textWithSecrets: 'The board approved the budget of $4.5 million for Project Titan scheduled to close by end of Q3.',
    expectedSpans: [
      {
        start: 33,
        end: 45,
        label: 'CONFIDENTIAL_FINANCIALS',
        category: 'financial',
      },
      {
        start: 50,
        end: 63,
        label: 'CONFIDENTIAL_CODENAME',
        category: 'credentials',
      },
    ],
  },
  {
    id: 'eval-09',
    scenarioName: 'Clean Engineering Talk (Harmless False Positive Resistance)',
    textWithSecrets: 'We upgraded the nginx reverse proxy on port 8080 and resolved Jira ticket ENG-4092 with standard HTTP 200 OK.',
    expectedSpans: [], // Expect 0 redactions — test for 0 false positives
  },
  {
    id: 'eval-10',
    scenarioName: 'OpenAI API Key in Debug Log',
    textWithSecrets: 'The gateway proxy returned an unauthorized error using sk-proj-9A8b7C6d5E4f3G2h1I0jK9L8M7N6O5P4Q3R2S1T0 so we need a new key.',
    expectedSpans: [
      {
        start: 55,
        end: 104,
        label: 'AI_API_KEY',
        category: 'api_keys',
      },
    ],
  },
];

// Helper to generate dynamic synthetic test batches for high-volume stress testing
export function generateSyntheticBatch(count: number = 30): EvalTestCase[] {
  const templates = [
    {
      template: (secret: string) => `Let's sync up on the staging keys. My AWS key is ${secret} please don't commit it.`,
      genSecret: () => `AKIA${Math.random().toString(36).substring(2, 18).toUpperCase()}`,
      label: 'AWS_ACCESS_KEY',
      category: 'api_keys',
    },
    {
      template: (secret: string) => `The backend microservice connection string is postgres://db_admin:${secret}@10.0.4.12:5432/analytics for query profiling.`,
      genSecret: () => `Pass#${Math.floor(Math.random() * 90000 + 10000)}!`,
      label: 'DATABASE_CONN_URI',
      category: 'credentials',
    },
    {
      template: (secret: string) => `Customer verified identity with social security number ${secret} over recorded line.`,
      genSecret: () => `${Math.floor(Math.random() * 899 + 100)}-${Math.floor(Math.random() * 89 + 10)}-${Math.floor(Math.random() * 8999 + 1000)}`,
      label: 'US_SSN',
      category: 'pii',
    },
    {
      template: (secret: string) => `The emergency server login is ${secret} which expires at midnight.`,
      genSecret: () => `SecureRoot${Math.floor(Math.random() * 9000 + 1000)}#`,
      label: 'SPOKEN_SECRET',
      category: 'spoken_cue',
    },
    {
      template: (secret: string) => `Please send the confidential invoice to ${secret} for VP approval.`,
      genSecret: () => `finance.lead_${Math.floor(Math.random() * 999)}@secure-enterprise.org`,
      label: 'EMAIL',
      category: 'pii',
    },
    {
      template: () => `The load test passed 12,500 requests per second with average p99 latency of 18ms across all cluster nodes.`,
      genSecret: () => '',
      label: 'CLEAN_BASELINE',
      category: 'clean',
    },
  ];

  const batch: EvalTestCase[] = [];

  for (let i = 0; i < count; i++) {
    const tmpl = templates[i % templates.length];
    const secret = tmpl.genSecret();
    const text = tmpl.template(secret);
    const expectedSpans: EvalTestCase['expectedSpans'] = [];

    if (secret && tmpl.category !== 'clean') {
      const idx = text.indexOf(secret);
      if (idx !== -1) {
        expectedSpans.push({
          start: idx,
          end: idx + secret.length,
          label: tmpl.label,
          category: tmpl.category,
        });
      }
    }

    batch.push({
      id: `synthetic-eval-${i + 1}`,
      scenarioName: `Synthetic Case #${i + 1} (${tmpl.label})`,
      textWithSecrets: text,
      expectedSpans,
    });
  }

  return batch;
}
