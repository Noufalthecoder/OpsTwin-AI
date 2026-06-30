"""
Bottleneck Detection API Router
─────────────────────────────────
POST /bottleneck

Accepts a document file, runs the full pipeline
(extract → workflow → knowledge graph → bottleneck analysis),
and returns a BottleneckReport.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from schemas.bottleneck import BottleneckReport
from services.bottleneck_service import detect_bottlenecks
from services.gemini_workflow_service import discover_workflow_with_gemini
from services.knowledge_graph_service import build_knowledge_graph
from services.document_analyzer import analyze_document
from services.file_service import (
    ensure_upload_dir,
    parse_docx,
    parse_txt,
    UPLOAD_DIR,
)
from services.pdf_parser import parse_pdf

import os
import shutil

router = APIRouter(prefix="/bottleneck", tags=["Bottleneck Detection"])


@router.post("", response_model=BottleneckReport)
async def analyse_bottlenecks(file: UploadFile = File(...)) -> BottleneckReport:
    """
    Upload a document and receive an AI bottleneck analysis report.

    - Accepts: PDF, DOCX, TXT
    - Returns: BottleneckReport (summary + list of bottlenecks)
    """
    from lemma.agent_manager import agent_manager
    result = agent_manager.run_workflow(file)
    if not result.bottleneck_report:
        raise HTTPException(status_code=500, detail="Failed to generate bottleneck report.")
    return BottleneckReport(**result.bottleneck_report)
