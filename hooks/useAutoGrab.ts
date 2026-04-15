import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchDepartures } from '../api/departures';
import { bookTicket } from '../api/tickets';
import { Departure } from '../api/types';
import { sendLocalNotification } from '../utils/notifications';
import { getLocalHour } from '../utils/time';

const AUTO_GRAB_STATE_KEY = 'autoGrabState';

interface AutoGrabConfig {
  route: string;
  bus: string;
  hour: number;
  toCampus: boolean;
  intervalMs: number;
}

interface AutoGrabState {
  isActive: boolean;
  attempts: number;
  elapsed: number;
  status: 'idle' | 'polling' | 'available' | 'success' | 'error';
  error: string | null;
}

export function useAutoGrab() {
  const [state, setState] = useState<AutoGrabState>({
    isActive: false,
    attempts: 0,
    elapsed: 0,
    status: 'idle',
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const attemptsRef = useRef<number>(0);
  const configRef = useRef<AutoGrabConfig | null>(null);
  const isBookingRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mutation for booking
  const bookMutation = useMutation({
    mutationFn: ({ departureId, toCampus }: { departureId: number; toCampus: boolean }) =>
      bookTicket(departureId, toCampus),
    onSuccess: (result) => {
      console.log('[AutoGrab] Booking successful!', result);
      isBookingRef.current = false;
      stopPolling();
      setState({
        isActive: false,
        attempts: attemptsRef.current,
        elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
        status: 'success',
        error: null,
      });
      sendLocalNotification('Ticket Booked!', 'Your ticket has been automatically booked!');
      clearPersistedState();
    },
    onError: (error: any) => {
      isBookingRef.current = false;
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || error.message;

      console.log('[AutoGrab] Booking error - Status:', status, 'Message:', msg);

      // 400 usually means already booked - treat as success
      if (status === 400) {
        stopPolling();
        setState({
          isActive: false,
          attempts: attemptsRef.current,
          elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
          status: 'success',
          error: null,
        });
        sendLocalNotification('Ticket Secured', 'You already have a ticket for this departure');
        clearPersistedState();
        return;
      }

      // For network errors, keep polling
      if (status === 0 || error.message?.includes('Network')) {
        console.log('[AutoGrab] Network error, will retry...');
        isBookingRef.current = false;
        setState((s) => ({ ...s, status: 'polling' }));
        return;
      }

      stopPolling();
      setState({
        isActive: false,
        attempts: attemptsRef.current,
        elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
        status: 'error',
        error: msg || 'Booking failed',
      });
      sendLocalNotification('Auto-Grab Failed', `Failed to book: ${msg || 'Unknown error'}`);
      clearPersistedState();
    },
  });

  // Persist state for background recovery
  const persistState = useCallback(async (config: AutoGrabConfig) => {
    try {
      await AsyncStorage.setItem(
        AUTO_GRAB_STATE_KEY,
        JSON.stringify({
          config,
          startTime: startTimeRef.current,
          attempts: attemptsRef.current,
        })
      );
    } catch (e) {
      console.error('[AutoGrab] Failed to persist state:', e);
    }
  }, []);

  const clearPersistedState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTO_GRAB_STATE_KEY);
    } catch (e) {
      console.error('[AutoGrab] Failed to clear persisted state:', e);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const checkForSeat = useCallback(async () => {
    // Skip if already booking
    if (isBookingRef.current) {
      console.log('[AutoGrab] Skipping - already booking');
      return;
    }

    // Skip if mutation is pending
    if (bookMutation.isPending) {
      console.log('[AutoGrab] Skipping - mutation pending');
      return;
    }

    if (!configRef.current) return;

    const config = configRef.current;
    attemptsRef.current += 1;

    console.log('[AutoGrab] Check #' + attemptsRef.current);

    setState((s) => ({
      ...s,
      attempts: attemptsRef.current,
    }));

    try {
      const currentDepartures = await fetchDepartures();

      // Find matching departure
      const departure = currentDepartures.find((d: Departure) => {
        const route = d.route;
        const bus = route.bus;
        const depHour = getLocalHour(d.departure_time);

        const routeMatch =
          config.route === 'any' || config.route.toLowerCase() === route.name.toLowerCase();
        const busMatch =
          config.bus === 'any' || config.bus.toLowerCase() === bus.name.toLowerCase();

        return routeMatch && busMatch && depHour === config.hour;
      });

      if (!departure) {
        console.log('[AutoGrab] No matching departure found');
        setState((s) => ({ ...s, status: 'polling' }));
        return;
      }

      console.log('[AutoGrab] Found matching departure:', departure.id);

      const capacity = departure.route.bus.capacity;
      const booked = departure.tickets?.length || 0;
      const available = Math.max(0, capacity - booked);
      const locked = departure.locked;

      console.log(
        `[AutoGrab] Status: capacity=${capacity}, booked=${booked}, available=${available}, locked=${locked}`
      );

      if (locked) {
        console.log('[AutoGrab] Departure locked, continuing...');
        setState((s) => ({ ...s, status: 'polling' }));
        return;
      }

      if (available <= 0) {
        console.log('[AutoGrab] No seats available, continuing...');
        setState((s) => ({ ...s, status: 'polling' }));
        return;
      }

      console.log('[AutoGrab] Seat available! Attempting to book...');
      setState((s) => ({ ...s, status: 'available' }));

      // Set booking lock BEFORE mutating
      isBookingRef.current = true;

      bookMutation.mutate({
        departureId: departure.id,
        toCampus: config.toCampus,
      });
    } catch (error: any) {
      console.error('[AutoGrab] Check error:', error);
      // Don't stop for network errors
      if (!error.message?.includes('Network')) {
        stopPolling();
        setState({
          isActive: false,
          attempts: attemptsRef.current,
          elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
          status: 'error',
          error: error.message,
        });
        clearPersistedState();
      }
    }
  }, [bookMutation, stopPolling, clearPersistedState]);

  // Update elapsed time every second
  const startElapsedTimer = useCallback(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
    }
    elapsedIntervalRef.current = setInterval(() => {
      if (startTimeRef.current > 0) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((s) => ({ ...s, elapsed }));
      }
    }, 1000);
  }, []);

  const start = useCallback(
    (config: AutoGrabConfig & { intervalMs: number }) => {
      // Minimum 2 second interval to prevent spam and API abuse
      const safeInterval = Math.max(2000, config.intervalMs);
      console.log('[AutoGrab] Starting with interval:', safeInterval + 'ms');

      stopPolling();

      configRef.current = config;
      startTimeRef.current = Date.now();
      attemptsRef.current = 0;
      isBookingRef.current = false;

      setState({
        isActive: true,
        attempts: 0,
        elapsed: 0,
        status: 'polling',
        error: null,
      });

      // Persist for background recovery
      persistState(config);

      // Start elapsed timer
      startElapsedTimer();

      // Set up polling interval
      intervalRef.current = setInterval(() => {
        checkForSeat();
      }, safeInterval);

      // First check after short delay
      setTimeout(() => {
        checkForSeat();
      }, 500);
    },
    [checkForSeat, stopPolling, persistState, startElapsedTimer]
  );

  const stop = useCallback(() => {
    stopPolling();
    isBookingRef.current = false;
    configRef.current = null;
    startTimeRef.current = 0;
    clearPersistedState();
    setState((s) => ({
      ...s,
      isActive: false,
      status: s.status === 'polling' ? 'idle' : s.status,
    }));
  }, [stopPolling, clearPersistedState]);

  const reset = useCallback(() => {
    stop();
    setState({
      isActive: false,
      attempts: 0,
      elapsed: 0,
      status: 'idle',
      error: null,
    });
  }, [stop]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('[AutoGrab] App state changed:', appStateRef.current, '->', nextAppState);

      // Coming back from background
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[AutoGrab] App came to foreground');
        // If we were polling, do an immediate check
        if (state.isActive && configRef.current && !isBookingRef.current) {
          console.log('[AutoGrab] Triggering immediate check after foreground');
          setTimeout(() => checkForSeat(), 300);
        }
      }

      // Going to background
      if (nextAppState === 'background') {
        console.log('[AutoGrab] App going to background, interval may pause');
        // Note: Intervals continue on modern iOS/Android but may be throttled
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [state.isActive, checkForSeat]);

  // Recovery: Check for persisted state on mount
  useEffect(() => {
    const recoverState = async () => {
      try {
        const persisted = await AsyncStorage.getItem(AUTO_GRAB_STATE_KEY);
        if (persisted) {
          const { config, startTime } = JSON.parse(persisted);
          const elapsed = Math.floor((Date.now() - startTime) / 1000);

          // Only recover if less than 10 minutes elapsed
          if (elapsed < 600) {
            console.log('[AutoGrab] Recovering previous session, elapsed:', elapsed + 's');
            // Don't auto-restart - user should see the previous state and decide
          } else {
            console.log('[AutoGrab] Previous session too old, clearing');
            await clearPersistedState();
          }
        }
      } catch (e) {
        console.error('[AutoGrab] Failed to recover state:', e);
      }
    };
    recoverState();
  }, [clearPersistedState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    ...state,
    config: configRef.current,
    start,
    stop,
    reset,
  };
}
