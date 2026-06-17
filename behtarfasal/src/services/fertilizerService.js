import { getApiBaseUrl, getNetworkErrorMessage } from './apiConfig';

const API_URL = getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, 8000);

export const getFertilizerRecommendation = async (payload) => {
  let response;

  try {
    response = await fetch(`${API_URL}/fertilizer/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_error) {
    throw new Error(getNetworkErrorMessage('Fertilizer', API_URL));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Unable to get fertilizer suggestion.');
  }

  return data;
};
