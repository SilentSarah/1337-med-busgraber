import { create } from 'zustand';
import { Ticket } from '../api/types';
import { fetchMyTickets } from '../api/tickets';
import { useAuthStore } from './authStore';

interface TicketsState {
  tickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  loadMyTickets: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  clearError: () => void;
  refreshTickets: () => Promise<void>;
}

export const useTicketsStore = create<TicketsState>()((set) => ({
  tickets: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  loadMyTickets: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.login) {
      set({ error: 'No user logged in' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const tickets = await fetchMyTickets(user.login);
      set({
        tickets,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load tickets',
        isLoading: false,
      });
    }
  },

  // Silent background refresh - no loading state changes
  silentRefresh: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.login) return;

    try {
      const tickets = await fetchMyTickets(user.login);
      set((state) => ({
        tickets,
        lastUpdated: new Date(),
        error: state.error && tickets.length > 0 ? null : state.error,
      }));
    } catch (e) {
      // Silent fail - keeps existing tickets
    }
  },

  clearError: () => set({ error: null }),

  refreshTickets: async () => {
    await useTicketsStore.getState().loadMyTickets();
  },
}));
