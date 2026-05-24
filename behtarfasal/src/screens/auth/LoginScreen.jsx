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
import { loginWithEmail } from '../../firebase/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INPUT_PLACEHOLDER_COLOR = '#7A7A7A';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError('Please enter email and password.');
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginWithEmail(trimmedEmail, password);
    } catch (err) {
      setError(err.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea } edges={['bottom', 'left', 'right']}>
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
              <View style={styles.logoIconStack}>
                <MaterialCommunityIcons
                  name="sprout"
                  size={46}
                  color={theme.colors.primary}
                  style={styles.logoLeaf}
                />
                <MaterialCommunityIcons
                  name="barley"
                  size={38}
                  color="#E7B42F"
                  style={styles.logoGrain}
                />
              </View>
            </View>

            <Text style={styles.brandTitle}>BehtarFasal</Text>
            <Text style={styles.brandUrdu}>بہتر فصل</Text>
            <Text style={styles.brandSubtitle}>Your Smart Farming Companion</Text>

            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>Sign in to continue</Text>

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

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                <Pressable onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.footerLink}>Register</Text>
                </Pressable>
              </View>
            </View>
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
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: theme.spacing.md,
  },
  logoCircle: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: '#E8EFE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  logoIconStack: {
    width: 56,
    height: 56,
  },
  logoLeaf: {
    position: 'absolute',
    left: 2,
    bottom: 0,
  },
  logoGrain: {
    position: 'absolute',
    right: -1,
    top: 3,
  },
  brandTitle: {
    fontSize: 29,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  brandUrdu: {
    fontSize: 21,
    color: theme.colors.primary,
    marginTop: 8,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#6F6F6F',
    marginTop: 10,
    marginBottom: 26,
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
    paddingTop: 24,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 24,
    color: '#252525',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#6F6F6F',
    marginBottom: 24,
    textAlign: 'center',
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
    marginTop: 28,
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
});

export default LoginScreen;
