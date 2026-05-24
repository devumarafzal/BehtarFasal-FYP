from enum import Enum
from typing import List, Optional, Union

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class NutrientLevel(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


NutrientInput = Union[NutrientLevel, int, float]


class CropRecommendRequest(BaseModel):
    """Input schema for crop recommendation requests."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    nitrogen: NutrientInput
    phosphorus: NutrientInput
    potassium: NutrientInput
    temperature: Optional[float] = Field(default=25.0, ge=0.0, le=42.0)
    humidity: Optional[float] = Field(default=60.0, ge=14.0, le=98.0)
    ph: Optional[float] = Field(
        default=6.5,
        ge=3.5,
        le=8.0,
        validation_alias=AliasChoices("ph", "ph_level"),
    )
    rainfall: Optional[float] = Field(default=100.0, ge=20.0, le=300.0)

    # Frontend compatibility fields; ignored by ML model.
    soil_type: Optional[str] = None
    province: Optional[str] = None
    farm_size: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("farm_size", "size_acres", "sizeAcres"),
    )

    @field_validator("nitrogen", "phosphorus", "potassium", mode="before")
    @classmethod
    def normalize_nutrient_input(cls, value: object) -> object:
        """Allow enum text (Low/Medium/High) or numeric nutrient values."""
        if isinstance(value, (int, float, NutrientLevel)):
            return value

        if isinstance(value, str):
            stripped = value.strip()
            if stripped.lower() in {"low", "medium", "high"}:
                return stripped.capitalize()
            try:
                if "." in stripped:
                    return float(stripped)
                return int(stripped)
            except ValueError as exc:
                raise ValueError("Nutrient value must be Low/Medium/High or numeric") from exc

        raise ValueError("Unsupported nutrient value")

    @field_validator("nitrogen")
    @classmethod
    def validate_nitrogen_range(cls, value: NutrientInput) -> NutrientInput:
        """Validate nitrogen range expected by the trained model."""
        numeric = cls._to_numeric_nutrient(value)
        if numeric < 0 or numeric > 140:
            raise ValueError("Nitrogen must be between 0 and 140.")
        return value

    @field_validator("phosphorus")
    @classmethod
    def validate_phosphorus_range(cls, value: NutrientInput) -> NutrientInput:
        """Validate phosphorus range expected by the trained model."""
        numeric = cls._to_numeric_nutrient(value)
        if numeric < 0 or numeric > 145:
            raise ValueError("Phosphorus must be between 0 and 145.")
        return value

    @field_validator("potassium")
    @classmethod
    def validate_potassium_range(cls, value: NutrientInput) -> NutrientInput:
        """Validate potassium range expected by the trained model."""
        numeric = cls._to_numeric_nutrient(value)
        if numeric < 7 or numeric > 210:
            raise ValueError("Potassium must be between 7 and 210.")
        return value

    @staticmethod
    def _to_numeric_nutrient(value: NutrientInput) -> float:
        """Convert nutrient enum inputs to numeric values for range checks."""
        if isinstance(value, NutrientLevel):
            mapping = {
                NutrientLevel.low: 20.0,
                NutrientLevel.medium: 70.0,
                NutrientLevel.high: 120.0,
            }
            return mapping[value]
        return float(value)


class CropRecommendationOption(BaseModel):
    """Single crop option with model confidence percentage."""

    crop_name: str
    confidence: float


class CropResult(BaseModel):
    """Core recommendation payload produced by the ML service."""

    crop_name: str
    confidence: float
    reason: str
    best_planting_time: str
    expected_yield_per_acre: str
    expected_yield: Optional[str] = None
    alternative_crops: List[str]
    top_recommendations: List[CropRecommendationOption]


class CropRecommendResponse(BaseModel):
    """API response model with compatibility mirrors for current frontend."""

    success: bool
    data: Optional[CropResult] = None
    message: str

    # Top-level compatibility fields for existing frontend cards.
    crop_name: Optional[str] = None
    confidence: Optional[float] = None
    reason: Optional[str] = None
    best_planting_time: Optional[str] = None
    expected_yield: Optional[str] = None
    alternative_crops: Optional[List[str]] = None
    top_recommendations: Optional[List[CropRecommendationOption]] = None
