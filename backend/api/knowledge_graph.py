"""
Knowledge Graph API Router
───────────────────────────
POST /knowledge-graph

Accepts a document file, extracts text, and returns the organizational
knowledge graph built by Gemini.  This endpoint is separate from /upload
so the graph can be fetched independently (e.g. on demand, or cached).
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from schemas.knowledge_graph import KnowledgeGraphData
from services.knowledge_graph_service import build_knowledge_graph
from services.file_service import (
    ensure_upload_dir,
    parse_docx,
    parse_txt,
    UPLOAD_DIR,
)
from services.pdf_parser import parse_pdf
from services.document_analyzer import analyze_document

import os
import shutil

router = APIRouter(prefix="/knowledge-graph", tags=["Knowledge Graph"])


@router.post("", response_model=KnowledgeGraphData)
async def build_graph_from_file(file: UploadFile = File(...)) -> KnowledgeGraphData:
    """
    Upload a document and receive an organizational knowledge graph.

    - Accepts: PDF, DOCX, TXT
    - Returns: KnowledgeGraphData (nodes, edges, insights)
    """
    from lemma.agent_manager import agent_manager
    result = agent_manager.run_workflow(file)
    if not result.knowledge_graph:
        raise HTTPException(status_code=500, detail="Failed to generate knowledge graph.")
    return KnowledgeGraphData(**result.knowledge_graph)
