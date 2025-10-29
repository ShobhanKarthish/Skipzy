import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error';
  visible: boolean;
  onHide?: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', visible, onHide }) => {
  const anim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Ref to hold timeout ID

  useEffect(() => {
    // Clear previous timeout if it exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (visible && message) {
      Animated.timing(anim, {
        toValue: 50, // Position below status bar likely
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        Animated.timing(anim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onHide?.(); // Call onHide after animation finishes
        });
      }, 3000); // Duration toast is visible

    } else if (!visible) {
        // If visibility is toggled off externally, animate out immediately
        Animated.timing(anim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
    }

    // Cleanup function for when component unmounts or dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, message, onHide]); // Dependencies for the effect

  // Render null if not visible or no message to prevent rendering empty space
  if (!message) return null;

  return (
    <Animated.View style={[
      styles.toastContainer,
      { transform: [{ translateY: anim }] },
      type === 'error' ? styles.toastError : styles.toastSuccess
    ]}>
      <Ionicons
        name={type === 'error' ? 'alert-circle' : 'checkmark-circle'}
        size={22}
        color="#ffffff"
      />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0, // Initial position off-screen, animated to `toValue`
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastSuccess: { backgroundColor: '#10b981' },
  toastError: { backgroundColor: '#ef4444' },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1, // Allow text to wrap
  },
});

export default Toast;