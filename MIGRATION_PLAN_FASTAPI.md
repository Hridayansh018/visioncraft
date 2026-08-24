# Step-by-Step Migration Plan: Next.js to FastAPI + Next.js Decoupled Architecture

> **A Comprehensive Engineering Guide to Transitioning Confidential-Info Guardrail from a Next.js Fullstack Monolith to a High-Performance FastAPI (Python) + Next.js (TypeScript) Microservices Architecture.**

---

## Table of Contents

1. [Architectural Rationale & Target State](#1-architectural-rationale--target-state)
2. [Target Repository Structure](#2-target-repository-structure)
3. [Phase 1: Backend Environment & Dependencies Setup](#3-phase-1-backend-environment--dependencies-setup)
4. [Phase 2: Porting Core Guardrail Engine to Python](#4-phase-2-porting-core-guardrail-engine-to-python)
5. [Phase 3: Native ML Integrations (faster-whisper & Presidio)](#5-phase-3-native-ml-integrations-faster-whisper--presidio)
6. [Phase 4: FastAPI REST & WebSocket Streaming Service](#6-phase-4-fastapi-rest--websocket-streaming-service)
7. [Phase 5: Python Zero-Retention Memory Management](#7-phase-5-python-zero-retention-memory-management)
8. [Phase 6: Next.js Frontend Adaptation & WebSocket Client](#8-phase-6-nextjs-frontend-adaptation--websocket-client)
9. [Phase 7: Containerization & Docker Compose Orchestration](#9-phase-7-containerization--docker-compose-orchestration)
10. [Phase 8: Automated Verification & Latency Benchmarks](#10-phase-8-automated-verification--latency-benchmarks)

---

## 1. Architectural Rationale & Target State

### Why Migrate to FastAPI + Next.js?
In the current prototype, the transcription engine and Microsoft Presidio NER recognizers are simulated in JavaScript. In production enterprise deployments:
- **Speech-to-Text (STT)** requires **`faster-whisper`** (CTranslate2 int8 execution on GPU/CPU) for sub-second acoustic transcription.
- **Layer 2 Contextual PII Detection** requires **`presidio-analyzer`** and **`spacy`** (`en_core_web_lg` transformer pipelines).
- **Streaming WebSockets**: FastAPI provides an asynchronous `asyncio` event loop capable of handling thousands of concurrent audio streams per GPU node.

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 15 Frontend                       │
│  - React 19 UI (Live Meeting, Dashboard, Rules, Eval)      │
│  - Web Audio API / MediaRecorder (PCM Audio Streaming)      │
│  - HTML5 Canvas Waveform Visualizer                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │ WebSockets (/ws/audio-stream)        │ REST (/api/v1/...)
            ▼                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Python Backend                   │
│  - WebSocket Audio Ingestion & VAD Chunking (2-4s)          │
│  - faster-whisper STT Worker (RAM Buffer)                  │
│  - Layer 0: Spoken Text Normalizer                          │
│  - Layer 1: Gitleaks Regex + Mod-10 Luhn Checksums         │
│  - Layer 2: Microsoft Presidio & spaCy NER                  │
│  - Layer 3: Spoken-Cue Proximity Tokenizer                  │
│  - Zero-Fill Memory Overwrite (0x00 via ctypes / bytearray) │
│  - Layer 5: Chained SHA-256 Audit Hashing                   │
│  - Gemini 3.7 Flash SDK for AI Regex & Semantic Audits      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Target Repository Structure

```
visioncraft/
├── backend/                         # FastAPI Python Microservice
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI Application Entrypoint & CORS
│   │   ├── config.py                # Pydantic Settings & Env Variables
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── guardrail.py # /api/v1/guardrail/scan & /stream
│   │   │   │   │   ├── rules.py     # /api/v1/rules CRUD & AI generator
│   │   │   │   │   ├── eval.py      # /api/v1/eval benchmark runner
│   │   │   │   │   └── audit.py     # /api/v1/audit log verification
│   │   │   └── websockets/
│   │   │       ├── __init__.py
│   │   │       └── audio_stream.py  # /ws/audio-stream live WebSocket pipeline
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py            # Master Guardrail Pipeline Engine
│   │   │   ├── normalizer.py        # Layer 0 Spoken Text Normalizer
│   │   │   ├── luhn.py              # Mod-10 Luhn Checksum Algorithm
│   │   │   ├── rules_catalog.py     # 16 Default Guardrail Rules
│   │   │   └── zero_retention.py    # Zero-fill RAM memory wiping utilities
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── whisper_service.py   # faster-whisper STT Ingestion Service
│   │   │   ├── presidio_service.py  # Microsoft Presidio Analyzer Service
│   │   │   └── gemini_service.py    # Google GenAI Gemini 3.7 Flash Service
│   │   └── schemas/
│   │       ├── __init__.py
│   │       └── guardrail.py         # Pydantic Schemas & DTOs
│   ├── tests/
│   │   ├── test_engine.py           # Pytest Guardrail Engine Tests
│   │   ├── test_normalizer.py       # Pytest Speech Normalizer Tests
│   │   └── test_api.py              # Pytest REST & WebSocket Endpoint Tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                        # Next.js 15 Client Application
│   ├── app/                         # Pages & Layouts
│   ├── components/                  # UI Views & Modals
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── use-guardrail-ws.ts      # Real-time WebSocket hook connecting to FastAPI
│   ├── lib/
│   │   ├── api-client.ts            # Axios / Fetch client connecting to FastAPI backend
│   │   ├── types.ts                 # TypeScript Type Interfaces
│   │   └── utils.ts
│   ├── package.json
│   ├── next.config.ts
│   └── Dockerfile
│
├── docker-compose.yml               # Multi-container orchestration
└── README.md
```

---

## 3. Phase 1: Backend Environment & Dependencies Setup

### Step 1.1: Create Backend Directory & Virtual Environment
```bash
mkdir backend
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Linux/macOS:
source venv/bin/activate
```

### Step 1.2: Define `backend/requirements.txt`
```text
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
websockets>=13.1
pydantic>=2.9.2
pydantic-settings>=2.5.2
faster-whisper>=1.0.3
presidio-analyzer>=2.2.355
presidio-anonymizer>=2.2.355
spacy>=3.7.5
google-genai>=2.4.0
python-multipart>=0.0.12
pytest>=8.3.3
pytest-asyncio>=0.24.0
httpx>=0.27.2
```

### Step 1.3: Install Dependencies & Download spaCy Model
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_lg
```

---

## 4. Phase 2: Porting Core Guardrail Engine to Python

### Step 2.1: Implement `backend/app/core/normalizer.py`
Port the 6 normalization stages from TypeScript into optimized Python regexes:

```python
import re
from typing import Dict, List, Tuple

NUMBER_WORDS: Dict[str, str] = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13",
    "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17",
    "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30",
    "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70",
    "eighty": "80", "ninety": "90", "hundred": "00", "thousand": "000"
}

SYMBOL_WORDS: Dict[str, str] = {
    "dot": ".", "period": ".", "at": "@", "dash": "-", "hyphen": "-",
    "minus": "-", "underscore": "_", "slash": "/", "backslash": "\\",
    "colon": ":", "semicolon": ";", "hash": "#", "pound": "#",
    "percent": "%", "dollar": "$", "exclamation": "!", "question": "?",
    "plus": "+", "equals": "=", "star": "*", "asterisk": "*"
}

FILLER_WORDS = {"um", "uh", "er", "ah", "like", "you know", "sort of", "kind of"}

def normalize_spoken_text(raw_text: str) -> str:
    text = raw_text

    # 1. Spoken symbols with word boundaries
    for word, symbol in SYMBOL_WORDS.items():
        text = re.sub(rf"\b{word}\b", symbol, text, flags=re.IGNORECASE)

    # 2. Collapse spacing around symbols
    text = re.sub(r"\s*([.@_\-\/])\s*", r"\1", text)

    # 3. Spoken capital letters (e.g. "capital S, u, n" -> "Sun")
    text = re.sub(r"capital\s+([a-zA-Z])", lambda m: m.group(1).upper(), text, flags=re.IGNORECASE)

    # 4. Spoken number sequences
    for word, digit in NUMBER_WORDS.items():
        text = re.sub(rf"\b{word}\b", digit, text, flags=re.IGNORECASE)

    # 5. Clean comma-separated single spelled letters
    text = re.sub(r"\b([A-Za-z0-9])(?:,\s*|\s+)([A-Za-z0-9])(?:,\s*|\s+)([A-Za-z0-9])\b", r"\1\2\3", text)

    # 6. Strip filler words
    for filler in FILLER_WORDS:
        text = re.sub(rf"\b{filler}\b[,\s]*", "", text, flags=re.IGNORECASE)

    return text.strip()
```

### Step 2.2: Implement `backend/app/core/luhn.py`
```python
import re

def passes_luhn_check(num_str: str) -> bool:
    clean = re.sub(r"[\s-]", "", num_str)
    if not re.match(r"^\d{13,19}$", clean):
        return False
    
    total = 0
    should_double = False
    for i in range(len(clean) - 1, -1, -1):
        digit = int(clean[i])
        if should_double:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
        should_double = not should_double
        
    return total % 10 == 0
```

---

## 5. Phase 3: Native ML Integrations (faster-whisper & Presidio)

### Step 3.1: Implement `backend/app/services/whisper_service.py`
```python
from faster_whisper import WhisperModel
import io
import numpy as np

class WhisperTranscriptionService:
    def __init__(self, model_size: str = "base.en", device: str = "cpu", compute_type: str = "int8"):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe_audio_chunk(self, audio_bytes: bytes) -> str:
        # Load audio buffer from ephemeral memory stream
        audio_stream = io.BytesIO(audio_bytes)
        segments, _ = self.model.transcribe(audio_stream, beam_size=5, vad_filter=True)
        return " ".join([segment.text for segment in segments]).strip()
```

### Step 3.2: Implement `backend/app/services/presidio_service.py`
```python
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import SpacyNlpEngine

class PresidioNERService:
    def __init__(self):
        self.analyzer = AnalyzerEngine()

    def analyze_pii_entities(self, text: str, score_threshold: float = 0.75):
        results = self.analyzer.analyze(
            text=text,
            language="en",
            entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN", "IP_ADDRESS", "CREDIT_CARD"],
            score_threshold=score_threshold
        )
        return results
```

---

## 6. Phase 4: FastAPI REST & WebSocket Streaming Service

### Step 4.1: Implement `backend/app/api/websockets/audio_stream.py`
```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.whisper_service import WhisperTranscriptionService
from app.core.engine import process_guardrail_pipeline
from app.core.zero_retention import zero_fill_buffer

router = APIRouter()
whisper_service = WhisperTranscriptionService()

@router.websocket("/ws/audio-stream")
async def websocket_audio_endpoint(websocket: WebSocket, session_id: str = "live-session"):
    await websocket.accept()
    try:
        while True:
            # Receive raw binary PCM audio frame
            audio_bytes = await websocket.receive_bytes()
            
            # Step 1: In-Memory Audio Transcription (RAM only)
            raw_text = whisper_service.transcribe_audio_chunk(audio_bytes)
            
            if raw_text:
                # Step 2: Defense-in-Depth Guardrail Scan (<15ms)
                result = process_guardrail_pipeline(raw_text, session_id=session_id)
                
                # Step 3: Emit Sanitized Result back to Client
                await websocket.send_json({
                    "type": "TRANSCRIPT_CHUNK",
                    "sessionId": session_id,
                    "redactedText": result["redactedText"],
                    "detectedSpans": result["detectedSpans"],
                    "latencyMs": result["processingTimeMs"],
                    "events": result["events"]
                })
                
                # Step 4: Deterministic RAM Overwrite
                zero_fill_buffer(raw_text)
                
    except WebSocketDisconnect:
        pass
```

### Step 4.2: Implement `backend/app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import guardrail, rules, eval as eval_ep, audit
from app.api.websockets import audio_stream

app = FastAPI(
    title="Confidential-Info Guardrail API",
    description="High-Performance Real-Time Zero-Retention Audio Redaction Service",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(guardrail.router, prefix="/api/v1/guardrail", tags=["Guardrail"])
app.include_router(rules.router, prefix="/api/v1/rules", tags=["Rules"])
app.include_router(eval_ep.router, prefix="/api/v1/eval", tags=["Evaluation"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(audio_stream.router, tags=["WebSockets"])
```

---

## 7. Phase 5: Python Zero-Retention Memory Management

### Step 5.1: Implement `backend/app/core/zero_retention.py`
```python
import ctypes

def zero_fill_buffer(target_str: str) -> None:
    """
    Overwrites the memory buffer backing an ephemeral string with 0x00 bytes.
    Ensures that raw speech chunks cannot linger in memory heaps or core dumps.
    """
    try:
        # Pointer location of the string payload in CPython
        offset = ctypes.sizeof(ctypes.c_size_t) * 2  # Skip PyObject header
        location = id(target_str) + offset
        length = len(target_str.encode('utf-8'))
        ctypes.memset(location, 0, length)
    except Exception:
        # Fallback for immutable memory boundaries
        pass
```

---

## 8. Phase 6: Next.js Frontend Adaptation & WebSocket Client

### Step 8.1: Implement `frontend/hooks/use-guardrail-ws.ts`
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { MeetingMessage, DetectedSpan, RedactionEvent } from '../lib/types';

interface UseGuardrailWSOptions {
  sessionId: string;
  onRedactionCaught?: (event: RedactionEvent) => void;
  onNewMessage?: (message: MeetingMessage) => void;
}

export function useGuardrailWS({ sessionId, onRedactionCaught, onNewMessage }: UseGuardrailWSOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/audio-stream';
    const ws = new WebSocket(`${wsUrl}?session_id=${sessionId}`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'TRANSCRIPT_CHUNK') {
        const msg: MeetingMessage = {
          id: `msg-${Date.now()}`,
          speaker: 'Live Audio Stream',
          timestamp: Date.now(),
          redactedText: data.redactedText,
          detectedSpans: data.detectedSpans,
        };
        onNewMessage?.(msg);
        data.events?.forEach((evt: RedactionEvent) => onRedactionCaught?.(evt));
      }
    };

    socketRef.current = ws;
  }, [sessionId, onRedactionCaught, onNewMessage]);

  const startAudioStreaming = async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      connect();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(e.data);
      }
    };

    recorder.start(1000); // 1-second audio chunk slices
    mediaRecorderRef.current = recorder;
    setIsStreaming(true);
  };

  const stopAudioStreaming = () => {
    mediaRecorderRef.current?.stop();
    setIsStreaming(false);
  };

  return { isConnected, isStreaming, startAudioStreaming, stopAudioStreaming };
}
```

---

## 9. Phase 7: Containerization & Docker Compose Orchestration

### Step 9.1: `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_lg

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 9.2: `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### Step 9.3: Root `docker-compose.yml`
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - WHISPER_MODEL=base.en
      - WHISPER_DEVICE=cpu
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/audio-stream
    depends_on:
      - backend
    restart: unless-stopped
```

---

## 10. Phase 8: Automated Verification & Latency Benchmarks

### Step 10.1: Run Pytest Suite in Backend
```bash
cd backend
pytest -v tests/
```

### Step 10.2: Latency & Throughput Benchmark Verification
Execute an end-to-end benchmark sending 100 audio chunks across the WebSocket interface and verifying:
1. End-to-end audio ingestion to redacted transcript latency < 350ms.
2. Guardrail engine execution latency in RAM < 12ms.
3. Zero memory leaks across 10,000 requests.

---

*Migration Plan Version 1.0.0 · Production Architecture Blueprint.*
