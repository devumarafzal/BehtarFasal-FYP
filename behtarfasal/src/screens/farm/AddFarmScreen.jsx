import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
  Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StepProgressBar from '../../components/StepProgressBar';
import {
  CROPPING_SYSTEMS,
  DECIMAL_INPUT_PATTERN,
  FARM_NAME_PATTERN,
  getDistrictOptions,
  INITIAL_FARM_FORM,
  IRRIGATION_OPTIONS,
  LOCATION_PATTERN,
  NAME_PATTERN,
  NUMERIC_INPUT_FIELDS,
  PROVINCES,
  SOIL_SUSTAINABILITY_OPTIONS,
  SOIL_TYPES,
  VILLAGE_PATTERN,
} from '../../constants/farmSetup';
import { theme } from '../../constants/theme';
import { auth } from '../../firebase/config';
import { addFarm, updateFarm } from '../../firebase/firestore';

const parseNumeric = (value) => {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};


const toNumberOrDefault = (value, fallback) => {
  const parsed = parseNumeric(value);
  return parsed === null ? fallback : parsed;
};

const getRangeError = ({ label, value, min, max }) => {
  const parsed = parseNumeric(value);
  if (parsed === null) {
    return `${label} must be a valid number.`;
  }
  if (parsed < min || parsed > max) {
    return `${label} must be between ${min} and ${max}.`;
  }
  return '';
};


const AddFarmScreen = ({ navigation, route }) => {
  const existingFarm = route.params?.farm || null;
  const farmId = route.params?.farmId || existingFarm?.id || null;
  const isEditMode = Boolean(farmId);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSoilTest, setHasSoilTest] = useState(false);
  const [openDropdownKey, setOpenDropdownKey] = useState('');
  const [districtModalOpen, setDistrictModalOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [formData, setFormData] = useState(INITIAL_FARM_FORM);

  useEffect(() => {
    if (!existingFarm) {
      return;
    }

    setFormData({
      farmerName: existingFarm.farmerName || '',
      farmName: existingFarm.farmName || '',
      sizeAcres: String(existingFarm.sizeAcres ?? ''),
      province: existingFarm.province || '',
      district: existingFarm.district || '',
      village: existingFarm.village || '',
      soilType: existingFarm.soilType || 'Loamy',
      phLevel: String(existingFarm.phLevel ?? 6.5),
      nitrogen: String(existingFarm.nitrogen ?? 0),
      phosphorus: String(existingFarm.phosphorus ?? 0),
      potassium: String(existingFarm.potassium ?? 0),
      rainfall: String(existingFarm.rainfall ?? 0),
      humidity: String(existingFarm.humidity ?? 0),
      temperature: String(existingFarm.temperature ?? 0),
      croppingSystem: existingFarm.croppingSystem || '',
      soilSustainability: existingFarm.soilSustainability || '',
      irrigationFacilities: existingFarm.irrigationFacilities || [],
    });

    const hasAnySoilData =
      Number(existingFarm.nitrogen || 0) > 0 ||
      Number(existingFarm.phosphorus || 0) > 0 ||
      Number(existingFarm.potassium || 0) > 0 ||
      Number(existingFarm.rainfall || 0) > 0 ||
      Number(existingFarm.humidity || 0) > 0 ||
      Number(existingFarm.temperature || 0) > 0;

    setHasSoilTest(hasAnySoilData);
  }, [existingFarm]);

  const screenTitle = useMemo(
    () => (isEditMode ? 'Edit Farm Profile' : 'Add Farm Profile'),
    [isEditMode]
  );

  const filteredDistricts = useMemo(() => {
    const options = getDistrictOptions(formData.province);
    const query = districtSearch.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((district) => district.toLowerCase().includes(query));
  }, [formData.province, districtSearch]);

  const updateField = (key, value) => {
    if (NUMERIC_INPUT_FIELDS.has(key) && !DECIMAL_INPUT_PATTERN.test(value)) {
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'province') {
        const districtOptions = getDistrictOptions(value);
        if (!districtOptions.includes(next.district)) {
          next.district = '';
        }
      }

      return next;
    });
    if (error) {
      setError('');
    }
  };

  const toggleIrrigation = (facility) => {
    setFormData((prev) => {
      const exists = prev.irrigationFacilities.includes(facility);
      return {
        ...prev,
        irrigationFacilities: exists
          ? prev.irrigationFacilities.filter((item) => item !== facility)
          : [...prev.irrigationFacilities, facility],
      };
    });
  };

  const validateStepOne = () => {
    const farmerName = formData.farmerName.trim();
    const farmName = formData.farmName.trim();
    const district = formData.district.trim();
    const village = formData.village.trim();
    const districtOptions = getDistrictOptions(formData.province);

    if (!farmerName || !farmName || !formData.sizeAcres || !formData.province || !district) {
      return 'Please complete all required fields in Step 1.';
    }

    if (!NAME_PATTERN.test(farmerName)) {
      return 'Farmer name must be 2-60 characters with valid letters.';
    }

    if (!FARM_NAME_PATTERN.test(farmName)) {
      return 'Farm name must be 2-80 characters with valid letters or numbers.';
    }

    const farmSize = parseNumeric(formData.sizeAcres);
    if (farmSize === null || farmSize <= 0 || farmSize > 100000) {
      return 'Farm size must be greater than 0 and at most 100000 acres.';
    }

    if (!LOCATION_PATTERN.test(district)) {
      return 'District must contain valid letters and be 2-80 characters.';
    }

    if (districtOptions.length && !districtOptions.includes(district)) {
      return 'Please select a valid district for the chosen province.';
    }

    if (village && !VILLAGE_PATTERN.test(village)) {
      return 'Village must contain valid letters/numbers and be 2-80 characters.';
    }

    return '';
  };

  const validateStepTwo = () => {
    if (!hasSoilTest) {
      return '';
    }

    if (!formData.soilType) {
      return 'Please select a soil type.';
    }

    const fieldValidations = [
      { label: 'pH level', value: formData.phLevel, min: 3.5, max: 8.0 },
      { label: 'Nitrogen', value: formData.nitrogen, min: 0, max: 140 },
      { label: 'Phosphorus', value: formData.phosphorus, min: 0, max: 145 },
      { label: 'Potassium', value: formData.potassium, min: 7, max: 210 },
      { label: 'Temperature', value: formData.temperature, min: 0, max: 42 },
      { label: 'Humidity', value: formData.humidity, min: 14, max: 98 },
      { label: 'Rainfall', value: formData.rainfall, min: 20, max: 300 },
    ];

    for (const item of fieldValidations) {
      if (String(item.value ?? '').trim() === '') {
        return `${item.label} is required.`;
      }

      const rangeError = getRangeError(item);
      if (rangeError) {
        return rangeError;
      }
    }

    return '';
  };

  const validateStepThree = () => {
    if (!formData.croppingSystem || !formData.soilSustainability) {
      return 'Please select cropping system and soil sustainability index.';
    }

    return '';
  };

  const validateStep = () => {
    let message = '';

    if (currentStep === 1) {
      message = validateStepOne();
    } else if (currentStep === 2) {
      message = validateStepTwo();
    } else if (currentStep === 3) {
      message = validateStepThree();
    }

    setError(message);
    return !message;
  };

  const validateAllSteps = () => {
    const stepOneError = validateStepOne();
    if (stepOneError) {
      setCurrentStep(1);
      setError(stepOneError);
      return false;
    }

    const stepTwoError = validateStepTwo();
    if (stepTwoError) {
      setCurrentStep(2);
      setError(stepTwoError);
      return false;
    }

    const stepThreeError = validateStepThree();
    if (stepThreeError) {
      setCurrentStep(3);
      setError(stepThreeError);
      return false;
    }

    setError('');
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep()) {
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
    setOpenDropdownKey('');
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError('');
    setOpenDropdownKey('');
  };

  const getFinalPayload = () => {
    if (!hasSoilTest) {
      return {
        ...formData,
        soilType: 'Loamy',
        phLevel: 6.5,
        nitrogen: 0,
        phosphorus: 0,
        potassium: 0,
        rainfall: 0,
        humidity: 0,
        temperature: 0,
      };
    }

    return {
      ...formData,
      phLevel: toNumberOrDefault(formData.phLevel, 6.5),
      nitrogen: toNumberOrDefault(formData.nitrogen, 0),
      phosphorus: toNumberOrDefault(formData.phosphorus, 0),
      potassium: toNumberOrDefault(formData.potassium, 0),
      rainfall: toNumberOrDefault(formData.rainfall, 0),
      humidity: toNumberOrDefault(formData.humidity, 0),
      temperature: toNumberOrDefault(formData.temperature, 0),
    };
  };

  const handleCompleteSetup = async () => {
    if (!validateAllSteps()) {
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError('You must be logged in to save a farm.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...getFinalPayload(),
        sizeAcres: toNumberOrDefault(formData.sizeAcres, 0),
      };

      if (isEditMode) {
        await updateFarm(userId, farmId, payload);
        Alert.alert('Success', 'Farm updated successfully.');
      } else {
        await addFarm(userId, payload);
        Alert.alert('Success', 'Farm profile setup completed successfully.');
      }

      navigation.navigate('MainTabs', { screen: 'My Farms' });
    } catch (err) {
      setError(err.message || 'Failed to save farm details.');
    } finally {
      setLoading(false);
    }
  };

  const renderDropdown = ({
    label,
    fieldKey,
    options,
    required = false,
    placeholder = 'Select option',
    disabled = false,
  }) => {
    const isOpen = openDropdownKey === fieldKey;
    const selected = formData[fieldKey];

    return (
      <View style={styles.fieldBlock}>
        <Text style={styles.labelText}>
          {label}
          {required ? ' *' : ''}
        </Text>

        <Pressable
          style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
          onPress={() => {
            if (disabled) {
              return;
            }
            setOpenDropdownKey((prev) => (prev === fieldKey ? '' : fieldKey));
          }}
          disabled={disabled}
        >
          <View style={styles.dropdownButtonContent}>
            <Text style={selected ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selected || placeholder}
            </Text>
            <Ionicons
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </View>
        </Pressable>

        {isOpen ? (
          <View style={styles.dropdownMenu}>
            {options.map((option) => (
              <Pressable
                key={option}
                style={styles.dropdownItem}
                onPress={() => {
                  updateField(fieldKey, option);
                  setOpenDropdownKey('');
                }}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderDistrictField = () => {
    const canSelectDistrict = Boolean(formData.province);
    const displayText = formData.district || (canSelectDistrict ? 'Select district' : 'Select province first');

    return (
      <View style={styles.fieldBlock}>
        <Text style={styles.labelText}>District *</Text>
        <Pressable
          style={[styles.dropdownButton, !canSelectDistrict && styles.dropdownButtonDisabled]}
          onPress={() => {
            if (!canSelectDistrict) {
              return;
            }
            setOpenDropdownKey('');
            setDistrictSearch('');
            setDistrictModalOpen(true);
          }}
          disabled={!canSelectDistrict}
        >
          <View style={styles.dropdownButtonContent}>
            <Text style={formData.district ? styles.dropdownText : styles.dropdownPlaceholder}>
              {displayText}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </View>
        </Pressable>

        <Modal
          transparent
          visible={districtModalOpen}
          animationType="slide"
          onRequestClose={() => setDistrictModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select District</Text>
                <Pressable onPress={() => setDistrictModalOpen(false)}>
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.modalSearchRow}>
                <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search district"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={districtSearch}
                  onChangeText={setDistrictSearch}
                />
              </View>

              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                {filteredDistricts.length ? (
                  filteredDistricts.map((district) => (
                    <Pressable
                      key={district}
                      style={styles.modalItem}
                      onPress={() => {
                        updateField('district', district);
                        setDistrictModalOpen(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{district}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.modalEmptyText}>No districts found.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderStepOne = () => (
    <View>
      <Text style={styles.sectionTitle}>Farm Details</Text>
      <Text style={styles.sectionSubtitle}>Basic farm information</Text>

      <View style={styles.fieldBlock}>
        <Text style={styles.labelText}>Farmer Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter farmer name"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="default"
          value={formData.farmerName}
          onChangeText={(value) => updateField('farmerName', value)}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.labelText}>Farm Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter farm name"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="default"
          value={formData.farmName}
          onChangeText={(value) => updateField('farmName', value)}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.labelText}>Farm Size (Acres) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter farm size"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="numeric"
          value={formData.sizeAcres}
          onChangeText={(value) => updateField('sizeAcres', value)}
        />
      </View>

      <Text style={styles.sectionTitle}>Farm Location</Text>

      {renderDropdown({
        label: 'Province',
        fieldKey: 'province',
        options: PROVINCES,
        required: true,
      })}

      {renderDistrictField()}

      <View style={styles.fieldBlock}>
        <Text style={styles.labelText}>Village</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter village"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="default"
          value={formData.village}
          onChangeText={(value) => updateField('village', value)}
        />
      </View>
    </View>
  );

  const renderCheckbox = ({ label, value, onPress }) => (
    <Pressable style={styles.checkboxRow} onPress={onPress}>
      <View style={[styles.checkbox, value && styles.checkboxActive]}>
        {value ? <Text style={styles.checkboxMark}>v</Text> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );

  const renderStepTwo = () => (
    <View>
      <Text style={styles.sectionTitle}>Soil Health</Text>
      <Text style={styles.sectionSubtitle}>Soil test results</Text>

      {renderCheckbox({
        label: 'I have soil test results',
        value: hasSoilTest,
        onPress: () => setHasSoilTest((prev) => !prev),
      })}

      {hasSoilTest ? (
        <View>
          {renderDropdown({
            label: 'Soil Type',
            fieldKey: 'soilType',
            options: SOIL_TYPES,
            required: true,
          })}

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>pH Level</Text>
            <TextInput
              style={styles.input}
              placeholder="3.5 to 8.0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
              value={formData.phLevel}
              onChangeText={(value) => updateField('phLevel', value)}
            />
          </View>

          <Text style={styles.sectionTitle}>Nutrient Levels</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>Nitrogen (N)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter nitrogen"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.nitrogen}
              onChangeText={(value) => updateField('nitrogen', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>Phosphorus (P)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phosphorus"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.phosphorus}
              onChangeText={(value) => updateField('phosphorus', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>Potassium (K)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter potassium"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.potassium}
              onChangeText={(value) => updateField('potassium', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.labelText}>Temperature (C)</Text>
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
            <Text style={styles.labelText}>Humidity (%)</Text>
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
            <Text style={styles.labelText}>Rainfall (mm)</Text>
            <TextInput
              style={styles.input}
              placeholder="20 to 300"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.rainfall}
              onChangeText={(value) => updateField('rainfall', value)}
            />
          </View>
        </View>
      ) : (
        <Text style={styles.hintText}>
          Soil nutrient fields are hidden. Default values will be used (pH 6.5 and nutrients as 0).
        </Text>
      )}
    </View>
  );

  const renderStepThree = () => (
    <View>
      <Text style={styles.sectionTitle}>Cropping Practices</Text>
      <Text style={styles.sectionSubtitle}>Farming methods</Text>

      {renderDropdown({
        label: 'Cropping System',
        fieldKey: 'croppingSystem',
        options: CROPPING_SYSTEMS,
        required: true,
      })}

      {renderDropdown({
        label: 'Soil Sustainability Index',
        fieldKey: 'soilSustainability',
        options: SOIL_SUSTAINABILITY_OPTIONS,
        required: true,
      })}

      <Text style={styles.sectionTitle}>Irrigation Facilities</Text>

      <View style={styles.grid}>
        {IRRIGATION_OPTIONS.map((item) => {
          const selected = formData.irrigationFacilities.includes(item);
          return (
            <Pressable key={item} style={styles.gridItem} onPress={() => toggleIrrigation(item)}>
              <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                {selected ? <Text style={styles.checkboxMark}>v</Text> : null}
              </View>
              <Text style={styles.gridLabel}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>{screenTitle}</Text>
          <StepProgressBar currentStep={currentStep} totalSteps={3} />

          {currentStep === 1 ? renderStepOne() : null}
          {currentStep === 2 ? renderStepTwo() : null}
          {currentStep === 3 ? renderStepThree() : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonRow}>
            {currentStep > 1 ? (
              <Pressable style={styles.secondaryButton} onPress={handlePreviousStep}>
                <Text style={styles.secondaryButtonText}>Previous</Text>
              </Pressable>
            ) : (
              <View style={styles.buttonPlaceholder} />
            )}

            {currentStep < 3 ? (
              <Pressable style={styles.primaryButton} onPress={handleNextStep}>
                <Text style={styles.primaryButtonText}>Next Step</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={handleCompleteSetup} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>Complete Setup</Text>
                )}
              </Pressable>
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
  pageTitle: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
  dropdownButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dropdownButtonDisabled: {
    opacity: 0.6,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    paddingRight: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  dropdownPlaceholder: {
    flex: 1,
    paddingRight: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
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
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  modalList: {
    flexGrow: 0,
  },
  modalListContent: {
    paddingBottom: theme.spacing.md,
  },
  modalItem: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalItemText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  modalEmptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxMark: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  checkboxLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  hintText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  buttonRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonPlaceholder: {
    width: '45%',
  },
  primaryButton: {
    width: '45%',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '45%',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  gridLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
  },
});

export default AddFarmScreen;
