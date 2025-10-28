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
import Toast from '../components/ui/Toast';

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

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastVisible, setToastVisible] = useState(false);

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
        return;
      }
      
      // Navigate immediately for better UX
      router.replace('/home' as Href);
      showToast('Welcome back!', 'success');
      if (data) {
        console.log('Signed in user:', data.user);
      }
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
      const { data, error } = await authService.signUp(email.trim(), password, name.trim());

      if (error) {
        showToast(error.message, 'error');
        return;
      }
      
      // Navigate immediately for better UX
      router.replace('/home' as Href);
      showToast('Account created! Check your email to confirm.', 'success');
      setName('');
      setEmail('');
      setPassword('');
      console.log('Signed up user:', data.user);
    } catch (err) {
      console.error('Sign up error:', err);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'signin') return handleSignIn();
    return handleSignUp();
  };

  const getTitle = () => {
    if (mode === 'signin') return { main: 'Welcome Back!', sub: "Oh, you're back? Makes sense" };
    return { main: 'Welcome to SKIPZY', sub: 'Attendance matters, but so do you' };
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

            <PasswordInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              style={styles.input}
            />

            <AuthButton
              onPress={handleSubmit}
              title={mode === 'signin' ? 'Sign In' : 'Sign Up'}
              loading={loading}
              disabled={loading}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create<Record<string, any>>({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between', padding: 32 },
  content: { flex: 1, justifyContent: 'center', maxWidth: 448, width: '100%', alignSelf: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 120, height: 120, borderRadius: 24 },
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
});

