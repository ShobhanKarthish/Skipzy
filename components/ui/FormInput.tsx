import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';

interface FormInputProps extends TextInputProps {
  error?: string;
}

const FormInput: React.FC<FormInputProps> = ({ error, style, ...props }) => (
  <View style={styles.inputWrapper}>
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#999"
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

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
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 8 },
});

export default FormInput;
