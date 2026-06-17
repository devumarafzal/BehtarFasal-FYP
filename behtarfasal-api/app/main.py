import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import crop, fertilizer, health, chat

load_dotenv()
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="BehtarFasal API",
    description="AI-powered crop recommendation API for Pakistani farmers",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(crop.router)
app.include_router(fertilizer.router)
app.include_router(chat.router)


@app.get("/")
async def root() -> dict:
    """Return a basic API status message."""
    return {"message": "BehtarFasal API is running", "docs": "/docs"}
