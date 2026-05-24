import { useCallback, useEffect, useState } from 'react';
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
    buildDailyForecast,
    getCurrentWeather,
  getCurrentWeatherByCoords,
    getFarmingTipFromWeather,
    getFiveDayForecast,
  getFiveDayForecastByCoords,
} from '../../services/weatherService';

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
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateCity = (value) => {
    if (!CITY_ALLOWED_INPUT.test(value)) {
      return;
    }

    setCity(value);
    if (error) {
      setError('');
    }
  };

  const applyWeatherData = useCallback((weatherData, forecastData) => {
    setWeather(weatherData);
    setForecast(buildDailyForecast(forecastData));
    if (weatherData?.name) {
      setCity(weatherData.name);
    }
  }, []);

  const fetchWeather = useCallback(async (targetCity, options = {}) => {
    const cityToSearch = (targetCity || '').trim();
    const shouldSetLoading = !options.skipLoading;

    if (!cityToSearch) {
      setError('Please enter a city name.');
      return;
    }

    if (!CITY_PATTERN.test(cityToSearch)) {
      setError('City name must be 2-60 characters and contain valid letters only.');
      return;
    }

    if (shouldSetLoading) {
      setLoading(true);
    }
    setError('');

    try {
      const [weatherData, forecastData] = await Promise.all([
        getCurrentWeather(cityToSearch),
        getFiveDayForecast(cityToSearch),
      ]);
      applyWeatherData(weatherData, forecastData);
    } catch (err) {
      setError(err.message || 'Unable to fetch weather data.');
      setWeather(null);
      setForecast([]);
    } finally {
      if (shouldSetLoading) {
        setLoading(false);
      }
    }
  }, [applyWeatherData]);

  const fetchWeatherByCoords = useCallback(
    async (latitude, longitude) => {
      const [weatherData, forecastData] = await Promise.all([
        getCurrentWeatherByCoords(latitude, longitude),
        getFiveDayForecastByCoords(latitude, longitude),
      ]);
      applyWeatherData(weatherData, forecastData);
    },
    [applyWeatherData]
  );

  useEffect(() => {
    const loadDefaultWeather = async () => {
      setLoading(true);
      setError('');

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          await fetchWeatherByCoords(location.coords.latitude, location.coords.longitude);
          return;
        }

        await fetchWeather('Lahore', { skipLoading: true });
      } catch (err) {
        try {
          await fetchWeather('Lahore', { skipLoading: true });
        } catch (fallbackError) {
          setError(fallbackError.message || 'Unable to fetch weather data.');
          setWeather(null);
          setForecast([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDefaultWeather();
  }, [fetchWeather, fetchWeatherByCoords]);

  const farmingTip = getFarmingTipFromWeather(
    weather?.weather?.[0]?.main,
    weather?.main?.humidity,
    weather?.main?.temp
  );

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
              onSubmitEditing={() => fetchWeather(city)}
            />
            <Pressable style={styles.searchButton} onPress={() => fetchWeather(city)} disabled={loading}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <View style={styles.loaderWrapper}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : null}

          {!loading && weather ? <WeatherCard weather={weather} /> : null}

          {!loading && forecast.length > 0 ? (
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

          {!loading && weather ? (
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Farming Tip</Text>
              <Text style={styles.tipText}>{farmingTip}</Text>
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
