# BehtarFasal Disease API

Plant disease detection service using a fine-tuned MobileNetV2 model.

## Setup

1) Use Python 3.11 or 3.12 for this service to avoid PyTorch wheel issues on Windows.

2) Create a virtual environment and install dependencies:

```bash
python -m venv myvenv
myvenv\Scripts\activate
pip install -r requirements.txt
```

3) Place the model folder at:

```
app/ml/disease_model/
```

If you want to keep the model in the main API folder instead, set an environment variable:

```
DISEASE_MODEL_DIR=..\behtarfasal-api\app\ml\disease_model
```

4) Run the service:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## API

Health check:
```
GET /health
```

Disease detection:
```
POST /disease/detect?top_k=3
Content-Type: multipart/form-data
file=@leaf.jpg
```

Example:
```bash
curl -X POST "http://localhost:8001/disease/detect?top_k=3" -F "file=@leaf.jpg"
```
