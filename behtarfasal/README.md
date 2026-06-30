# BehtarFasal

BehtarFasal is an AI-powered farming assistant mobile app for Pakistani farmers.

## Tech Stack

- React Native (Expo)
- React Navigation (Stack + Bottom Tabs)
- Firebase (Auth + Firestore + Storage)
- FastAPI backends for crop, fertilizer, yield, chat, and disease detection
- OpenWeatherMap API for weather
- Google Gemini API for chatbot and weekly farming calendar

## Current Features

- Firebase login, registration, logout, profile editing, and password change.
- Farm profile setup with location, soil, NPK, weather, cropping, and irrigation details.
- Crop recommendation, fertilizer suggestion, and yield prediction.
- Disease detection from leaf images with severity, treatment recommendations, and prevention tips.
- Weather, chatbot, and farming calendar tools.

## Project Structure

```text
.
├── App.jsx
├── src/
│   ├── components/
│   ├── constants/
│   ├── firebase/
│   ├── navigation/
│   ├── screens/
│   └── services/
└── .env
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables in `.env`

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_WEATHER_API_KEY=your_openweathermap_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
EXPO_PUBLIC_DISEASE_API_URL=http://YOUR_COMPUTER_IP:8001
```

3. Start the app

```bash
npm run start:lan
```

For physical phone testing:

- Use `npm run start:lan`, then scan the LAN QR code in Expo Go.
- Do not start Expo with `--localhost` on a physical phone. The phone will try to download the app from itself and can show `java.io.IOException: Failed to download remote update`.
- Keep your phone and computer on the same Wi-Fi network.
- Use your computer's Wi-Fi IP in `.env`, run both APIs with `--host 0.0.0.0`, and allow Windows Firewall inbound access for ports `8000`, `8001`, and Expo's Metro port.
- If LAN is blocked by your network, use `npm run start:tunnel` instead.

After changing `.env`, restart Expo with cache clear:

```bash
npm run start:lan
```

## Scripts

- `npm start` - start Expo on LAN for Expo Go
- `npm run start:lan` - start Expo on LAN and clear cache
- `npm run start:tunnel` - start Expo through a tunnel if LAN is blocked
- `npm run start:local` - start Expo for local-only testing
- `npm run android` - start on Android
- `npm run ios` - start on iOS
- `npm run web` - start web target
- `npm run lint` - run lint checks
