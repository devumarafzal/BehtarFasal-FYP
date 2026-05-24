const API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const requestWeatherApi = async (url) => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch weather data');
  }

  return data;
};

export const getCurrentWeather = async (city) => {
  if (!city?.trim()) {
    throw new Error('City is required');
  }

  return requestWeatherApi(
    `${BASE_URL}/weather?q=${encodeURIComponent(city.trim())}&appid=${API_KEY}&units=metric`
  );
};

export const getCurrentWeatherByCoords = async (latitude, longitude) => {
  return requestWeatherApi(
    `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
  );
};

export const getFiveDayForecastByCoords = async (latitude, longitude) => {
  return requestWeatherApi(
    `${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
  );
};

export const getFiveDayForecast = async (city) => {
  if (!city?.trim()) {
    throw new Error('City is required');
  }

  return requestWeatherApi(
    `${BASE_URL}/forecast?q=${encodeURIComponent(city.trim())}&appid=${API_KEY}&units=metric`
  );
};

export const buildDailyForecast = (forecastData) => {
  if (!forecastData?.list) {
    return [];
  }

  const dailyMap = {};

  forecastData.list.forEach((entry) => {
    const dayKey = new Date(entry.dt * 1000).toDateString();
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = {
        date: entry.dt,
        min: entry.main.temp_min,
        max: entry.main.temp_max,
        condition: entry.weather?.[0]?.main || 'Clear',
      };
      return;
    }

    dailyMap[dayKey].min = Math.min(dailyMap[dayKey].min, entry.main.temp_min);
    dailyMap[dayKey].max = Math.max(dailyMap[dayKey].max, entry.main.temp_max);
  });

  return Object.values(dailyMap).slice(0, 5);
};

export const getFarmingTipFromWeather = (condition, humidity, temperature) => {
  const weather = (condition || '').toLowerCase();

  if (weather.includes('rain')) {
    return 'Avoid pesticide spraying today and secure fertilizer bags from moisture.';
  }
  if (temperature >= 35) {
    return 'High heat expected. Plan irrigation in early morning or evening.';
  }
  if (humidity >= 80) {
    return 'High humidity can increase fungal disease risk. Monitor leaves closely.';
  }
  if (weather.includes('cloud')) {
    return 'Cloudy conditions are suitable for transplanting and light field work.';
  }
  return 'Good day for irrigation planning and regular crop monitoring.';
};
