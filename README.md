# 🛡️ VisionCraft: Local-First Meeting Guardrail & Transcription

> **Privacy-oriented, local-first meeting transcription and confidential-information protection system. Transcribes microphone and system audio, normalizes spoken cues, and redacts credentials, secrets, PII, and financial identifiers in real time before display or persistence.**

---

## 📋 Table of Contents
1. [Architectural Overview](#-architectural-overview)
2. [Prerequisites & Installation](#-prerequisites--installation)
3. [Quick Start & Usage Modes](#-quick-start--usage-modes)
   - [Mode 1: Interactive Live Meeting Web App](#mode-1-interactive-live-meeting-web-app)
   - [Mode 2: Live Meeting Background Recorder (CLI)](#mode-2-live-meeting-background-recorder-cli)
   - [Mode 3: Batch Audio File Transcription](#mode-3-batch-audio-file-transcription)
   - [Mode 4: Text & Transcript File Scanner](#mode-4-text--transcript-file-scanner)
   - [Mode 5: Direct Python Core Library API](#mode-5-direct-python-core-library-api)
4. [Theoretical Concepts & Code Mapping](#-theoretical-concepts--code-mapping)
5. [Guardrail Pipeline Architecture](#-guardrail-pipeline-architecture)
6. [Default Rule Catalog](#-default-rule-catalog)
7. [Automated Verification & Testing](#-automated-verification--testing)
8. [Cryptographic Audit & Integrity](#-cryptographic-audit--integrity)

---

## 🏛️ Architectural Overview

VisionCraft features a decoupled, high-performance architecture where **all heavy processing lives in a pure Python core**, accessible via CLI, FastAPI WebSockets, and a modern Next.js desktop/web UI.

```
┌────────────────────────────────────────────────────────┐
│             Next.js / React (Client UI)                │
│  - Live waveform visualizer & audio device selector    │
│  - Real-time safe transcript feed display              │
│  - Review queue & rules toggle dashboard               │
└───────────────────────────┬────────────────────────────┘
                            │ REST / WebSockets (/ws/live-meeting)
                            ▼
┌────────────────────────────────────────────────────────┐
│              FastAPI (Thin Gateway Layer)              │
│  - WebSocket streaming & session REST endpoints        │
│  - Zero business logic (delegates 100% to Python core) │
└───────────────────────────┬────────────────────────────┘
                            │ Python API calls
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Python Core Engine                    │
│  ├── 1. Audio: Windows WASAPI loopback & Mic capture   │
│  ├── 2. ASR: Local faster-whisper + VAD chunking       │
│  ├── 3. Diarization: Speaker attribution (You vs Them) │
│  ├── 4. Normalization: Spoken symbol/digit parsing     │
│  ├── 5. Detection: Multi-layer Regex, Luhn, Presidio   │
│  ├── 6. Redaction: Safe transcript replacement         │
│  ├── 7. Audit: Cryptographic SHA-256 hash chains       │
│  └── 8. Export: TXT, Markdown, JSON formatters         │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Prerequisites & Installation

### System Requirements
- **Python**: 3.10+ (tested on Python 3.14)
- **Node.js**: v18+ (tested on v20+)
- **OS**: Windows (WASAPI loopback & Mic), macOS (CoreAudio), or Linux (PulseAudio/PipeWire)

### Automated Setup

#### Windows One-Click:
```cmd
setup_venv.bat
```

#### macOS / Linux One-Click:
```bash
bash setup_venv.sh
```

### Manual Setup Steps

1. **Clone and enter repository**:
   ```bash
   git clone https://github.com/Hridayansh018/visioncraft.git
   cd visioncraft
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Install Python package & dependencies**:
   ```bash
   pip install -r requirements.txt
   pip install -e .
   ```

---

## 🚀 Quick Start & Usage Modes

### Mode 1: Interactive Live Meeting Web App

Run the complete web application with live audio waveform visualizations, WebSocket streaming, and interactive review queue:

```bash
# Terminal 1: Launch Python FastAPI Gateway (port 8000)
npm run server

# Terminal 2: Launch Next.js UI (port 3000)
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Select your audio capture mode:
   - **Microphone Only**
   - **System Audio** (Zoom/Google Meet/Teams audio)
   - **Dual Mixed** (both microphone and remote participants)
3. Click **"Start Live Session"**.
4. Spoken text normalizes on-the-fly and sensitive credentials/PII are redacted in real time.
5. Click **"Export"** to download the sanitized transcript in Markdown, TXT, or JSON.

---

### Mode 2: Live Meeting Background Recorder (CLI)

Run VisionCraft directly in your terminal during a live meeting (Zoom, Teams, Google Meet, Slack Huddle):

```bash
python -m visioncraft.cli.main record --mic --system --out meeting_transcript.md
```

- **`--mic`**: Captures your local microphone speech (`speaker_00`).
- **`--system`**: Captures remote participants via Windows WASAPI Loopback (`speaker_01`).
- **`--model`**: Choose Whisper model size (`tiny`, `base`, `small`, `medium`). Default: `base`.
- **`--format`**: Export format (`md`, `txt`, `json`).
- Press `Ctrl+C` to stop the meeting. The sanitized transcript and verified cryptographic hash chain will be saved immediately to `meeting_transcript.md`.

---

### Mode 3: Batch Audio File Transcription

Transcribe pre-recorded `.wav` or `.mp3` meeting audio files locally:

```bash
python -m visioncraft.cli.main transcribe meeting.wav --model base --format md --out safe_meeting.md
```

---

### Mode 4: Text & Transcript File Scanner

Scan existing meeting notes, transcripts, or server logs for secrets:

```bash
python -m visioncraft.cli.main scan sample_meeting.txt --out safe_meeting.txt
```

---

### Mode 5: Direct Python Core Library API

Embed VisionCraft into your custom Python backend or data pipeline:

```python
from visioncraft import GuardrailPipeline
from visioncraft.audit.hashing import AuditHashChain

# Initialize pipeline and verifiable audit hash chain
pipeline = GuardrailPipeline()
chain = AuditHashChain(session_id="session_001")

# Process raw speech transcript
raw_text = "Please verify AWS bucket with capital A capital K capital I capital A I O S F O D N N 7 E X A M P L E"
result = pipeline.process(raw_text, session_id="session_001", hash_chain=chain)

print("Safe Redacted Text:", result.redacted_text)
# Output: "Please verify AWS bucket with [AWS_ACCESS_KEY]"

print("Audit Chain Verified:", chain.verify_chain())
# Output: True
```

---

## 🔬 Theoretical Concepts & Code Mapping

VisionCraft implements formal principles from **Digital Signal Processing**, **Automata Theory**, **Information Theory**, **Graph Theory**, **NLP**, and **Cryptographic Engineering**. Detailed mathematical formulations are documented in **[DOCUMENTATION.md §9](./DOCUMENTATION.md#9-theoretical-computer-science-nlp-cryptography--dsp-concepts-and-codebase-mapping)**:

| Discipline | Theoretical Concept / Formula | Codebase Implementation | Purpose |
| :--- | :--- | :--- | :--- |
| **Acoustics & DSP** | RMS Energy Thresholding ($x_{\text{rms}} = \sqrt{\frac{1}{N}\sum x^2}$) | [`transcription/vad.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/transcription/vad.py) (`VoiceActivityDetector`) | Silence filtering; saves 70% ASR inference compute. |
| **Acoustics & DSP** | Dynamic Buffer Segmentation & Latency Caps | [`transcription/chunker.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/transcription/chunker.py) (`AudioChunker`) | Natural pause boundaries with $\le 4\text{s}$ latency bounds. |
| **OS Audio / DSP** | WASAPI Loopback Direct Endpoint Interception | [`audio/windows.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/audio/windows.py) (`WindowsWASAPILoopbackCapture`) | Captures system audio from Zoom/Meet without virtual cables. |
| **Automata Theory** | DFA Regular Expressions & Boundary Assertions | [`detection/regex.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/detection/regex.py) (`scan_regex_rules`) | Linear $O(N)$ high-speed matching for structured secrets. |
| **Number Theory** | Mod-10 Luhn Checksum Algorithm ($\sum f(d_i) \equiv 0$) | [`detection/luhn.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/detection/luhn.py) (`passes_luhn_check`) | Verifies genuine payment cards; cuts 90% false positives. |
| **NLP** | Phonetic Speech-to-Text Entity Normalization | [`normalization/spoken.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/normalization/spoken.py) (`normalize_spoken_text`) | Normalizes spoken symbols, acronyms, and digit sequences. |
| **NLP** | Contextual Proximity Sliding Token Windows | [`detection/spoken_cues.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/detection/spoken_cues.py) (`scan_spoken_cues`) | Scans password lead-in cues and redacts following token window. |
| **NLP / Transformers** | Named Entity Recognition (NER) | [`detection/presidio.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/detection/presidio.py) (`scan_presidio_pii`) | Contextual recognition for person names and locations. |
| **Graph Theory** | Interval Scheduling Span Overlap Resolution | [`detection/engine.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/detection/engine.py) (`resolve_overlapping_spans`) | Resolves multi-span collisions by severity and confidence. |
| **Cryptography** | FIPS 180-4 SHA-256 Merkle-Damgård Compression | [`audit/hashing.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/audit/hashing.py) (`compute_sha256`) | Generates tamper-proof 256-bit metadata audit digests. |
| **Cryptographic Systems**| Verifiable Hash Chain ($H_i = \text{SHA256}(H_{i-1} \parallel E_i)$) | [`audit/hashing.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/audit/hashing.py) (`AuditHashChain`) | Cryptographically binds audit trail; proves log integrity. |
| **Security Architecture**| Ephemeral In-Memory Zero-Retention Policy | [`pipeline.py`](file:///c:/Users/hrida/Desktop/grd2/visioncraft/visioncraft/pipeline.py) (`GuardrailPipeline`) | Eliminates credential persistence on disk, logs, or telemetry. |

---

## 🛡️ Guardrail Pipeline Architecture

The guardrail operates in 6 sequential stages:

1. **Layer 0 (Spoken Text Normalizer)**:
   - Converts spoken symbols: `"dot"` $\to$ `"."`, `"at"` $\to$ `"@"`, `"slash"` $\to$ `"/"`, `"dash"` $\to$ `"-"`.
   - Collapses spoken digit sequences: `"two zero two six"` $\to$ `"2026"`.
   - Collapses spelled letters: `"capital A capital K capital I capital A"` $\to$ `"AKIA"`.
2. **Layer 1 (Deterministic Regex & Checksums)**:
   - High-precision patterns for AWS keys, GitHub tokens, OpenAI project keys (`sk-proj-`), DB connection strings, SSNs, and JWTs.
   - **Mod-10 Luhn Algorithm**: Mathematically validates credit card numbers to eliminate numerical false positives.
3. **Layer 2 (Contextual NER)**:
   - Microsoft Presidio & spaCy named entity recognition for participant names and locations with heuristic fallbacks.
4. **Layer 3 (Spoken Secret Cues)**:
   - Scans lead-in phrases (`"my password is"`, `"the secret token is"`, `"the temporary login is"`) and redacts following token windows.
5. **Deterministic Span Overlap Resolution**:
   - Resolves multi-rule collisions based on start position, rule severity (Critical > High > Medium > Low), and confidence score.
6. **Zero-Retention Ephemeral RAM Policy**:
   - Raw speech chunks are transiently processed in memory and never persisted to disk or telemetry.

---

## 📜 Default Rule Catalog

| Rule ID | Category | Detection Mechanism | Replacement Strategy |
| :--- | :--- | :--- | :--- |
| `rule-aws-key` | API Keys | `(AKIA\|ABIA\|ACCA\|ASIA)[0-9A-Z]{16}` | `[AWS_ACCESS_KEY]` |
| `rule-aws-secret` | Credentials | 40-char base64 in proximity to AWS cues | `[AWS_SECRET_KEY]` |
| `rule-github-token` | API Keys | `ghp_...` and `github_pat_...` | `[GITHUB_TOKEN]` |
| `rule-openai-key` | API Keys | `sk-...`, `sk-proj-...`, `AIza...` | `[AI_API_KEY]` |
| `rule-slack-token` | API Keys | `xox[baprs]-...` and webhook URLs | `[SLACK_TOKEN]` |
| `rule-jwt` | Credentials | Base64 header.payload.signature | `••••••••` |
| `rule-private-key` | Credentials | PEM Private key headers | `[PRIVATE_KEY_BLOCK]` |
| `rule-db-uri` | Credentials | PostgreSQL/MySQL/MongoDB URIs with passwords | `[DATABASE_CONN_URI]` |
| `rule-credit-card` | Financial | Visa/MasterCard/Amex + **Mod-10 Luhn Check** | `[FINANCIAL:CREDIT_CARD]` |
| `rule-ssn` | PII | US Social Security Numbers | `[PII:US_SSN]` |
| `rule-email` | PII | Normalized email addresses | `[EMAIL]` |
| `rule-phone` | PII | North American & International phone numbers | `[PHONE_NUMBER]` |
| `rule-spoken-password`| Spoken Cue | Proximity to `"my password is"`, `"the token is"` | `[SPOKEN_SECRET]` |
| `rule-confidential-mna`| Credentials | Strategic corporate codenames | `[CONFIDENTIAL_CODENAME]` |
| `rule-confidential-financial` | Financial | M&A values & deals (`$X million/billion`) | `[CONFIDENTIAL_FINANCIALS]` |

---

## 🧪 Automated Verification & Testing

VisionCraft includes full test suites across both TypeScript and Python:

```bash
# Run all test suites simultaneously (TypeScript + Python)
npm run test:all

# Run Python Pytest suite only (34 tests)
npm run test:py

# Run TypeScript unit tests only (10 tests)
npm test
```

### Test Suite Status
- **TypeScript Unit Tests**: `10/10 Passed`
- **Python Pytest Suite**: `34/34 Passed`

---

## 🔒 Cryptographic Audit & Integrity

Compliant with **FR-024** and **FR-025**:
- All audit entries use standard **FIPS 180-4 SHA-256** cryptographic hashes.
- Tamper-evident **hash chains** are formed sequentially:
  $$H_0 = \text{SHA256}(\text{genesis})$$
  $$H_1 = \text{SHA256}(H_0 + \text{event}_1)$$
  $$H_2 = \text{SHA256}(H_1 + \text{event}_2)$$
- Any tampering with session metadata or logs immediately invalidates `chain.verify_chain()`.

---

## 📄 License
VisionCraft is distributed under the MIT License.
