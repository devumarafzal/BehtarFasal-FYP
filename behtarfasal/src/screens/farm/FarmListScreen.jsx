import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FarmCard from '../../components/FarmCard';
import { theme } from '../../constants/theme';
import { auth } from '../../firebase/config';
import { getFarms } from '../../firebase/firestore';

const FarmListScreen = ({ navigation }) => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadFarms = useCallback(async () => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      setError('Please login to view your farms.');
      setFarms([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const farmList = await getFarms(userId);
      setFarms(farmList);
    } catch (err) {
      setError(err.message || 'Failed to load farms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFarms();
    }, [loadFarms])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && farms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No farms found</Text>
            <Text style={styles.emptySubtitle}>Create your first farm profile to continue.</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('AddFarm')}>
              <Text style={styles.primaryButtonText}>Add Your First Farm</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && farms.length > 0 ? (
          <FlatList
            data={farms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <FarmCard
                farm={item}
                onView={() => navigation.navigate('FarmDetail', { farmId: item.id })}
              />
            )}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  centeredState: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  emptyState: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.accentGreen,
    borderStyle: 'dashed',
    padding: theme.spacing.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.headerGreen,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  primaryButtonText: {
    color: theme.colors.headerText,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
});

export default FarmListScreen;
