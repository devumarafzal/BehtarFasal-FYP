import logging

from fastapi import APIRouter, HTTPException

from app.models.fertilizer_model import FertilizerRecommendRequest, FertilizerRecommendResponse
from app.services.fertilizer_service import fertilizer_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fertilizer", tags=["Fertilizer Recommendation"])


@router.post("/recommend", response_model=FertilizerRecommendResponse)
async def recommend_fertilizer(request: FertilizerRecommendRequest) -> FertilizerRecommendResponse:
    """Get fertilizer recommendation based on soil, crop, and nutrient inputs."""
    if not fertilizer_service.model_loaded:
        raise HTTPException(
            status_code=503,
            detail="Fertilizer model not loaded. Check fertilizer_rf.pkl, fertilizer_scaler.pkl, fertilizer_encoders.pkl.",
        )

    try:
        result = fertilizer_service.predict(request)
        return FertilizerRecommendResponse(
            success=True,
            data=result,
            message="Fertilizer recommendation generated successfully",
            fertilizer=result["fertilizer"],
            confidence=result["confidence"],
            top_recommendations=result["top_recommendations"],
        )
    except ValueError as exc:
        logger.warning("Invalid fertilizer input: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Fertilizer prediction failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
