import { Platform } from "react-native";
import Constants from "expo-constants";

const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000";
const trimTrailingSlash = (url) => url.replace(/\/+$/, "");
const isAndroidEmulator =
  Platform.OS === "android" && !(Constants.isDevice ?? false);

const normalizeApiUrl = (url) => {
  const trimmedUrl = trimTrailingSlash(String(url || "").trim());
  if (!trimmedUrl) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const isLocalNetworkHost =
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname.startsWith("192.168.") ||
      parsedUrl.hostname.startsWith("10.") ||
      parsedUrl.hostname.startsWith("172.");

    if (isLocalNetworkHost && parsedUrl.protocol === "https:") {
      parsedUrl.protocol = "http:";
    }

    if ((parsedUrl.port === "8010" || parsedUrl.port === "8001") && isLocalNetworkHost) {
      parsedUrl.port = "8000";
    }

    return trimTrailingSlash(parsedUrl.toString());
  } catch (_error) {
    return trimmedUrl;
  }
};

const getExpoHostIp = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return hostUri?.split(":")[0] || "";
};

const isLocalDevUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname.startsWith("192.168.") ||
      parsedUrl.hostname.startsWith("10.") ||
      parsedUrl.hostname.startsWith("172.")
    );
  } catch (_error) {
    return false;
  }
};

export const getApiBaseUrl = (envUrl, port = 8000) => {
  const configuredUrl = String(envUrl || "").trim();
  if (configuredUrl) {
    if (isAndroidEmulator && isLocalDevUrl(configuredUrl)) {
      try {
        const parsedUrl = new URL(configuredUrl);
        parsedUrl.hostname = "10.0.2.2";
        return normalizeApiUrl(parsedUrl.toString());
      } catch (_error) {
        return normalizeApiUrl(configuredUrl);
      }
    }

    return normalizeApiUrl(configuredUrl);
  }

  const expoHostIp = getExpoHostIp();
  if (expoHostIp) {
    return `http://${expoHostIp}:${port}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${port}`;
  }

  return trimTrailingSlash(DEFAULT_API_BASE_URL);
};

export const getNetworkErrorMessage = (serviceName, baseUrl) =>
  `${serviceName} service is not reachable at ${baseUrl}. Make sure the backend is running with --host 0.0.0.0, your phone/emulator is on the same network, and EXPO_PUBLIC_API_URL uses your computer IP address.`;
