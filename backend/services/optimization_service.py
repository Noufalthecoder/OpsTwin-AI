"""
AI Workflow Optimization Service
──────────────────────────────────
Takes the discovered workflow + bottleneck report and asks Gemini to
produce an optimized version of the workflow.

Returns an OptimizationReport consumed by:
  - /upload  (file_service.py)
  - /optimization  (api/optimization.py)
  - Future: Lemma SDK Orchestration
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

from schemas.optimization import (
    ComparisonMetrics,
    OptimizationRecommendation,
    OptimizationReport,
    OptimizedStep,
)

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

MAX_WORKFLOW_CHARS  = 3_000
MAX_BOTTLENECK_CHARS = 1_500

# ── Prompt ───────────────────────────────────────────────────────────────
_OPT_PROMPT = """\
You are an Enterprise Workflow Optimization AI acting as a Senior Process Consultant.

You will receive:
1. The CURRENT workflow (JSON)
2. The BOTTLENECK report (JSON)

Your task is to produce a fully optimized version of this workflow.

Apply these optimization strategies where applicable:
- Remove redundant or duplicate steps
- Merge multiple approval steps into a single consolidated approval
- Parallelize independent tasks (steps that don't depend on each other)
- Replace manual work with automation where clearly feasible
- Simplify complex decision points
- Eliminate bottlenecks identified in the report
- Reduce the critical path length

Rules:
- Only make changes that are genuinely justified by the workflow/bottlenecks
- Preserve all steps that are essential and non-redundant
- Do NOT invent information not present in the input
- Return JSON only — no markdown, no prose

Return EXACTLY this schema:

{
  "original_step_count": 10,
  "optimized_step_count": 7,
  "time_reduction_pct": 35,
  "manual_work_reduction_pct": 45,
  "cost_savings": "~30% reduction in processing cost",
  "optimization_confidence": 88,
  "executive_summary": "<2-3 sentences explaining the key optimizations and their business impact>",
  "comparison": {
    "original_steps": 10,
    "optimized_steps": 7,
    "original_approvals": 3,
    "optimized_approvals": 1,
    "original_decision_points": 2,
    "optimized_decision_points": 1,
    "original_manual_steps": 8,
    "optimized_manual_steps": 4,
    "original_execution_time": "5 Days",
    "optimized_execution_time": "3 Days",
    "original_automation_score": 20,
    "optimized_automation_score": 60
  },
  "optimized_steps": [
    {
      "id": 1,
      "title": "<step title>",
      "actor": "<role>",
      "department": "<dept>",
      "type": "Start",
      "execution_mode": "Manual",
      "inputs": [],
      "outputs": [],
      "dependencies": [],
      "change": "kept",
      "change_reason": ""
    }
  ],
  "recommendations": [
    {
      "category": "Quick Win",
      "title": "<recommendation title>",
      "description": "<what to do>",
      "expected_impact": "<business impact>",
      "implementation_difficulty": "Low",
      "estimated_time_saved": "1 Day",
      "estimated_cost_saved": "~15%",
      "confidence": 90
    }
  ],
  "ai_confidence": 85
}

Recommendation categories MUST be exactly: "Quick Win" | "Medium Effort" | "Strategic"
Step type MUST be one of: Start | Task | Decision | Approval | End
Step execution_mode MUST be one of: Manual | Automated | Semi-Automated
Step change MUST be one of: kept | merged | automated | removed | parallelized | new
implementation_difficulty MUST be one of: Low | Medium | High

Return JSON only.
"""


# ── Helpers ───────────────────────────────────────────────────────────────

def _trim(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n[... truncated ...]"


def _serialise(obj: Optional[dict | list], max_chars: int) -> str:
    if not obj:
        return "{}"
    try:
        raw = json.dumps(obj, separators=(",", ":"))
    except Exception:
        raw = str(obj)
    return _trim(raw, max_chars)


def _repair_json(raw: str) -> str:
    text = raw.strip()
    m = re.search(r"```(?:json)?\s*\n?(.*)", text, re.DOTALL)
    if m:
        text = m.group(1).strip()
    d_b = d_br = 0
    in_s = esc = False
    for ch in text:
        if esc:    esc = False; continue
        if ch == "\\" and in_s: esc = True; continue
        if ch == '"': in_s = not in_s; continue
        if in_s: continue
        if ch == "{":  d_b  += 1
        elif ch == "}": d_b  -= 1
        elif ch == "[": d_br += 1
        elif ch == "]": d_br -= 1
    closing = ('"' if in_s else "") + "]" * max(d_br, 0) + "}" * max(d_b, 0)
    return text + closing


def _extract_json(raw: str) -> Optional[dict]:
    for fn in (
        lambda s: json.loads(s.strip()),
        lambda s: json.loads(re.search(r"```(?:json)?\s*\n?(.*?)\n?```", s, re.DOTALL).group(1).strip()),  # type: ignore[union-attr]
        lambda s: json.loads(re.search(r"\{.*\}", s, re.DOTALL).group(0)),  # type: ignore[union-attr]
    ):
        try:
            return fn(raw)
        except Exception:
            pass
    return None


def _clamp(val, lo: int = 0, hi: int = 100) -> int:
    try:
        return max(lo, min(hi, int(val)))
    except Exception:
        return 75


def _str_list(val) -> list[str]:
    if isinstance(val, list):
        return [str(v) for v in val if v]
    return []


def _normalise(data: dict, original_workflow: dict) -> OptimizationReport:
    VALID_TYPES = {"Start", "End", "Task", "Decision", "Approval"}
    VALID_MODES = {"Manual", "Automated", "Semi-Automated"}
    VALID_CHANGES = {"kept", "merged", "automated", "removed", "parallelized", "new"}
    VALID_CATS = {"Quick Win", "Medium Effort", "Strategic"}
    VALID_DIFFS = {"Low", "Medium", "High"}

    # ── Optimized steps ───────────────────────────────────────────────────
    raw_steps: list = data.get("optimized_steps") or []
    opt_steps: list[OptimizedStep] = []
    for i, s in enumerate(raw_steps):
        if not isinstance(s, dict):
            continue
        stype = str(s.get("type") or "Task").strip()
        if stype not in VALID_TYPES:
            stype = "Task"
        mode = str(s.get("execution_mode") or "Manual").strip()
        if mode not in VALID_MODES:
            mode = "Manual"
        change = str(s.get("change") or "kept").strip().lower()
        if change not in VALID_CHANGES:
            change = "kept"
        deps = s.get("dependencies")
        if not isinstance(deps, list):
            deps = [i] if i > 0 else []

        opt_steps.append(OptimizedStep(
            id=int(s.get("id") or i + 1),
            title=str(s.get("title") or f"Step {i+1}").strip(),
            actor=str(s.get("actor") or "Unknown").strip(),
            department=str(s.get("department") or "Unknown").strip(),
            type=stype,
            execution_mode=mode,
            inputs=_str_list(s.get("inputs")),
            outputs=_str_list(s.get("outputs")),
            dependencies=[int(d) for d in deps if str(d).isdigit()],
            change=change,
            change_reason=str(s.get("change_reason") or "").strip(),
        ))
    if opt_steps:
        opt_steps[0].type = "Start"
        opt_steps[-1].type = "End"

    # ── Recommendations ───────────────────────────────────────────────────
    raw_recs: list = data.get("recommendations") or []
    recs: list[OptimizationRecommendation] = []
    for r in raw_recs:
        if not isinstance(r, dict):
            continue
        cat = str(r.get("category") or "Medium Effort").strip()
        if cat not in VALID_CATS:
            cat = "Medium Effort"
        diff = str(r.get("implementation_difficulty") or "Medium").strip().capitalize()
        if diff not in VALID_DIFFS:
            diff = "Medium"
        recs.append(OptimizationRecommendation(
            category=cat,
            title=str(r.get("title") or "").strip(),
            description=str(r.get("description") or "").strip(),
            expected_impact=str(r.get("expected_impact") or "").strip(),
            implementation_difficulty=diff,
            estimated_time_saved=str(r.get("estimated_time_saved") or "Unknown").strip(),
            estimated_cost_saved=str(r.get("estimated_cost_saved") or "Unknown").strip(),
            confidence=_clamp(r.get("confidence", 75)),
        ))
    # Sort: Quick Win → Medium Effort → Strategic
    order = {"Quick Win": 0, "Medium Effort": 1, "Strategic": 2}
    recs.sort(key=lambda r: order.get(r.category, 99))

    # ── Comparison ────────────────────────────────────────────────────────
    raw_cmp: dict = data.get("comparison") or {}
    orig_steps_list = original_workflow.get("steps") or []
    orig_count = len(orig_steps_list)
    orig_approvals = len([s for s in orig_steps_list if s.get("type") == "Approval"])
    orig_decisions = len([s for s in orig_steps_list if s.get("type") == "Decision"])
    orig_manual = sum(1 for s in orig_steps_list
                      if s.get("actor", "").lower() not in ("system", "api", "automated", "bot"))
    orig_auto_score = original_workflow.get("insights", {}).get("automation_score", 0)

    opt_count = len(opt_steps)
    new_approvals = len([s for s in opt_steps if s.type == "Approval"])
    new_decisions = len([s for s in opt_steps if s.type == "Decision"])
    new_manual = sum(1 for s in opt_steps if s.execution_mode == "Manual")
    new_auto_score = int(((opt_count - new_manual) / opt_count) * 100) if opt_count else 0

    comparison = ComparisonMetrics(
        original_steps=int(raw_cmp.get("original_steps") or orig_count),
        optimized_steps=int(raw_cmp.get("optimized_steps") or opt_count),
        original_approvals=int(raw_cmp.get("original_approvals") or orig_approvals),
        optimized_approvals=int(raw_cmp.get("optimized_approvals") or new_approvals),
        original_decision_points=int(raw_cmp.get("original_decision_points") or orig_decisions),
        optimized_decision_points=int(raw_cmp.get("optimized_decision_points") or new_decisions),
        original_manual_steps=int(raw_cmp.get("original_manual_steps") or orig_manual),
        optimized_manual_steps=int(raw_cmp.get("optimized_manual_steps") or new_manual),
        original_execution_time=str(raw_cmp.get("original_execution_time")
                                    or original_workflow.get("insights", {}).get("estimated_execution_time", "Unknown")),
        optimized_execution_time=str(raw_cmp.get("optimized_execution_time") or "Unknown"),
        original_automation_score=int(raw_cmp.get("original_automation_score") or orig_auto_score),
        optimized_automation_score=int(raw_cmp.get("optimized_automation_score") or new_auto_score),
    )

    return OptimizationReport(
        original_step_count=int(data.get("original_step_count") or orig_count),
        optimized_step_count=int(data.get("optimized_step_count") or opt_count),
        time_reduction_pct=_clamp(data.get("time_reduction_pct", 0)),
        manual_work_reduction_pct=_clamp(data.get("manual_work_reduction_pct", 0)),
        cost_savings=str(data.get("cost_savings") or "Unknown").strip(),
        optimization_confidence=_clamp(data.get("optimization_confidence", 75)),
        comparison=comparison,
        optimized_steps=opt_steps,
        recommendations=recs,
        executive_summary=str(data.get("executive_summary") or "").strip(),
        ai_confidence=_clamp(data.get("ai_confidence", 75)),
    )


# ── Gemini call with retry ────────────────────────────────────────────────

def _call_gemini(prompt: str) -> str:
    client = genai.Client(api_key=GEMINI_API_KEY)
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=8192,
                ),
            )
            raw = response.text or ""
            if response.candidates and "MAX_TOKENS" in str(response.candidates[0].finish_reason):
                logger.warning("Optimization: MAX_TOKENS hit — repairing JSON.")
                raw = _repair_json(raw)
            return raw
        except Exception as exc:
            last_exc = exc
            err = str(exc)
            if "503" in err or "UNAVAILABLE" in err or "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait = 5 * (attempt + 1)
                logger.warning("Optimization: Gemini error (attempt %d/3) — retry in %ds.", attempt + 1, wait)
                time.sleep(wait)
            else:
                raise
    raise last_exc  # type: ignore[misc]


# ── Public API ────────────────────────────────────────────────────────────

from utils.ai_router import execute_prompt

def optimize_workflow(
    workflow: dict,
    bottleneck_report: Optional[dict] = None,
    document_text: str = "",
) -> OptimizationReport:
    """
    Analyse the workflow and return an OptimizationReport.

    Parameters
    ----------
    workflow : dict
        Normalised workflow from discover_workflow_with_gemini.
    bottleneck_report : dict, optional
        Bottleneck report from detect_bottlenecks (model_dump()).
    document_text : str
        Raw document text for additional context.

    Returns
    -------
    OptimizationReport

    Raises
    ------
    RuntimeError on AI failure or unparseable response.
    """
    wf_json = _serialise(workflow, MAX_WORKFLOW_CHARS)
    bn_json = _serialise(bottleneck_report, MAX_BOTTLENECK_CHARS)

    user_msg = (
        f"=== CURRENT WORKFLOW ===\n{wf_json}\n\n"
        f"=== BOTTLENECK REPORT ===\n{bn_json}\n\n"
        "Produce the optimized workflow JSON now."
    )

    prompt = _OPT_PROMPT + "\n\n" + user_msg

    try:
        parsed, metrics = execute_prompt(prompt)
        
        if parsed is None:
            logger.error("Optimization: failed to parse JSON.")
            raise RuntimeError("Optimization: unable to parse JSON from AI response.")
            
        report = _normalise(parsed, workflow)
        report.metrics = metrics
        return report
        
    except Exception as exc:
        logger.exception("Optimization: AI call failed.")
        raise RuntimeError(f"AI API error: {exc}") from exc
