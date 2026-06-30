import asyncio
from typing import AsyncGenerator

class PipelineEventBus:
    def __init__(self):
        self.queues = []
        self.history = []

    async def subscribe(self) -> AsyncGenerator[str, None]:
        q = asyncio.Queue()
        self.queues.append(q)
        
        # Send history first
        for msg in self.history:
            q.put_nowait(msg)

        try:
            while True:
                msg = await q.get()
                yield msg
        finally:
            self.queues.remove(q)

    def emit(self, event_name: str, data: str):
        msg = f"event: {event_name}\ndata: {data}\n\n"
        
        # Clear history if this is the start of a new pipeline run
        if event_name == "agent_status" and '"agent": "doc"' in data and '"status": "Running"' in data:
            self.history = []
            
        self.history.append(msg)
        if len(self.history) > 200:
            self.history = self.history[-200:]
            
        try:
            loop = asyncio.get_running_loop()
            for q in self.queues:
                loop.call_soon_threadsafe(q.put_nowait, msg)
        except RuntimeError:
            pass

pipeline_bus = PipelineEventBus()
