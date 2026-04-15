import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchDepartures } from '../api/departures';
import { bookTicket } from '../api/tickets';
import { useDeparturesStore } from '../stores/departuresStore';
import { ScheduledBooking, Departure } from '../api/types';
import { sendLocalNotification } from '../utils/notifications';
import { getLocalHour } from '../utils/time';

interface ScheduledBookingStats {
  attempts: number;
  elapsed: number;
  booked: number;
  pending: number;
  errored: number;
}

interface ScheduledBookingState {
  isRunning: boolean;
  isLoading: boolean;
  stats: ScheduledBookingStats;
  error: string | null;
}

interface ScheduledBookingConfig {
  intervalMs: number;
}

export function useScheduledBooking() {
  const { scheduledBookings, updateScheduledBooking, loadCurrentDepartures } = useDeparturesStore();
  const [state, setState] = useState<ScheduledBookingState>({
    isRunning: false,
    isLoading: false,
    stats: {
      attempts: 0,
      elapsed: 0,
      booked: 0,
      pending: 0,
      errored: 0,
    },
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const calculateStats = useCallback(() => {
    const booked = scheduledBookings.filter((b) => b.booked).length;
    const errored = scheduledBookings.filter((b) => b.error && !b.booked).length;
    const pending = scheduledBookings.filter((b) => !b.booked && !b.error).length;
    return { booked, errored, pending };
  }, [scheduledBookings]);

  const checkAndBook = useCallback(async () => {
    const pendingBookings = scheduledBookings.filter((b) => !b.booked && !b.error);

    if (pendingBookings.length === 0) {
      stopScheduledBookings();
      await sendLocalNotification(
        '✅ All Scheduled Bookings Complete',
        `Booked: ${state.stats.booked} | Errors: ${state.stats.errored}`
      );
      return;
    }

    setState((s) => ({
      ...s,
      stats: {
        ...s.stats,
        ...calculateStats(),
        elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
      },
    }));

    try {
      const departures = await fetchDepartures();

      for (const booking of pendingBookings) {
        // Find matching departure
        const departure = departures.find((d: Departure) => {
          const route = d.route;
          const bus = route.bus;
          const depHour = getLocalHour(d.departure_time);

          return (
            booking.route.toLowerCase() === route.name.toLowerCase() &&
            booking.bus.toLowerCase() === bus.name.toLowerCase() &&
            depHour === booking.hour
          );
        });

        if (!departure) {
          continue; // Not available yet, keep polling
        }

        // Check availability
        const capacity = departure.route.bus.capacity;
        const booked = departure.tickets?.length || 0;
        const available = capacity - booked;
        const locked = departure.locked;

        if (locked || available <= 0) {
          continue;
        }

        // Book it!
        try {
          const result = await bookTicket(departure.id, booking.to_campus);
          updateScheduledBooking(booking.id, {
            booked: true,
            ticket_hash: result.hash,
          });

          await sendLocalNotification(
            '🎉 Scheduled Booking Booked!',
            `${booking.route} at ${booking.hour}:00 - Hash: ${result.hash.substring(0, 8)}...`
          );
        } catch (bookingError: any) {
          const msg = bookingError.response?.data?.message || bookingError.message;
          if (msg?.toLowerCase().includes('already booked')) {
            updateScheduledBooking(booking.id, {
              booked: true,
              ticket_hash: 'Already had ticket',
            });
          } else {
            updateScheduledBooking(booking.id, {
              error: msg || 'Booking failed',
            });
          }
        }
      }

      setState((s) => ({
        ...s,
        stats: {
          ...s.stats,
          attempts: s.stats.attempts + 1,
          ...calculateStats(),
          elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
        },
      }));
    } catch (error: any) {
      console.error('Scheduled booking error:', error);
      // Network errors don't stop polling
      if (!error.message?.includes('Network')) {
        setState((s) => ({ ...s, error: error.message }));
      }
    }
  }, [scheduledBookings, calculateStats, updateScheduledBooking]);

  const startScheduledBookings = useCallback((config: ScheduledBookingConfig) => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    startTimeRef.current = Date.now();
    const stats = calculateStats();

    setState({
      isRunning: true,
      isLoading: false,
      stats: {
        attempts: 0,
        elapsed: 0,
        ...stats,
      },
      error: null,
    });

    // Immediate check
    checkAndBook();

    // Set up interval
    intervalRef.current = setInterval(() => {
      checkAndBook();
    }, config.intervalMs);
  }, [calculateStats, checkAndBook]);

  const stopScheduledBookings = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((s) => ({ ...s, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    stopScheduledBookings();
    setState({
      isRunning: false,
      isLoading: false,
      stats: { attempts: 0, elapsed: 0, booked: 0, pending: 0, errored: 0 },
      error: null,
    });
  }, [stopScheduledBookings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startScheduledBookings,
    stopScheduledBookings,
    reset,
  };
}
