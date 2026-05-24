import logging
import pickle
from pathlib import Path
from typing import Dict, List, Union

import numpy as np

from app.models.crop_model import CropRecommendRequest, NutrientLevel
from app.utils.helpers import (
    build_reason,
    convert_nutrient_level,
    get_expected_yield,
    get_planting_time,
)

logger = logging.getLogger(__name__)

CROP_MAP: Dict[int, str] = {
    1: "rice",
    2: "maize",
    3: "chickpea",
    4: "kidneybeans",
    5: "pigeonpeas",
    6: "mothbeans",
    7: "mungbean",
    8: "blackgram",
    9: "lentil",
    10: "pomegranate",
    11: "banana",
    12: "mango",
    13: "grapes",
    14: "watermelon",
    15: "muskmelon",
    16: "apple",
    17: "orange",
    18: "papaya",
    19: "coconut",
    20: "cotton",
    21: "jute",
    22: "coffee",
}

ML_DIR = Path(__file__).resolve().parent.parent / "ml"


class CropService:
    """Service that loads ML artifacts and runs crop recommendation inference."""

    def __init__(self) -> None:
        self.model = None
        self.scaler = None
        self.crop_map: Dict[int, str] = CROP_MAP
        self.model_loaded = False
        self._load_models()

    @staticmethod
    def _normalize_crop_map(raw_map: object) -> Dict[int, str]:
        """Ensure crop map keys are integers and values are lowercase names."""
        if not isinstance(raw_map, dict):
            return CROP_MAP

        normalized: Dict[int, str] = {}
        for key, value in raw_map.items():
            try:
                normalized[int(key)] = str(value).strip().lower()
            except (TypeError, ValueError):
                continue

        return normalized or CROP_MAP

    @staticmethod
    def _normalize_nutrient(value: Union[NutrientLevel, int, float, str]) -> int:
        """Convert nutrient values from enum/text/numeric input to integer kg/ha."""
        if isinstance(value, NutrientLevel):
            return convert_nutrient_level(value.value)

        if isinstance(value, str):
            stripped = value.strip()
            if stripped.lower() in {"low", "medium", "high"}:
                return convert_nutrient_level(stripped)
            try:
                return int(round(float(stripped)))
            except ValueError as exc:
                raise ValueError("Invalid nutrient value") from exc

        if isinstance(value, (int, float)):
            return int(round(float(value)))

        raise ValueError("Unsupported nutrient type")

    def _load_models(self) -> None:
        """Load model, scaler, and crop map from app/ml using pickle."""
        try:
            with open(ML_DIR / "model.pkl", "rb") as model_file:
                self.model = pickle.load(model_file)

            with open(ML_DIR / "standscaler.pkl", "rb") as scaler_file:
                self.scaler = pickle.load(scaler_file)

            try:
                with open(ML_DIR / "crop_map.pkl", "rb") as crop_map_file:
                    loaded_map = pickle.load(crop_map_file)
                    self.crop_map = self._normalize_crop_map(loaded_map)
            except FileNotFoundError:
                logger.warning("crop_map.pkl missing; using fallback map")
                self.crop_map = CROP_MAP

            self.model_loaded = True
            logger.info("Model, scaler, and crop map loaded successfully")
        except FileNotFoundError as exc:
            logger.error("ML artifact missing: %s", exc)
            self.model_loaded = False
        except Exception as exc:
            logger.exception("Failed to initialize ML service: %s", exc)
            self.model_loaded = False

    def predict(self, request: CropRecommendRequest) -> dict:
        """
        Run crop recommendation prediction.

        The model expects features in this exact order:
        [N, P, K, temperature, humidity, ph, rainfall]
        """
        if not self.model_loaded or self.model is None or self.scaler is None:
            raise RuntimeError("ML model is not loaded")

        n = int(self._normalize_nutrient(request.nitrogen))
        p = int(self._normalize_nutrient(request.phosphorus))
        k = int(self._normalize_nutrient(request.potassium))

        temp = float(request.temperature if request.temperature is not None else 25.0)
        humidity = float(request.humidity if request.humidity is not None else 60.0)
        ph = float(request.ph if request.ph is not None else 6.5)
        rainfall = float(request.rainfall if request.rainfall is not None else 100.0)

        if not (0 <= n <= 140):
            raise ValueError("Nitrogen must be between 0 and 140.")
        if not (0 <= p <= 145):
            raise ValueError("Phosphorus must be between 0 and 145.")
        if not (7 <= k <= 210):
            raise ValueError("Potassium must be between 7 and 210.")
        if not (0.0 <= temp <= 42.0):
            raise ValueError("Temperature must be between 0 and 42 C.")
        if not (14.0 <= humidity <= 98.0):
            raise ValueError("Humidity must be between 14 and 98%.")
        if not (3.5 <= ph <= 8.0):
            raise ValueError("pH must be between 3.5 and 8.0.")
        if not (20.0 <= rainfall <= 300.0):
            raise ValueError("Rainfall must be between 20 and 300 mm.")

        features = np.array([[n, p, k, temp, humidity, ph, rainfall]], dtype=float)

        try:
            scaled_features = self.scaler.transform(features)
            predicted_class = int(self.model.predict(scaled_features)[0])

            probabilities = self.model.predict_proba(scaled_features)[0]
            classes = np.array(
                getattr(self.model, "classes_", np.arange(1, len(probabilities) + 1)),
                dtype=int,
            )

            class_probabilities = {
                int(label): float(probabilities[idx]) for idx, label in enumerate(classes)
            }

            sorted_classes: List[int] = sorted(
                class_probabilities.keys(),
                key=lambda cls_label: class_probabilities[cls_label],
                reverse=True,
            )

            top_recommendations: List[Dict[str, Union[str, float]]] = []
            for cls_label in sorted_classes[:3]:
                name = self.crop_map.get(cls_label, CROP_MAP.get(cls_label, "unknown"))
                top_recommendations.append(
                    {
                        "crop_name": name,
                        "confidence": round(class_probabilities[cls_label] * 100, 1),
                    }
                )

            if not top_recommendations:
                top_recommendations = [
                    {
                        "crop_name": self.crop_map.get(
                            predicted_class,
                            CROP_MAP.get(predicted_class, "unknown"),
                        ),
                        "confidence": round(
                            class_probabilities.get(predicted_class, max(probabilities)) * 100,
                            1,
                        ),
                    }
                ]

            crop_name = str(top_recommendations[0]["crop_name"])
            confidence = float(top_recommendations[0]["confidence"])

            alternative_crops: List[str] = []
            for recommendation in top_recommendations[1:3]:
                alt_name = str(recommendation["crop_name"])
                if alt_name and alt_name not in alternative_crops and alt_name != crop_name:
                    alternative_crops.append(alt_name)

            reason = build_reason(crop_name, n, p, k, ph, temp, humidity, rainfall)
            expected_yield = get_expected_yield(crop_name)

            return {
                "crop_name": crop_name,
                "confidence": confidence,
                "reason": reason,
                "best_planting_time": get_planting_time(crop_name),
                "expected_yield_per_acre": expected_yield,
                "expected_yield": expected_yield,
                "alternative_crops": alternative_crops,
                "top_recommendations": top_recommendations,
            }
        except Exception as exc:
            logger.exception("Prediction failure: %s", exc)
            raise RuntimeError(f"Prediction failed: {exc}") from exc


crop_service = CropService()
