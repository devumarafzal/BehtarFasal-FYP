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
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.accentGreen,
  },
  farmName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.headerGreen,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.2,
  },
  detailText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  viewButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.headerGreen,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  viewButtonText: {
    color: theme.colors.headerText,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default FarmCard;
