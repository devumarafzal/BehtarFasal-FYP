from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    role: str # 'user' or 'ai'
    content: str

class ChatRequest(BaseModel):
    userId: Optional[str] = None
    message: str
    location: Optional[Dict[str, float]] = None # {lat: ..., lon: ...}
    weather: Optional[Dict[str, Any]] = None
    history: List[ChatMessage] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str
    intent: str
    data: Optional[Dict[str, Any]] = None

class ChatTranscribeResponse(BaseModel):
    text: str
