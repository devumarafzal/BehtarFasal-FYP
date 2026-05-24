from fastapi import APIRouter

from app.services.crop_service import crop_service

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
    }
