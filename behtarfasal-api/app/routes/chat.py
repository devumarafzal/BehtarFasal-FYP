import logging
from fastapi import APIRouter, File, HTTPException, UploadFile
from app.models.chat_model import ChatRequest, ChatResponse, ChatTranscribeResponse
from app.services.chat_service import process_chat_message
from app.services.gemini_service import (
    GeminiTranscriptionError,
    get_gemini_status,
    transcribe_audio,
)

router = APIRouter(prefix="/chat", tags=["Chatbot"])
logger = logging.getLogger(__name__)

MAX_TRANSCRIPTION_AUDIO_BYTES = 8 * 1024 * 1024
SUPPORTED_AUDIO_TYPES = {
    "audio/3gpp",
    "audio/aac",
    "audio/mp4",
    "audio/m4a",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "video/mp4",
}

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


@router.post("/transcribe", response_model=ChatTranscribeResponse)
async def transcribe_endpoint(file: UploadFile = File(...)):
    content_type = (file.content_type or "audio/mp4").split(";")[0].strip().lower()

    if content_type not in SUPPORTED_AUDIO_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported audio format.")

    audio_bytes = await file.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    if len(audio_bytes) > MAX_TRANSCRIPTION_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file is too large.")

    logger.info(
        "Transcribing voice note: filename=%s content_type=%s size=%s",
        file.filename,
        content_type,
        len(audio_bytes),
    )

    try:
        transcript = await transcribe_audio(audio_bytes, content_type)
    except GeminiTranscriptionError as e:
        logger.error("Gemini transcription provider error: %s", str(e))
        raise HTTPException(
            status_code=e.status_code,
            detail=e.user_message,
        )
    except Exception as e:
        logger.exception("Transcription error: %s", str(e))
        raise HTTPException(status_code=500, detail="Could not transcribe audio.")

    if not transcript:
        raise HTTPException(
            status_code=422,
            detail="No clear speech detected. Please speak louder and try again.",
        )

    return ChatTranscribeResponse(text=transcript)
