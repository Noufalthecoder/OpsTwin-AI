"""
Document Analyzer
──────────────────
Thin adapter that calls the Intelligence Engine and converts its rich output
into the legacy AnalysisResult shape expected by the upload API response.

If the Intelligence Engine is unavailable (no API key, network error) this
module falls back to the original rule-based heuristics so the system
always returns *something* useful.
"""

from __future__ import annotations

import logging
import math
import re

logger = logging.getLogger(__name__)


# ── Rule-based fallback (unchanged from original) ────────────────────────

def _rule_based(text: str) -> dict:
    text_lower = text.lower()

    # Document type detection
    doc_type = "General"
    confidence = 50

    rules = [
        (["sop", "standard operating procedure"],                         "SOP", 92),
        (["security architecture", "zero trust", "end-to-end encryption",
          "vpn", "firewall", "rbac", "biometric"],                        "Security Architecture", 91),
        (["product requirement", "prd", "user story", "acceptance criteria"], "Product Requirement Document", 90),
        (["technical specification", "tech spec", "api specification"],   "Technical Specification", 88),
        (["system design", "high level design", "low level design"],      "System Design", 87),
        (["compliance policy", "regulatory", "gdpr", "hipaa"],            "Compliance Policy", 89),
        (["hr policy", "human resources", "leave policy", "attendance"],  "HR Policy", 88),
        (["meeting notes", "minutes", "attendees", "action items"],       "Meeting Notes", 88),
        (["business proposal", "proposal", "executive summary", "roi"],   "Business Proposal", 85),
        (["technical architecture", "architecture diagram", "components"], "Technical Architecture", 86),
        (["research paper", "abstract", "methodology", "conclusion",
          "references"],                                                   "Research Paper", 84),
        (["military", "defence", "classified", "operation", "mission"],   "Military Process", 92),
        (["government", "ministry", "gazette", "tender", "public sector"], "Government Process", 90),
        (["jira", "ticket", "issue tracker"],                             "Workflow Document", 87),
        (["engineering", "architecture", "api", "deploy"],                "Software Design", 83),
    ]
    for keywords, dtype, conf in rules:
        if any(kw in text_lower for kw in keywords):
            doc_type = dtype
            confidence = conf
            break

    # Reading time
    word_count = len(re.findall(r'\w+', text))
    reading_time = max(1, math.ceil(word_count / 250))

    # Departments
    dept_map = {
        "Engineering": ["code", "system", "architecture", "api", "deploy", "engineering"],
        "HR":          ["policy", "leave", "employee", "human resources", "hr"],
        "Sales":       ["revenue", "customer", "sales", "deal", "pipeline"],
        "Marketing":   ["campaign", "lead", "marketing", "ads", "seo"],
        "Operations":  ["process", "sop", "operations", "logistics"],
        "Security":    ["security", "vpn", "encryption", "firewall", "auth"],
    }
    departments = [d for d, kws in dept_map.items() if any(k in text_lower for k in kws)] or ["General"]

    # Keywords (top frequency, 5+ chars)
    stop = {"the","and","for","are","was","with","this","that","from","have","been","will","they","their"}
    words = re.findall(r'\b[a-zA-Z]{5,}\b', text_lower)
    freq: dict[str, int] = {}
    for w in words:
        if w not in stop:
            freq[w] = freq.get(w, 0) + 1
    keywords = [w for w, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:8]]

    summary = (
        f"This document is classified as {doc_type}. "
        f"Key topics include: {', '.join(keywords[:3])}."
    )

    return {
        "document_type":             doc_type,
        "estimated_reading_time_mins": reading_time,
        "departments":               departments,
        "employees":                 ["Unknown"],
        "keywords":                  keywords,
        "summary":                   summary,
        "confidence":                confidence,
    }


# ── Public API ────────────────────────────────────────────────────────────

def analyze_document(text: str) -> dict:
    """
    Analyse a document and return an AnalysisResult-compatible dict.

    Primary path: Intelligence Engine (Gemini).
    Fallback path: rule-based heuristics.

    The returned dict always contains:
      document_type, estimated_reading_time_mins, departments,
      employees, keywords, summary, confidence

    If the Intelligence Engine succeeded it also carries:
      _intelligence  — the full engine context for downstream services
    """
    # Try the Intelligence Engine first
    try:
        from services.intelligence_engine import analyse_document as ie_analyse
        ctx = ie_analyse(text)

        cls    = ctx["classification"]
        ent    = ctx["entities"]
        sec    = ctx["security"]

        # Merge security components into keywords for visibility
        keywords = (
            ent.get("_keywords_legacy") or []
            + ent.get("security_components", [])[:3]
        )[:8]
        if not keywords:
            # Fallback: extract from text
            stop = {"the","and","for","are","was","with","this","that","from","have","been"}
            words = re.findall(r'\b[a-zA-Z]{5,}\b', text.lower())
            freq: dict[str, int] = {}
            for w in words:
                if w not in stop:
                    freq[w] = freq.get(w, 0) + 1
            keywords = [w for w, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:8]]

        # "employees" for the legacy UI card =
        #   team_members + workflow_actors (not plain authors)
        employees = list(dict.fromkeys(
            ent.get("team_members", []) + ent.get("workflow_actors", [])
        ))
        if not employees:
            employees = ["Unknown"]

        result = {
            "document_type":              cls["primary_category"],
            "estimated_reading_time_mins": cls["reading_time_mins"],
            "departments":                ent.get("departments") or ["General"],
            "employees":                  employees,
            "keywords":                   keywords,
            "summary":                    cls["summary"] or f"Document classified as {cls['primary_category']}.",
            "confidence":                 cls["confidence"],
            "metrics":                    ctx.get("metrics", {}),
            # Full engine context — used by workflow / KG / bottleneck services
            "_intelligence":              ctx,
        }
        return result

    except Exception as exc:
        logger.warning("Intelligence Engine unavailable (%s) — using rule-based fallback.", exc)
        return _rule_based(text)
