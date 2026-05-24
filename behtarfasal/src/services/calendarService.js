import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
];

const shouldTryAnotherModel = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('404') ||
    message.includes('not found for api version') ||
    message.includes('not supported for generatecontent')
  );
};

const generateWithModelFallback = async (prompt) => {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      if (!shouldTryAnotherModel(error)) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to access a supported Gemini model. Tried: ${MODEL_CANDIDATES.join(', ')}. Last error: ${lastError?.message || 'Unknown error.'}`
  );
};

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;

  if (month >= 3 && month <= 5) {
    return 'Spring (Rabi harvest / Kharif preparation)';
  }
  if (month >= 6 && month <= 9) {
    return 'Summer/Monsoon (Kharif season)';
  }
  if (month >= 10 && month <= 11) {
    return 'Autumn (Rabi planting)';
  }
  return 'Winter (Rabi growing season)';
};

const parseCalendarResponse = (text) => {
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Invalid calendar response format from Gemini');
  }

  return JSON.parse(cleaned.slice(start, end + 1));
};

export const generateFarmingCalendar = async (farm) => {
  if (!genAI) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');
  }

  const selectedCrop = String(farm?.selectedCrop || '').trim();
  if (!selectedCrop) {
    throw new Error('Selected crop is required to generate a complete calendar.');
  }

  const prompt = `
You are an expert agricultural advisor for Pakistani farmers.
Generate a complete crop-cycle farming timeline (not a 7-day schedule) for the following farm and crop.

Farm Name: ${farm.farmName}
Location: ${farm.district}, ${farm.province}, Pakistan
Farm Size: ${farm.sizeAcres} acres
Selected Crop: ${selectedCrop}
Soil Type: ${farm.soilType}
pH Level: ${farm.phLevel}
Nitrogen: ${farm.nitrogen}, Phosphorus: ${farm.phosphorus}, Potassium: ${farm.potassium}
Cropping System: ${farm.croppingSystem}
Irrigation: ${(farm.irrigationFacilities || []).join(', ')}
Current Season: ${getCurrentSeason()}

Return a JSON array of 12 to 24 objects that cover the full crop cycle from pre-sowing to post-harvest.
Each object must follow this schema:
{
  "sequence": 1,
  "title": "Land preparation",
  "category": "Preparation | Irrigation | Sowing | Nutrition | Pest Control | Harvest | Post-harvest",
  "date": "2026-02-03",
  "phase": "Pre-sowing | Soil preparation | Sowing | Vegetative growth | Flowering/Fruiting | Harvest | Post-harvest",
  "period": "Week 1-2" or "Month 1" style range,
  "mainTask": "task description",
  "description": "short preview text",
  "details": "full detailed instruction",
  "secondaryTask": "optional task or null",
  "bestTime": "Morning" | "Afternoon" | "Evening",
  "taskType": "irrigation" | "planting" | "fertilizer" | "pesticide" | "harvesting" | "general",
  "tip": "short farming tip for this day"
}

Rules:
- Do not return weekly Monday-Sunday output.
- Include stage-specific fertilizer, irrigation, pest control, and harvest guidance for ${selectedCrop} in Pakistan.
- Keep tasks practical for local farmers.
- Keep sequence strictly increasing from 1.
- Include realistic date progression from sowing to harvest.
- Only return JSON array with no extra text.
  `;

  const text = await generateWithModelFallback(prompt);
  const parsed = parseCalendarResponse(text);

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response is not an array');
  }

  if (parsed.length < 8) {
    throw new Error('Gemini response did not provide a complete crop-cycle timeline.');
  }

  return parsed;
};

export { getCurrentSeason };

