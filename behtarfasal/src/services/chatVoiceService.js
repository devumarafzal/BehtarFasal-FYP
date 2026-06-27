import { getApiBaseUrl, getNetworkErrorMessage } from "./apiConfig";

const API_URL = getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, 8000);

const getAudioFileMeta = (uri) => {
  const lowerUri = String(uri || "").toLowerCase();

  if (lowerUri.endsWith(".3gp")) {
    return { name: "voice-message.3gp", type: "audio/3gpp" };
  }

  if (lowerUri.endsWith(".webm")) {
    return { name: "voice-message.webm", type: "audio/webm" };
  }

  if (lowerUri.endsWith(".wav")) {
    return { name: "voice-message.wav", type: "audio/wav" };
  }

  return { name: "voice-message.m4a", type: "audio/mp4" };
};

export const transcribeVoiceMessage = async (uri) => {
  if (!uri) {
    throw new Error("Voice recording file nahi mil saki. Please try again.");
  }

  const fileMeta = getAudioFileMeta(uri);
  const formData = new FormData();

  formData.append("file", {
    uri,
    name: fileMeta.name,
    type: fileMeta.type,
  });

  let response;

  try {
    response = await fetch(`${API_URL}/chat/transcribe`, {
      method: "POST",
      body: formData,
    });
  } catch (_error) {
    throw new Error(getNetworkErrorMessage("Voice transcription", API_URL));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Voice samajh nahi aa saki.");
  }

  const text = String(data?.text || "").trim();

  if (!text) {
    throw new Error("Voice samajh nahi aa saki. Please dobara bol kar try karein.");
  }

  return text;
};
