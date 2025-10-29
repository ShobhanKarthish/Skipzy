import { SubjectsProvider } from '@/contexts/SubjectsContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/lib/supabaseService';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

// Prevent the native splash screen from auto-hiding before auth check.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Initialize isAuthenticated based on a potential synchronous check if possible,
  // otherwise default to false until the async check completes.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Start in loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state asynchronously
    const checkAuth = async () => {
      try {
        // Attempt to get the current session
        const { data, error } = await authService.getSession();

        if (error) {
          // Log error and assume not authenticated
          console.error('Error getting session on startup:', error.message);
          setIsAuthenticated(false);
        } else {
          // Update auth state based on session presence
          setIsAuthenticated(!!data?.session);
        }
      } catch (e) {
        // Catch any unexpected errors during the session check
        console.error('Unexpected error during session check:', e);
        setIsAuthenticated(false);
      } finally {
        // Crucially, set loading to false only after the check is fully complete
        setIsLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      // Update the auth state whenever it changes (login, logout)
      setIsAuthenticated(!!session);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Hide splash screen only when loading is finished
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]); // Run this effect when isLoading changes

  // Render nothing while checking auth state and splash screen is visible
  if (isLoading) {
    return null;
  }

  // Render the appropriate stack based on authentication state
  return (
    <UserProfileProvider>
      <SubjectsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              // Screens for authenticated users
              <>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="subject-detail" />
              </>
            ) : (
              // Auth screen for unauthenticated users
              <Stack.Screen name="auth" />
            )}
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SubjectsProvider>
    </UserProfileProvider>
  );
}
