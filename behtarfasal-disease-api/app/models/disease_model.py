from typing import List, Optional

from pydantic import BaseModel


class DiseasePrediction(BaseModel):
    label: str
    confidence: float


class DiseaseDetectResult(BaseModel):
    label: str
    confidence: float
    top_predictions: List[DiseasePrediction]


class DiseaseDetectResponse(BaseModel):
    success: bool
    data: Optional[DiseaseDetectResult] = None
    message: str

    label: Optional[str] = None
    confidence: Optional[float] = None
    top_predictions: Optional[List[DiseasePrediction]] = None
