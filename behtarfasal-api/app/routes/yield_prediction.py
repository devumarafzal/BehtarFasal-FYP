import logging

from fastapi import APIRouter, HTTPException

from app.models.yield_model import YieldOptionsResponse, YieldPredictRequest, YieldPredictResponse
from app.services.yield_service import yield_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/yield", tags=["Yield Prediction"])


@router.get("/options", response_model=YieldOptionsResponse)
async def get_yield_options() -> YieldOptionsResponse:
    """Get supported crop, soil, irrigation, and fertilizer options."""
    return YieldOptionsResponse(
        crops=yield_service.crops,
        soil_types=yield_service.soil_types,
        irrigation_types=yield_service.irrigation_types,
        fertilizers=yield_service.fertilizers,
        model_loaded=yield_service.model_loaded,
    )


@router.post("/predict", response_model=YieldPredictResponse)
async def predict_yield(request: YieldPredictRequest) -> YieldPredictResponse:
    """Predict yield per acre and total yield for a farm."""
    if not yield_service.model_loaded:
        raise HTTPException(
            status_code=503,
            detail="Yield model not loaded. Check yield_rf.pkl, yield_scaler.pkl, and yield_encoders.pkl.",
        )

    try:
        result = yield_service.predict(request)
        return YieldPredictResponse(
            success=True,
            data=result,
            message="Yield prediction generated successfully",
            predicted_yield_per_acre=result["predicted_yield_per_acre"],
            total_yield=result["total_yield"],
            unit=result["unit"],
            total_unit=result["total_unit"],
        )
    except ValueError as exc:
        logger.warning("Invalid yield input: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Yield prediction failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
