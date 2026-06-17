import { useEffect, useState, useContext } from 'react';
import * as Location from 'expo-location';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WeatherCard from '../../components/WeatherCard';
import { theme } from '../../constants/theme';
import {
    getFarmingTipFromWeather,
    getCurrentWeather,
    getCurrentWeatherByCoords,
    getFiveDayForecast,
    getFiveDayForecastByCoords,
    buildDailyForecast,
} from '../../services/weatherService';
import { WeatherContext } from '../../contexts/WeatherContext';

const CITY_ALLOWED_INPUT = /^[A-Za-z\s'.-]*$/;
const CITY_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,59}$/;

const conditionToEmoji = (condition) => {
  const key = (condition || '').toLowerCase();
  if (key.includes('rain')) {
    return '🌧️';
  }
  if (key.includes('cloud')) {
    return '☁️';
  }
  if (key.includes('storm') || key.includes('thunder')) {
    return '⛈️';
  }
  if (key.includes('clear')) {
    return '☀️';
  }
  return '🌤️';
};

const formatDayName = (unixTimestamp) => {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const WeatherScreen = () => {
  const [city, setCity] = useState('');
  const [validationError, setValidationError] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  const updateCity = (value) => {
    if (!CITY_ALLOWED_INPUT.test(value)) {
      return;
    }

    setCity(value);
    if (validationError) {
      setValidationError('');
    }
  };

  const applyWeatherData = (weatherData, forecastData) => {
    setWeather(weatherData);
    if (forecastData) {
      setForecast(buildDailyForecast(forecastData));
    }
    if (weatherData?.name) {
      setCity(weatherData.name);
    }
  };

  const fetchWeatherByCity = async (cityToSearch) => {
    if (!cityToSearch?.trim()) {
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
  };

  const fetchWeatherByCoords = async (latitude, longitude) => {
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
  };

  // Initialize weather on mount
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
  }, []);

  const handleSearch = () => {
    if (!CITY_PATTERN.test(city)) {
      setValidationError('City name must be 2-60 characters and contain valid letters only.');
      return;
    }

    setValidationError('');
    fetchWeatherByCity(city);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter city name"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="default"
              autoCapitalize="words"
              value={city}
              onChangeText={updateCity}
              onSubmitEditing={handleSearch}
            />
            <Pressable 
              style={styles.searchButton} 
              onPress={handleSearch} 
              disabled={weatherLoading}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
          {weatherError ? <Text style={styles.errorText}>{weatherError}</Text> : null}

          {weatherLoading ? (
            <View style={styles.loaderWrapper}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : null}

          {!weatherLoading && weather ? <WeatherCard weather={weather} /> : null}

          {!weatherLoading && forecast.length > 0 ? (
            <View style={styles.forecastBlock}>
              <Text style={styles.sectionTitle}>5-Day Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {forecast.map((day) => (
                  <View key={day.date} style={styles.forecastCard}>
                    <Text style={styles.forecastDay}>{formatDayName(day.date)}</Text>
                    <Text style={styles.forecastEmoji}>{conditionToEmoji(day.condition)}</Text>
                    <Text style={styles.forecastTemp}>
                      {Math.round(day.min)}° / {Math.round(day.max)}°
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {!weatherLoading && weather ? (
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Farming Tip</Text>
              <Text style={styles.tipText}>
                {getFarmingTipFromWeather(
                  weather?.weather?.[0]?.main,
                  weather?.main?.humidity,
                  weather?.main?.temp
                )}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    width: '72%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  searchButton: {
    width: '25%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  loaderWrapper: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  forecastBlock: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  forecastCard: {
    width: 110,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
  },
  forecastDay: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  forecastEmoji: {
    fontSize: theme.fontSize.xxl,
    marginBottom: theme.spacing.xs,
  },
  forecastTemp: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  tipCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  tipTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  tipText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
});

export default WeatherScreen;
