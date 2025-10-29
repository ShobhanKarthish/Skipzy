import { SubjectsProvider } from '@/contexts/SubjectsContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/lib/supabaseService';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

// Prevent the native splash screen from auto-hiding.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      try {
        const { data, error } = await authService.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!data?.session);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Hide the native splash screen once the app is ready.
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Render nothing while the native splash screen is visible.
  if (isLoading) {
    return null;
  }

  return (
    <UserProfileProvider>
      <SubjectsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              <>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="subject-detail" />
              </>
            ) : (
              <Stack.Screen name="auth" />
            )}
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SubjectsProvider>
    </UserProfileProvider>
  );
}
