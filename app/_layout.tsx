import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../stores/authStore';
import { HeroUINativeProvider } from 'heroui-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000 },
    mutations: { retry: false },
  },
});

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: 'hsl(217, 91%, 60%)',
    background: 'hsl(240, 10%, 6%)',
    card: 'hsl(240, 6%, 10%)',
    text: 'hsl(0, 0%, 98%)',
    border: 'hsl(240, 6%, 20%)',
  },
};

function RootLayoutNav() {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const lastAuthenticatedRef = useRef<boolean | null>(null);

  useEffect(() => {
    checkAuthStatus().catch(e => console.error('Auth check failed:', e));
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inBooking = segments.join('/') === 'booking' || (segments as string[]).includes('booking');
    const inLogin = segments[0] === 'login' || segments[0] === 'manual-login';

    if (inBooking) return;

    if (isAuthenticated === lastAuthenticatedRef.current) {
      if (!isAuthenticated && inAuthGroup) {
        router.replace('/login');
      } else if (isAuthenticated && !inAuthGroup && !inBooking) {
        router.replace('/');
      }
      return;
    }

    lastAuthenticatedRef.current = isAuthenticated;

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inLogin) {
      router.replace('/');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="hsl(217, 91%, 60%)" />
      </View>
    );
  }

  return (
    <ThemeProvider value={CustomDarkTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: 'hsl(240, 5%, 16%)' },
          headerTintColor: 'hsl(0, 0%, 98%)',
          headerTitleStyle: { color: 'hsl(0, 0%, 98%)' },
          contentStyle: { backgroundColor: 'hsl(240, 10%, 6%)' },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="manual-login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="booking/index"
          options={{
            title: 'Book Ticket',
            headerShown: true,
            presentation: 'modal',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <HeroUINativeProvider>
            <RootLayoutNav />
          </HeroUINativeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
