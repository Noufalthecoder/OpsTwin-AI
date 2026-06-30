from fastapi import APIRouter
from lemma.agent_manager import agent_manager

router = APIRouter(
    prefix="/monitor",
    tags=["Monitor"]
)

@router.get("/status")
def get_monitor_status():
    return agent_manager.agent_status
