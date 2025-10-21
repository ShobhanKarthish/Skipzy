import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { useRouter, type Href } from 'expo-router';

import Toast from '../components/ui/Toast';
import FormInput from '../components/ui/FormInput';
import PasswordInput from '../components/ui/PasswordInput';
import AuthButton from '../components/ui/AuthButton';
import AuthSwitchLink from '../components/ui/AuthSwitchLink';

// Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FormErrors {
  email?: string;
  name?: string;
  password?: string;
}

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signup');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastVisible, setToastVisible] = useState(false);

  // Cooldown timer for password reset
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  // Toast function
  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Hide toast callback
  const handleToastHide = () => {
    setToastVisible(false);
    setToastMessage(null);
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
    if (mode !== 'forgot-password') {
      if (!password) newErrors.password = 'Password is required';
      else if (mode === 'signup' && password.length < 6)
        newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        showToast(error.message, 'error');
        return;
      }
      showToast('Welcome back!', 'success');
      router.replace('/home' as Href);
      console.log('Signed in user:', data.user);
    } catch (err) {
      console.error('Sign in error:', err);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) {
        showToast(error.message, 'error');
        return;
      }
      showToast('Account created! Check your email to confirm.', 'success');
      setName('');
      setEmail('');
      setPassword('');
      router.replace('/home' as Href);
      console.log('Signed up user:', data.user);
    } catch (err) {
      console.error('Sign up error:', err);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'skipzy://reset-password',
      });

      if (error) {
        showToast(error.message, 'error');
        return;
      }
      showToast('Password reset link sent! Check your email.', 'success');
      setResetCooldown(60);
      setEmail('');
    } catch (err) {
      console.error('Password reset error:', err);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'signin') return handleSignIn();
    if (mode === 'signup') return handleSignUp();
    return handleForgotPassword();
  };

  const getTitle = () => {
    if (mode === 'signin') return { main: 'Welcome Back!', sub: "Oh, you're back? Makes sense" };
    if (mode === 'signup') return { main: 'Welcome to SKIPZY', sub: 'Attendance matters, but so do you' };
    return { main: 'Reset Your Password', sub: 'Password? Yeah... I forget that too' };
  };

  const title = getTitle();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={handleToastHide}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Ionicons name="fitness" size={64} color="#fff" />
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
                style={styles.input}
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
              style={styles.input}
            />

            {mode !== 'forgot-password' && (
              <PasswordInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                style={styles.input}
              />
            )}

            {mode === 'signin' && (
              <View style={styles.forgotPassword}>
                <Text
                  style={styles.forgotPasswordText}
                  onPress={() => setMode('forgot-password')}
                >
                  Forgot Password?
                </Text>
              </View>
            )}

            <AuthButton
              onPress={handleSubmit}
              title={
                resetCooldown > 0
                  ? `Wait ${resetCooldown}s`
                  : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                  ? 'Sign Up'
                  : 'Send Reset Link'
              }
              loading={loading}
              disabled={loading || resetCooldown > 0}
              style={styles.button}
            />

            <AuthSwitchLink
              mode={mode}
              onSwitch={(target) => {
                setMode(target);
                setErrors({});
              }}
            />
          </View>
        </View>

        <Text style={styles.footer}>Made With Love ❤️</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create<Record<string, any>>({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between', padding: 32 },
  content: { flex: 1, justifyContent: 'center', maxWidth: 448, width: '100%', alignSelf: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  mainTitle: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#fff' },
  subtitle: { color: '#999', textAlign: 'center', marginBottom: 48, fontSize: 14 },
  form: { width: '100%' },
  inputWrapper: { marginBottom: 32 },
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(153,153,153,0.3)',
    color: '#fff',
    paddingBottom: 8,
    fontSize: 16,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 40 },
  eyeIcon: { position: 'absolute', right: 0, top: 0, padding: 4 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 8 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 32, marginTop: -16 },
  forgotPasswordText: { color: '#8b5cf6', fontSize: 14 },
  button: {
    backgroundColor: '#8b5cf6',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  switchText: { textAlign: 'center', color: '#999', fontSize: 14 },
  switchLink: { color: '#8b5cf6', fontWeight: '500' },
  footer: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 32 },
});

