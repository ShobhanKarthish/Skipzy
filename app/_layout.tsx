import { SubjectsProvider } from '@/contexts/SubjectsContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen after a short delay to allow initial render
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <UserProfileProvider>
      <SubjectsProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Index screen handles auth redirect */}
            <Stack.Screen name="index" />
            {/* Auth screen for login/signup */}
            <Stack.Screen name="auth" />
            {/* Main app tabs */}
            <Stack.Screen name="(tabs)" />
            {/* Modal screens */}
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="subject-detail" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SubjectsProvider>
    </UserProfileProvider>
  );
}