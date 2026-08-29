"""Thin FastAPI Gateway Server for VisionCraft (FR-033, FR-034, FR-035).

Exposes REST and WebSocket endpoints to the React / Desktop UI.
Contains ZERO detection business logic—all operations delegate 100% to the Python core engine.
"""

import uuid
import time
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from visioncraft.pipeline import GuardrailPipeline
from visioncraft.types import GuardrailRule, TranscriptSegment, ProcessTranscriptResult
from visioncraft.detection.rules import DEFAULT_GUARDRAIL_RULES
from visioncraft.audit.hashing import AuditHashChain
from visioncraft.export.txt import export_to_txt
from visioncraft.export.markdown import export_to_markdown
from visioncraft.export.json import export_to_json


app = FastAPI(
    title="VisionCraft Guardrail API",
    version="1.0.0",
    description="Thin communication gateway for VisionCraft Local-First Meeting Guardrail Engine",
)

# Enable CORS for Next.js frontend / desktop app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session registry (ephemeral session state)
class SessionState:
    def __init__(self, session_id: str, title: str = "Live Meeting"):
        self.session_id = session_id
        self.title = title
        self.started_at = time.time()
        self.ended_at: Optional[float] = None
        self.is_active = True
        self.pipeline = GuardrailPipeline()
        self.hash_chain = AuditHashChain(session_id=session_id)
        self.segments: List[TranscriptSegment] = []


SESSIONS: Dict[str, SessionState] = {}


# --- REST Schemas ---
class CreateSessionRequest(BaseModel):
    title: str = "Live Meeting"


class ScanRequest(BaseModel):
    text: str
    session_id: Optional[str] = "scan-session"
    allowlist: Optional[List[str]] = None


# --- REST Endpoints ---
@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "service": "visioncraft-engine"}


@app.get("/api/v1/rules")
def get_rules() -> List[Dict[str, Any]]:
    """Fetches active guardrail rules from Python core."""
    return [rule.model_dump() for rule in DEFAULT_GUARDRAIL_RULES]


@app.post("/api/v1/scan")
def scan_text(req: ScanRequest) -> ProcessTranscriptResult:
    """Scans and redacts text through Python core pipeline."""
    pipeline = GuardrailPipeline()
    return pipeline.process(
        raw_transcript=req.text,
        session_id=req.session_id or "scan-session",
        allowlist=req.allowlist,
    )


@app.post("/api/v1/sessions")
def create_session(req: CreateSessionRequest) -> Dict[str, Any]:
    """Initializes a new meeting session (FR-035)."""
    session_id = f"session_{uuid.uuid4().hex[:8]}"
    state = SessionState(session_id=session_id, title=req.title)
    SESSIONS[session_id] = state
    return {
        "session_id": session_id,
        "title": state.title,
        "started_at": state.started_at,
        "status": "live",
    }


@app.post("/api/v1/sessions/{session_id}/stop")
def stop_session(session_id: str) -> Dict[str, Any]:
    """Stops and finalizes a meeting session."""
    state = SESSIONS.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    state.is_active = False
    state.ended_at = time.time()
    return {
        "session_id": session_id,
        "status": "completed",
        "total_segments": len(state.segments),
        "chain_verified": state.hash_chain.verify_chain(),
    }


@app.get("/api/v1/sessions/{session_id}")
def get_session(session_id: str) -> Dict[str, Any]:
    state = SESSIONS.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": state.session_id,
        "title": state.title,
        "started_at": state.started_at,
        "ended_at": state.ended_at,
        "is_active": state.is_active,
        "total_segments": len(state.segments),
        "chain_verified": state.hash_chain.verify_chain(),
    }


@app.get("/api/v1/sessions/{session_id}/transcript")
def get_session_transcript(session_id: str) -> List[Dict[str, Any]]:
    state = SESSIONS.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return [seg.model_dump() for seg in state.segments]


@app.get("/api/v1/sessions/{session_id}/export")
def export_session(session_id: str, format: str = Query("markdown", enum=["txt", "markdown", "md", "json"])) -> Dict[str, Any]:
    """Exports safe transcript in requested format (FR-038)."""
    state = SESSIONS.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    if format in ("markdown", "md"):
        content = export_to_markdown(state.segments, session_title=state.title, session_id=session_id)
        content_type = "text/markdown"
    elif format == "json":
        content = export_to_json(state.segments, {"session_id": session_id, "title": state.title})
        content_type = "application/json"
    else:
        content = export_to_txt(state.segments, session_title=state.title)
        content_type = "text/plain"

    return {
        "session_id": session_id,
        "format": format,
        "content_type": content_type,
        "content": content,
    }


# --- WebSocket Streaming Endpoint (FR-034) ---
@app.websocket("/ws/live-meeting")
async def websocket_live_meeting(websocket: WebSocket, session_id: Optional[str] = None):
    """Real-time streaming WebSocket endpoint for live meeting transcription and redaction."""
    await websocket.accept()
    sid = session_id or f"ws_{uuid.uuid4().hex[:8]}"
    state = SESSIONS.get(sid) or SessionState(session_id=sid)
    SESSIONS[sid] = state

    try:
        await websocket.send_json({
            "type": "SESSION_CONNECTED",
            "session_id": sid,
            "title": state.title,
        })

        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "")

            if event_type == "PROCESS_TEXT_CHUNK":
                raw_text = data.get("text", "")
                speaker = data.get("speaker", "speaker_00")
                source = data.get("source", "microphone")
                timestamp = data.get("timestamp", time.time())

                # Process chunk through Python Core
                result = state.pipeline.process(
                    raw_transcript=raw_text,
                    session_id=sid,
                    hash_chain=state.hash_chain,
                )

                segment = TranscriptSegment(
                    id=f"seg_{len(state.segments):03d}",
                    start=timestamp,
                    end=timestamp + 2.0,
                    speaker=speaker,
                    source=source,
                    safe_text=result.redacted_text,
                    detections=[s.model_dump() for s in result.detected_spans],
                )
                state.segments.append(segment)

                # Push real-time safe transcript event to UI
                await websocket.send_json({
                    "type": "TRANSCRIPT_CHUNK",
                    "segment": segment.model_dump(),
                    "detections": [s.model_dump() for s in result.detected_spans],
                    "events": [e.model_dump() for e in result.events],
                    "processing_time_ms": result.processing_time_ms,
                    "chain_verified": state.hash_chain.verify_chain(),
                })

            elif event_type == "PING":
                await websocket.send_json({"type": "PONG", "timestamp": time.time()})

    except WebSocketDisconnect:
        pass
