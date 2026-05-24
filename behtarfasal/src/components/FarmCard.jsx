import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

const FarmCard = ({ farm, onView }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.farmName}>{farm.farmName || 'Unnamed Farm'}</Text>
      <Text style={styles.detailText}>
        {farm.district || 'Unknown District'}, {farm.province || 'Unknown Province'}
      </Text>
      <Text style={styles.detailText}>Size: {farm.sizeAcres || 0} acres</Text>
      <Text style={styles.detailText}>Soil: {farm.soilType || 'Not set'}</Text>

      <Pressable style={styles.viewButton} onPress={onView}>
        <Text style={styles.viewButtonText}>View</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  farmName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  detailText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  viewButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  viewButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});

export default FarmCard;
