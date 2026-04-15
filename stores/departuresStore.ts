import { create } from 'zustand';
import { Departure, UpcomingDeparture, ScheduledBooking } from '../api/types';
import { fetchDepartures, fetchUpcomingDepartures } from '../api/departures';

interface DeparturesState {
  currentDepartures: Departure[];
  upcomingDepartures: UpcomingDeparture[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions - standard load (shows spinner)
  loadCurrentDepartures: () => Promise<void>;
  loadUpcomingDepartures: () => Promise<void>;
  refreshAll: () => Promise<void>;
  // Actions - silent background refresh (no UI changes)
  silentRefreshCurrent: () => Promise<void>;
  silentRefreshUpcoming: () => Promise<void>;
  clearError: () => void;

  // Scheduled bookings
  scheduledBookings: ScheduledBooking[];
  addScheduledBooking: (booking: Omit<ScheduledBooking, 'id' | 'booked'>) => void;
  removeScheduledBooking: (id: string) => void;
  updateScheduledBooking: (id: string, updates: Partial<ScheduledBooking>) => void;
  clearScheduledBookings: () => void;
}

export const useDeparturesStore = create<DeparturesState>()((set, get) => ({
  currentDepartures: [],
  upcomingDepartures: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  scheduledBookings: [],

  loadCurrentDepartures: async () => {
    set({ isLoading: true, error: null });
    try {
      const departures = await fetchDepartures();
      set({
        currentDepartures: departures,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load departures',
        isLoading: false,
      });
    }
  },

  loadUpcomingDepartures: async () => {
    set({ isLoading: true, error: null });
    try {
      const departures = await fetchUpcomingDepartures();
      set({
        upcomingDepartures: departures,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load upcoming departures',
        isLoading: false,
      });
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().loadCurrentDepartures(),
      get().loadUpcomingDepartures(),
    ]);
  },

  // Silent background refresh - updates data without changing isLoading
  silentRefreshCurrent: async () => {
    try {
      const departures = await fetchDepartures();
      set((state) => ({
        currentDepartures: departures,
        lastUpdated: new Date(),
        error: state.error ? null : state.error,
      }));
    } catch (e) {
      // Silent fail - don't overwrite existing data
    }
  },

  silentRefreshUpcoming: async () => {
    try {
      const departures = await fetchUpcomingDepartures();
      set((state) => ({
        upcomingDepartures: departures,
        lastUpdated: new Date(),
        error: state.error ? null : state.error,
      }));
    } catch (e) {
      // Silent fail
    }
  },

  clearError: () => set({ error: null }),

  addScheduledBooking: (booking) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      scheduledBookings: [...state.scheduledBookings, { ...booking, id, booked: false }],
    }));
  },

  removeScheduledBooking: (id) => {
    set((state) => ({
      scheduledBookings: state.scheduledBookings.filter((b) => b.id !== id),
    }));
  },

  updateScheduledBooking: (id, updates) => {
    set((state) => ({
      scheduledBookings: state.scheduledBookings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
  },

  clearScheduledBookings: () => {
    set({ scheduledBookings: [] });
  },
}));
