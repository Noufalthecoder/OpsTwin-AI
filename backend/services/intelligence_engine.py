"""
Enterprise Intelligence Engine V2
────────────────────────────────────
Single Gemini call that acts as the AI brain for the entire OpsTwin platform.

One pass over the document produces a rich intelligence context that is then
consumed by every downstream service:
  - Workflow Discovery       (gemini_workflow_service.py)
  - Knowledge Graph          (knowledge_graph_service.py)
  - Bottleneck Detection     (bottleneck_service.py)
  - Optimization Engine      (optimization_service.py)
  - Lemma SDK Orchestration  (future)

Design goals
────────────
• Understand the document like a Business Analyst, not a keyword scanner.
• Separate document metadata (authors, slide titles) from workflow actors.
• Support 16 precise document categories with primary + secondary classification.
• Extract entities into typed buckets — never conflate authors with employees.
• Identify security architecture separately.
• Build clean workflow semantics (Start/Task/Decision/Approval/Parallel/End).
• Produce a knowledge graph seed that only includes workflow-participating entities.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Keep input small so Gemini has maximum output budget.
MAX_DOC_CHARS = 5_000

# ── Master prompt ─────────────────────────────────────────────────────────
_INTELLIGENCE_PROMPT = """\
You are an Enterprise Process Intelligence AI acting as a Senior Business Analyst.

Analyse the document below with the depth of a consulting engagement.
Return a single JSON object — no markdown, no prose, no explanations.

=== DOCUMENT CLASSIFICATION ===
Classify the document. Primary categories:
  Business Proposal | Technical Architecture | Software Design |
  Security Architecture | SOP | Workflow Document | Meeting Notes |
  Product Requirement Document | Technical Specification | Compliance Policy |
  HR Policy | Military Process | Government Process | Research Paper |
  System Design | General

Return:
  primary_category, secondary_category, confidence (0-100),
  summary (2-3 sentences describing the actual business purpose),
  reading_time_mins (word_count / 250, minimum 1)

=== ENTITY EXTRACTION ===
Separate entities into typed buckets. Apply STRICT rules:
- authors: people who WROTE this document (byline, "prepared by", "author:")
- team_members: people mentioned by name who are NOT workflow actors
- workflow_actors: roles/persons who PERFORM steps in the described process
- departments: organisational units
- roles: job titles or function labels
- systems: software systems, platforms, applications
- technologies: programming languages, frameworks, protocols, standards
- projects: named initiatives or programmes
- organisations: external companies, agencies, bodies
- documents: named documents referenced
- security_components: security technologies and controls
  (VPN, E2E encryption, Zero Trust, DigiLocker, SSL, Authentication,
   Authorization, Audit Logs, RBAC, Biometrics, Threat Detection,
   Security Monitoring, Encryption Keys, Firewall, PKI, MFA, OTP, etc.)
- infrastructure: servers, networks, cloud services, hardware
- databases: database systems named in the document
- approvals: named approval gates or sign-off requirements
- tasks: discrete operational tasks mentioned

CRITICAL: Do NOT put document authors into workflow_actors or employees.
          Only add a person to workflow_actors if they perform a process step.

=== WORKFLOW EXTRACTION ===
Extract ONLY the operational business process steps. Ignore:
  - Presentation titles, slide numbers, author names
  - Marketing text, statistics, references, headers, footers
  - Any text that is metadata rather than a process action

For each step identify:
  id (sequential integer starting at 1), title, actor, department,
  type (Start | Task | Decision | Approval | Parallel | End),
  execution_mode (Manual | Automated | Semi-Automated),
  inputs (list), outputs (list), dependencies (list of step ids)

Rules:
  - First step type = Start, last step type = End
  - Only extract steps that represent real operational actions
  - If a step has no clear actor, set actor = "Unknown"

=== KNOWLEDGE GRAPH SEED ===
Build a concise graph of entities that PARTICIPATE in the workflow.
Exclude isolated entities that have no workflow relationship.
Merge near-duplicates (e.g. "Eng Team" and "Engineering" → one node).

Node types: department | employee | team | role | project | system |
            technology | document | task | approval | security

Edge relationship types (snake_case): manages | belongs_to | uses |
  approves | depends_on | reports_to | hands_off_to | assigned_to |
  part_of | owns | secures | authenticates | monitors

=== SECURITY INTELLIGENCE ===
Identify all security architecture components and their roles.
For each: name, category (Encryption | Authentication | Authorization |
  Monitoring | Network | Compliance | Identity | Other), description.

=== INSIGHTS ===
Derive:
  workflow_complexity (Low | Medium | High),
  estimated_execution_time (e.g. "2 Days"),
  automation_score (0-100, % of steps that are or could be automated),
  manual_steps (count),
  approval_count (count),
  ai_confidence (0-100, your overall confidence in this analysis)

=== OUTPUT SCHEMA ===
Return exactly this JSON (no extra keys, no missing keys):

{
  "classification": {
    "primary_category": "",
    "secondary_category": "",
    "confidence": 85,
    "summary": "",
    "reading_time_mins": 3
  },
  "entities": {
    "authors": [],
    "team_members": [],
    "workflow_actors": [],
    "departments": [],
    "roles": [],
    "systems": [],
    "technologies": [],
    "projects": [],
    "organisations": [],
    "documents": [],
    "security_components": [],
    "infrastructure": [],
    "databases": [],
    "approvals": [],
    "tasks": []
  },
  "workflow": {
    "workflow_name": "",
    "description": "",
    "steps": [
      {
        "id": 1,
        "title": "",
        "actor": "",
        "department": "",
        "type": "Start",
        "execution_mode": "Manual",
        "inputs": [],
        "outputs": [],
        "dependencies": []
      }
    ],
    "decision_points": [],
    "automation_opportunities": [
      {
        "step_title": "",
        "suggestion": "",
        "impact": "High"
      }
    ]
  },
  "knowledge_graph": {
    "nodes": [
      {
        "id": "",
        "label": "",
        "type": "",
        "description": ""
      }
    ],
    "edges": [
      {
        "source": "",
        "target": "",
        "relationship": "",
        "label": ""
      }
    ]
  },
  "security": {
    "components": [
      {
        "name": "",
        "category": "",
        "description": ""
      }
    ],
    "security_posture": "Unknown",
    "risk_level": "Unknown"
  },
  "insights": {
    "workflow_complexity": "Medium",
    "estimated_execution_time": "",
    "automation_score": 40,
    "manual_steps": 0,
    "approval_count": 0,
    "ai_confidence": 80
  }
}

Rules:
- Return JSON only. No markdown. No prose. No commentary.
- Do not invent information not present in the document.
- If a field cannot be determined, use "" for strings, [] for lists, 0 for numbers.
- Every document must produce unique output derived solely from its content.
"""


# ── JSON utilities ────────────────────────────────────────────────────────

def _truncate(text: str, max_chars: int = MAX_DOC_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    logger.warning("Intelligence: truncated doc from %d to %d chars.", len(text), max_chars)
    return text[:max_chars] + "\n\n[... document truncated for analysis ...]"


def _repair_json(raw: str) -> str:
    text = raw.strip()
    m = re.search(r"```(?:json)?\s*\n?(.*)", text, re.DOTALL)
    if m:
        text = m.group(1).strip()

    d_brace = d_bracket = 0
    in_str = esc = False
    for ch in text:
        if esc:
            esc = False; continue
        if ch == "\\" and in_str:
            esc = True; continue
        if ch == '"':
            in_str = not in_str; continue
        if in_str:
            continue
        if ch == "{":   d_brace += 1
        elif ch == "}": d_brace -= 1
        elif ch == "[":   d_bracket += 1
        elif ch == "]": d_bracket -= 1

    closing = ('"' if in_str else "") + "]" * max(d_bracket, 0) + "}" * max(d_brace, 0)
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


# ── Normalisation ─────────────────────────────────────────────────────────

def _str_list(val) -> list[str]:
    if isinstance(val, list):
        return [str(v).strip() for v in val if v and str(v).strip()]
    return []


def _clamp(val, lo: int = 0, hi: int = 100) -> int:
    try:
        return max(lo, min(hi, int(val)))
    except Exception:
        return 75


def _normalise(data: dict, raw_text: str) -> dict:
    """
    Validate and fill defaults so every downstream consumer receives a
    fully-populated intelligence context even if Gemini omitted fields.
    """

    # ── Classification ────────────────────────────────────────────────────
    cls = data.get("classification") or {}
    if not isinstance(cls, dict):
        cls = {}

    word_count = len(re.findall(r'\w+', raw_text))
    default_reading = max(1, math.ceil(word_count / 250))

    classification = {
        "primary_category":  cls.get("primary_category") or "General",
        "secondary_category": cls.get("secondary_category") or "",
        "confidence":         _clamp(cls.get("confidence", 75)),
        "summary":            str(cls.get("summary") or "").strip(),
        "reading_time_mins":  max(1, int(cls.get("reading_time_mins") or default_reading)),
    }

    # ── Entities ──────────────────────────────────────────────────────────
    ent = data.get("entities") or {}
    if not isinstance(ent, dict):
        ent = {}

    entities = {
        "authors":             _str_list(ent.get("authors")),
        "team_members":        _str_list(ent.get("team_members")),
        "workflow_actors":     _str_list(ent.get("workflow_actors")),
        "departments":         _str_list(ent.get("departments")),
        "roles":               _str_list(ent.get("roles")),
        "systems":             _str_list(ent.get("systems")),
        "technologies":        _str_list(ent.get("technologies")),
        "projects":            _str_list(ent.get("projects")),
        "organisations":       _str_list(ent.get("organisations")),
        "documents":           _str_list(ent.get("documents")),
        "security_components": _str_list(ent.get("security_components")),
        "infrastructure":      _str_list(ent.get("infrastructure")),
        "databases":           _str_list(ent.get("databases")),
        "approvals":           _str_list(ent.get("approvals")),
        "tasks":               _str_list(ent.get("tasks")),
    }

    # Derive legacy "departments" and "employees" for document_analyzer compat
    entities["_departments_legacy"] = entities["departments"] or ["General"]
    # employees = team_members + workflow_actors (excluding pure-role strings)
    entities["_employees_legacy"] = list(dict.fromkeys(
        entities["team_members"] + entities["workflow_actors"]
    )) or ["Unknown"]
    # keywords = top terms from security + technologies + systems
    kw_pool = entities["security_components"] + entities["technologies"] + entities["systems"]
    entities["_keywords_legacy"] = kw_pool[:8] if kw_pool else []

    # ── Workflow ──────────────────────────────────────────────────────────
    wf_raw = data.get("workflow") or {}
    if not isinstance(wf_raw, dict):
        wf_raw = {}

    steps_raw: list = wf_raw.get("steps") or []
    VALID_TYPES = {"Start", "End", "Task", "Decision", "Approval", "Parallel"}
    VALID_MODES = {"Manual", "Automated", "Semi-Automated"}

    steps: list[dict] = []
    for i, s in enumerate(steps_raw):
        if not isinstance(s, dict):
            continue
        stype = str(s.get("type") or "Task").strip()
        if stype not in VALID_TYPES:
            stype = "Task"
        mode = str(s.get("execution_mode") or "Manual").strip()
        if mode not in VALID_MODES:
            mode = "Manual"
        deps = s.get("dependencies")
        if not isinstance(deps, list):
            deps = [i] if i > 0 else []

        steps.append({
            "id":             int(s.get("id") or i + 1),
            "title":          str(s.get("title") or f"Step {i+1}").strip(),
            "actor":          str(s.get("actor") or "Unknown").strip(),
            "department":     str(s.get("department") or "Unknown").strip(),
            "type":           stype,
            "execution_mode": mode,
            "inputs":         _str_list(s.get("inputs")),
            "outputs":        _str_list(s.get("outputs")),
            "dependencies":   [int(d) for d in deps if str(d).isdigit()],
        })

    # Enforce Start/End types on first/last steps
    if steps:
        steps[0]["type"]  = "Start"
        steps[-1]["type"] = "End"

    # Aggregate actors & departments from steps if Gemini omitted them
    step_actors = list(dict.fromkeys(
        s["actor"] for s in steps if s["actor"] not in ("Unknown", "")
    ))
    step_depts = list(dict.fromkeys(
        s["department"] for s in steps if s["department"] not in ("Unknown", "")
    ))

    wf_actors = entities["workflow_actors"] or step_actors or ["Unknown"]
    wf_depts  = entities["departments"] or step_depts or ["Unknown"]

    decision_points = _str_list(wf_raw.get("decision_points"))

    auto_opps_raw = wf_raw.get("automation_opportunities") or []
    auto_opps: list[dict] = []
    for ao in auto_opps_raw:
        if isinstance(ao, dict):
            impact = str(ao.get("impact") or "Medium").strip().capitalize()
            if impact not in ("High", "Medium", "Low"):
                impact = "Medium"
            auto_opps.append({
                "step_title": str(ao.get("step_title") or "").strip(),
                "suggestion": str(ao.get("suggestion") or "").strip(),
                "impact":     impact,
            })

    workflow = {
        "workflow_name":          str(wf_raw.get("workflow_name") or "Discovered Workflow").strip(),
        "description":            str(wf_raw.get("description") or "").strip(),
        "start":                  steps[0]["title"] if steps else "Start",
        "end":                    steps[-1]["title"] if steps else "End",
        "steps":                  steps,
        "actors":                 wf_actors,
        "departments":            wf_depts,
        "inputs":                 [],
        "outputs":                [],
        "decision_points":        decision_points,
        "approvals":              entities["approvals"],
        "dependencies":           [],
        "automation_opportunities": auto_opps,
    }

    # ── Insights (attach to workflow) ─────────────────────────────────────
    ins_raw = data.get("insights") or {}
    if not isinstance(ins_raw, dict):
        ins_raw = {}

    step_count = len(steps)
    manual_count = sum(1 for s in steps if s["execution_mode"] == "Manual")
    auto_score = _clamp(ins_raw.get("automation_score",
        int(((step_count - manual_count) / step_count) * 100) if step_count else 0
    ))

    workflow["insights"] = {
        "complexity":              str(ins_raw.get("workflow_complexity") or "Medium").strip(),
        "estimated_execution_time": str(ins_raw.get("estimated_execution_time") or "Unknown").strip(),
        "automation_score":        auto_score,
        "manual_steps":            _clamp(ins_raw.get("manual_steps", manual_count), 0, 9999),
        "approval_count":          _clamp(ins_raw.get("approval_count", len(entities["approvals"])), 0, 9999),
        "ai_confidence":           _clamp(ins_raw.get("ai_confidence", 80)),
    }

    # ── Knowledge Graph ────────────────────────────────────────────────────
    kg_raw  = data.get("knowledge_graph") or {}
    if not isinstance(kg_raw, dict):
        kg_raw = {}

    kg = {
        "nodes":        kg_raw.get("nodes") or [],
        "edges":        kg_raw.get("edges") or [],
        "ai_confidence": _clamp(ins_raw.get("ai_confidence", 80)),
    }

    # ── Security ──────────────────────────────────────────────────────────
    sec_raw = data.get("security") or {}
    if not isinstance(sec_raw, dict):
        sec_raw = {}

    sec_comps = sec_raw.get("components") or []
    security = {
        "components":       sec_comps if isinstance(sec_comps, list) else [],
        "security_posture": str(sec_raw.get("security_posture") or "Unknown").strip(),
        "risk_level":       str(sec_raw.get("risk_level") or "Unknown").strip(),
    }

    return {
        "classification": classification,
        "entities":        entities,
        "workflow":        workflow,
        "knowledge_graph": kg,
        "security":        security,
        "insights":        workflow["insights"],
    }


# ── AI Client (via router) ────────────────────────────────────────────────
from utils.ai_router import execute_prompt

def analyse_document(document_text: str) -> dict:
    """
    Main entry point. Uses execute_prompt for routing (Gemini primary, Groq fallback).
    Returns a fully normalised intelligence context.

    The returned dict has these top-level keys:
      classification, entities, workflow, knowledge_graph, security, insights, metrics
    """
    truncated = _truncate(document_text)
    prompt = (
        _INTELLIGENCE_PROMPT
        + "\n\n--- DOCUMENT START ---\n"
        + truncated
        + "\n--- DOCUMENT END ---\n\n"
        + "Return the intelligence JSON now."
    )

    try:
        parsed, metrics = execute_prompt(prompt)
    except Exception as exc:
        logger.error("Intelligence: execution failed: %s", exc)
        raise RuntimeError(f"Intelligence execution failed: {exc}") from exc

    if not parsed:
        raise RuntimeError("Intelligence: AI provider returned an empty or invalid response.")

    ctx = _normalise(parsed, document_text)
    ctx["_provider"] = metrics.get("provider", "unknown")
    ctx["metrics"] = metrics
    return ctx

def analyse_document_safe(document_text: str) -> Optional[dict]:
    """
    Like analyse_document but never raises — returns None on failure.
    Used by file_service so a single module failure doesn't abort the upload.
    """
    try:
        return analyse_document(document_text)
    except Exception as exc:
        logger.error("Intelligence (safe): analysis failed: %s", exc)
        return None
