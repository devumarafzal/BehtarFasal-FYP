import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { auth } from '../../firebase/config';
import { deleteFarm, getFarm } from '../../firebase/firestore';

const FarmDetailScreen = ({ navigation, route }) => {
  const { farmId } = route.params || {};

  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadFarm = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || !farmId) {
      setError('Unable to find this farm.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const farmData = await getFarm(userId, farmId);
      if (!farmData) {
        setError('Farm not found.');
        return;
      }
      setFarm(farmData);
    } catch (err) {
      setError(err.message || 'Failed to load farm details.');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useFocusEffect(
    useCallback(() => {
      loadFarm();
    }, [loadFarm])
  );

  const handleDeleteFarm = () => {
    Alert.alert('Delete Farm', 'Are you sure you want to delete this farm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const userId = auth.currentUser?.uid;
          if (!userId) {
            setError('Please login again to delete this farm.');
            return;
          }

          setLoading(true);
          setError('');

          try {
            await deleteFarm(userId, farmId);
            navigation.navigate('MainTabs', { screen: 'My Farms' });
          } catch (err) {
            setError(err.message || 'Unable to delete farm.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderInfoRow = (label, value) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || 'Not set'}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {farm ? (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Farm Details</Text>
              {renderInfoRow('Farm Name', farm.farmName)}
              {renderInfoRow('Farmer Name', farm.farmerName)}
              {renderInfoRow('Farm Size (Acres)', String(farm.sizeAcres || 0))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Location</Text>
              {renderInfoRow('Province', farm.province)}
              {renderInfoRow('District', farm.district)}
              {renderInfoRow('Village', farm.village)}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Soil Health</Text>
              {renderInfoRow('Soil Type', farm.soilType)}
              {renderInfoRow('pH Level', String(farm.phLevel ?? 6.5))}
              {renderInfoRow('Nitrogen', String(farm.nitrogen ?? 0))}
              {renderInfoRow('Phosphorus', String(farm.phosphorus ?? 0))}
              {renderInfoRow('Potassium', String(farm.potassium ?? 0))}
              {renderInfoRow('Rainfall (mm)', String(farm.rainfall ?? 0))}
              {renderInfoRow('Humidity (%)', String(farm.humidity ?? 0))}
              {renderInfoRow('Temperature (C)', String(farm.temperature ?? 0))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cropping Practices</Text>
              {renderInfoRow('Cropping System', farm.croppingSystem)}
              {renderInfoRow('Soil Sustainability', farm.soilSustainability)}
              {renderInfoRow(
                'Irrigation',
                Array.isArray(farm.irrigationFacilities)
                  ? farm.irrigationFacilities.join(', ')
                  : 'Not set'
              )}
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate('CropRecommend', { farmId: farm.id })}
            >
              <Text style={styles.primaryButtonText}>Get Crop Recommendation</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() =>
                  navigation.navigate('AddFarm', {
                    farmId: farm.id,
                    farm,
                  })
                }
              >
                <Text style={styles.secondaryButtonText}>Edit Farm</Text>
              </Pressable>

              <Pressable style={styles.deleteButton} onPress={handleDeleteFarm}>
                <Text style={styles.deleteButtonText}>Delete Farm</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  rowLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  rowValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  deleteButton: {
    width: '48%',
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});

export default FarmDetailScreen;
