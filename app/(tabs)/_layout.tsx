import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useAuthStore } from '../../stores/authStore';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { logout } = useAuthStore();

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title;
          const isFocused = state.index === index;

          const icons: Record<string, string> = {
            'index': 'bus.fill',
            'upcoming': 'calendar',
            'tickets': 'ticket.fill',
            'auto-grab': 'timer',
            'scheduled': 'list.bullet',
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isFocused && styles.tabFocused]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
                <IconSymbol
                  name={icons[route.name] as any}
                  size={20}
                  color={isFocused ? '#14B8A6' : '#71717A'}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={styles.logoutTab}
          onPress={() => logout()}
        >
          <View style={styles.iconContainer}>
            <IconSymbol name="logout" size={20} color="#EF4444" />
          </View>
          <Text style={[styles.tabLabel, { color: '#EF4444' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0A0A0A',
          borderBottomWidth: 1,
          borderBottomColor: '#27272A',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Departures' }} />
      <Tabs.Screen name="upcoming" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="auto-grab" options={{ title: 'Auto-Grab' }} />
      <Tabs.Screen name="scheduled" options={{ title: 'Scheduled' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 3,
  },
  tabFocused: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#71717A',
  },
  tabLabelActive: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  logoutTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 3,
  },
});
