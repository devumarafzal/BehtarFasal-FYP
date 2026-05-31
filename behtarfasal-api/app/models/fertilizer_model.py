from typing import List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class FertilizerRecommendRequest(BaseModel):
    """Input schema for fertilizer recommendation requests."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    soil_type: str = Field(validation_alias=AliasChoices("soil_type", "soilType", "soil"))
    crop_type: str = Field(validation_alias=AliasChoices("crop_type", "cropType", "crop"))
    temperature: float
    humidity: float
    moisture: float
    nitrogen: float
    phosphorus: float
    potassium: float


class FertilizerOption(BaseModel):
    """Single fertilizer option with confidence percentage."""

    fertilizer: str
    confidence: float


class FertilizerResult(BaseModel):
    """Core fertilizer recommendation payload produced by the ML service."""

    fertilizer: str
    confidence: float
    soil_type: str
    crop_type: str
    top_recommendations: List[FertilizerOption]


class FertilizerRecommendResponse(BaseModel):
    """API response model with compatibility mirrors for frontend."""

    success: bool
    data: Optional[FertilizerResult] = None
    message: str

    fertilizer: Optional[str] = None
    confidence: Optional[float] = None
    top_recommendations: Optional[List[FertilizerOption]] = None
