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

  useEffect(() => {
    if (visible && message) {
      Animated.timing(anim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timeout = setTimeout(() => {
        Animated.timing(anim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onHide?.();
        });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [visible, message]);

  if (!visible || !message) return null;

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
    top: 0,
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
    flex: 1,
  },
});

export default Toast;
