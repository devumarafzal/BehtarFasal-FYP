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
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [currentCity, setCurrentCity] = useState('');

  const applyWeatherData = useCallback((weatherData, forecastData) => {
    setWeather(weatherData);
    if (forecastData) {
      setForecast(buildDailyForecast(forecastData));
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
      } finally {
        setWeatherLoading(false);
      }
    },
    [applyWeatherData]
  );

  // Weather Context is used by Weather Screen for city search functionality
  // Initial weather loading is handled by individual screens (Dashboard, Weather Screen)

  return (
    <WeatherContext.Provider
      value={{
        weather,
        forecast,
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
