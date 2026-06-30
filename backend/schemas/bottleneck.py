"""
Pydantic schemas for the AI Bottleneck Detection module.
Canonical contracts shared across:
  - API layer      (api/bottleneck.py)
  - Service layer  (services/bottleneck_service.py)
  - Future modules (Optimization Engine, Lemma SDK)
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class Bottleneck(BaseModel):
    """A single detected process bottleneck."""

    severity: str = Field(
        ...,
        description="One of: High | Medium | Low",
    )
    title: str = Field(..., description="Short name for the bottleneck")
    description: str = Field(..., description="What the bottleneck is")
    reason: str = Field(..., description="Root cause explanation")
    impact: str = Field(
        ...,
        description="Business impact — one of: High | Medium | Low",
    )
    affected_steps: List[str] = Field(
        default_factory=list,
        description="Workflow step titles that are affected",
    )
    affected_actors: List[str] = Field(
        default_factory=list,
        description="Roles / people involved in the bottleneck",
    )
    estimated_delay: str = Field(
        default="Unknown",
        description="Estimated time added to the process, e.g. '2 Days'",
    )
    recommendation: str = Field(
        ...,
        description="Concrete actionable recommendation to fix this bottleneck",
    )
    confidence: int = Field(
        default=75,
        description="AI confidence in this finding (0–100)",
        ge=0,
        le=100,
    )


class BottleneckSummary(BaseModel):
    """Aggregate process health metrics."""

    overall_health_score: int = Field(
        default=75,
        description="0–100. Higher = healthier process.",
        ge=0,
        le=100,
    )
    workflow_complexity: str = Field(
        default="Medium",
        description="Low | Medium | High",
    )
    automation_readiness: str = Field(
        default="Medium",
        description="Low | Medium | High — how ready the process is for automation",
    )
    estimated_time_savings: str = Field(
        default="Unknown",
        description="Total time that could be saved if all bottlenecks are resolved",
    )
    risk_score: int = Field(
        default=50,
        description="0–100. Higher = riskier process.",
        ge=0,
        le=100,
    )
    ai_confidence: int = Field(
        default=75,
        description="Overall Gemini confidence in the analysis (0–100)",
        ge=0,
        le=100,
    )
    total_bottlenecks: int = Field(default=0)
    high_severity: int = Field(default=0)
    medium_severity: int = Field(default=0)
    low_severity: int = Field(default=0)


class BottleneckReport(BaseModel):
    """Full bottleneck analysis report returned by the service and API."""

    summary: BottleneckSummary = Field(default_factory=BottleneckSummary)
    bottlenecks: List[Bottleneck] = Field(default_factory=list)
    metrics: Optional[dict] = Field(default_factory=dict, description="Execution metrics from the AI router")
