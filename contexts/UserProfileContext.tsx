import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  name: string;
  course: string;
  year: string;
  institution: string;
  studentId: string;
  email: string;
  avatarUri?: string;
}

interface UserProfileContextType {
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  darkMode: boolean;
  toggleDarkMode: () => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  resetAllData: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const DEFAULT_PROFILE: UserProfile = {
  name: 'Shobhan',
  course: 'BDS',
  year: '3rd Year',
  institution: 'Dental College',
  studentId: 'DC2022001',
  email: 'shobhan@example.com',
};

const STORAGE_KEYS = {
  USER_PROFILE: '@skipzy_user_profile',
  DARK_MODE: '@skipzy_dark_mode',
  NOTIFICATIONS: '@skipzy_notifications',
  LANGUAGE: '@skipzy_language',
};

export const UserProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [darkMode, setDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguageState] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load all data from AsyncStorage on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [profileData, darkModeData, notificationsData, languageData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
      ]);

      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      }
      if (darkModeData !== null) {
        setDarkMode(JSON.parse(darkModeData));
      }
      if (notificationsData !== null) {
        setNotificationsEnabled(JSON.parse(notificationsData));
      }
      if (languageData) {
        setLanguageState(languageData);
      }

      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      setIsLoaded(true);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      const newProfile = { ...userProfile, ...updates };
      setUserProfile(newProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(newProfile));
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
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
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.DARK_MODE,
        STORAGE_KEYS.NOTIFICATIONS,
        STORAGE_KEYS.LANGUAGE,
      ]);
      
      // Reset to defaults
      setUserProfile(DEFAULT_PROFILE);
      setDarkMode(true);
      setNotificationsEnabled(true);
      setLanguageState('en');
    } catch (error) {
      console.error('Error resetting data:', error);
      throw error;
    }
  };

  // Don't render children until data is loaded
  if (!isLoaded) {
    return null; // Or return a loading screen component
  }

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        updateUserProfile,
        darkMode,
        toggleDarkMode,
        notificationsEnabled,
        toggleNotifications,
        language,
        setLanguage,
        resetAllData,
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