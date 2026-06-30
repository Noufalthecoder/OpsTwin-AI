"""
Pydantic schemas for the Organizational Knowledge Graph module.
These are the canonical data contracts shared across:
  - API layer       (api/knowledge_graph.py)
  - Service layer   (services/knowledge_graph_service.py)
  - Future modules  (Bottleneck Detection, Optimization Engine, Lemma SDK)
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class KGNode(BaseModel):
    """A single entity in the knowledge graph."""
    id: str = Field(..., description="Unique slug identifier, e.g. 'engineering-dept'")
    label: str = Field(..., description="Human-readable display name")
    type: str = Field(
        ...,
        description=(
            "Entity type. One of: department | employee | system | policy | "
            "document | sop | approval | application | jira_issue | slack_message | email | meeting"
        ),
    )
    description: Optional[str] = Field(
        default="",
        description="Short description extracted from the document",
    )


class KGEdge(BaseModel):
    """A directed relationship between two nodes."""
    source: str = Field(..., description="id of the source node")
    target: str = Field(..., description="id of the target node")
    relationship: str = Field(
        ...,
        description=(
            "Relationship type, e.g. USES | REPORTS_TO | REFERENCES | "
            "BLOCKS | DEPENDS_ON | GENERATES | APPROVES | OWNS"
        ),
    )
    label: Optional[str] = Field(
        default="",
        description="Optional human-readable edge label shown on the graph",
    )


class KGInsights(BaseModel):
    """Aggregate statistics derived from the graph structure."""
    total_nodes: int = 0
    total_edges: int = 0
    total_departments: int = 0
    total_employees: int = 0
    total_systems: int = 0
    total_technologies: int = 0
    total_relationships: int = 0
    graph_density: float = Field(
        default=0.0,
        description="Edges / max-possible-edges (0–1). Higher = more interconnected.",
    )
    most_connected_department: Optional[str] = None
    most_connected_employee: Optional[str] = None
    ai_confidence: Optional[int] = Field(
        default=None,
        description="Gemini self-reported confidence (0–100)",
    )


class KnowledgeGraphData(BaseModel):
    """Complete knowledge graph payload returned by the service and API."""
    nodes: List[KGNode] = []
    edges: List[KGEdge] = []
    insights: KGInsights = KGInsights()
    metrics: Optional[dict] = Field(default_factory=dict, description="Execution metrics from the AI router")

