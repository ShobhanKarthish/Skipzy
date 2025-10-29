import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '@/lib/supabaseService';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data } = await authService.getSession();
      
      if (data?.session) {
        // User is authenticated, redirect to home
        router.replace('/(tabs)/home');
      } else {
        // No session, redirect to auth
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // On error, redirect to auth screen
      router.replace('/auth');
    }
  };

  // Show loading indicator while checking auth
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8b5cf6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
});