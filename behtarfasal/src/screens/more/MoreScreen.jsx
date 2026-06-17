import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

const MoreScreen = ({ navigation }) => {
  const [loading] = useState(false);
  const [error] = useState('');

  const items = [
    {
      key: 'profile',
      title: 'Profile',
      subtitle: 'Update your account details',
      icon: 'person-circle',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      key: 'calendar',
      title: 'Farming Calendar',
      subtitle: 'View your weekly plan',
      icon: 'calendar',
      onPress: () => navigation.navigate('Calendar'),
    },
    {
      key: 'fertilizer',
      title: 'Fertilizer Suggestion',
      subtitle: 'Smart nutrient guidance',
      icon: 'flask',
      onPress: () => navigation.navigate('Fertilizer'),
    },
    {
      key: 'disease',
      title: 'Crop Disease Detection',
      subtitle: 'Identify crop issues',
      icon: 'bug',
      onPress: () => navigation.navigate('DiseaseDetect'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Extra tools and account settings.</Text> */}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tools</Text>
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loaderRow}>
            <Text style={styles.loaderText}>Loading options...</Text>
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
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
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
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  loaderRow: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  loaderText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
});

export default MoreScreen;
