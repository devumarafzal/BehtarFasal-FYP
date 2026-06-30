import { getApiBaseUrl, getNetworkErrorMessage } from "./apiConfig";

const API_URL = getApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, 8000);
const VOICE_ERROR_FALLBACK =
  "Voice service abhi available nahi hai. Please sawal type kar dein ya thori dair baad try karein.";

const getAudioFileMeta = (uri) => {
  const lowerUri = String(uri || "").split("?")[0].toLowerCase();

  if (lowerUri.endsWith(".3gp")) {
    return { name: "voice-message.3gp", type: "audio/3gpp" };
  }

  if (lowerUri.endsWith(".webm")) {
    return { name: "voice-message.webm", type: "audio/webm" };
  }

  if (lowerUri.endsWith(".wav")) {
    return { name: "voice-message.wav", type: "audio/wav" };
  }

  if (lowerUri.endsWith(".aac")) {
    return { name: "voice-message.aac", type: "audio/aac" };
  }

  if (lowerUri.endsWith(".mp3") || lowerUri.endsWith(".mpeg")) {
    return { name: "voice-message.mp3", type: "audio/mpeg" };
  }

  if (lowerUri.endsWith(".ogg")) {
    return { name: "voice-message.ogg", type: "audio/ogg" };
  }

  return { name: "voice-message.m4a", type: "audio/mp4" };
};

const normalizeVoiceErrorMessage = (value) => {
  const detail = String(value || "")
    .replace(/^Voice transcription service error:\s*/i, "")
    .trim();

  if (!detail) {
    return "Voice samajh nahi aa saki.";
  }

  const lowerDetail = detail.toLowerCase();
  const containsProviderError =
    lowerDetail.includes("httperror") ||
    lowerDetail.includes("generativelanguage") ||
    lowerDetail.includes("googleapis") ||
    lowerDetail.includes("google.rpc") ||
    lowerDetail.includes("api_key") ||
    lowerDetail.includes("api key") ||
    lowerDetail.includes("gemini") ||
    lowerDetail.includes("redacted");

  return containsProviderError ? VOICE_ERROR_FALLBACK : detail;
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
    const detail = normalizeVoiceErrorMessage(data?.detail || data?.message);
    throw new Error(detail || "Voice samajh nahi aa saki.");
  }

  const text = String(data?.text || "").trim();

  if (!text) {
    throw new Error("Voice samajh nahi aa saki. Please dobara bol kar try karein.");
  }

  return text;
};
