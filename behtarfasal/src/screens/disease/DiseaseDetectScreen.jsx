import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDiseaseAdvice } from '../../constants/diseaseAdvice';
import { theme } from '../../constants/theme';
import { detectPlantDisease } from '../../services/diseaseService';

const DiseaseDetectScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [result, setResult] = useState(null);

  const CONFIDENCE_THRESHOLD = 70;
  const imagePickerOptions = { quality: 0.8, mediaTypes: ['images'] };

  const pickImage = async () => {
    setError('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media library permission is required to select a photo.');
      return;
    }

    try {
      const output = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);

      if (!output.canceled && output.assets?.length) {
        setSelectedImage(output.assets[0]);
        setResult(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to open photo library.');
    }
  };

  const takePhoto = async () => {
    setError('');

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a photo.');
      return;
    }

    try {
      const output = await ImagePicker.launchCameraAsync(imagePickerOptions);

      if (!output.canceled && output.assets?.length) {
        setSelectedImage(output.assets[0]);
        setResult(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to open camera.');
    }
  };

  const handleDetect = async () => {
    if (!selectedImage) {
      setError('Please choose a leaf photo first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await detectPlantDisease(selectedImage, 3);
      const payload = response?.data || null;

      if (!payload) {
        setError('No prediction returned. Please try again.');
        setResult(null);
        return;
      }

      if (payload.confidence < CONFIDENCE_THRESHOLD) {
        setError(
          'Low confidence result. Please upload a clear leaf photo in good lighting.'
        );
        setResult({
          ...payload,
          label: 'Unknown',
          top_predictions: [],
        });
        return;
      }

      setResult(payload);
    } catch (err) {
      setError(err.message || 'Unable to detect disease right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setResult(null);
    setError('');
  };

  const advice = result ? getDiseaseAdvice(result.label, result.confidence) : null;

  const renderAdviceList = (items) => (
    <View style={styles.adviceList}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.adviceRow}>
          <Text style={styles.bullet}>-</Text>
          <Text style={styles.adviceText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* <Text style={styles.title}>Crop Disease Detection</Text> */}
        <Text style={styles.subtitle}>Upload a clear leaf image to identify the disease.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Leaf Photo</Text>
            <Pressable
              style={[styles.clearButton, !selectedImage && !result && styles.clearButtonDisabled]}
              onPress={handleClear}
              disabled={!selectedImage && !result}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          </View>
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={pickImage} disabled={loading}>
              <Text style={styles.secondaryButtonText}>Choose Photo</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.secondaryButtonRight]}
              onPress={takePhoto}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Take Photo</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleDetect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Detect Disease</Text>
          )}
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prediction</Text>
          {!result ? (
            <Text style={styles.placeholderText}>Run detection to see results.</Text>
          ) : (
            <View>
              <Text style={styles.resultTitle}>{result.label}</Text>
              <Text style={styles.resultMeta}>Confidence: {result.confidence}%</Text>

              {advice ? (
                <View style={styles.adviceBox}>
                  <View style={styles.severityRow}>
                    <Text style={styles.subheading}>Severity</Text>
                    <Text
                      style={[
                        styles.severityBadge,
                        advice.severity === 'High' && styles.severityHigh,
                        advice.severity === 'Medium' && styles.severityMedium,
                        advice.severity === 'Low' && styles.severityLow,
                      ]}
                    >
                      {advice.severity}
                    </Text>
                  </View>

                  <Text style={styles.adviceSummary}>{advice.summary}</Text>

                  <Text style={styles.subheading}>Immediate Actions</Text>
                  {renderAdviceList(advice.immediateActions)}

                  <Text style={styles.subheading}>Treatment Recommendations</Text>
                  {renderAdviceList(advice.treatments)}

                  <Text style={styles.subheading}>Prevention Tips</Text>
                  {renderAdviceList(advice.prevention)}

                  <Text style={styles.disclaimerText}>
                    Use crop protection products only according to the label and local agriculture department guidance.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.subheading}>Top Matches</Text>
              {result.top_predictions?.map((item, index) => (
                <View key={`${item.label}-${index}`} style={styles.predictionRow}>
                  <Text style={styles.predictionLabel}>{item.label}</Text>
                  <Text style={styles.predictionScore}>{item.confidence}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  clearButtonDisabled: {
    opacity: 0.4,
  },
  clearButtonText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  placeholder: {
    height: 180,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  preview: {
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonRight: {
    marginLeft: theme.spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
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
  subheading: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  adviceBox: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  severityBadge: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    overflow: 'hidden',
    backgroundColor: theme.colors.textSecondary,
  },
  severityHigh: {
    backgroundColor: theme.colors.error,
  },
  severityMedium: {
    backgroundColor: theme.colors.warning,
  },
  severityLow: {
    backgroundColor: theme.colors.success,
  },
  adviceSummary: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  adviceList: {
    marginBottom: theme.spacing.xs,
  },
  adviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  bullet: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginRight: theme.spacing.xs,
    lineHeight: 20,
  },
  adviceText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  disclaimerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
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

export default DiseaseDetectScreen;
