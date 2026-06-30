"""
Organizational Knowledge Graph Service
────────────────────────────────────────
Sends extracted document text to Google Gemini and returns a structured
knowledge graph (nodes + edges) representing the organization as a
Digital Twin.

Designed to be fully modular: the returned KnowledgeGraphData object
can be consumed directly by future modules (Bottleneck Detection,
Optimization Engine, Lemma SDK) without any coupling to this service.
"""

import json
import os
import re
import logging
from collections import Counter
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

from schemas.knowledge_graph import KGNode, KGEdge, KGInsights, KnowledgeGraphData

# ── Setup ────────────────────────────────────────────────────────────────
load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Keep input short so Gemini has plenty of output budget for the graph JSON.
# Knowledge graphs are verbose — a 30-node graph easily uses 3000+ output tokens.
MAX_DOC_CHARS = 4_000

# ── Gemini Prompt ─────────────────────────────────────────────────────────
_KG_PROMPT = """\
You are an Enterprise Knowledge Graph AI.

Analyze the organizational document below.
Extract ALL entities and relationships present in the document.
Do NOT invent or hallucinate information.
If a field is unknown, use "Unknown".

Return a single JSON object — no markdown fences, no prose, just JSON.

Node types you MUST use (exactly as written):
  department | employee | system | policy | document | sop | approval | application | jira_issue | slack_message | email | meeting

Relationship types (use UPPERCASE exactly as written: USES, REPORTS_TO, REFERENCES, BLOCKS, DEPENDS_ON, GENERATES, APPROVES, OWNS):

Schema:
{
  "nodes": [
    {
      "id": "<unique-slug-no-spaces>",
      "label": "<display name>",
      "type": "<node type from list above>",
      "description": "<one sentence from the document or empty string>"
    }
  ],
  "edges": [
    {
      "source": "<node id>",
      "target": "<node id>",
      "relationship": "<relationship type>",
      "label": "<short human readable label>"
    }
  ],
  "ai_confidence": 85
}

Rules:
- Every node id must be unique and slug-safe (lowercase, hyphens only)
- Every edge source and target must reference an existing node id
- Extract as many real entities as the document contains
- Return JSON only — no other text whatsoever
"""


# ── Helpers ──────────────────────────────────────────────────────────────

def _truncate(text: str, max_chars: int = MAX_DOC_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    logger.warning("KG: document truncated from %d to %d chars.", len(text), max_chars)
    return text[:max_chars] + "\n\n[... document truncated ...]"


def _repair_truncated_json(raw: str) -> str:
    """Close unclosed JSON structures when Gemini hits MAX_TOKENS."""
    text = raw.strip()
    # Strip fences
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
        logger.info("KG: repaired truncated JSON, appended: %r", closing)
    return text + closing


def _extract_json(raw: str) -> Optional[dict]:
    """Parse JSON from raw Gemini output, handling fences and partial blocks."""
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


def _compute_insights(nodes: list[KGNode], edges: list[KGEdge], ai_confidence: int) -> KGInsights:
    """Derive aggregate statistics from the graph structure."""
    n = len(nodes)
    e = len(edges)

    type_counts: Counter = Counter(node.type for node in nodes)

    # Graph density = actual edges / maximum possible directed edges
    max_edges = n * (n - 1) if n > 1 else 1
    density = round(e / max_edges, 4)

    # Degree centrality: count how many edges touch each node id
    degree: Counter = Counter()
    for edge in edges:
        degree[edge.source] += 1
        degree[edge.target] += 1

    def _most_connected_of_type(node_type: str) -> Optional[str]:
        candidates = [nd for nd in nodes if nd.type == node_type]
        if not candidates:
            return None
        return max(candidates, key=lambda nd: degree.get(nd.id, 0)).label

    return KGInsights(
        total_nodes=n,
        total_edges=e,
        total_departments=type_counts.get("department", 0),
        total_employees=type_counts.get("employee", 0),
        total_systems=type_counts.get("system", 0),
        total_technologies=type_counts.get("technology", 0),
        total_relationships=e,
        graph_density=density,
        most_connected_department=_most_connected_of_type("department"),
        most_connected_employee=_most_connected_of_type("employee"),
        ai_confidence=ai_confidence,
    )


def _normalise(raw_data: dict) -> KnowledgeGraphData:
    """
    Convert Gemini's raw JSON dict into a validated KnowledgeGraphData object.
    Cleans ids, removes edges with dangling references, and fills defaults.
    """
    VALID_NODE_TYPES = {
        "department", "employee", "system", "policy", "document",
        "sop", "approval", "application", "jira_issue", "slack_message", "email", "meeting"
    }

    # ── Nodes ────────────────────────────────────────────────────────────
    raw_nodes: list[dict] = raw_data.get("nodes") or []
    nodes: list[KGNode] = []
    seen_ids: set[str] = set()

    for rn in raw_nodes:
        raw_id: str = str(rn.get("id", "")).strip()
        label: str = str(rn.get("label", "")).strip()
        node_type: str = str(rn.get("type", "")).strip().lower()
        description: str = str(rn.get("description", "")).strip()

        # Normalise id: lowercase, replace spaces/special chars with hyphens
        slug = re.sub(r"[^a-z0-9]+", "-", raw_id.lower()).strip("-")
        if not slug:
            slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or "node"

        # Deduplicate
        base_slug = slug
        counter = 1
        while slug in seen_ids:
            slug = f"{base_slug}-{counter}"
            counter += 1
        seen_ids.add(slug)

        if node_type not in VALID_NODE_TYPES:
            node_type = "document"

        nodes.append(KGNode(
            id=slug,
            label=label or slug,
            type=node_type,
            description=description,
        ))

    # Build id-remap in case we slugified the ids
    raw_ids = [str(rn.get("id", "")).strip() for rn in raw_nodes]
    id_remap: dict[str, str] = {
        raw_ids[i]: nodes[i].id for i in range(len(nodes))
    }
    valid_ids = {nd.id for nd in nodes}

    # ── Edges ────────────────────────────────────────────────────────────
    raw_edges: list[dict] = raw_data.get("edges") or []
    edges: list[KGEdge] = []

    for re_ in raw_edges:
        src_raw = str(re_.get("source", "")).strip()
        tgt_raw = str(re_.get("target", "")).strip()
        relationship = str(re_.get("relationship", "REFERENCES")).strip().upper()
        label = str(re_.get("label", "")).strip()

        # Remap ids via the slug map, or try direct match
        src = id_remap.get(src_raw, src_raw)
        tgt = id_remap.get(tgt_raw, tgt_raw)

        # Drop edges with dangling references
        if src not in valid_ids or tgt not in valid_ids:
            logger.debug("KG: dropping edge with unknown nodes (%s -> %s)", src, tgt)
            continue

        # No self-loops
        if src == tgt:
            continue

        edges.append(KGEdge(
            source=src,
            target=tgt,
            relationship=relationship or "REFERENCES",
            label=label,
        ))

    ai_confidence: int = int(raw_data.get("ai_confidence", 75))
    insights = _compute_insights(nodes, edges, ai_confidence)

    return KnowledgeGraphData(nodes=nodes, edges=edges, insights=insights)


# ── Public API ────────────────────────────────────────────────────────────

from utils.ai_router import execute_prompt

def _build_direct(document_text: str, document_type: str) -> KnowledgeGraphData:
    """Standalone Gemini call used when no engine context is available."""
    truncated = _truncate(document_text)
    user_message = (
        f"Document Type: {document_type}\n\n"
        f"--- DOCUMENT CONTENT START ---\n{truncated}\n"
        f"--- DOCUMENT CONTENT END ---\n\n"
        "Extract the organizational knowledge graph from the document above."
    )
    full_prompt = _KG_PROMPT + "\n\n" + user_message

    try:
        parsed, metrics = execute_prompt(full_prompt)
        if parsed is None:
            raise RuntimeError("Unable to parse knowledge graph JSON from AI response.")
        
        normalized = _normalise(parsed)
        normalized.metrics = metrics
        return normalized

    except Exception as exc:
        logger.exception("Unexpected error during direct KG call.")
        raise RuntimeError(f"AI API error: {exc}") from exc


def build_knowledge_graph(
    document_text: str,
    document_type: str = "Unknown",
    intelligence_context: Optional[dict] = None,
) -> KnowledgeGraphData:
    """
    Return a KnowledgeGraphData object.

    Primary path: use knowledge_graph seed from the Intelligence Engine context.
    Fallback path: direct Gemini call.
    """
    # ── Primary: engine context ───────────────────────────────────────────
    if intelligence_context and isinstance(intelligence_context, dict):
        kg_seed = intelligence_context.get("knowledge_graph")
        if kg_seed and isinstance(kg_seed, dict) and kg_seed.get("nodes"):
            logger.debug("KG: using Intelligence Engine context.")
            return _normalise(dict(kg_seed))

    # ── Fallback: direct Gemini call ──────────────────────────────────────
    logger.debug("KG: falling back to direct Gemini call.")
    return _build_direct(document_text, document_type)
