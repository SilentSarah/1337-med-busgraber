import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { bookTicket, cancelTicket } from '../api/tickets';
import { sendLocalNotification } from '../utils/notifications';
import { BookingResponse, Ticket } from '../api/types';

interface BookingState {
  isLoading: boolean;
  error: string | null;
  booking: BookingResponse | null;
}

export function useBooking() {
  const [state, setState] = useState<BookingState>({
    isLoading: false,
    error: null,
    booking: null,
  });

  const book = useCallback(async (
    departureId: number,
    toCampus: boolean,
    options?: {
      onSuccess?: (booking: BookingResponse) => void;
      onError?: (error: any) => void;
      showNotification?: boolean;
      routeName?: string;
    }
  ): Promise<boolean> => {
    setState({ isLoading: true, error: null, booking: null });

    try {
      const booking = await bookTicket(departureId, toCampus);

      setState({ isLoading: false, error: null, booking });

      if (options?.showNotification) {
        await sendLocalNotification(
          '🎉 Ticket Booked!',
          `Your ${options.routeName || 'bus'} ticket has been booked successfully!`,
          { ticketHash: booking.hash }
        );
      }

      options?.onSuccess?.(booking);
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to book ticket';
      setState({ isLoading: false, error: message, booking: null });
      options?.onError?.(error);
      return false;
    }
  }, []);

  const cancel = useCallback(async (
    ticketId: number,
    options?: {
      onSuccess?: () => void;
      onError?: (error: any) => void;
      showNotification?: boolean;
    }
  ): Promise<boolean> => {
    setState((s) => ({ ...s, isLoading: true }));

    try {
      await cancelTicket(ticketId);
      setState({ isLoading: false, error: null, booking: null });

      if (options?.showNotification) {
        await sendLocalNotification(
          'Ticket Cancelled',
          'Your ticket has been successfully cancelled'
        );
      }

      options?.onSuccess?.();
      return true;
    } catch (error: any) {
      const message = error.message || 'Failed to cancel ticket';
      setState((s) => ({ ...s, isLoading: false, error: message }));
      options?.onError?.(error);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, booking: null });
  }, []);

  return {
    ...state,
    book,
    cancel,
    clearError,
    reset,
  };
}
