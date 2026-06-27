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