from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import uuid
import os
import json

router = APIRouter(prefix="/api/share", tags=["share"])

SHARES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "shares")
os.makedirs(SHARES_DIR, exist_ok=True)

class ShareRequest(BaseModel):
    workflow: Dict[str, Any]
    optimization: Dict[str, Any]

class ShareResponse(BaseModel):
    id: str
    url: str

@router.post("/", response_model=ShareResponse)
async def create_share_link(request: ShareRequest):
    try:
        share_id = str(uuid.uuid4())
        file_path = os.path.join(SHARES_DIR, f"{share_id}.json")
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({
                "workflow": request.workflow,
                "optimization": request.optimization
            }, f, indent=2)
            
        return ShareResponse(
            id=share_id,
            url=f"https://opstwin.ai/share/{share_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{share_id}")
async def get_shared_workflow(share_id: str):
    try:
        # Prevent path traversal
        if not share_id.isalnum() and "-" not in share_id:
            raise HTTPException(status_code=400, detail="Invalid share ID")
            
        file_path = os.path.join(SHARES_DIR, f"{share_id}.json")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Shared workflow not found")
            
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
