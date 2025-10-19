import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';

// Supabase credentials from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript interface for form errors
interface FormErrors {
  email?: string;
  name?: string;
  password?: string;
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signup'); // 'signin', 'signup', 'forgot-password'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  // Cooldown timer for password reset
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        newErrors.name = 'Name is required';
      } else if (name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
    }

    if (mode !== 'forgot-password') {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (mode === 'signup' && password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
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
        Alert.alert('Sign In Failed', error.message);
        return;
      }

      Alert.alert('Success', 'Welcome back!');
      // Navigate to home screen - add your navigation logic here
      console.log('Signed in user:', data.user);
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Sign up with email, password and name in metadata
      // The database trigger will automatically create the user profile
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
        return;
      }

      // Note: The trigger handle_new_user() automatically creates the profile
      // No need to manually insert into users table
      
      Alert.alert(
        'Success', 
        'Account created! Please check your email to confirm your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form and switch to sign in
              setName('');
              setEmail('');
              setPassword('');
              setMode('signin');
            }
          }
        ]
      );
      
      console.log('Signed up user:', data.user);
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'skipzy://reset-password', // Update with your app's deep link
      });

      if (error) {
        Alert.alert('Reset Failed', error.message);
        return;
      }

      Alert.alert('Success', 'Password reset link sent! Check your email');
      setResetCooldown(60);
      setEmail('');
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
      console.error('Password reset error:', error);
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
    if (mode === 'signup') return { main: 'Welcome to SKIPZY', sub: 'Attendance matters, but so does you' };
    return { main: 'Reset Your Password', sub: 'Password? Yeah... I forget that too' };
  };

  const title = getTitle();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="fitness" size={64} color="#fff" />
          </View>

          {/* Title */}
          <Text style={styles.mainTitle}>
            {mode === 'signup' ? (
              <>
                Welcome to <Text style={styles.primaryText}>SKIPZY</Text>
              </>
            ) : mode === 'forgot-password' ? (
              <>
                Reset Your <Text style={styles.primaryText}>Password</Text>
              </>
            ) : (
              'Welcome Back!'
            )}
          </Text>
          <Text style={styles.subtitle}>{title.sub}</Text>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoCapitalize="words"
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="E-mail Id"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {mode !== 'forgot-password' && (
              <View style={styles.inputWrapper}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={[styles.input, styles.passwordInput]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>
            )}

            {mode === 'signin' && (
              <TouchableOpacity
                onPress={() => setMode('forgot-password')}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || resetCooldown > 0}
              style={[
                styles.button,
                (loading || resetCooldown > 0) && styles.buttonDisabled,
              ]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {resetCooldown > 0
                    ? `Wait ${resetCooldown}s`
                    : mode === 'signin'
                    ? 'Sign in'
                    : mode === 'signup'
                    ? 'Sign Up'
                    : 'Send Reset Link'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'signin' && (
              <Text style={styles.switchText}>
                Don't have an account?{' '}
                <Text
                  onPress={() => {
                    setMode('signup');
                    setErrors({});
                  }}
                  style={styles.switchLink}
                >
                  Sign Up
                </Text>
              </Text>
            )}

            {mode === 'signup' && (
              <Text style={styles.switchText}>
                Already have an account?{' '}
                <Text
                  onPress={() => {
                    setMode('signin');
                    setErrors({});
                  }}
                  style={styles.switchLink}
                >
                  Sign In
                </Text>
              </Text>
            )}

            {mode === 'forgot-password' && (
              <Text style={styles.switchText}>
                Remember your password?{' '}
                <Text
                  onPress={() => {
                    setMode('signin');
                    setErrors({});
                  }}
                  style={styles.switchLink}
                >
                  Sign In
                </Text>
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.footer}>Made With Love ❤️</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#fff',
  },
  primaryText: {
    color: '#8b5cf6',
  },
  subtitle: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 48,
    fontSize: 14,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(153, 153, 153, 0.3)',
    color: '#fff',
    paddingBottom: 8,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    marginTop: -16,
  },
  forgotPasswordText: {
    color: '#8b5cf6',
    fontSize: 14,
  },
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  switchLink: {
    color: '#8b5cf6',
    fontWeight: '500',
  },
  footer: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
  },
});
