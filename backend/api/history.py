import os
import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

router = APIRouter(prefix="/history", tags=["History"])

RUNS_DIR = os.path.join("data", "runs")

@router.get("/")
def list_history():
    """List all historical runs, with basic metadata."""
    if not os.path.exists(RUNS_DIR):
        return []

    runs = []
    for filename in os.listdir(RUNS_DIR):
        if filename.endswith(".json"):
            file_path = os.path.join(RUNS_DIR, filename)
            try:
                with open(file_path, "r") as f:
                    data = json.load(f)
                    
                # Extract basic metadata to avoid sending entire JSON payloads
                run_info = {
                    "id": filename.replace(".json", ""),
                    "filename": data.get("filename", "Unknown"),
                    "timestamp": filename.replace("run_", "").replace(".json", ""),
                    "status": data.get("status", "Unknown"),
                    "document_type": data.get("analysis", {}).get("document_type", "Unknown") if data.get("analysis") else "Unknown",
                }
                
                # Try to extract an automation score or ROI if available
                if data.get("workflow") and data["workflow"].get("insights"):
                    run_info["automation_score"] = data["workflow"]["insights"].get("automation_score")
                    
                runs.append(run_info)
            except Exception as e:
                print(f"Failed to read run {filename}: {e}")
                
    # Sort newest first
    runs.sort(key=lambda x: x["timestamp"], reverse=True)
    return runs

@router.get("/{run_id}")
def get_run(run_id: str):
    """Get the full payload for a specific run."""
    # Prevent path traversal
    safe_run_id = os.path.basename(run_id)
    file_path = os.path.join(RUNS_DIR, f"{safe_run_id}.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Run not found")
        
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read run data: {e}")
