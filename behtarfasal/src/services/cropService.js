import { getApiBaseUrl, getNetworkErrorMessage } from "./apiConfig";

const API_URL = getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, 8000);

export const getCropRecommendation = async (farmData) => {
  let response;

  try {
    response = await fetch(`${API_URL}/crop/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nitrogen: Number(farmData.nitrogen),
        phosphorus: Number(farmData.phosphorus),
        potassium: Number(farmData.potassium),
        temperature: Number(farmData.temperature),
        humidity: Number(farmData.humidity),
        ph: Number(farmData.ph),
        rainfall: Number(farmData.rainfall),
      }),
    });
  } catch (_error) {
    throw new Error(getNetworkErrorMessage("Crop recommendation", API_URL));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || "Failed to get crop recommendation",
    );
  }

  return data;
};
