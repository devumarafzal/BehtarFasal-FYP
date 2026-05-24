from typing import Optional

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard API error payload."""

    success: bool = False
    message: str
    detail: Optional[str] = None
