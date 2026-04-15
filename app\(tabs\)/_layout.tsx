import { Tabs } from 'expo-router';
import React from 'react';
import { IconButton } from 'react-native-paper';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { Colors } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { Alert } from 'react-native';

function HeaderRight() {
  const { logout } = useAuthStore();
  const handleLogout = () => {
    Alert.alert(
      'Logout?',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logout() },
      ]
    );
  };
  return (
    <IconButton
      icon="logout"
      size={24}
      iconColor="#FFFFFF"
      onPress={handleLogout}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const tintColor = colorScheme === 'dark' ? Colors.white : Colors.primary;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6200EE',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Departures',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bus.fill" color={color} />,
          headerTitle: '🚌 Current Departures',
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Upcoming',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          headerTitle: '📅 Upcoming',
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My Tickets',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="ticket.fill" color={color} />,
          headerTitle: '🎫 My Tickets',
        }}
      />
      <Tabs.Screen
        name="auto-grab"
        options={{
          title: 'Auto-Grab',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="timer" color={color} />,
          headerTitle: '🎯 Auto-Grab',
        }}
      />
      <Tabs.Screen
        name="scheduled"
        options={{
          title: 'Scheduled',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
          headerTitle: '📋 Scheduled',
        }}
      />
    </Tabs>
  );
}
