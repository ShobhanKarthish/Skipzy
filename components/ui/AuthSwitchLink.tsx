import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface AuthSwitchLinkProps {
  mode: 'signin' | 'signup' | 'forgot-password';
  onSwitch: (targetMode: 'signin' | 'signup') => void;
}

const AuthSwitchLink: React.FC<AuthSwitchLinkProps> = ({ mode, onSwitch }) => {
  let text = '', link = '', targetMode: 'signin' | 'signup' = 'signin';

  if (mode === 'signin') {
    text = "Don't have an account? ";
    link = 'Sign Up';
    targetMode = 'signup';
  } else if (mode === 'signup') {
    text = 'Already have an account? ';
    link = 'Sign In';
    targetMode = 'signin';
  } else {
    text = 'Remember your password? ';
    link = 'Sign In';
    targetMode = 'signin';
  }
  return (
    <Text style={styles.switchText}>
      {text}
      <Text style={styles.switchLink} onPress={() => onSwitch(targetMode)}>
        {link}
      </Text>
    </Text>
  );
};

const styles = StyleSheet.create({
  switchText: { textAlign: 'center', color: '#999', fontSize: 14 },
  switchLink: { color: '#8b5cf6', fontWeight: '500' },
});

export default AuthSwitchLink;
