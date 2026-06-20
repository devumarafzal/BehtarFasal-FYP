import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
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
import { auth } from '../../firebase/config';
import { getFarms } from '../../firebase/firestore';
import { getYieldOptions, predictYield } from '../../services/yieldService';

const FALLBACK_OPTIONS = {
  crops: ['Cotton', 'Maize', 'Potato', 'Rice', 'Sugarcane', 'Wheat'],
  soil_types: ['Black', 'Clayey', 'Loamy', 'Red', 'Sandy'],
  irrigation_types: ['Bore Well', 'Canal Water', 'Drip Irrigation', 'Flood Irrigation', 'Rain Fed', 'Sprinkler System'],
  fertilizers: ['10-26-26', '14-35-14', '17-17-17', '20-20', '28-28', 'DAP', 'MOP', 'None', 'Urea'],
};

const NUMERIC_INPUT_PATTERN = /^\d*\.?\d*$/;
const NUMERIC_FIELDS = ['farmSizeAcres', 'nitrogen', 'phosphorous', 'potassium'];
const FIELD_RULES = {
  farmSizeAcres: {
    label: 'Farm Size',
    min: 0.1,
    max: 1000,
    suffix: 'acres',
    helper: 'Enter farm size in acres.',
  },
  nitrogen: {
    label: 'Nitrogen',
    min: 0,
    max: 300,
    suffix: 'N',
    helper: 'Enter 0 to 300.',
  },
  phosphorous: {
    label: 'Phosphorous',
    min: 0,
    max: 300,
    suffix: 'P',
    helper: 'Enter 0 to 300.',
  },
  potassium: {
    label: 'Potassium',
    min: 0,
    max: 300,
    suffix: 'K',
    helper: 'Enter 0 to 300.',
  },
};

const INITIAL_FORM = {
  farmId: '',
  crop: '',
  soilType: '',
  irrigationType: '',
  fertilizerUsed: '',
  farmSizeAcres: '',
  nitrogen: '',
  phosphorous: '',
  potassium: '',
};

const normalizeSoilType = (soilType, availableSoils) => {
  if (!soilType) {
    return '';
  }

  const directMatch = availableSoils.find((soil) => soil.toLowerCase() === String(soilType).toLowerCase());
  if (directMatch) {
    return directMatch;
  }

  const aliases = {
    clay: 'Clayey',
    clayey: 'Clayey',
    black: 'Black',
    loamy: 'Loamy',
    red: 'Red',
    sandy: 'Sandy',
  };
  const mapped = aliases[String(soilType).trim().toLowerCase()];
  return availableSoils.includes(mapped) ? mapped : '';
};

const formatFarmValue = (value) => (value === null || value === undefined ? '' : String(value));

const YieldPredictScreen = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [farms, setFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      try {
        const response = await getYieldOptions();
        if (!mounted) {
          return;
        }

        setOptions({
          crops: response.crops?.length ? response.crops : FALLBACK_OPTIONS.crops,
          soil_types: response.soil_types?.length ? response.soil_types : FALLBACK_OPTIONS.soil_types,
          irrigation_types: response.irrigation_types?.length
            ? response.irrigation_types
            : FALLBACK_OPTIONS.irrigation_types,
          fertilizers: response.fertilizers?.length ? response.fertilizers : FALLBACK_OPTIONS.fertilizers,
        });
      } catch (_err) {
        if (mounted) {
          setOptions(FALLBACK_OPTIONS);
        }
      }
    };

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const loadFarms = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setFarms([]);
      return;
    }

    setFarmsLoading(true);
    try {
      const farmList = await getFarms(userId);
      setFarms(farmList);
    } catch (err) {
      setError(err.message || 'Unable to load farms.');
      setFarms([]);
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFarms();
    }, [loadFarms])
  );

  const updateField = (key, value) => {
    if (NUMERIC_FIELDS.includes(key) && !NUMERIC_INPUT_PATTERN.test(value)) {
      return;
    }

    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    if (error) {
      setError('');
    }
  };

  const handleSelectFarm = (farm) => {
    const irrigationMatch = Array.isArray(farm.irrigationFacilities)
      ? farm.irrigationFacilities.find((item) => options.irrigation_types.includes(item))
      : '';

    setFormData((prev) => ({
      ...prev,
      farmId: farm.id,
      farmSizeAcres: formatFarmValue(farm.sizeAcres),
      nitrogen: formatFarmValue(farm.nitrogen),
      phosphorous: formatFarmValue(farm.phosphorus),
      potassium: formatFarmValue(farm.potassium),
      soilType: normalizeSoilType(farm.soilType, options.soil_types) || prev.soilType,
      irrigationType: irrigationMatch || prev.irrigationType,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      farmSizeAcres: '',
      nitrogen: '',
      phosphorous: '',
      potassium: '',
      soilType: '',
      irrigationType: '',
    }));
    setFarmDropdownOpen(false);
    setResult(null);
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    const nextFieldErrors = {};

    if (!formData.crop) {
      nextFieldErrors.crop = 'Select a crop.';
    }
    if (!formData.soilType) {
      nextFieldErrors.soilType = 'Select a soil type.';
    }
    if (!formData.irrigationType) {
      nextFieldErrors.irrigationType = 'Select an irrigation type.';
    }
    if (!formData.fertilizerUsed) {
      nextFieldErrors.fertilizerUsed = 'Select a fertilizer.';
    }

    for (const key of NUMERIC_FIELDS) {
      const rule = FIELD_RULES[key];
      const raw = String(formData[key] ?? '').trim();
      if (!raw) {
        nextFieldErrors[key] = `${rule.label} is required.`;
        continue;
      }

      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        nextFieldErrors[key] = `${rule.label} must be a valid number.`;
        continue;
      }

      if (numeric < rule.min || numeric > rule.max) {
        nextFieldErrors[key] = `${rule.label} must be between ${rule.min} and ${rule.max} ${rule.suffix}.`;
      }
    }

    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length ? 'Please fix the highlighted fields.' : '';
  };

  const handlePredict = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await predictYield({
        crop: formData.crop,
        farmSizeAcres: Number(formData.farmSizeAcres),
        soilType: formData.soilType,
        irrigationType: formData.irrigationType,
        fertilizerUsed: formData.fertilizerUsed,
        nitrogen: Number(formData.nitrogen),
        phosphorous: Number(formData.phosphorous),
        potassium: Number(formData.potassium),
      });

      setResult(response?.data || null);
    } catch (err) {
      setError(err.message || 'Unable to predict yield.');
    } finally {
      setLoading(false);
    }
  };

  const renderChips = (items, keyName) => (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const selected = formData[keyName] === item;
        return (
          <Pressable
            key={item}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => updateField(keyName, item)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const selectedFarm = farms.find((farm) => farm.id === formData.farmId);

  const renderFarmSelector = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Select Farm</Text>
      <Text style={styles.helperText}>Farm size and NPK values will fill automatically.</Text>

      <Pressable
        style={styles.dropdownButton}
        onPress={() => setFarmDropdownOpen((prev) => !prev)}
        disabled={farmsLoading}
      >
        <View style={styles.dropdownButtonContent}>
          <Text style={selectedFarm ? styles.dropdownText : styles.dropdownPlaceholder}>
            {selectedFarm?.farmName || (farmsLoading ? 'Loading farms...' : 'Select a farm')}
          </Text>
          <Text style={styles.dropdownIcon}>{farmDropdownOpen ? '^' : 'v'}</Text>
        </View>
      </Pressable>

      {farmDropdownOpen ? (
        <View style={styles.dropdownMenu}>
          {farms.length ? (
            farms.map((farm) => (
              <Pressable
                key={farm.id}
                style={styles.dropdownItem}
                onPress={() => handleSelectFarm(farm)}
              >
                <Text style={styles.dropdownItemTitle}>{farm.farmName || 'Unnamed Farm'}</Text>
                <Text style={styles.dropdownItemSubtitle}>
                  {farm.sizeAcres || 0} acres - N {farm.nitrogen ?? 0} - P {farm.phosphorus ?? 0} - K {farm.potassium ?? 0}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.dropdownEmptyText}>No saved farms found.</Text>
          )}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Yield Prediction</Text>
          <Text style={styles.subtitle}>Estimate yield from crop, farm, irrigation, fertilizer, and nutrients.</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {renderFarmSelector()}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Crop</Text>
            {fieldErrors.crop ? <Text style={styles.fieldErrorText}>{fieldErrors.crop}</Text> : null}
            {renderChips(options.crops, 'crop')}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Soil Type</Text>
            {fieldErrors.soilType ? <Text style={styles.fieldErrorText}>{fieldErrors.soilType}</Text> : null}
            {renderChips(options.soil_types, 'soilType')}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Irrigation Type</Text>
            {fieldErrors.irrigationType ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.irrigationType}</Text>
            ) : null}
            {renderChips(options.irrigation_types, 'irrigationType')}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fertilizer Used</Text>
            {fieldErrors.fertilizerUsed ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.fertilizerUsed}</Text>
            ) : null}
            {renderChips(options.fertilizers, 'fertilizerUsed')}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Farm Details</Text>
            {NUMERIC_FIELDS.map((key) => {
              const rule = FIELD_RULES[key];
              const hasError = Boolean(fieldErrors[key]);

              return (
                <View key={key} style={styles.fieldBlock}>
                  <Text style={styles.label}>
                    {rule.label} ({rule.suffix})
                  </Text>
                  <TextInput
                    style={[styles.input, hasError && styles.inputError]}
                    placeholder={key === 'farmSizeAcres' ? 'e.g., 7' : key === 'nitrogen' ? 'e.g., 126' : key === 'phosphorous' ? 'e.g., 120' : 'e.g., 128'}
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="decimal-pad"
                    value={formData[key]}
                    onChangeText={(value) => updateField(key, value)}
                    maxLength={7}
                  />
                  <Text style={[styles.helperText, hasError && styles.fieldErrorText]}>
                    {fieldErrors[key] || rule.helper}
                  </Text>
                </View>
              );
            })}
          </View>

          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handlePredict}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Predict Yield</Text>
            )}
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Prediction</Text>
            {!result ? (
              <Text style={styles.placeholderText}>Run a prediction to view estimated yield.</Text>
            ) : (
              <View>
                <Text style={styles.resultTitle}>
                  {result.predicted_yield_per_acre} {result.unit}
                </Text>
                <Text style={styles.resultMeta}>
                  Total: {result.total_yield} {result.total_unit}
                </Text>
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>Crop</Text>
                  <Text style={styles.predictionScore}>{result.crop}</Text>
                </View>
                <View style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>Farm Size</Text>
                  <Text style={styles.predictionScore}>{result.farm_size_acres} acres</Text>
                </View>
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
  dropdownButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    paddingRight: theme.spacing.sm,
  },
  dropdownPlaceholder: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    paddingRight: theme.spacing.sm,
  },
  dropdownIcon: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  dropdownMenu: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  dropdownItemSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  dropdownEmptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    padding: theme.spacing.md,
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
  inputError: {
    borderColor: theme.colors.error,
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  fieldErrorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    marginBottom: theme.spacing.xs,
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
    fontWeight: '600',
  },
});

export default YieldPredictScreen;
