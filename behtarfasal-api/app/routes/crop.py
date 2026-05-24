import logging

from fastapi import APIRouter, HTTPException

from app.models.crop_model import CropRecommendRequest, CropRecommendResponse
from app.services.crop_service import crop_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/crop", tags=["Crop Recommendation"])


@router.post("/recommend", response_model=CropRecommendResponse)
async def recommend_crop(request: CropRecommendRequest) -> CropRecommendResponse:
    """Get AI crop recommendation based on soil nutrient and weather inputs."""
    if not crop_service.model_loaded:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Check that model.pkl and standscaler.pkl exist in app/ml/",
        )

    try:
        result = crop_service.predict(request)
        return CropRecommendResponse(
            success=True,
            data=result,
            message="Crop recommendation generated successfully",
            crop_name=result["crop_name"],
            confidence=result["confidence"],
            reason=result["reason"],
            best_planting_time=result["best_planting_time"],
            expected_yield=result["expected_yield_per_acre"],
            alternative_crops=result["alternative_crops"],
            top_recommendations=result["top_recommendations"],
        )
    except ValueError as exc:
        logger.warning("Invalid prediction input: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Prediction failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
