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
  },
  emptyState: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
});

export default FarmListScreen;
