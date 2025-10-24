import { authService, userService } from '@/lib/supabaseService';
import { AppUserProfile } from '@/types/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface UserProfileContextType {
  userProfile: AppUserProfile | null;
  loading: boolean;
  error: string | null;
  updateUserProfile: (updates: Partial<AppUserProfile>) => Promise<boolean>;
  darkMode: boolean;
  toggleDarkMode: () => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  resetAllData: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const STORAGE_KEYS = {
  DARK_MODE: '@skipzy_dark_mode',
  NOTIFICATIONS: '@skipzy_notifications',
  LANGUAGE: '@skipzy_language',
};

export const UserProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguageState] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user profile from Supabase
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await userService.getCurrentUser();
      setUserProfile(profile);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  // Load local preferences from AsyncStorage
  const loadLocalPreferences = async () => {
    try {
      const [darkModeData, notificationsData, languageData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
      ]);

      if (darkModeData !== null) {
        setDarkMode(JSON.parse(darkModeData));
      }
      if (notificationsData !== null) {
        setNotificationsEnabled(JSON.parse(notificationsData));
      }
      if (languageData) {
        setLanguageState(languageData);
      }
    } catch (error) {
      console.error('Error loading local preferences:', error);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadUserProfile();
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setError(null);
      }
    });

    // Load data on mount
    const initializeData = async () => {
      await loadLocalPreferences();
      
      // Check if user is already signed in
      const { data } = await authService.getSession();
      if (data?.session) {
        await loadUserProfile();
      }
      
      setIsLoaded(true);
    };
    
    initializeData();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateUserProfile = async (updates: Partial<AppUserProfile>): Promise<boolean> => {
    try {
      setError(null);
      const success = await userService.updateUserProfile(updates);
      
      if (success) {
        // Update local state immediately for better UX
        setUserProfile(prev => prev ? { ...prev, ...updates } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating user profile:', err);
      setError('Failed to update user profile');
      return false;
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newValue = !darkMode;
      setDarkMode(newValue);
      await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(newValue));
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newValue));
    } catch (error) {
      console.error('Error saving notifications preference:', error);
    }
  };

  const setLanguage = async (lang: string) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const resetAllData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.DARK_MODE,
        STORAGE_KEYS.NOTIFICATIONS,
        STORAGE_KEYS.LANGUAGE,
      ]);
      
      // Reset to defaults
      setDarkMode(true);
      setNotificationsEnabled(true);
      setLanguageState('en');
      
      // Note: We don't reset userProfile here as it's managed by Supabase
      // The user would need to sign out to clear their profile data
    } catch (error) {
      console.error('Error resetting data:', error);
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    await loadUserProfile();
  };

  // Don't render children until data is loaded
  if (!isLoaded) {
    return null; // Or return a loading screen component
  }

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        loading,
        error,
        updateUserProfile,
        darkMode,
        toggleDarkMode,
        notificationsEnabled,
        toggleNotifications,
        language,
        setLanguage,
        resetAllData,
        refreshUserProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
};