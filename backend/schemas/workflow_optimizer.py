from pydantic import BaseModel, Field
from typing import List, Optional

class OptimizedWorkflowStep(BaseModel):
    id: int
    title: str
    actor: str = "Unknown"
    department: str = "Unknown"
    type: str = "Task"
    execution_mode: str = "Manual"
    inputs: List[str] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)
    dependencies: List[int] = Field(default_factory=list)
    change: str = "kept"  # kept, automated, merged, removed, parallelized, new
    change_reason: str = ""

class RemovedStep(BaseModel):
    step_title: str
    reason: str
    impact: str

class MergedStep(BaseModel):
    original_steps: List[str]
    new_step: str
    reason: str

class AutomationCandidate(BaseModel):
    step_title: str
    suggestion: str
    time_saved: str

class ImplementationPhase(BaseModel):
    phase_name: str
    title: str
    duration: str
    description: str

class WorkflowOptimizationResult(BaseModel):
    current_steps: int
    optimized_steps: int
    step_reduction: int
    optimized_graph: List[OptimizedWorkflowStep]
    removed_steps: List[RemovedStep]
    merged_steps: List[MergedStep]
    automation_candidates: List[AutomationCandidate]
    estimated_time_saved: str
    estimated_cost_saved: str
    estimated_manual_work_reduction: int = 0
    estimated_human_errors_prevented: int = 0
    estimated_productivity_increase: int = 0
    automation_score: int = 0
    implementation_plan: List[ImplementationPhase]
    executive_summary: str
    confidence: int
