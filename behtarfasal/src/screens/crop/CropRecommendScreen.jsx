import { useEffect, useState } from 'react';
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
import CropResultCard from '../../components/CropResultCard';
import { theme } from '../../constants/theme';
import { auth } from '../../firebase/config';
import { getFarm } from '../../firebase/firestore';
import { getCropRecommendation } from '../../services/cropService';
import { getCurrentWeather } from '../../services/weatherService';

const DEFAULT_FORM_DATA = {
  nitrogen: '0',
  phosphorus: '0',
  potassium: '0',
  temperature: '25',
  humidity: '60',
  ph: '6.5',
  rainfall: '100',
};

const FIELD_RULES = [
  { key: 'nitrogen', label: 'N', min: 0, max: 140 },
  { key: 'phosphorus', label: 'P', min: 0, max: 145 },
  { key: 'potassium', label: 'K', min: 7, max: 210 },
  { key: 'temperature', label: 'temperature', min: 0, max: 42 },
  { key: 'humidity', label: 'humidity', min: 14, max: 98 },
  { key: 'ph', label: 'ph', min: 3.5, max: 8.0 },
  { key: 'rainfall', label: 'rainfall', min: 20, max: 300 },
];

const NUMERIC_INPUT_PATTERN = /^\d*\.?\d*$/;

const getUniqueLocationCandidates = (farm) => {
  const values = [farm?.district, farm?.village, farm?.province]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return [...new Set(values)];
};

const toCleanNumberString = (value, decimals = 1) => {
  if (!Number.isFinite(value)) {
    return '';
  }
  return String(Number(value.toFixed(decimals)));
};

const CropRecommendScreen = ({ route, navigation }) => {
  const farmId = route.params?.farmId;

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [result, setResult] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherHint, setWeatherHint] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    if (!farmId) {
      setWeatherHint('Open this screen from a farm profile to auto-fill weather from district/city.');
      return () => {
        isMounted = false;
      };
    }

    const fetchFarmData = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return;
      }

      setPrefillLoading(true);
      setError('');
      setWeatherHint('');

      try {
        const farm = await getFarm(userId, farmId);
        if (!farm) {
          setWeatherHint('Farm not found. Enter values manually.');
          return;
        }

        const nextFormData = {
          nitrogen: String(farm.nitrogen ?? 0),
          phosphorus: String(farm.phosphorus ?? 0),
          potassium: String(farm.potassium ?? 0),
          temperature: String(farm.temperature ?? 25),
          humidity: String(farm.humidity ?? 60),
          ph: String(farm.phLevel ?? 6.5),
          rainfall: String(farm.rainfall ?? 100),
        };

        if (isMounted) {
          setFormData(nextFormData);
        }

        const locationCandidates = getUniqueLocationCandidates(farm);
        if (!locationCandidates.length) {
          setWeatherHint('District/city is missing in farm profile. Using saved weather values; you can edit them.');
          return;
        }

        setWeatherLoading(true);
        let weatherApplied = false;

        for (const place of locationCandidates) {
          try {
            const weather = await getCurrentWeather(`${place},PK`);
            const liveTemp = Number(weather?.main?.temp);
            const liveHumidity = Number(weather?.main?.humidity);

            if (!Number.isFinite(liveTemp) || !Number.isFinite(liveHumidity)) {
              continue;
            }

            if (isMounted) {
              setFormData((prev) => ({
                ...prev,
                temperature: toCleanNumberString(liveTemp, 1),
                humidity: toCleanNumberString(liveHumidity, 0),
              }));
              setWeatherHint(
                `Temperature and humidity were auto-filled from current weather in ${place}. You can edit both values.`
              );
            }
            weatherApplied = true;
            break;
          } catch (weatherErr) {
            // Try next location candidate.
          }
        }

        if (!weatherApplied && isMounted) {
          setWeatherHint('Could not fetch live weather for this location. Using saved values; you can still edit them.');
        }
      } catch (err) {
        setError(err.message || 'Unable to prefill farm data.');
      } finally {
        if (isMounted) {
          setPrefillLoading(false);
          setWeatherLoading(false);
        }
      }
    };

    fetchFarmData();

    return () => {
      isMounted = false;
    };
  }, [farmId]);

  const updateField = (field, value) => {
    if (!NUMERIC_INPUT_PATTERN.test(value)) {
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) {
      setError('');
    }
  };

  const validateFormData = () => {
    for (const field of FIELD_RULES) {
      const raw = String(formData[field.key] ?? '').trim();
      if (!raw) {
        return `${field.label} is required.`;
      }

      const numericValue = Number(raw);
      if (!Number.isFinite(numericValue)) {
        return `${field.label} must be a valid number.`;
      }

      if (numericValue < field.min || numericValue > field.max) {
        return `${field.label} must be between ${field.min} and ${field.max}.`;
      }
    }

    return '';
  };

  const handleGetRecommendation = async () => {
    const validationError = validateFormData();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSelectedCrop('');

    try {
      const response = await getCropRecommendation(formData);
      const payload = response?.data || response;
      setResult(payload);

      const preferredCrop = payload?.top_recommendations?.[0]?.crop_name || payload?.crop_name || '';
      setSelectedCrop(preferredCrop);
    } catch (err) {
      setError(err.message || 'Unable to fetch recommendation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCalendar = () => {
    if (!selectedCrop) {
      setError('Please select one crop recommendation before generating calendar.');
      return;
    }

    navigation.navigate('Calendar', {
      farmId,
      selectedCrop,
    });
  
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>AI Crop Recommendation</Text>

          {prefillLoading ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.inlineLoaderText}>Loading farm data...</Text>
            </View>
          ) : null}

          {weatherLoading ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.inlineLoaderText}>Fetching weather from farm district/city...</Text>
            </View>
          ) : null}

          {weatherHint ? <Text style={styles.infoText}>{weatherHint}</Text> : null}

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>N - ratio of Nitrogen content in soil</Text>
            <TextInput
              style={styles.input}
              placeholder="0 to 140"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.nitrogen}
              onChangeText={(value) => updateField('nitrogen', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>P - ratio of Phosphorous content in soil</Text>
            <TextInput
              style={styles.input}
              placeholder="0 to 145"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.phosphorus}
              onChangeText={(value) => updateField('phosphorus', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>K - ratio of Potassium content in soil</Text>
            <TextInput
              style={styles.input}
              placeholder="7 to 210"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.potassium}
              onChangeText={(value) => updateField('potassium', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>temperature - temperature in degree Celsius</Text>
            <TextInput
              style={styles.input}
              placeholder="0 to 42"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
              value={formData.temperature}
              onChangeText={(value) => updateField('temperature', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>humidity - relative humidity in %</Text>
            <TextInput
              style={styles.input}
              placeholder="14 to 98"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.humidity}
              onChangeText={(value) => updateField('humidity', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>ph - ph value of the soil</Text>
            <TextInput
              style={styles.input}
              placeholder="3.5 to 8.0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
              value={formData.ph}
              onChangeText={(value) => updateField('ph', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>rainfall - rainfall in mm</Text>
            <TextInput
              style={styles.input}
              placeholder="20 to 300"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.rainfall}
              onChangeText={(value) => updateField('rainfall', value)}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleGetRecommendation} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Get Recommendation</Text>
            )}
          </Pressable>

          {result ? (
            <CropResultCard
              result={result}
              selectedCrop={selectedCrop}
              onSelectCrop={setSelectedCrop}
            />
          ) : null}

          {result ? (
            <Pressable style={styles.calendarButton} onPress={handleCreateCalendar}>
              <Text style={styles.calendarButtonText}>Create Full Crop Calendar</Text>
            </Pressable>
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
  pageTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  inlineLoaderText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  fieldBlock: {
    marginBottom: theme.spacing.md,
  },
  labelText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  calendarButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  calendarButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});

export default CropRecommendScreen;
