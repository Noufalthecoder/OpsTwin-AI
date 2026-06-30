from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="OpsTwin AI",
    version="1.0.0",
    description="AI Organizational Digital Twin"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.upload import router as upload_router
from api.knowledge_graph import router as knowledge_graph_router
from api.bottleneck import router as bottleneck_router
from api.optimization import router as optimization_router
from api.share import router as share_router
from api.copilot import router as copilot_router
from api.monitor import router as monitor_router
from api.pipeline import router as pipeline_router
from api.history import router as history_router
from api.deployment import router as deployment_router
from api.simulator import router as simulator_router

app.include_router(upload_router)
app.include_router(knowledge_graph_router)
app.include_router(bottleneck_router)
app.include_router(optimization_router)
app.include_router(share_router)
app.include_router(copilot_router)
app.include_router(monitor_router)
app.include_router(pipeline_router)
app.include_router(history_router)
app.include_router(deployment_router)
app.include_router(simulator_router)

@app.get("/")
def home():
    return {
        "status": "running",
        "project": "OpsTwin AI"
    }

@app.get("/health")
def health():
    return {
        "health": "OK"
    }