import logging
from typing import Dict, List

import torch
from PIL import Image
from transformers import AutoModelForImageClassification

try:
    from transformers import AutoImageProcessor

    IMAGE_PROCESSOR = AutoImageProcessor
except ImportError:
    from transformers import AutoFeatureExtractor

    IMAGE_PROCESSOR = AutoFeatureExtractor

logger = logging.getLogger(__name__)

# Auto-downloads from HuggingFace Hub at container startup instead of loading
# from a local folder. Avoids Git/Git-LFS file corruption issues entirely —
# the model is fetched fresh from HF's CDN and cached for this container's lifetime.
MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"


class DiseaseService:
    """Service that loads the plant disease model and runs image inference."""

    def __init__(self) -> None:
        self.model = None
        self.processor = None
        self.id2label: Dict[str, str] = {}
        self.model_loaded = False
        self.model_name = "mobilenet_v2_1.0_224-plant-disease-identification"
        self.num_labels = 0
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._load_model()

    def _load_model(self) -> None:
        try:
            logger.info("Downloading disease model from HuggingFace: %s", MODEL_ID)
            self.processor = IMAGE_PROCESSOR.from_pretrained(MODEL_ID)
            self.model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
            self.model.to(self.device)
            self.model.eval()
            self.id2label = self.model.config.id2label or {}
            self.num_labels = len(self.id2label)
            self.model_loaded = True
            logger.info("Disease model loaded successfully from HuggingFace (%s classes)", self.num_labels)
        except Exception as exc:
            logger.exception("Failed to load disease model: %s", exc)
            self.model_loaded = False

    def _resolve_label(self, idx: int) -> str:
        label = self.id2label.get(str(idx)) or self.id2label.get(idx)
        return str(label) if label else f"class_{idx}"

    def predict(self, image: Image.Image, top_k: int = 3) -> dict:
        if not self.model_loaded or self.model is None or self.processor is None:
            raise RuntimeError("Disease model is not loaded")

        if image.mode != "RGB":
            image = image.convert("RGB")

        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {key: tensor.to(self.device) for key, tensor in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            probabilities = torch.softmax(outputs.logits, dim=1)[0]

        top_k = max(1, min(top_k, probabilities.shape[0]))
        values, indices = torch.topk(probabilities, k=top_k)

        predictions: List[dict] = []
        for score, idx in zip(values.tolist(), indices.tolist()):
            predictions.append(
                {
                    "label": self._resolve_label(int(idx)),
                    "confidence": round(float(score) * 100, 2),
                }
            )

        primary = predictions[0]
        return {
            "label": primary["label"],
            "confidence": primary["confidence"],
            "top_predictions": predictions,
        }


disease_service = DiseaseService()
