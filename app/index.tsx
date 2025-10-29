import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Use a fast synchronous check first
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      // Quick session check - don't wait for network
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is authenticated, redirect to home immediately
        router.replace('/(tabs)/home');
      } else {
        // No session, redirect to auth
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // On error, redirect to auth screen
      router.replace('/auth');
    } finally {
      setIsChecking(false);
    }
  };

  // Minimal loading screen
  if (!isChecking) {
    return null;
  }

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