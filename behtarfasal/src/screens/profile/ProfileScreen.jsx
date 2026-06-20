import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { logoutUser } from '../../firebase/auth';
import { auth } from '../../firebase/config';
import { createUserProfile, getFarms, getUserProfile, updateUserProfile } from '../../firebase/firestore';

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,59}$/;
const PHONE_PATTERN = /^\+?[0-9\s-]{10,15}$/;
const PHONE_INPUT_PATTERN = /^[0-9+\-\s]*$/;

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Not available';
  }

  if (typeof timestamp?.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString();
  }

  if (typeof timestamp?.seconds === 'number') {
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  }

  return 'Not available';
};

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileMeta, setProfileMeta] = useState({
    email: '',
    memberSince: 'Not available',
    farmsCount: 0,
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const loadProfile = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    const authEmail = auth.currentUser?.email || '';

    if (!userId) {
      setError('Please login again to view your profile.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [profile, farms] = await Promise.all([getUserProfile(userId), getFarms(userId)]);
      const source = profile || {
        name: auth.currentUser?.displayName || '',
        email: authEmail,
        phone: '',
      };

      setFormData({
        name: source.name || '',
        phone: source.phone || '',
      });

      setProfileMeta({
        email: source.email || authEmail,
        memberSince: formatTimestamp(profile?.createdAt),
        farmsCount: farms.length,
      });
    } catch (err) {
      setError(err.message || 'Unable to load your profile details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const validateForm = () => {
    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName) {
      return 'Name is required.';
    }

    if (!NAME_PATTERN.test(trimmedName)) {
      return 'Name must be 2-60 characters with valid letters.';
    }

    if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone)) {
      return 'Phone number must be 10-15 digits (you can use +, spaces, or hyphen).';
    }

    return '';
  };

  const canSave = useMemo(() => !loading && !saving, [loading, saving]);

  const updateField = (field, value) => {
    if (field === 'phone' && !PHONE_INPUT_PATTERN.test(value)) {
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) {
      setError('');
    }
  };

  const handleSaveProfile = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError('Please login again to save your profile.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        email: profileMeta.email,
        phone: formData.phone.trim(),
      };

      const existingProfile = await getUserProfile(userId);
      if (existingProfile) {
        await updateUserProfile(userId, payload);
      } else {
        await createUserProfile(userId, payload);
      }

      Alert.alert('Success', 'Profile updated successfully.');
      await loadProfile();
    } catch (err) {
      setError(err.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutUser();
          } catch (err) {
            setError(err.message || 'Unable to logout right now.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* <Text style={styles.title}>My Profile</Text> */}
        {/* <Text style={styles.subtitle}>Manage your account and farming preferences.</Text> */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.metaText}>Email: {profileMeta.email || 'Not available'}</Text>
          <Text style={styles.metaText}>Member since: {profileMeta.memberSince}</Text>
          <Text style={styles.metaText}>Total farms: {profileMeta.farmsCount}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Details</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="words"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        <Pressable style={[styles.primaryButton, !canSave && styles.buttonDisabled]} onPress={handleSaveProfile} disabled={!canSave}>
          {saving ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Save Profile</Text>
          )}
        </Pressable>

        <View style={styles.quickRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'My Farms' })}
          >
            <Text style={styles.secondaryButtonText}>My Farms</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('AddFarm')}>
            <Text style={styles.secondaryButtonText}>Add Farm</Text>
          </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
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
    color: theme.colors.headerGreen,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    fontWeight: '500',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 2,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accentGreen,
  },
  cardTitle: {
    color: theme.colors.headerGreen,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.4,
  },
  metaText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  fieldBlock: {
    marginBottom: theme.spacing.md,
  },
  label: {
    color: theme.colors.headerGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#FAFFFE',
    borderWidth: 2,
    borderColor: theme.colors.accentGreen,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  loaderContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.headerGreen,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: theme.colors.headerText,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accentGreen,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  secondaryButtonText: {
    color: theme.colors.headerGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoutButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});

export default ProfileScreen;
