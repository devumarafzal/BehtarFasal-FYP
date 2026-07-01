import { Platform } from "react-native";
import Constants from "expo-constants";

const DEFAULT_API_BASE_URL =
  "https://behtarfasal-fyp-production.up.railway.app";
const trimTrailingSlash = (url) => url.replace(/\/+$/, "");

const getExpoHostIp = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return hostUri?.split(":")[0] || "";
};

export const getApiBaseUrl = (envUrl, port = 8000) => {
  const configuredUrl = String(envUrl || "").trim();
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  const expoHostIp = getExpoHostIp();
  if (expoHostIp) {
    return `http://${expoHostIp}:${port}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${port}`;
  }

  return DEFAULT_API_BASE_URL;
};

export const getNetworkErrorMessage = (serviceName, baseUrl) =>
  `${serviceName} service is not reachable at ${baseUrl}. Make sure the backend is running with --host 0.0.0.0, your phone/emulator is on the same network, and EXPO_PUBLIC_API_URL uses your computer IP address.`;
