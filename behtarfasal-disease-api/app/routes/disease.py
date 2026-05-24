import logging
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

from app.models.disease_model import DiseaseDetectResponse, DiseaseDetectResult
from app.services.disease_service import disease_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/disease", tags=["Plant Disease"])

ALLOWED_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
}


@router.post("/detect", response_model=DiseaseDetectResponse)
async def detect_disease(
    file: UploadFile = File(...),
    top_k: int = 3,
) -> DiseaseDetectResponse:
    if not disease_service.model_loaded:
        raise HTTPException(
            status_code=503,
            detail="Disease model not loaded. Check app/ml/disease_model.",
        )

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image format.")

    if top_k < 1:
        raise HTTPException(status_code=422, detail="top_k must be >= 1")

    try:
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        result = disease_service.predict(image, top_k=top_k)

        return DiseaseDetectResponse(
            success=True,
            message="Disease prediction generated successfully",
            data=DiseaseDetectResult(**result),
            label=result["label"],
            confidence=result["confidence"],
            top_predictions=result["top_predictions"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Disease detection failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc
