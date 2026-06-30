"""
Gemini Workflow Discovery Service
──────────────────────────────────
Primary path: reads workflow from the Intelligence Engine context produced
by document_analyzer.analyze_document() — no extra Gemini call needed.

Fallback path: makes its own Gemini call when no engine context is available
(e.g. standalone use via the /upload legacy path or unit tests).
"""

import json
import os
import re
import logging
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_DOC_CHARS = 6_000

# ── Prompt ───────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are an Enterprise Workflow Discovery AI.

Analyze the organizational document provided below.
Understand how the organization operates.
Extract ONLY real information present in the document — do NOT invent data.

Return a single JSON object and nothing else (no markdown fences, no prose).

Schema you MUST follow exactly:

{
  "workflow_name": "<name derived from the document>",
  "description": "<one or two sentences summarising the workflow>",
  "steps": [
    {
      "id": 1,
      "title": "<short, clear step title>",
      "actor": "<role or person performing this step>",
      "department": "<department responsible>",
      "type": "Start",
      "inputs": ["<input>"],
      "outputs": ["<output>"],
      "dependencies": []
    }
  ],
  "actors": ["<all distinct actors>"],
  "departments": ["<all distinct departments>"],
  "approvals": ["<titles of approval steps>"],
  "decision_points": ["<titles of decision steps>"],
  "dependencies": ["<StepA title -> StepB title>"],
  "inputs": ["<all workflow-level inputs>"],
  "outputs": ["<all workflow-level outputs>"],
  "automation_opportunities": [
    {
      "step_title": "<which step>",
      "suggestion": "<what can be automated and how>",
      "impact": "High"
    }
  ],
  "insights": {
    "complexity": "Medium",
    "estimated_execution_time": "2 Days",
    "automation_score": 40,
    "manual_steps": 4,
    "approval_count": 1,
    "ai_confidence": 85
  }
}

Rules:
- Step type MUST be one of: "Start", "End", "Task", "Decision", "Approval"
- The FIRST step must be type "Start" and the LAST step must be type "End"
- Each step's "dependencies" lists the id(s) of steps that must finish first
- If information is missing from the document, set the field to "Unknown"
- Every document must produce a unique workflow derived solely from its content
- Return JSON only — absolutely no other text
"""


# ── Helpers ──────────────────────────────────────────────────────────────

def _truncate(text: str, max_chars: int = MAX_DOC_CHARS) -> str:
    """Trim document text to avoid Gemini token-limit errors on huge PDFs."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    logger.warning(
        "Document truncated from %d to %d chars for Gemini.", len(text), max_chars
    )
    return truncated + "\n\n[... document truncated for analysis ...]"


def _repair_truncated_json(raw: str) -> str:
    """
    When Gemini hits MAX_TOKENS the JSON is cut mid-stream.
    This function attempts to close any open arrays/objects so that
    _extract_json can still parse a partial but valid result.
    """
    # Strip fences first
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*\n?(.*)", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    # Count unclosed braces/brackets
    depth_brace = 0
    depth_bracket = 0
    in_string = False
    escape_next = False

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

    # If we're mid-string, close it
    closing = ""
    if in_string:
        closing += '"'

    # Close open arrays then objects
    closing += "]" * max(depth_bracket, 0)
    closing += "}" * max(depth_brace, 0)

    repaired = text + closing
    logger.info("Repaired truncated JSON by appending: %r", closing)
    return repaired


def _extract_json(raw: str) -> Optional[dict]:
    """
    Extract a JSON object from Gemini's raw output.
    Handles plain JSON, ```json ... ``` fences, and embedded JSON blocks.
    """
    # 1. Direct parse
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass

    # 2. Markdown code fence  ```json ... ``` or ``` ... ```
    fence = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", raw, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 3. First { ... } block in the response
    brace = re.search(r"\{.*\}", raw, re.DOTALL)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            pass

    return None


def _normalise(data: dict) -> dict:
    """
    Ensure the parsed object conforms to the shape expected by the Pydantic
    models and the React frontend.  Adds safe defaults for any missing fields.
    """
    # ── Top-level defaults ───────────────────────────────────────────────
    data.setdefault("workflow_name", "Discovered Workflow")
    data.setdefault("description", "")
    data.setdefault("steps", [])
    data.setdefault("actors", [])
    data.setdefault("departments", [])
    data.setdefault("approvals", [])
    data.setdefault("decision_points", [])
    data.setdefault("dependencies", [])
    data.setdefault("inputs", [])
    data.setdefault("outputs", [])
    data.setdefault("automation_opportunities", [])

    # ── Derive start / end labels ────────────────────────────────────────
    steps = data["steps"]
    data["start"] = steps[0].get("title", "Start") if steps else "Start"
    data["end"] = steps[-1].get("title", "End") if steps else "End"

    # ── Normalise each step ──────────────────────────────────────────────
    for i, step in enumerate(steps):
        step.setdefault("id", i + 1)
        step.setdefault("title", f"Step {i + 1}")
        step.setdefault("actor", "Unknown")
        step.setdefault("department", "Unknown")
        step.setdefault("type", "Task")
        step.setdefault("inputs", [])
        step.setdefault("outputs", [])
        # Default: each step depends on the previous one (sequential)
        step.setdefault("dependencies", [i] if i > 0 else [])

    # ── Insights block ───────────────────────────────────────────────────
    insights = data.get("insights") or {}
    if not isinstance(insights, dict):
        insights = {}

    step_count = len(steps)
    insights.setdefault("complexity", "Medium")
    insights.setdefault("estimated_execution_time", "Unknown")
    insights.setdefault("ai_confidence", 75)

    if "automation_score" not in insights:
        # Derive from actor names: System/API roles are automated
        manual = sum(
            1 for s in steps
            if s.get("actor", "").lower() not in ("system", "api", "automated", "bot")
        )
        insights["automation_score"] = (
            int(((step_count - manual) / step_count) * 100) if step_count > 0 else 0
        )
        insights["manual_steps"] = manual
    else:
        insights.setdefault("manual_steps", step_count)

    insights.setdefault("approval_count", len(data.get("approvals", [])))
    data["insights"] = insights

    # ── Back-fill actors / departments from step data if Gemini omitted them
    if not data["actors"]:
        data["actors"] = list({
            s["actor"] for s in steps if s.get("actor") and s["actor"] != "Unknown"
        })
    if not data["departments"]:
        data["departments"] = list({
            s["department"] for s in steps
            if s.get("department") and s["department"] != "Unknown"
        })

    # Guarantee at least one entry so the frontend never renders empty tags
    if not data["actors"]:
        data["actors"] = ["Unknown"]
    if not data["departments"]:
        data["departments"] = ["Unknown"]

    return data


# ── Public API ────────────────────────────────────────────────────────────

from utils.ai_router import execute_prompt

def _discover_direct(document_text: str, document_type: str) -> dict:
    """Standalone Gemini call used when no engine context is available."""
    truncated_text = _truncate(document_text)
    user_message = (
        f"Document Type: {document_type}\n\n"
        f"--- DOCUMENT CONTENT START ---\n{truncated_text}\n"
        f"--- DOCUMENT CONTENT END ---\n\n"
        f"Analyze the document above and return the workflow JSON."
    )
    full_prompt = _SYSTEM_PROMPT + "\n\n" + user_message

    try:
        parsed, metrics = execute_prompt(full_prompt)
        if parsed is None:
            raise RuntimeError("Unable to parse workflow JSON from AI response.")
        
        normalized = _normalise(parsed)
        normalized["metrics"] = metrics
        return normalized

    except Exception as exc:
        logger.exception("Unexpected error during direct workflow call.")
        raise RuntimeError(f"AI API error: {exc}") from exc


def discover_workflow_with_gemini(
    document_text: str,
    document_type: str = "Unknown",
    intelligence_context: Optional[dict] = None,
) -> dict:
    """
    Return a normalised workflow dict.

    Primary path: if *intelligence_context* (from the Intelligence Engine) is
    provided and contains a valid workflow, return it directly — no Gemini call.

    Fallback path: send *document_text* to Gemini independently.
    """
    # ── Primary: use pre-computed engine context ──────────────────────────
    if intelligence_context and isinstance(intelligence_context, dict):
        wf = intelligence_context.get("workflow")
        if wf and isinstance(wf, dict) and wf.get("steps"):
            logger.debug("Workflow: using Intelligence Engine context.")
            return _normalise(dict(wf))  # returns a copy

    # ── Fallback: direct Gemini call ──────────────────────────────────────
    logger.debug("Workflow: falling back to direct Gemini call.")
    return _discover_direct(document_text, document_type)
