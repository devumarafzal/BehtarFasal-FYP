from fastapi import APIRouter

from app.services.crop_service import crop_service
from app.services.fertilizer_service import fertilizer_service
from app.services.yield_service import yield_service

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict:
    """Return API and model readiness state."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "model_loaded": crop_service.model_loaded,
        "model_accuracy": "99.55%",
        "total_crops": 22,
        "sklearn_version": "1.8.0",
        "fertilizer_model_loaded": fertilizer_service.model_loaded,
        "fertilizer_options": fertilizer_service.fertilizer_labels,
        "fertilizer_soil_types": fertilizer_service.soil_types,
        "fertilizer_crop_types": fertilizer_service.crop_types,
        "yield_model_loaded": yield_service.model_loaded,
        "yield_crops": yield_service.crops,
        "yield_soil_types": yield_service.soil_types,
        "yield_irrigation_types": yield_service.irrigation_types,
        "yield_fertilizers": yield_service.fertilizers,
    }
