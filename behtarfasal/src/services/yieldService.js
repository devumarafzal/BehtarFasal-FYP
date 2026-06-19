import { getApiBaseUrl, getNetworkErrorMessage } from './apiConfig';

const API_URL = getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, 8000);

export const getYieldOptions = async () => {
  let response;

  try {
    response = await fetch(`${API_URL}/yield/options`);
  } catch (_error) {
    throw new Error(getNetworkErrorMessage('Yield prediction', API_URL));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Unable to load yield options.');
  }

  return data;
};

export const predictYield = async (payload) => {
  let response;

  try {
    response = await fetch(`${API_URL}/yield/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_error) {
    throw new Error(getNetworkErrorMessage('Yield prediction', API_URL));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || 'Unable to predict yield.');
  }

  return data;
};
