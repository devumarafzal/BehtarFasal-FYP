from typing import List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class YieldPredictRequest(BaseModel):
    """Input schema for yield prediction requests."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    crop: str = Field(validation_alias=AliasChoices("crop", "crop_type", "cropType"))
    farm_size_acres: float = Field(
        gt=0,
        validation_alias=AliasChoices("farm_size_acres", "farmSizeAcres", "farm_size", "farmSize"),
    )
    soil_type: str = Field(validation_alias=AliasChoices("soil_type", "soilType", "soil"))
    irrigation_type: str = Field(
        validation_alias=AliasChoices("irrigation_type", "irrigationType", "irrigation")
    )
    fertilizer_used: str = Field(
        validation_alias=AliasChoices("fertilizer_used", "fertilizerUsed", "fertilizer")
    )
    nitrogen: float = Field(ge=0)
    phosphorous: float = Field(
        ge=0,
        validation_alias=AliasChoices("phosphorous", "phosphorus"),
    )
    potassium: float = Field(ge=0)


class YieldResult(BaseModel):
    """Core yield prediction payload produced by the ML service."""

    crop: str
    farm_size_acres: float
    soil_type: str
    irrigation_type: str
    fertilizer_used: str
    predicted_yield_per_acre: float
    total_yield: float
    unit: str
    total_unit: str


class YieldPredictResponse(BaseModel):
    """API response model with compatibility mirrors for current frontend."""

    success: bool
    data: Optional[YieldResult] = None
    message: str

    predicted_yield_per_acre: Optional[float] = None
    total_yield: Optional[float] = None
    unit: Optional[str] = None
    total_unit: Optional[str] = None


class YieldOptionsResponse(BaseModel):
    """Supported categorical options for yield prediction."""

    crops: List[str]
    soil_types: List[str]
    irrigation_types: List[str]
    fertilizers: List[str]
    model_loaded: bool
