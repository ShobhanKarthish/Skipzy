import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface PasswordInputProps extends TextInputProps {
  error?: string;
  style?: object;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ error, style, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput, style]}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          placeholderTextColor="#999"
          {...props}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
          activeOpacity={0.7}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#999" />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: { marginBottom: 32 },
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(153,153,153,0.3)',
    color: '#fff',
    paddingBottom: 8,
    fontSize: 16,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 40 },
  eyeIcon: { position: 'absolute', right: 0, top: 0, padding: 4 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 8 },
});

export default PasswordInput;
