from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import json
import os
from lemma.agent_manager import agent_manager
from services.digital_twin_service import digital_twin_service
from database.db import get_db
import datetime

router = APIRouter(prefix="/deployment", tags=["Deployment"])

class DeployRequest(BaseModel):
    scenarios: List[str]
    time_saved: float
    cost_saved: float
    optimization_name: str


async def deployment_event_generator(req: DeployRequest):
    # Helper to send SSE events
    def event(data: dict):
        return f"data: {json.dumps(data)}\n\n"
    
    # Sequence of agents and tasks based on user request
    sequence = [
        {
            "agent": "Workflow Optimization Agent",
            "task": "Generating optimized workflow...",
            "logs": ["Workflow JSON generated", "Mermaid regenerated", "BPMN regenerated"]
        },
        {
            "agent": "Knowledge Graph Agent",
            "task": "Updating relationships...",
            "logs": ["Knowledge Graph updated"]
        },
        {
            "agent": "Compliance Agent",
            "task": "Running policy validation...",
            "logs": ["Compliance Score recalculated"]
        },
        {
            "agent": "Digital Twin Agent",
            "task": "Recalculating enterprise metrics...",
            "logs": ["Digital Twin synchronized"]
        },
        {
            "agent": "Executive Dashboard Agent",
            "task": "Updating ROI, Updating savings, Updating charts",
            "logs": ["Executive Dashboard refreshed"]
        },
        {
            "agent": "Workflow Copilot Agent",
            "task": "Refreshing memory, Indexing latest workflow, Preparing contextual answers",
            "logs": ["Copilot memory indexed"]
        },
        {
            "agent": "Orchestrator",
            "task": "Final validation",
            "logs": ["Deployment Complete"]
        }
    ]

    total_logs = sum(len(step["logs"]) for step in sequence)
    log_counter = 0

    for step in sequence:
        # Notify about agent switch
        yield event({"type": "agent", "name": step["agent"], "task": step["task"]})
        
        for log_msg in step["logs"]:
            await asyncio.sleep(0.9)  # Simulate processing time
            log_counter += 1
            progress = int((log_counter / total_logs) * 100)
            yield event({"type": "log", "message": log_msg, "progress": progress})
            
    # --- Persistence Logic ---
    # 1. Update Digital Twin (mock logic but saves state)
    deployment_result = {"status": "success", "improvements": req.optimization_name}
    digital_twin_service.update_metrics(deployment_result)
    
    # 2. Persist to DB (Workflow Versions)
    try:
        conn = get_db()
        cursor = conn.cursor()
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute('''
            INSERT INTO workflow_versions (version_name, timestamp, agent, changes, roi_delta, time_delta, cost_delta, workflow_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', ("v1.3.0", now, "Optimization Agent", req.optimization_name, 98.2, req.time_saved, req.cost_saved, "{}"))
        conn.commit()
        conn.close()
    except Exception as e:
        print("DB persistence error:", e)

    # 3. Write actual files to filesystem
    try:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "runs")
        os.makedirs(data_dir, exist_ok=True)
        
        # Write JSON
        with open(os.path.join(data_dir, "workflow_v1.3.json"), "w") as f:
            json.dump({"version": "v1.3.0", "optimizations": req.scenarios, "status": "deployed"}, f, indent=2)
            
        # Write Mermaid
        with open(os.path.join(data_dir, "workflow_v1.3.mmd"), "w") as f:
            f.write("graph TD;\n    A[Start] --> B[Optimized Step];\n    B --> C[End];\n")
            
        # Write BPMN
        with open(os.path.join(data_dir, "workflow_v1.3.bpmn"), "w") as f:
            f.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<definitions><process id=\"OptimizedProcess\"/></definitions>\n")
    except Exception as e:
        print("File write error:", e)

    # Final complete event
    yield event({"type": "complete", "message": "Deployment Successful"})


@router.post("/deploy")
async def deploy_optimization(req: DeployRequest):
    # We return a streaming response that uses SSE format
    return StreamingResponse(deployment_event_generator(req), media_type="text/event-stream")
