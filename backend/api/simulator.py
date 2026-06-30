from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter(prefix="/simulator", tags=["Simulator"])

class SimulationRequest(BaseModel):
    workflow_id: str
    removed_steps: List[str] = []
    merged_steps: List[str] = []

@router.post("/simulate")
def simulate_workflow(request: SimulationRequest):
    # Base mock metrics
    base_time = 120
    base_cost = 5000
    base_automation = 45
    
    # Calculate modifiers based on removed/merged steps
    time_reduction = len(request.removed_steps) * 15 + len(request.merged_steps) * 10
    cost_reduction = len(request.removed_steps) * 500 + len(request.merged_steps) * 250
    automation_increase = len(request.removed_steps) * 2 + len(request.merged_steps) * 1
    
    # Recompute metrics dynamically
    new_time = max(10, base_time - time_reduction)
    new_cost = max(500, base_cost - cost_reduction)
    new_automation = min(100, base_automation + automation_increase)
    
    return {
        "status": "success",
        "simulation": {
            "processing_time_hours": new_time,
            "cost_dollars": new_cost,
            "automation_percent": new_automation,
            "productivity_score": min(100, 60 + automation_increase),
            "manual_effort_hours": max(0, 80 - time_reduction),
            "compliance_score": 90,
            "risk_score": 15
        },
        "charts_data": {
            "cost_trend": [new_cost + 1000, new_cost + 500, new_cost, new_cost - 200, new_cost - 500],
            "efficiency_trend": [new_automation - 10, new_automation - 5, new_automation, new_automation + 5, new_automation + 10]
        }
    }
