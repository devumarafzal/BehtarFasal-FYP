from fastapi import APIRouter

from app.services.disease_service import disease_service

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "version": "1.0.0",
        "model_loaded": disease_service.model_loaded,
        "model_name": disease_service.model_name,
        "total_classes": disease_service.num_labels,
    }
