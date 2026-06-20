import { createContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import {
  getCurrentWeather,
  getCurrentWeatherByCoords,
  getFiveDayForecast,
  getFiveDayForecastByCoords,
  buildDailyForecast,
} from '../services/weatherService';

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [rawForecast, setRawForecast] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [currentCity, setCurrentCity] = useState('');

  const applyWeatherData = useCallback((weatherData, forecastData) => {
    setWeather(weatherData);
    if (forecastData) {
      setForecast(buildDailyForecast(forecastData));
      setRawForecast(Array.isArray(forecastData?.list) ? forecastData.list : []);
    } else {
      setForecast([]);
      setRawForecast([]);
    }
    if (weatherData?.name) {
      setCurrentCity(weatherData.name);
    }
  }, []);

  const fetchWeatherByCity = useCallback(async (city) => {
    const cityToSearch = (city || '').trim();

    if (!cityToSearch) {
      setWeatherError('Please enter a city name.');
      return;
    }

    setWeatherLoading(true);
    setWeatherError('');

    try {
      const [weatherData, forecastData] = await Promise.all([
        getCurrentWeather(cityToSearch),
        getFiveDayForecast(cityToSearch),
      ]);
      applyWeatherData(weatherData, forecastData);
    } catch (err) {
      setWeatherError(err.message || 'Unable to fetch weather data.');
      setWeather(null);
      setForecast([]);
      setRawForecast([]);
    } finally {
      setWeatherLoading(false);
    }
  }, [applyWeatherData]);

  const fetchWeatherByCoords = useCallback(
    async (latitude, longitude) => {
      setWeatherLoading(true);
      setWeatherError('');

      try {
        const [weatherData, forecastData] = await Promise.all([
          getCurrentWeatherByCoords(latitude, longitude),
          getFiveDayForecastByCoords(latitude, longitude),
        ]);
        applyWeatherData(weatherData, forecastData);
      } catch (err) {
        setWeatherError(err.message || 'Unable to fetch weather data.');
        setWeather(null);
        setForecast([]);
        setRawForecast([]);
      } finally {
        setWeatherLoading(false);
      }
    },
    [applyWeatherData]
  );

  // Fetch weather once on mount
  useEffect(() => {
    const loadInitialWeather = async () => {
      setWeatherLoading(true);
      setWeatherError('');

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          await fetchWeatherByCoords(location.coords.latitude, location.coords.longitude);
          return;
        }

        await fetchWeatherByCity('Lahore');
      } catch (_err) {
        try {
          await fetchWeatherByCity('Lahore');
        } catch (fallbackError) {
          setWeatherError(fallbackError.message || 'Unable to load weather info.');
        }
      } finally {
        setWeatherLoading(false);
      }
    };

    loadInitialWeather();
  }, [fetchWeatherByCity, fetchWeatherByCoords]);

  return (
    <WeatherContext.Provider
      value={{
        weather,
        forecast,
        rawForecast,
        weatherLoading,
        weatherError,
        currentCity,
        fetchWeatherByCity,
        fetchWeatherByCoords,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};
