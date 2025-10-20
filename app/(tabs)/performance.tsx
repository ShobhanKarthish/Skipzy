import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

export default function PerformanceScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <Text style={styles.text}>Performance Screen</Text>
      <Text style={styles.subText}>Coming Soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    color: '#9ca3af',
    fontSize: 16,
  },
});