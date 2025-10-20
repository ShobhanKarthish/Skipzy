import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Performance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 0,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
    position: 'absolute',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBarIcon: {
    marginBottom: -4,
  },
});