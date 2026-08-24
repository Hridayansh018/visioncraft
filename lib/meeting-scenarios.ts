export interface ScenarioSpeakerLine {
  speaker: string;
  avatarColor: string;
  role: string;
  text: string;
  delayMs: number;
}

export interface PredefinedMeetingScenario {
  id: string;
  title: string;
  category: string;
  description: string;
  expectedRedactionsCount: number;
  dialogue: ScenarioSpeakerLine[];
}

export const PREDEFINED_MEETING_SCENARIOS: PredefinedMeetingScenario[] = [
  {
    id: 'devops-incident',
    title: '🚨 DevOps Severity-1 Incident Call',
    category: 'Cloud & Credentials',
    description: 'Engineering team frantically diagnosing an outage and sharing AWS keys, DB URIs, and root tokens over voice.',
    expectedRedactionsCount: 4,
    dialogue: [
      {
        speaker: 'Sarah (Site Reliability Lead)',
        avatarColor: 'bg-emerald-600',
        role: 'SRE Lead',
        text: 'All hands on deck. The production API gateway is failing health checks in us-east-1.',
        delayMs: 1400,
      },
      {
        speaker: 'Alex (Backend Eng)',
        avatarColor: 'bg-blue-600',
        role: 'Senior Backend',
        text: 'I found the issue. The S3 credential expired. Use my emergency access key AKIA3X5Z8K9M2L1P0Q7R right now to check the bucket logs.',
        delayMs: 2200,
      },
      {
        speaker: 'Marcus (DevOps)',
        avatarColor: 'bg-purple-600',
        role: 'Cloud Architect',
        text: 'Got it. Also, the read-replica database is locked up. Connect directly using postgres://replica_admin:SuperSecret2026!@pg-cluster.internal:5432/main_db to kill idle locks.',
        delayMs: 2600,
      },
      {
        speaker: 'Sarah (Site Reliability Lead)',
        avatarColor: 'bg-emerald-600',
        role: 'SRE Lead',
        text: 'If that fails, the temporary bastion host password is RedHotCluster#99 so you can SSH in.',
        delayMs: 2000,
      },
      {
        speaker: 'Alex (Backend Eng)',
        avatarColor: 'bg-blue-600',
        role: 'Senior Backend',
        text: 'Locks cleared, latency is dropping back below 45ms. Traffic is normalizing.',
        delayMs: 1800,
      },
    ],
  },
  {
    id: 'fintech-compliance',
    title: '💳 FinTech Customer Escalation & KYC Sync',
    category: 'Banking & PII',
    description: 'Support rep and compliance officer discussing a flagged high-value account with card details and SSN.',
    expectedRedactionsCount: 4,
    dialogue: [
      {
        speaker: 'David (Customer Support)',
        avatarColor: 'bg-amber-600',
        role: 'Tier 3 Support',
        text: 'We have a VIP client on the line whose wire transfer got held by automated AML rules.',
        delayMs: 1500,
      },
      {
        speaker: 'Rachel (Compliance Officer)',
        avatarColor: 'bg-rose-600',
        role: 'AML Officer',
        text: 'Understood. Please state the card number they used for initial verification.',
        delayMs: 1800,
      },
      {
        speaker: 'David (Customer Support)',
        avatarColor: 'bg-amber-600',
        role: 'Tier 3 Support',
        text: 'The card on file is 4532 0150 0000 0005 under primary cardholder Sarah Connor.',
        delayMs: 2400,
      },
      {
        speaker: 'Rachel (Compliance Officer)',
        avatarColor: 'bg-rose-600',
        role: 'AML Officer',
        text: 'Thanks. For identity confirmation, please cross-verify the SSN: 678-45-1234.',
        delayMs: 2200,
      },
      {
        speaker: 'David (Customer Support)',
        avatarColor: 'bg-amber-600',
        role: 'Tier 3 Support',
        text: 'Identity verified in the core database. I am clearing the hold and emailing confirmation to sarah.connor@cyberdyne.systems.',
        delayMs: 2200,
      },
    ],
  },
  {
    id: 'spoken-phonetic-secrets',
    title: '🗣️ Spoken Phonetic & Spelled-out Passwords',
    category: 'Speech Normalization',
    description: 'Demonstrates Layer 0 speech normalization handling spelled letters, spoken punctuation ("dot", "at"), and trigger phrases.',
    expectedRedactionsCount: 3,
    dialogue: [
      {
        speaker: 'Elena (IT Helpdesk)',
        avatarColor: 'bg-teal-600',
        role: 'IT Specialist',
        text: 'Welcome to the team! Let me spell out your temporary WiFi access credentials.',
        delayMs: 1600,
      },
      {
        speaker: 'Jordan (New Hire)',
        avatarColor: 'bg-indigo-600',
        role: 'Software Engineer',
        text: 'Ready, I am listening.',
        delayMs: 1200,
      },
      {
        speaker: 'Elena (IT Helpdesk)',
        avatarColor: 'bg-teal-600',
        role: 'IT Specialist',
        text: 'Your email is jordan dot smith at enterprise dot com and your one time passcode is capital S, u, n, 2, 0, 2, 6, exclamation.',
        delayMs: 2800,
      },
      {
        speaker: 'Elena (IT Helpdesk)',
        avatarColor: 'bg-teal-600',
        role: 'IT Specialist',
        text: 'Also, if you need the developer GitHub organization token, it is ghp_X9y8Z7a6B5c4D3e2F1g0H1i2J3k4L5m6N7o8.',
        delayMs: 2400,
      },
      {
        speaker: 'Jordan (New Hire)',
        avatarColor: 'bg-indigo-600',
        role: 'Software Engineer',
        text: 'Got them. Logged in successfully and will change my master password immediately.',
        delayMs: 1600,
      },
    ],
  },
  {
    id: 'executive-strategy',
    title: '👔 Executive M&A Strategy & Compensation',
    category: 'Executive Strategy',
    description: 'C-suite discussion regarding acquisition valuation, target project names, and executive compensation terms.',
    expectedRedactionsCount: 3,
    dialogue: [
      {
        speaker: 'Victoria (Chief Strategy Officer)',
        avatarColor: 'bg-violet-700',
        role: 'CSO',
        text: 'Let us review the Q4 confidential growth strategy and acquisition roadmap.',
        delayMs: 1500,
      },
      {
        speaker: 'Arthur (Chief Financial Officer)',
        avatarColor: 'bg-slate-700',
        role: 'CFO',
        text: 'The board approved a total transaction budget of $12.5 million for Project Titan pending antitrust review.',
        delayMs: 2400,
      },
      {
        speaker: 'Victoria (Chief Strategy Officer)',
        avatarColor: 'bg-violet-700',
        role: 'CSO',
        text: 'Excellent. The retention package for lead engineer Jensen includes a signing bonus of $450,000.',
        delayMs: 2200,
      },
      {
        speaker: 'Arthur (Chief Financial Officer)',
        avatarColor: 'bg-slate-700',
        role: 'CFO',
        text: 'Everything is accounted for in our pro-forma cash projection. Meeting adjourned.',
        delayMs: 1600,
      },
    ],
  },
];
