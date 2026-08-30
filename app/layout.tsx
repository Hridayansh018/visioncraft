import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Confidential-Info Guardrail | Zero-Retention Audio Redaction & PII Shield',
  description: 'Real-time zero-retention guardrail for meeting transcription that captures audio, transcribes, and detects & redacts credentials, secrets, and PII before display or persistence.',
  keywords: ['guardrail', 'zero-retention', 'PII redaction', 'secret detection', 'audio transcription', 'compliance', 'meeting security'],
  openGraph: {
    title: 'Confidential-Info Guardrail | Zero-Retention Audio Redaction',
    description: 'Real-time zero-retention guardrail for meeting transcription that intercepts credentials and PII in RAM.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Confidential-Info Guardrail',
    description: 'Zero-retention real-time audio guardrail for credentials & PII protection.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0A0E17] text-[#dfe2ef] antialiased font-sans selection:bg-[#4d8eff] selection:text-[#00285d]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
