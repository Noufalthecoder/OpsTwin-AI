"""
Pydantic schemas for the AI Workflow Optimization module.
Canonical contracts consumed by:
  - services/optimization_service.py
  - api/optimization.py
  - Future: Lemma SDK Orchestration
"""

from pydantic import BaseModel, Field
from typing import List, Optional


# ── Optimized step (mirrors WorkflowStep but adds optimization metadata) ──

class OptimizedStep(BaseModel):
    id: int
    title: str
    actor: str = "Unknown"
    department: str = "Unknown"
    type: str = "Task"          # Start | Task | Decision | Approval | End
    execution_mode: str = "Manual"   # Manual | Automated | Semi-Automated
    inputs: List[str] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)
    dependencies: List[int] = Field(default_factory=list)
    change: str = ""            # "kept" | "merged" | "automated" | "removed" | "parallelized" | "new"
    change_reason: str = ""     # Why this change was made


# ── Recommendation ────────────────────────────────────────────────────────

class OptimizationRecommendation(BaseModel):
    category: str = Field(..., description="Quick Win | Medium Effort | Strategic")
    title: str
    description: str
    expected_impact: str
    implementation_difficulty: str = Field(..., description="Low | Medium | High")
    estimated_time_saved: str = "Unknown"
    estimated_cost_saved: str = "Unknown"
    confidence: int = Field(default=75, ge=0, le=100)


# ── Before vs After comparison ────────────────────────────────────────────

class ComparisonMetrics(BaseModel):
    original_steps: int = 0
    optimized_steps: int = 0
    original_approvals: int = 0
    optimized_approvals: int = 0
    original_decision_points: int = 0
    optimized_decision_points: int = 0
    original_manual_steps: int = 0
    optimized_manual_steps: int = 0
    original_execution_time: str = "Unknown"
    optimized_execution_time: str = "Unknown"
    original_automation_score: int = 0
    optimized_automation_score: int = 0


# ── Top-level report ─────────────────────────────────────────────────────

class OptimizationReport(BaseModel):
    # Summary numbers shown in the hero row
    original_step_count: int = 0
    optimized_step_count: int = 0
    time_reduction_pct: int = Field(default=0, ge=0, le=100)
    manual_work_reduction_pct: int = Field(default=0, ge=0, le=100)
    cost_savings: str = "Unknown"         # e.g. "₹45,000/month" or "~30%"
    optimization_confidence: int = Field(default=75, ge=0, le=100)

    # Comparison table
    comparison: ComparisonMetrics = Field(default_factory=ComparisonMetrics)

    # Optimized workflow steps (the new process)
    optimized_steps: List[OptimizedStep] = Field(default_factory=list)

    # Recommendations grouped by effort
    recommendations: List[OptimizationRecommendation] = Field(default_factory=list)

    # Executive summary
    executive_summary: str = ""

    # AI metadata
    ai_confidence: int = Field(default=75, ge=0, le=100)
    metrics: Optional[dict] = Field(default_factory=dict, description="Execution metrics from the AI router")
