"""
AI Bottleneck Detection Service
─────────────────────────────────
Takes the discovered workflow JSON, knowledge graph JSON, and raw document
text, sends them to Google Gemini, and returns a structured BottleneckReport.

Designed to be fully modular: the returned BottleneckReport can be consumed
by future modules (Optimization Engine, Lemma SDK) without coupling to this
service.
"""

import json
import os
import re
import logging
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

from schemas.bottleneck import Bottleneck, BottleneckSummary, BottleneckReport

# ── Setup ────────────────────────────────────────────────────────────────
load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Keep the combined context tight so the output budget is large enough
# for a detailed bottleneck report (can be 3 000+ tokens).
MAX_WORKFLOW_CHARS = 3_000
MAX_KG_CHARS = 1_500
MAX_DOC_CHARS = 2_000

# ── Prompt ───────────────────────────────────────────────────────────────
_BOTTLENECK_PROMPT = """\
You are an Enterprise Workflow Optimization AI specialising in Business
Process Intelligence.

You will be given:
1. A discovered workflow (JSON)
2. An organizational knowledge graph (JSON, may be partial)
3. A short excerpt from the source document

Your task is to identify ALL process bottlenecks and inefficiencies present
in this specific workflow.

Analyse for:
- Sequential approval chains that create waiting time
- Single points of failure (one person / team owns everything)
- Repeated or redundant manual tasks
- Long approval chains with no automation
- Duplicate work across teams
- Steps with missing ownership (actor = Unknown)
- Missing automation opportunities in repetitive tasks
- Risky dependencies (one step blocks many others)
- High process complexity
- Poor handoff clarity between departments

Do NOT invent information. Infer only from the workflow and document provided.
If the workflow is simple and healthy, return fewer bottlenecks with a high
health score.

Return a single JSON object ONLY — no markdown, no prose.

Schema you MUST follow exactly:

{
  "summary": {
    "overall_health_score": 75,
    "workflow_complexity": "Medium",
    "automation_readiness": "Medium",
    "estimated_time_savings": "2 Days",
    "risk_score": 40,
    "ai_confidence": 85,
    "total_bottlenecks": 3,
    "high_severity": 1,
    "medium_severity": 1,
    "low_severity": 1
  },
  "bottlenecks": [
    {
      "severity": "High",
      "title": "<short bottleneck name>",
      "description": "<what the bottleneck is>",
      "reason": "<root cause>",
      "impact": "High",
      "affected_steps": ["<step title>"],
      "affected_actors": ["<role or name>"],
      "estimated_delay": "2 Days",
      "recommendation": "<concrete fix>",
      "confidence": 88
    }
  ]
}

Rules:
- severity and impact MUST be one of: High | Medium | Low
- overall_health_score: 0 (broken) to 100 (perfect)
- risk_score: 0 (safe) to 100 (very risky)
- ai_confidence: your confidence in the overall analysis (0–100)
- confidence per bottleneck: your confidence in that specific finding (0–100)
- estimated_time_savings: total time savings if ALL bottlenecks fixed
- Return JSON only — absolutely no other text
"""


# ── Helpers ──────────────────────────────────────────────────────────────

def _trim(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n[... truncated ...]"


def _serialise(obj: Optional[dict], max_chars: int) -> str:
    if not obj:
        return "{}"
    try:
        raw = json.dumps(obj, separators=(",", ":"))
    except Exception:
        raw = str(obj)
    return _trim(raw, max_chars)


def _repair_truncated_json(raw: str) -> str:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*\n?(.*)", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    depth_brace = depth_bracket = 0
    in_string = escape_next = False

    for ch in text:
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth_brace += 1
        elif ch == "}":
            depth_brace -= 1
        elif ch == "[":
            depth_bracket += 1
        elif ch == "]":
            depth_bracket -= 1

    closing = ('"' if in_string else "") + "]" * max(depth_bracket, 0) + "}" * max(depth_brace, 0)
    if closing:
        logger.info("Bottleneck: repaired truncated JSON, appended: %r", closing)
    return text + closing


def _extract_json(raw: str) -> Optional[dict]:
    for attempt in (
        lambda s: json.loads(s.strip()),
        lambda s: json.loads(
            re.search(r"```(?:json)?\s*\n?(.*?)\n?```", s, re.DOTALL).group(1).strip()  # type: ignore[union-attr]
        ),
        lambda s: json.loads(re.search(r"\{.*\}", s, re.DOTALL).group(0)),  # type: ignore[union-attr]
    ):
        try:
            return attempt(raw)
        except Exception:
            pass
    return None


def _normalise(data: dict) -> BottleneckReport:
    """Convert parsed Gemini JSON into a validated BottleneckReport."""

    # ── Summary ──────────────────────────────────────────────────────────
    raw_summary: dict = data.get("summary") or {}
    if not isinstance(raw_summary, dict):
        raw_summary = {}

    raw_bottlenecks: list = data.get("bottlenecks") or []
    if not isinstance(raw_bottlenecks, list):
        raw_bottlenecks = []

    # Recount from actual bottleneck list for consistency
    high = sum(1 for b in raw_bottlenecks if str(b.get("severity", "")).strip().lower() == "high")
    med  = sum(1 for b in raw_bottlenecks if str(b.get("severity", "")).strip().lower() == "medium")
    low  = sum(1 for b in raw_bottlenecks if str(b.get("severity", "")).strip().lower() == "low")

    summary = BottleneckSummary(
        overall_health_score=_clamp(raw_summary.get("overall_health_score", 75)),
        workflow_complexity=raw_summary.get("workflow_complexity", "Medium") or "Medium",
        automation_readiness=raw_summary.get("automation_readiness", "Medium") or "Medium",
        estimated_time_savings=raw_summary.get("estimated_time_savings", "Unknown") or "Unknown",
        risk_score=_clamp(raw_summary.get("risk_score", 40)),
        ai_confidence=_clamp(raw_summary.get("ai_confidence", 75)),
        total_bottlenecks=len(raw_bottlenecks),
        high_severity=high,
        medium_severity=med,
        low_severity=low,
    )

    # ── Bottlenecks ───────────────────────────────────────────────────────
    bottlenecks: list[Bottleneck] = []
    VALID_LEVELS = {"high", "medium", "low"}

    for rb in raw_bottlenecks:
        if not isinstance(rb, dict):
            continue

        severity = str(rb.get("severity", "Medium")).strip().capitalize()
        if severity.lower() not in VALID_LEVELS:
            severity = "Medium"

        impact = str(rb.get("impact", "Medium")).strip().capitalize()
        if impact.lower() not in VALID_LEVELS:
            impact = "Medium"

        bottlenecks.append(Bottleneck(
            severity=severity,
            title=str(rb.get("title", "Unnamed Bottleneck")).strip() or "Unnamed Bottleneck",
            description=str(rb.get("description", "")).strip(),
            reason=str(rb.get("reason", "")).strip(),
            impact=impact,
            affected_steps=_ensure_list(rb.get("affected_steps")),
            affected_actors=_ensure_list(rb.get("affected_actors")),
            estimated_delay=str(rb.get("estimated_delay", "Unknown")).strip() or "Unknown",
            recommendation=str(rb.get("recommendation", "")).strip(),
            confidence=_clamp(rb.get("confidence", 75)),
        ))

    # Sort: High → Medium → Low
    order = {"High": 0, "Medium": 1, "Low": 2}
    bottlenecks.sort(key=lambda b: order.get(b.severity, 99))

    return BottleneckReport(summary=summary, bottlenecks=bottlenecks)


def _clamp(val, lo: int = 0, hi: int = 100) -> int:
    try:
        return max(lo, min(hi, int(val)))
    except (TypeError, ValueError):
        return 75


def _ensure_list(val) -> list:
    if isinstance(val, list):
        return [str(v) for v in val if v]
    if val:
        return [str(val)]
    return []


# ── Public API ────────────────────────────────────────────────────────────

from utils.ai_router import execute_prompt

def detect_bottlenecks(
    workflow: dict,
    knowledge_graph: Optional[dict] = None,
    document_text: str = "",
    intelligence_context: Optional[dict] = None,
) -> BottleneckReport:
    """
    Analyse the workflow for bottlenecks using AI.

    Parameters
    ----------
    workflow : dict
        Normalised workflow dict from ``discover_workflow_with_gemini``.
    knowledge_graph : dict, optional
        Normalised knowledge graph dict from ``build_knowledge_graph``.
    document_text : str
        Raw extracted document text (used as additional context).

    Returns
    -------
    BottleneckReport
        Validated report ready for the API and frontend.

    Raises
    ------
    RuntimeError
        When the AI API fails, or JSON cannot be parsed.
    """
    workflow_json = _serialise(workflow, MAX_WORKFLOW_CHARS)
    kg_json = _serialise(knowledge_graph, MAX_KG_CHARS)
    doc_excerpt = _trim(document_text, MAX_DOC_CHARS)

    user_message = (
        f"=== WORKFLOW JSON ===\n{workflow_json}\n\n"
        f"=== KNOWLEDGE GRAPH JSON (partial) ===\n{kg_json}\n\n"
        f"=== DOCUMENT EXCERPT ===\n{doc_excerpt}\n\n"
        "Analyse the workflow above and return the bottleneck report JSON."
    )

    full_prompt = _BOTTLENECK_PROMPT + "\n\n" + user_message

    try:
        parsed, metrics = execute_prompt(full_prompt)
        
        if parsed is None:
            logger.error("Bottleneck: failed to parse JSON.")
            raise RuntimeError(
                "Unable to parse bottleneck JSON from AI response."
            )

        report = _normalise(parsed)
        report.metrics = metrics
        return report

    except Exception as exc:
        logger.exception("Unexpected error during bottleneck detection.")
        raise RuntimeError(f"AI API error: {exc}") from exc
