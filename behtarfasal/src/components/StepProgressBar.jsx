import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

const StepProgressBar = ({ currentStep, totalSteps = 3 }) => {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Step {currentStep} of {totalSteps}</Text>
        <Text style={styles.headerText}>{progress}% Complete</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.indicatorRow}>
        {[1, 2, 3].map((step) => {
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;

          return (
            <View key={step} style={styles.indicatorItem}>
              <View
                style={[
                  styles.indicatorCircle,
                  isCompleted && styles.indicatorCompleted,
                  isActive && styles.indicatorActive,
                ]}
              >
                <Text
                  style={[
                    styles.indicatorText,
                    (isCompleted || isActive) && styles.indicatorTextActive,
                  ]}
                >
                  {isCompleted ? '✓' : step}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  indicatorItem: {
    alignItems: 'center',
    flex: 1,
  },
  indicatorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  indicatorCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  indicatorActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  indicatorText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  indicatorTextActive: {
    color: theme.colors.surface,
  },
});

export default StepProgressBar;
