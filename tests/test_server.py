"""Tests for FastAPI Gateway Endpoints (FR-033, FR-034, FR-035)."""

from server.main import (
    health_check,
    get_rules,
    scan_text,
    create_session,
    get_session,
    export_session,
    stop_session,
    ScanRequest,
    CreateSessionRequest,
)


def test_health():
    res = health_check()
    assert res["status"] == "ok"
    assert res["service"] == "visioncraft-engine"


def test_get_rules():
    rules = get_rules()
    assert len(rules) >= 10
    assert any(r["id"] == "rule-aws-key" for r in rules)


def test_scan_endpoint():
    req = ScanRequest(text="Here is AWS key AKIAIOSFODNN7EXAMPLE for deploy")
    res = scan_text(req)
    assert "[AWS_ACCESS_KEY]" in res.redacted_text
    assert len(res.detected_spans) == 1
    assert res.ephemeral_memory_cleared is True


def test_sessions_lifecycle_and_export():
    # 1. Create session
    req = CreateSessionRequest(title="Sprint Planning")
    create_res = create_session(req)
    session_id = create_res["session_id"]
    assert create_res["status"] == "live"

    # 2. Get session
    get_res = get_session(session_id)
    assert get_res["title"] == "Sprint Planning"
    assert get_res["is_active"] is True

    # 3. Export
    exp_res = export_session(session_id=session_id, format="markdown")
    assert "# Sprint Planning" in exp_res["content"]

    # 4. Stop session
    stop_res = stop_session(session_id)
    assert stop_res["status"] == "completed"
