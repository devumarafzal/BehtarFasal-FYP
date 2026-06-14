import { useEffect, useCallback, useState, useContext } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WeatherCard from '../../components/WeatherCard';
import { theme } from '../../constants/theme';
import { auth } from '../../firebase/config';
import { getFarms, getUserProfile, getAllCalendarPlans } from '../../firebase/firestore';
import { WeatherContext } from '../../contexts/WeatherContext';

const DashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('Farmer');
  const [totalFarms, setTotalFarms] = useState(0);
  const [activeCrops, setActiveCrops] = useState(0);
  const [recentFarms, setRecentFarms] = useState([]);

  const { weather, weatherLoading } = useContext(WeatherContext);

  const loadDashboard = useCallback(async () => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      setError('Please login to access your dashboard.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [profile, farms, calendarPlans] = await Promise.all([
        getUserProfile(userId), 
        getFarms(userId),
        getAllCalendarPlans(userId)
      ]);

      setUserName(profile?.name || auth.currentUser?.displayName || 'Farmer');
      setTotalFarms(farms.length);
      setRecentFarms(farms.slice(0, 3));

      // Calculate active crops (number of saved calendars in all farms)
      setActiveCrops(calendarPlans.length);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>Assalamu Alaikum, {userName}!</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Farms</Text>
                <Text style={styles.summaryValue}>{totalFarms}</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Active Crops</Text>
                <Text style={styles.summaryValue}>{activeCrops}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Weather</Text>
              <Pressable onPress={() => navigation.navigate('Weather')}>
                <Text style={styles.linkText}>See Full</Text>
              </Pressable>
            </View>

            {weatherLoading ? (
              <View style={styles.weatherLoader}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : (
              <WeatherCard weather={weather} />
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Farms</Text>
              <Pressable onPress={() => navigation.navigate('My Farms')}>
                <Text style={styles.linkText}>See All</Text>
              </Pressable>
            </View>

            {recentFarms.length === 0 ? (
              <Text style={styles.emptyText}>No farms available yet.</Text>
            ) : (
              recentFarms.map((farm) => (
                <Pressable
                  key={farm.id}
                  style={styles.recentCard}
                  onPress={() => navigation.navigate('FarmDetail', { farmId: farm.id })}
                >
                  <Text style={styles.recentTitle}>{farm.farmName || 'Unnamed Farm'}</Text>
                  <Text style={styles.recentMeta}>
                    {farm.district || 'Unknown District'}, {farm.province || 'Unknown Province'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
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
  greeting: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  loadingBlock: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
  },
  sectionHeader: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  weatherLoader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  recentCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  recentTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  recentMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
});

export default DashboardScreen;
