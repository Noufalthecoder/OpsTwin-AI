"""
Workflow Optimization API Router
──────────────────────────────────
POST /optimization

Standalone endpoint: upload a document, get back the full optimization report.
The /upload endpoint also runs optimization automatically on every upload.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from schemas.workflow_optimizer import WorkflowOptimizationResult
from services.workflow_optimizer import optimize_workflow
from services.gemini_workflow_service import discover_workflow_with_gemini
from services.document_analyzer import analyze_document
from services.file_service import (
    ensure_upload_dir, parse_docx, parse_txt, UPLOAD_DIR,
)
from services.pdf_parser import parse_pdf
import os, shutil

router = APIRouter(prefix="/optimization", tags=["Workflow Optimization"])


@router.post("", response_model=WorkflowOptimizationResult)
async def optimize_from_file(file: UploadFile = File(...)) -> WorkflowOptimizationResult:
    """
    Upload a document and receive a full workflow optimization report.
    Accepts: PDF, DOCX, TXT.
    """
    from lemma.agent_manager import agent_manager
    result = agent_manager.run_workflow(file)
    if not result.optimization:
        raise HTTPException(status_code=500, detail="Failed to generate optimization report.")
    return WorkflowOptimizationResult(**result.optimization)

@router.get("/recommendations")
async def get_recommendations():
    """
    Returns AI-driven optimization recommendations.
    In a fully integrated setup, this would fetch from the OptimizationAgent's latest run.
    """
    return {
        "status": "success",
        "recommendations": [
            { "id": "rec_1", "title": "Automate Invoice Approval", "impact": "High", "savings": "$45k/yr", "type": "Automation" },
            { "id": "rec_2", "title": "Remove Redundant HR Review", "impact": "Medium", "savings": "$12k/yr", "type": "Efficiency" },
            { "id": "rec_3", "title": "Consolidate Vendor Data", "impact": "High", "savings": "$30k/yr", "type": "Data" },
            { "id": "rec_4", "title": "Implement Auto-Categorization", "impact": "Medium", "savings": "$15k/yr", "type": "Automation" }
        ]
    }
