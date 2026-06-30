from fastapi import APIRouter, File, UploadFile
from models.document import UploadResponse
from lemma.agent_manager import agent_manager

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
def upload_file(file: UploadFile = File(...)):
    return agent_manager.run_workflow(file)
