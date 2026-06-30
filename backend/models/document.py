from pydantic import BaseModel
from typing import List, Optional

class AnalysisResult(BaseModel):
    document_type: str
    estimated_reading_time_mins: int
    departments: List[str]
    employees: List[str]
    keywords: List[str]
    summary: str
    confidence: int
    metrics: Optional[dict] = None

class WorkflowStep(BaseModel):
    id: int
    title: str
    actor: Optional[str] = None
    department: Optional[str] = None
    type: str = "Task" # Task, Decision, Approval, Start, End
    inputs: Optional[List[str]] = None
    outputs: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None

class WorkflowInsights(BaseModel):
    complexity: str
    estimated_execution_time: str
    automation_score: int
    manual_steps: int
    approval_count: int
    ai_confidence: Optional[int] = None        # Gemini self-reported confidence
    gemini_fallback: Optional[bool] = False    # True when rule-based fallback was used
    gemini_error: Optional[str] = None         # Error message from Gemini (if fallback)

class AutomationOpportunity(BaseModel):
    step_title: str
    suggestion: str
    impact: Optional[str] = "Medium"

class WorkflowData(BaseModel):
    workflow_name: str
    description: Optional[str] = ""      # Gemini workflow description
    start: Optional[str] = "Start"
    end: Optional[str] = "End"
    steps: List[WorkflowStep]
    actors: List[str]
    departments: List[str]
    inputs: Optional[List[str]] = []
    outputs: Optional[List[str]] = []
    decision_points: Optional[List[str]] = []
    approvals: Optional[List[str]] = []
    dependencies: Optional[List[str]] = []
    automation_opportunities: Optional[List[AutomationOpportunity]] = []
    insights: WorkflowInsights
    metrics: Optional[dict] = None

# ── Knowledge Graph models (mirrors schemas/knowledge_graph.py) ──────────
# Duplicated here so UploadResponse stays self-contained via a single import.

class KGNode(BaseModel):
    id: str
    label: str
    type: str
    description: Optional[str] = ""

class KGEdge(BaseModel):
    source: str
    target: str
    relationship: str
    label: Optional[str] = ""

class KGInsights(BaseModel):
    total_nodes: int = 0
    total_edges: int = 0
    total_departments: int = 0
    total_employees: int = 0
    total_systems: int = 0
    total_technologies: int = 0
    total_relationships: int = 0
    graph_density: float = 0.0
    most_connected_department: Optional[str] = None
    most_connected_employee: Optional[str] = None
    ai_confidence: Optional[int] = None

class KnowledgeGraphData(BaseModel):
    nodes: List[KGNode] = []
    edges: List[KGEdge] = []
    insights: KGInsights = KGInsights()
    metrics: Optional[dict] = None

class UploadResponse(BaseModel):
    filename: str
    pages: int
    text: str
    status: str
    analysis: Optional[AnalysisResult] = None
    workflow: Optional[WorkflowData] = None
    knowledge_graph: Optional[KnowledgeGraphData] = None
    bottleneck_report: Optional[dict] = None
    optimization: Optional[dict] = None
