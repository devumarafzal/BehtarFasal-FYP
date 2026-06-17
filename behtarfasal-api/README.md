# BehtarFasal API

FastAPI backend for crop recommendation using your trained RandomForest model and scaler artifacts.

## Stack

- Python 3.10+
- FastAPI
- scikit-learn 1.8.0
- Pydantic v2
- numpy
- python-dotenv

## Project Layout

```text
behtarfasal-api/
├── app/
│   ├── main.py
│   ├── ml/
│   │   ├── model.pkl
│   │   ├── standscaler.pkl
│   │   ├── minmaxscaler.pkl
│   │   └── crop_map.pkl
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── requirements.txt
└── .env
```

## Setup

```bash
# Recommended on Windows for reproducible installs:
py -3.11 -m venv venv

# Or with your active Python interpreter:
# python -m venv venv

source venv/bin/activate       # Windows: venv\Scripts\activate
python -m pip install -r requirements.txt --index-url https://pypi.org/simple

# Make sure these files exist in app/ml/:
# model.pkl, standscaler.pkl, minmaxscaler.pkl, crop_map.pkl

# For the real-time chatbot, create behtarfasal-api/.env:
# GEMINI_API_KEY=your_google_gemini_key
# GEMINI_MODEL=gemini-2.5-flash

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

If you use Python 3.13, avoid pinning very old pydantic versions because they may try to build `pydantic-core` from source and require MSVC build tools.

If you see a warning like `Numpy built with MINGW-W64 ... experimental`, reinstall NumPy from an official wheel:

```bash
python -m pip uninstall -y numpy
python -m pip install --only-binary=:all: "numpy>=2.2,<3"
```

If that still fails on your machine, create the venv with Python 3.11 (`py -3.11 -m venv venv`) and reinstall requirements.

## Endpoints

| Method | Endpoint        | Description                |
| ------ | --------------- | -------------------------- |
| GET    | /health         | Check API and model status |
| POST   | /crop/recommend | Get crop recommendation    |
| POST   | /chat/          | Ask the real-time Gemini chatbot |
| GET    | /docs           | Swagger UI                 |

## Request Examples

### Prompt-format request

```json
{
  "nitrogen": "High",
  "phosphorus": "Medium",
  "potassium": "Medium",
  "temperature": 25.0,
  "humidity": 80.0,
  "ph": 6.5,
  "rainfall": 200.0
}
```

### Frontend-format request (currently used by mobile app)

```json
{
  "soil_type": "Loamy",
  "ph_level": 6.5,
  "nitrogen": 95,
  "phosphorus": 45,
  "potassium": 80,
  "province": "Punjab",
  "farm_size": 10
}
```

## Response Example

```json
{
  "success": true,
  "data": {
    "crop_name": "rice",
    "confidence": 94.0,
    "reason": "Rice is recommended because your farm conditions show high nitrogen (120 kg/ha), high humidity (80%), and good rainfall (200mm), which are suitable for this crop in Pakistan. This humidity and moisture profile strongly supports water-loving crops.",
    "best_planting_time": "June to July (Kharif season)",
    "expected_yield_per_acre": "30-40 maunds per acre",
    "expected_yield": "30-40 maunds per acre",
    "alternative_crops": ["jute", "cotton"]
  },
  "message": "Crop recommendation generated successfully",
  "crop_name": "rice",
  "confidence": 94.0,
  "reason": "Rice is recommended because your farm conditions show high nitrogen (120 kg/ha), high humidity (80%), and good rainfall (200mm), which are suitable for this crop in Pakistan. This humidity and moisture profile strongly supports water-loving crops.",
  "best_planting_time": "June to July (Kharif season)",
  "expected_yield": "30-40 maunds per acre",
  "alternative_crops": ["jute", "cotton"]
}
```

## Notes

- Feature order is fixed: [N, P, K, temperature, humidity, ph, rainfall].
- StandardScaler is always applied before model prediction.
- API returns 503 when model files are not loaded and 500 for prediction failures.

## Run Checklist

1. Place all 4 model files in app/ml/.
2. Run `pip install -r requirements.txt`.
3. Run `uvicorn app.main:app --reload --port 8000`.
4. Check `http://localhost:8000/health` and confirm model_loaded is true.
5. Test prediction at `http://localhost:8000/docs`.
