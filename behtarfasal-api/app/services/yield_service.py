import logging
import pickle
from pathlib import Path
from typing import Dict, List

import numpy as np

from app.models.yield_model import YieldPredictRequest

logger = logging.getLogger(__name__)

ML_DIR = Path(__file__).resolve().parent.parent / "ml"


class YieldService:
    """Service that loads yield model artifacts and runs inference."""

    def __init__(self) -> None:
        self.model = None
        self.scaler = None
        self.crop_encoder = None
        self.soil_encoder = None
        self.irrigation_encoder = None
        self.fertilizer_encoder = None
        self.model_loaded = False
        self.crops: List[str] = []
        self.soil_types: List[str] = []
        self.irrigation_types: List[str] = []
        self.fertilizers: List[str] = []
        self.crop_mean_yield: Dict[str, float] = {}
        self.data_source = ""
        self._load_models()

    def _load_models(self) -> None:
        try:
            with open(ML_DIR / "yield_rf.pkl", "rb") as model_file:
                self.model = pickle.load(model_file)

            # Avoid Windows multiprocessing/thread-pool permission failures during API inference.
            if hasattr(self.model, "n_jobs"):
                self.model.n_jobs = 1

            with open(ML_DIR / "yield_scaler.pkl", "rb") as scaler_file:
                self.scaler = pickle.load(scaler_file)

            with open(ML_DIR / "yield_encoders.pkl", "rb") as encoder_file:
                encoders = pickle.load(encoder_file)

            if not isinstance(encoders, dict):
                raise ValueError("Yield encoders file is not a dict")

            self.crop_encoder = encoders.get("crop")
            self.soil_encoder = encoders.get("soil")
            self.irrigation_encoder = encoders.get("irrigation")
            self.fertilizer_encoder = encoders.get("fertilizer")

            if not all(
                [
                    self.crop_encoder,
                    self.soil_encoder,
                    self.irrigation_encoder,
                    self.fertilizer_encoder,
                ]
            ):
                raise ValueError("Required label encoders missing in yield_encoders.pkl")

            self.crops = [str(item) for item in encoders.get("crops") or self.crop_encoder.classes_]
            self.soil_types = [str(item) for item in encoders.get("soils") or self.soil_encoder.classes_]
            self.irrigation_types = [
                str(item) for item in encoders.get("irrigations") or self.irrigation_encoder.classes_
            ]
            self.fertilizers = [
                str(item) for item in encoders.get("fertilizers") or self.fertilizer_encoder.classes_
            ]
            self.crop_mean_yield = {
                str(crop): float(value)
                for crop, value in dict(encoders.get("crop_mean_yield", {})).items()
            }
            self.data_source = str(encoders.get("data_source", ""))

            self.model_loaded = True
            logger.info("Yield model, scaler, and encoders loaded successfully")
        except FileNotFoundError as exc:
            logger.error("Yield artifacts missing: %s", exc)
            self.model_loaded = False
        except Exception as exc:
            logger.exception("Failed to initialize yield service: %s", exc)
            self.model_loaded = False

    @staticmethod
    def _match_label(value: str, options: List[str], label_name: str) -> str:
        if not value:
            raise ValueError(f"{label_name} is required.")

        for option in options:
            if option.lower() == value.strip().lower():
                return option

        raise ValueError(f"Invalid {label_name}. Choose one of: {', '.join(options)}")

    def predict(self, request: YieldPredictRequest) -> Dict[str, object]:
        if not self.model_loaded or not self.model or not self.scaler:
            raise RuntimeError("Yield model is not loaded")

        crop = self._match_label(request.crop, self.crops, "crop")
        soil = self._match_label(request.soil_type, self.soil_types, "soil type")
        irrigation = self._match_label(
            request.irrigation_type,
            self.irrigation_types,
            "irrigation type",
        )
        fertilizer = self._match_label(
            request.fertilizer_used,
            self.fertilizers,
            "fertilizer",
        )

        crop_encoded = int(self.crop_encoder.transform([crop])[0])
        soil_encoded = int(self.soil_encoder.transform([soil])[0])
        irrigation_encoded = int(self.irrigation_encoder.transform([irrigation])[0])
        fertilizer_encoded = int(self.fertilizer_encoder.transform([fertilizer])[0])

        # Expected feature order used during training:
        # [crop, soil_type, irrigation_type, fertilizer_used, nitrogen, phosphorous, potassium]
        features = np.array(
            [
                [
                    crop_encoded,
                    soil_encoded,
                    irrigation_encoded,
                    fertilizer_encoded,
                    float(request.nitrogen),
                    float(request.phosphorous),
                    float(request.potassium),
                ]
            ],
            dtype=float,
        )

        try:
            scaled_features = self.scaler.transform(features)
            yield_factor = max(0.0, float(self.model.predict(scaled_features)[0]))
            crop_average = self.crop_mean_yield.get(crop, 1.0)
            yield_per_acre = yield_factor * crop_average
            total_yield = yield_per_acre * float(request.farm_size_acres)

            return {
                "crop": crop,
                "farm_size_acres": float(request.farm_size_acres),
                "soil_type": soil,
                "irrigation_type": irrigation,
                "fertilizer_used": fertilizer,
                "predicted_yield_per_acre": round(yield_per_acre, 1),
                "total_yield": round(total_yield, 1),
                "unit": "maunds/acre",
                "total_unit": "maunds",
            }
        except Exception as exc:
            logger.exception("Yield prediction failed: %s", exc)
            raise RuntimeError(f"Prediction failed: {exc}") from exc


yield_service = YieldService()
