import json
import logging
import os
import re
import time
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

from schemas.workflow_optimizer import WorkflowOptimizationResult, OptimizedWorkflowStep, RemovedStep, MergedStep, AutomationCandidate, ImplementationPhase

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

MAX_WORKFLOW_CHARS = 4_000

_OPT_PROMPT = """\
You are an Enterprise Workflow Optimization AI.
Your task is to take a business process workflow (JSON) and generate a highly optimized version.

Optimization strategies:
1. Merge duplicate tasks or sequential approvals into single steps.
2. Parallelize independent tasks.
3. Replace manual tasks with API or automation (e.g., DigiLocker, OCR, automated emails).
4. Remove entirely redundant steps.

Return ONLY a JSON object that strictly adheres to the following format:
{
    "current_steps": <int>,
    "optimized_steps": <int>,
    "step_reduction": <int, percentage reduction 0-100>,
    "optimized_graph": [
        {
            "id": 1,
            "title": "Start",
            "actor": "System",
            "department": "Unknown",
            "type": "Start",
            "execution_mode": "Automated",
            "inputs": [],
            "outputs": [],
            "dependencies": [],
            "change": "kept",
            "change_reason": ""
        }
    ],
    "removed_steps": [
        { "step_title": "Manual HQ Review", "reason": "Redundant verification", "impact": "-1 Day" }
    ],
    "merged_steps": [
        { "original_steps": ["Check ID", "Check Background"], "new_step": "Automated Identity Verification", "reason": "Consolidated into API call" }
    ],
    "automation_candidates": [
        { "step_title": "Data Entry", "suggestion": "Use OCR for automated parsing", "time_saved": "2 hours per day" }
    ],
    "estimated_time_saved": "e.g., 3.5 Days",
    "estimated_cost_saved": "e.g., ₹1.8L / Year",
    "estimated_manual_work_reduction": <int 0-100>,
    "estimated_human_errors_prevented": <int 0-100>,
    "estimated_productivity_increase": <int 0-100>,
    "automation_score": <int 0-100>,
    "implementation_plan": [
        { "phase_name": "Phase 1", "title": "Quick Wins", "duration": "1 week", "description": "Implement easy automations." }
    ],
    "executive_summary": "Our AI discovered...",
    "confidence": 94
}

Rules for 'optimized_graph':
- 'type' MUST be one of: Start, End, Task, Decision, Approval.
- 'execution_mode' MUST be one of: Manual, Automated, Semi-Automated.
- 'change' MUST be one of: kept, automated, merged, removed, parallelized, new.
"""

def _trim(text: str, max_chars: int) -> str:
    return text if len(text) <= max_chars else text[:max_chars] + "\n[... truncated ...]"

def _serialise(obj: Optional[dict]) -> str:
    if not obj:
        return "{}"
    return _trim(json.dumps(obj, separators=(",", ":")), MAX_WORKFLOW_CHARS)

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
    return text + ('"' if in_s else "") + "]" * max(d_br, 0) + "}" * max(d_b, 0)

def _extract_json(raw: str) -> Optional[dict]:
    for fn in (
        lambda s: json.loads(s.strip()),
        lambda s: json.loads(re.search(r"```(?:json)?\s*\n?(.*?)\n?```", s, re.DOTALL).group(1).strip()),
        lambda s: json.loads(re.search(r"\{.*\}", s, re.DOTALL).group(0)),
    ):
        try:
            return fn(raw)
        except Exception:
            pass
    return None

def _call_gemini(prompt: str) -> str:
    client = genai.Client(api_key=GEMINI_API_KEY)
    last_exc = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=genai_types.GenerateContentConfig(temperature=0.2, max_output_tokens=8192),
            )
            raw = response.text or ""
            if response.candidates and "MAX_TOKENS" in str(response.candidates[0].finish_reason):
                raw = _repair_json(raw)
            return raw
        except Exception as exc:
            last_exc = exc
            if any(e in str(exc) for e in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"]):
                time.sleep(5 * (attempt + 1))
            else:
                raise
    raise last_exc

def _generate_rule_based_fallback(workflow: dict) -> dict:
    """Intelligent rule-based fallback if LLM fails."""
    original_steps = workflow.get("steps", [])
    current_count = len(original_steps)
    
    optimized = []
    removed = []
    auto_cands = []
    
    for i, s in enumerate(original_steps):
        # Rule: Any step mentioning 'Manual' can be an automation candidate
        title = s.get("title", "")
        if "manual" in title.lower() or s.get("execution_mode") == "Manual":
            auto_cands.append({
                "step_title": title,
                "suggestion": "Automate using digital APIs or RPA",
                "time_saved": "1 Day"
            })
        
        # Rule: Remove consecutive identical titles (simple duplicate detection)
        if i > 0 and title == original_steps[i-1].get("title"):
            removed.append({
                "step_title": title,
                "reason": "Duplicate step detected in sequence",
                "impact": "-0.5 Days"
            })
            continue
            
        opt_s = s.copy()
        opt_s["change"] = "kept"
        optimized.append(opt_s)
    
    # Fix IDs and dependencies for remaining steps
    for i, s in enumerate(optimized):
        s["id"] = i + 1
        s["dependencies"] = [i] if i > 0 else []

    opt_count = len(optimized)
    reduction = int(((current_count - opt_count) / current_count) * 100) if current_count else 0
    
    return {
        "current_steps": current_count,
        "optimized_steps": opt_count,
        "step_reduction": reduction,
        "optimized_graph": optimized,
        "removed_steps": removed,
        "merged_steps": [],
        "automation_candidates": auto_cands,
        "estimated_time_saved": f"~{len(auto_cands)} Days",
        "estimated_cost_saved": "Variable",
        "estimated_manual_work_reduction": reduction or 20,
        "estimated_human_errors_prevented": reduction or 10,
        "estimated_productivity_increase": reduction or 15,
        "automation_score": 40,
        "implementation_plan": [
            {"phase_name": "Phase 1", "title": "Quick Wins", "duration": "2 weeks", "description": "Basic automation of manual tasks."}
        ],
        "executive_summary": "Rule-based fallback optimization applied due to AI failure. Detected basic optimizations.",
        "confidence": 60
    }

def _normalise(data: dict) -> WorkflowOptimizationResult:
    # Ensure types
    opt_graph = []
    for s in data.get("optimized_graph", []):
        stype = s.get("type", "Task")
        if stype not in ["Start", "End", "Task", "Decision", "Approval"]: stype = "Task"
        
        opt_graph.append(OptimizedWorkflowStep(
            id=int(s.get("id") or 1),
            title=str(s.get("title") or "Unknown"),
            actor=str(s.get("actor") or "Unknown"),
            department=str(s.get("department") or "Unknown"),
            type=stype,
            execution_mode=str(s.get("execution_mode") or "Manual"),
            inputs=s.get("inputs", []),
            outputs=s.get("outputs", []),
            dependencies=[int(d) for d in s.get("dependencies", []) if str(d).isdigit()],
            change=str(s.get("change") or "kept"),
            change_reason=str(s.get("change_reason") or "")
        ))

    rem = [RemovedStep(**r) for r in data.get("removed_steps", [])]
    mer = [MergedStep(**m) for m in data.get("merged_steps", [])]
    aut = [AutomationCandidate(**a) for a in data.get("automation_candidates", [])]
    ip = [ImplementationPhase(**p) for p in data.get("implementation_plan", [])]

    return WorkflowOptimizationResult(
        current_steps=int(data.get("current_steps", 0)),
        optimized_steps=int(data.get("optimized_steps", 0)),
        step_reduction=int(data.get("step_reduction", 0)),
        optimized_graph=opt_graph,
        removed_steps=rem,
        merged_steps=mer,
        automation_candidates=aut,
        estimated_time_saved=str(data.get("estimated_time_saved", "")),
        estimated_cost_saved=str(data.get("estimated_cost_saved", "")),
        estimated_manual_work_reduction=int(data.get("estimated_manual_work_reduction", 0)),
        estimated_human_errors_prevented=int(data.get("estimated_human_errors_prevented", 0)),
        estimated_productivity_increase=int(data.get("estimated_productivity_increase", 0)),
        automation_score=int(data.get("automation_score", 0)),
        implementation_plan=ip,
        executive_summary=str(data.get("executive_summary", "")),
        confidence=int(data.get("confidence", 80))
    )

from utils.ai_router import execute_prompt

def optimize_workflow(workflow: dict, document_text: str = "") -> WorkflowOptimizationResult:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your-gemini-api-key-here":
        fallback_data = _generate_rule_based_fallback(workflow)
        return _normalise(fallback_data)

    wf_json = _serialise(workflow)
    prompt = f"{_OPT_PROMPT}\n\n=== CURRENT WORKFLOW ===\n{wf_json}\n\nProduce the optimized workflow JSON now."
    
    try:
        parsed, metrics = execute_prompt(prompt)
        if not parsed: raise Exception("Failed to parse JSON")
        return _normalise(parsed)
    except Exception as exc:
        logger.error(f"Workflow optimizer AI failed: {exc}. Using fallback.")
        fallback_data = _generate_rule_based_fallback(workflow)
        return _normalise(fallback_data)
