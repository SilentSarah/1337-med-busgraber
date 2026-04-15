import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { User } from '../api/types';
import { authStorage } from '../api/client';
import { checkAuth, AuthError } from '../api/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: User | null;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: true,
      token: null,
      user: null,
      error: null,

    login: async (token: string) => {
      set({ isLoading: true, error: null });

      try {
        await authStorage.setToken(token);
        const authData = await checkAuth();

        if (authData?.user) {
          set({
            isAuthenticated: true,
            token,
            user: authData.user,
            isLoading: false,
            error: null,
          });
        } else {
          await authStorage.removeToken();
          set({
            isAuthenticated: false,
            isLoading: false,
            error: 'Invalid token',
          });
          throw new Error('Invalid token');
        }
      } catch (error) {
        await authStorage.removeToken();
        const errorMessage = error instanceof AuthError
          ? error.message
          : error instanceof Error
          ? error.message
          : String(error);
        set({
          isAuthenticated: false,
          isLoading: false,
          error: errorMessage,
        });
        throw error;
      }
    },

    logout: async () => {
      await authStorage.removeToken();
      set({
        isAuthenticated: false,
        token: null,
        user: null,
        error: null,
      });
    },

    checkAuthStatus: async () => {
      try {
        set({ isLoading: true });
        const token = await authStorage.getToken();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return false;
        }

        const authData = await checkAuth();
        if (authData?.user) {
          set({
            isAuthenticated: true,
            token,
            user: authData.user,
            isLoading: false,
          });
          return true;
        } else {
          await authStorage.removeToken();
          set({
            isAuthenticated: false,
            token: null,
            user: null,
            isLoading: false,
          });
          return false;
        }
      } catch (error) {
        set({ isLoading: false, isAuthenticated: false });
        return false;
      }
    },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
