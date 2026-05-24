import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { registerWithEmail } from '../../firebase/auth';
import { createUserProfile } from '../../firebase/firestore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,59}$/;
const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const INPUT_PLACEHOLDER_COLOR = '#7A7A7A';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!NAME_PATTERN.test(trimmedName)) {
      setError('Name must be 2-60 characters and contain valid letters only.');
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!PASSWORD_COMPLEXITY_PATTERN.test(password)) {
      setError('Password must be at least 6 characters and include letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await registerWithEmail(trimmedEmail, password, trimmedName);

      await createUserProfile(user.uid, {
        name: trimmedName,
        email: trimmedEmail,
        phone: '',
        language: 'english',
      });
    } catch (err) {
      setError(err.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="sprout" size={44} color={theme.colors.primaryLight} />
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join BehtarFasal today</Text>

            <View style={styles.formCard}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  keyboardType="default"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (error) {
                      setError('');
                    }
                  }}
                />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) {
                      setError('');
                    }
                  }}
                />
              </View>

              <View style={[styles.inputWrapper, styles.passwordRow]}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  secureTextEntry={!showPassword}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) {
                      setError('');
                    }
                  }}
                />
                <Pressable
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={28}
                    color="#8A8A8A"
                  />
                </Pressable>
              </View>

              <View style={[styles.inputWrapper, styles.passwordRow]}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm Password"
                  placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                  secureTextEntry={!showConfirmPassword}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (error) {
                      setError('');
                    }
                  }}
                />
                <Pressable
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={28}
                    color="#8A8A8A"
                  />
                </Pressable>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Pressable onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F3F3',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  logoCircle: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: '#E8EFE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DCDCDC',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 18,
    minHeight: 58,
    marginBottom: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#4F4F4F',
    fontSize: 16,
    paddingVertical: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  passwordToggle: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontWeight: '600',
    fontSize: 19,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 26,
    alignItems: 'center',
  },
  footerText: {
    color: '#6F6F6F',
    fontSize: 17,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  termsText: {
    color: '#8B8B8B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: 26,
    lineHeight: 26,
    maxWidth: 350,
  },
});

export default RegisterScreen;
