import { SubjectsProvider } from '@/contexts/SubjectsContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/lib/supabaseService';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const { data, error } = await authService.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setIsAuthenticated(false);
        return;
      }
      setIsAuthenticated(!!data?.session);
    };

    checkAuth();

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return null; // Or return a loading screen
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