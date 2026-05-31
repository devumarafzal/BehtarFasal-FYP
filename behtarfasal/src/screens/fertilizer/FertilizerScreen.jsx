import { useState } from 'react';
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
import { theme } from '../../constants/theme';
import { getFertilizerRecommendation } from '../../services/fertilizerService';

const SOIL_TYPES = ['Black', 'Clayey', 'Loamy', 'Red', 'Sandy'];
const CROP_TYPES = [
  'Barley',
  'Cotton',
  'Ground Nuts',
  'Maize',
  'Millets',
  'Oil seeds',
  'Paddy',
  'Pulses',
  'Sugarcane',
  'Tobacco',
  'Wheat',
];

const NUMERIC_INPUT_PATTERN = /^\d*\.?\d*$/;

const INITIAL_FORM = {
  soilType: '',
  cropType: '',
  temperature: '',
  humidity: '',
  moisture: '',
  nitrogen: '',
  phosphorus: '',
  potassium: '',
};

const FertilizerScreen = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const updateField = (key, value) => {
    if (
      ['temperature', 'humidity', 'moisture', 'nitrogen', 'phosphorus', 'potassium'].includes(
        key
      ) &&
      !NUMERIC_INPUT_PATTERN.test(value)
    ) {
      return;
    }

    setFormData((prev) => ({ ...prev, [key]: value }));
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (!formData.soilType || !formData.cropType) {
      return 'Please select soil type and crop type.';
    }

    const fields = [
      { key: 'temperature', label: 'Temperature' },
      { key: 'humidity', label: 'Humidity' },
      { key: 'moisture', label: 'Moisture' },
      { key: 'nitrogen', label: 'Nitrogen' },
      { key: 'phosphorus', label: 'Phosphorus' },
      { key: 'potassium', label: 'Potassium' },
    ];

    for (const field of fields) {
      const raw = String(formData[field.key] ?? '').trim();
      if (!raw) {
        return `${field.label} is required.`;
      }

      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        return `${field.label} must be a valid number.`;
      }
    }

    return '';
  };

  const handleRecommend = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        soilType: formData.soilType,
        cropType: formData.cropType,
        temperature: Number(formData.temperature),
        humidity: Number(formData.humidity),
        moisture: Number(formData.moisture),
        nitrogen: Number(formData.nitrogen),
        phosphorus: Number(formData.phosphorus),
        potassium: Number(formData.potassium),
      };

      const response = await getFertilizerRecommendation(payload);
      setResult(response?.data || null);
    } catch (err) {
      setError(err.message || 'Unable to generate fertilizer suggestion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Fertilizer Suggestion</Text>
          <Text style={styles.subtitle}>Provide soil, crop, and nutrient values for a recommendation.</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Soil Type</Text>
            <View style={styles.chipRow}>
              {SOIL_TYPES.map((soil) => {
                const selected = formData.soilType === soil;
                return (
                  <Pressable
                    key={soil}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => updateField('soilType', soil)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{soil}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Crop Type</Text>
            <View style={styles.chipRow}>
              {CROP_TYPES.map((crop) => {
                const selected = formData.cropType === crop;
                return (
                  <Pressable
                    key={crop}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => updateField('cropType', crop)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{crop}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Field Conditions</Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Temperature (C)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 26"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={formData.temperature}
                onChangeText={(value) => updateField('temperature', value)}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Humidity (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 65"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={formData.humidity}
                onChangeText={(value) => updateField('humidity', value)}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Moisture (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 40"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={formData.moisture}
                onChangeText={(value) => updateField('moisture', value)}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Nitrogen (N)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 90"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={formData.nitrogen}
                onChangeText={(value) => updateField('nitrogen', value)}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Phosphorus (P)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 45"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={formData.phosphorus}
                onChangeText={(value) => updateField('phosphorus', value)}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Potassium (K)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 60"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={formData.potassium}
                onChangeText={(value) => updateField('potassium', value)}
              />
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRecommend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Get Fertilizer Suggestion</Text>
            )}
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recommendation</Text>
            {!result ? (
              <Text style={styles.placeholderText}>Generate a suggestion to view results.</Text>
            ) : (
              <View>
                <Text style={styles.resultTitle}>{result.fertilizer}</Text>
                <Text style={styles.resultMeta}>Confidence: {result.confidence}%</Text>

                {result.top_recommendations?.length ? (
                  <View style={styles.topList}>
                    <Text style={styles.subheading}>Top Matches</Text>
                    {result.top_recommendations.map((item, index) => (
                      <View key={`${item.fertilizer}-${index}`} style={styles.predictionRow}>
                        <Text style={styles.predictionLabel}>{item.fertilizer}</Text>
                        <Text style={styles.predictionScore}>{item.confidence}%</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </View>
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
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: theme.colors.surface,
  },
  fieldBlock: {
    marginBottom: theme.spacing.md,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  resultTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  resultMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  topList: {
    marginTop: theme.spacing.sm,
  },
  subheading: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  predictionLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  predictionScore: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
});

export default FertilizerScreen;
