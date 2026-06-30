from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from utils.event_bus import pipeline_bus

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])

@router.get("/stream")
async def stream_pipeline_events():
    return StreamingResponse(pipeline_bus.subscribe(), media_type="text/event-stream")
