const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getFertilizerRecommendation = async (payload) => {
  const response = await fetch(`${API_URL}/fertilizer/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Unable to get fertilizer suggestion.');
  }

  return data;
};
