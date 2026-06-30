from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class CopilotMessage(BaseModel):
    role: str
    content: str

class CopilotRequest(BaseModel):
    messages: List[CopilotMessage]
    workflow: Dict[str, Any]
    optimization: Dict[str, Any]
    document_text: Optional[str] = None
