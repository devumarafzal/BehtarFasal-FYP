# BehtarFasal Monorepo

BehtarFasal is an AI-powered farming assistant for Pakistani farmers. This repo contains the mobile app, the main FastAPI backend, and a separate disease detection backend.

## Projects

| Path | Description | Default Port |
| --- | --- | --- |
| behtarfasal/ | Expo React Native app | 8081 (Metro/Expo) |
| behtarfasal-api/ | Main API: crop, fertilizer, yield, chat (FastAPI) | 8000 |
| behtarfasal-disease-api/ | Plant disease detection API (FastAPI) | 8001 |

## Features

- Farm profile management with soil, NPK, weather, crop practice, and irrigation details.
- Crop recommendation, fertilizer recommendation, and yield prediction.
- Disease detection from leaf images with treatment recommendations and prevention tips.
- Weather, chatbot, and farming calendar tools.
- Firebase authentication, profile editing, and password change.

## Quick Start (Local)

1) Mobile app
- cd behtarfasal
- npm install
- Create .env based on behtarfasal/README.md
- npm start

2) Main API
- cd behtarfasal-api
- python -m venv venv
- venv\Scripts\activate (Windows) / source venv/bin/activate (macOS/Linux)
- pip install -r requirements.txt
- uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

3) Disease API
- cd behtarfasal-disease-api
- python -m venv myvenv
- myvenv\Scripts\activate (Windows) / source myvenv/bin/activate (macOS/Linux)
- pip install -r requirements.txt
- Ensure the model folder exists at app/ml/disease_model/
- uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

## Environment Variables

### Mobile App (behtarfasal/.env)

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| EXPO_PUBLIC_FIREBASE_API_KEY | Yes | Firebase API key | your_key_here |
| EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | Yes | Firebase Auth domain | your_project.firebaseapp.com |
| EXPO_PUBLIC_FIREBASE_PROJECT_ID | Yes | Firebase project ID | your_project_id |
| EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET | Yes | Firebase storage bucket | your_project.appspot.com |
| EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Yes | Firebase sender ID | your_sender_id |
| EXPO_PUBLIC_FIREBASE_APP_ID | Yes | Firebase app ID | your_app_id |
| EXPO_PUBLIC_WEATHER_API_KEY | Yes | OpenWeatherMap API key | your_openweathermap_key |
| EXPO_PUBLIC_GEMINI_API_KEY | Yes | Google Gemini API key | your_gemini_api_key |
| EXPO_PUBLIC_API_URL | Yes | Base URL for main API | http://localhost:8000 |
| EXPO_PUBLIC_DISEASE_API_URL | Yes | Base URL for disease API | http://localhost:8001 |

### Main API (behtarfasal-api)

`GEMINI_API_KEY` is required for chatbot features. Make sure crop, fertilizer, and yield model artifacts exist in `app/ml/` as described in the service README.

### Disease API (behtarfasal-disease-api)

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| DISEASE_MODEL_DIR | No | Override path to model folder | ..\behtarfasal-api\app\ml\disease_model |

## Documentation

- behtarfasal/README.md
- behtarfasal-api/README.md
- behtarfasal-disease-api/README.md
