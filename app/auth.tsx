import { authService } from '@/lib/supabaseService';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import AuthButton from '../components/ui/AuthButton';
import AuthSwitchLink from '../components/ui/AuthSwitchLink';
import FormInput from '../components/ui/FormInput';
import PasswordInput from '../components/ui/PasswordInput';
import Toast from '../components/ui/Toast'; // Uses the standalone Toast

interface FormErrors {
  email?: string;
  name?: string;
  password?: string;
}

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Toast state for this screen
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastVisible, setToastVisible] = useState(false);

  // Toast function for this screen
  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Hide toast callback for this screen
  const handleToastHide = () => {
    setToastVisible(false);
    // Optional: Clear message after hide animation in Toast.tsx completes
    // setToastMessage(null);
  };

  // FormValidation
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Invalid email address';
    if (mode === 'signup') {
      if (!name.trim()) newErrors.name = 'Name is required';
      else if (name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
    }
    if (!password) newErrors.password = 'Password is required';
    else if (mode === 'signup' && password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await authService.signIn(email.trim(), password);

      if (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
        showToast(errorMessage, 'error');
        // setLoading(false); // Ensure loading stops on error - moved to finally
        return; // Stop execution on error
      }

      // Navigate immediately after successful sign-in attempt
      router.replace('/home' as Href);
      // Optional: Show welcome message, though instant navigation might be better UX
      // showToast('Welcome back!', 'success');

    } catch (err) {
      console.error('Sign in error:', err);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
       setLoading(false); // Ensure loading stops in all cases
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await authService.signUp(email.trim(), password, name.trim());

      if (error) {
        showToast(error.message, 'error');
        // setLoading(false); // Ensure loading stops on error - moved to finally
        return; // Stop execution on error
      }

      // Navigate immediately after successful sign-up attempt
      router.replace('/home' as Href);
      // Optional: Show confirmation message, perhaps guide user to check email
      // showToast('Account created! Check your email to confirm.', 'success');

      // Clear form fields after successful signup attempt
      setName('');
      setEmail('');
      setPassword('');

    } catch (err) {
      console.error('Sign up error:', err);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
       setLoading(false); // Ensure loading stops in all cases
    }
  };

  const handleSubmit = () => {
    if (mode === 'signin') return handleSignIn();
    return handleSignUp();
  };

  const getTitle = () => {
    if (mode === 'signin') return { main: 'Welcome Back!', sub: "Sign in to continue" }; // Updated sub
    return { main: 'Create Account', sub: 'Start tracking your attendance' }; // Updated titles
  };

  const title = getTitle();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Toast component instance for this screen */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={handleToastHide}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logoImage}
            />
          </View>

          <Text style={styles.mainTitle}>{title.main}</Text>
          <Text style={styles.subtitle}>{title.sub}</Text>

          <View style={styles.form}>
            {mode === 'signup' && (
              <FormInput
                placeholder="Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                error={errors.name}
              />
            )}

            <FormInput
              placeholder="E-mail Id"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            <PasswordInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />

            <AuthButton
              onPress={handleSubmit}
              title={mode === 'signin' ? 'Sign In' : 'Sign Up'}
              loading={loading}
              disabled={loading}
            />

            <AuthSwitchLink
              mode={mode}
              onSwitch={(target) => {
                setMode(target);
                setErrors({}); // Clear errors on mode switch
              }}
            />
          </View>
        </View>
      </ScrollView> 
    </KeyboardAvoidingView> 
  );
} // <-- Corrected potential extra character issue here

// --- Styles (kept as provided previously) ---
const styles = StyleSheet.create<Record<string, any>>({
  container: { flex: 1, backgroundColor: '#0a0a0a' }, // Dark background
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 32 }, // Centered content
  content: { flex: 1, justifyContent: 'center', maxWidth: 400, width: '100%', alignSelf: 'center' }, // Max width for larger screens
  logoContainer: { alignItems: 'center', marginBottom: 40 }, // Increased margin
  logoImage: { width: 100, height: 100, borderRadius: 20 }, // Slightly smaller logo, rounded corners
  mainTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#ffffff' },
  subtitle: { color: '#9ca3af', textAlign: 'center', marginBottom: 40, fontSize: 16 }, // Lighter subtitle
  form: { width: '100%' },
  // Input styles are now handled inside FormInput and PasswordInput, but kept here for reference if needed elsewhere
  inputWrapper: { marginBottom: 32 },
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(153, 153, 153, 0.3)', // #999 with opacity
    color: '#ffffff', // White text
    paddingBottom: 12, // More padding
    fontSize: 16,
  },
  // PasswordInput styles are internal now
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 40 },
  eyeIcon: { position: 'absolute', right: 0, top: 0, padding: 4 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 8 },
  // AuthButton styles are internal now
  button: {
    backgroundColor: '#8b5cf6', // Purple button
    height: 56,
    borderRadius: 16, // More rounded
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    // Removed shadow for flatter design, uncomment if needed
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 8,
    // elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 }, // More noticeable disabled state
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  // AuthSwitchLink styles are internal now
  switchText: { textAlign: 'center', color: '#9ca3af', fontSize: 14 },
  switchLink: { color: '#8b5cf6', fontWeight: '600' }, // Bold link
  // Optional Forgot Password styles
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -16 },
  forgotPasswordText: { color: '#8b5cf6', fontSize: 14, fontWeight: '600'},
});