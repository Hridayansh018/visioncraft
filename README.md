# 🛡️ Confidential-Info Guardrail

> **Real-time zero-retention guardrail for meeting transcription that captures audio, transcribes, and detects & redacts credentials, secrets, and PII before display or persistence.**

---

## 📖 Documentation & Architecture Blueprint

- 📘 **[Master Technical Documentation (DOCUMENTATION.md)](./DOCUMENTATION.md)** — Complete technology stack, multi-layer detection engine specification, programming methodologies (Regex, Luhn, NER heuristics, sliding windows, zero-retention memory wipe), and an exhaustive file-by-file & function-by-function catalog.
- 🚀 **[FastAPI + Next.js Migration Plan (MIGRATION_PLAN_FASTAPI.md)](./MIGRATION_PLAN_FASTAPI.md)** — Step-by-step engineering blueprint to migrate from Next.js fullstack to a decoupled FastAPI (Python with `faster-whisper`, Microsoft Presidio, spaCy, WebSockets) + Next.js microservices architecture.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v18+ (tested on v24.16.0)
- **npm**: v9+ (tested on v11.17.0)

### Run Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables** (Optional, for AI regex generation & semantic auditing):
   ```bash
   cp .env.example .env.local
   ```
   Add your Gemini API Key in `.env.local`:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Verify Production Build**:
   ```bash
   npm run build
   ```

---

## 🚀 Key Features

- **Multi-Layer Defense-in-Depth Pipeline**:
  - **Layer 0**: Spoken speech normalizer (symbols, number words, spelled-out sequences, filler words)
  - **Layer 1**: Deterministic regex recognizers + Mod-10 Luhn credit card validation (AWS keys, GitHub tokens, OpenAI keys, Slack tokens, JWTs, DB URIs, SSNs)
  - **Layer 2**: Presidio/spaCy NER simulation (Person names, confidential financials, project codenames)
  - **Layer 3**: Spoken-cue proximity triggers (`"my password is"`, `"the login is"`)
  - **Layer 4**: Redaction formatter (`[LABEL]`, `••••••••`, `[#SHA:hash]`, `[CATEGORY:LABEL]`)
  - **Layer 5**: Tamper-evident chained SHA-256 audit hashing
- **Zero-Retention Ephemeral RAM Buffer**: Raw speech chunk overwritten immediately with zero-fill (`0x00`) in <15ms.
- **7 Operational Views**:
  1. 🎙️ **Live Meeting Stream**: Real-time microphone capture, audio file ingestion (`.mp3`/`.wav`), live waveform visualizer, 4 simulated scenarios.
  2. 📊 **KPI Dashboard**: Analytics on intercepted threats, category distributions, and latency metrics.
  3. 📋 **Review Queue**: Human-in-the-loop validation without raw secret exposure, one-click allowlisting, threshold tuning.
  4. ⚙️ **Rules Manager**: Rule catalog management with Gemini 3.7 Flash AI regex generation.
  5. 🧪 **Evaluation Suite**: Ground-truth benchmark scoring, synthetic dataset generator, 9-test automated engine runner.
  6. 🔒 **Audit Log**: Cryptographic chained hash integrity verification.
  7. ☁️ **Architecture View**: Local MVP vs Cloud SaaS vs Enterprise Air-Gapped VPC deployment comparison.
- **Clean Export**: TXT, Markdown, and JSON metadata export.
- **Local Persistence & Error Recovery**: Full `localStorage` persistence and isolated React Error Boundary.

