import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

const getTopRecommendations = (result) => {
  if (Array.isArray(result?.top_recommendations) && result.top_recommendations.length > 0) {
    return result.top_recommendations.slice(0, 3).map((item) => ({
      crop_name: String(item?.crop_name || '').trim(),
      confidence: Number(item?.confidence),
    }));
  }

  const fallback = [
    {
      crop_name: String(result?.crop_name || result?.crop || '').trim(),
      confidence: Number(result?.confidence ?? result?.confidence_percentage),
    },
  ];

  if (Array.isArray(result?.alternative_crops)) {
    result.alternative_crops.slice(0, 2).forEach((name) => {
      fallback.push({ crop_name: String(name || '').trim(), confidence: NaN });
    });
  }

  return fallback.filter((item) => item.crop_name).slice(0, 3);
};

const CropResultCard = ({ result, selectedCrop, onSelectCrop }) => {
  if (!result) {
    return null;
  }

  const cropName = result.crop_name || result.crop || 'No recommendation';
  const confidence = result.confidence ?? result.confidence_percentage ?? 0;
  const explanation = result.reason || result.explanation || 'No explanation provided.';
  const plantingTime = result.best_planting_time || result.planting_time || 'Not specified';
  const expectedYield = result.expected_yield || 'Not specified';
  const topRecommendations = getTopRecommendations(result);
  const currentSelection = selectedCrop || topRecommendations[0]?.crop_name || cropName;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Top 3 Recommended Crops</Text>

      {topRecommendations.map((item, index) => {
        const isSelected = currentSelection === item.crop_name;
        const displayConfidence = Number.isFinite(item.confidence)
          ? `${item.confidence}%`
          : '--';

        return (
          <Pressable
            key={`${item.crop_name}-${index}`}
            style={[styles.recommendationRow, isSelected && styles.recommendationRowSelected]}
            onPress={() => onSelectCrop?.(item.crop_name)}
          >
            <View>
              <Text style={styles.rankText}>#{index + 1}</Text>
              <Text style={styles.recommendationCrop}>{item.crop_name}</Text>
            </View>
            <Text style={styles.recommendationConfidence}>{displayConfidence}</Text>
          </Pressable>
        );
      })}

      <Text style={styles.meta}>Selected crop for calendar: {currentSelection}</Text>

      <Text style={styles.label}>Why this crop?</Text>
      <Text style={styles.value}>{explanation}</Text>

      <Text style={styles.label}>Best planting time</Text>
      <Text style={styles.value}>{plantingTime}</Text>

      <Text style={styles.label}>Expected yield</Text>
      <Text style={styles.value}>{expectedYield}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  heading: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  recommendationRow: {
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
  },
  recommendationRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EAF7EA',
  },
  rankText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  recommendationCrop: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
    textTransform: 'capitalize',
  },
  recommendationConfidence: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  meta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  value: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
});

export default CropResultCard;
