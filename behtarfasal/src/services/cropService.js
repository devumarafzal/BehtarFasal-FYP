export const getCropRecommendation = async (farmData) => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/crop/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Failed to get crop recommendation');
  }

  return data;
};
