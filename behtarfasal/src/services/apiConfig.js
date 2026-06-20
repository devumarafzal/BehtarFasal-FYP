import { Platform } from 'react-native';
import Constants from 'expo-constants';

const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

const getExpoHostIp = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return hostUri?.split(':')[0] || '';
};

export const getApiBaseUrl = (envUrl, port = 8000) => {
  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  const expoHostIp = getExpoHostIp();
  if (expoHostIp) {
    return `http://${expoHostIp}:${port}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  return `http://localhost:${port}`;
};

export const getNetworkErrorMessage = (serviceName, baseUrl) =>
  `${serviceName} service is not reachable at ${baseUrl}. Make sure the backend is running with --host 0.0.0.0, your phone/emulator is on the same network, and EXPO_PUBLIC_API_URL uses your computer IP address.`;
