import logging
from fastapi import APIRouter, HTTPException
from app.models.chat_model import ChatRequest, ChatResponse
from app.services.chat_service import process_chat_message
from app.services.gemini_service import get_gemini_status

router = APIRouter(prefix="/chat", tags=["Chatbot"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        response = await process_chat_message(request)
        return response
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while processing the chat.")


@router.get("/status")
async def chat_status():
    return get_gemini_status()
