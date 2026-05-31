import logging
import pickle
from pathlib import Path
from typing import Dict, List

import numpy as np

from app.models.fertilizer_model import FertilizerRecommendRequest

logger = logging.getLogger(__name__)

ML_DIR = Path(__file__).resolve().parent.parent / "ml"


class FertilizerService:
    """Service that loads fertilizer model artifacts and runs inference."""

    def __init__(self) -> None:
        self.model = None
        self.scaler = None
        self.soil_encoder = None
        self.crop_encoder = None
        self.fertilizer_encoder = None
        self.model_loaded = False
        self.soil_types: List[str] = []
        self.crop_types: List[str] = []
        self.fertilizer_labels: List[str] = []
        self._load_models()

    def _load_models(self) -> None:
        try:
            with open(ML_DIR / "fertilizer_rf.pkl", "rb") as model_file:
                self.model = pickle.load(model_file)

            with open(ML_DIR / "fertilizer_scaler.pkl", "rb") as scaler_file:
                self.scaler = pickle.load(scaler_file)

            with open(ML_DIR / "fertilizer_encoders.pkl", "rb") as encoder_file:
                encoders = pickle.load(encoder_file)

            if not isinstance(encoders, dict):
                raise ValueError("Fertilizer encoders file is not a dict")

            self.soil_encoder = encoders.get("soil")
            self.crop_encoder = encoders.get("crop")
            self.fertilizer_encoder = encoders.get("fertilizer")

            if not self.soil_encoder or not self.crop_encoder or not self.fertilizer_encoder:
                raise ValueError("Required label encoders missing in fertilizer_encoders.pkl")

            self.soil_types = [str(item) for item in encoders.get("soil_types") or self.soil_encoder.classes_]
            self.crop_types = [str(item) for item in encoders.get("crop_types") or self.crop_encoder.classes_]
            self.fertilizer_labels = [
                str(item) for item in encoders.get("fertilizers") or self.fertilizer_encoder.classes_
            ]

            self.model_loaded = True
            logger.info("Fertilizer model, scaler, and encoders loaded successfully")
        except FileNotFoundError as exc:
            logger.error("Fertilizer artifacts missing: %s", exc)
            self.model_loaded = False
        except Exception as exc:
            logger.exception("Failed to initialize fertilizer service: %s", exc)
            self.model_loaded = False

    @staticmethod
    def _match_label(value: str, options: List[str], label_name: str) -> str:
        if not value:
            raise ValueError(f"{label_name} is required.")

        for option in options:
            if option.lower() == value.strip().lower():
                return option

        raise ValueError(f"Invalid {label_name}. Choose one of: {', '.join(options)}")

    def predict(self, request: FertilizerRecommendRequest) -> Dict[str, object]:
        if not self.model_loaded or not self.model or not self.scaler:
            raise RuntimeError("Fertilizer model is not loaded")

        soil = self._match_label(request.soil_type, self.soil_types, "soil type")
        crop = self._match_label(request.crop_type, self.crop_types, "crop type")

        soil_encoded = int(self.soil_encoder.transform([soil])[0])
        crop_encoded = int(self.crop_encoder.transform([crop])[0])

        temperature = float(request.temperature)
        humidity = float(request.humidity)
        moisture = float(request.moisture)
        nitrogen = float(request.nitrogen)
        potassium = float(request.potassium)
        phosphorus = float(request.phosphorus)

        # Expected feature order used during training:
        # [temperature, humidity, moisture, soil_type, crop_type, nitrogen, potassium, phosphorus]
        features = np.array(
            [[temperature, humidity, moisture, soil_encoded, crop_encoded, nitrogen, potassium, phosphorus]],
            dtype=float,
        )

        try:
            scaled_features = self.scaler.transform(features)
            predicted_class = int(self.model.predict(scaled_features)[0])

            probabilities = getattr(self.model, "predict_proba", lambda _: None)(scaled_features)
            if probabilities is None:
                fertilizer_label = self.fertilizer_encoder.inverse_transform([predicted_class])[0]
                return {
                    "fertilizer": str(fertilizer_label),
                    "confidence": 0.0,
                    "soil_type": soil,
                    "crop_type": crop,
                    "top_recommendations": [],
                }

            probabilities = probabilities[0]
            classes = np.array(
                getattr(self.model, "classes_", np.arange(len(probabilities))),
                dtype=int,
            )

            class_probabilities = {
                int(label): float(probabilities[idx]) for idx, label in enumerate(classes)
            }

            sorted_classes = sorted(
                class_probabilities.keys(),
                key=lambda cls_label: class_probabilities[cls_label],
                reverse=True,
            )

            top_recommendations: List[Dict[str, object]] = []
            for cls_label in sorted_classes[:3]:
                label = self.fertilizer_encoder.inverse_transform([cls_label])[0]
                top_recommendations.append(
                    {
                        "fertilizer": str(label),
                        "confidence": round(class_probabilities[cls_label] * 100, 2),
                    }
                )

            primary = top_recommendations[0]
            return {
                "fertilizer": primary["fertilizer"],
                "confidence": float(primary["confidence"]),
                "soil_type": soil,
                "crop_type": crop,
                "top_recommendations": top_recommendations,
            }
        except Exception as exc:
            logger.exception("Fertilizer prediction failed: %s", exc)
            raise RuntimeError(f"Prediction failed: {exc}") from exc


fertilizer_service = FertilizerService()
