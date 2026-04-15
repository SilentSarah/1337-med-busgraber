import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { BASE_URL } from './types';

const TOKEN_KEY = 'le_token';

// Platform-specific storage - SecureStore doesn't work on web
const isWeb = Platform.OS === 'web';
let webToken: string | null = null;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Web: withCredentials allows cookies to be sent for CORS requests
  // Native: this is ignored
  withCredentials: isWeb,
});

// Track if we're in the middle of a booking to prevent redirects
let isBookingInProgress = false;

export function setBookingInProgress(value: boolean) {
  isBookingInProgress = value;
}

// Request interceptor - adds auth cookie
apiClient.interceptors.request.use(
  async (config) => {
    const isPublic = config.url?.includes('/auth/isAuth');

    try {
      let token: string | null = null;

      if (isWeb) {
        token = webToken;
      } else {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
      }

      if (token) {
        const cleanToken = token.trim();
        if (!isWeb) {
          config.headers.Cookie = `le_token=${cleanToken}`;
        }
      }
    } catch (e) {
      // Ignore token read errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 errors - but don't trigger navigation during booking
    if (error.response?.status === 401) {
      if (!isWeb && !isBookingInProgress) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    }
    return Promise.reject(error);
  }
);

// Token management - handles both native and web
export const authStorage = {
  async setToken(token: string): Promise<void> {
    const cleanToken = token.trim();
    if (isWeb) {
      webToken = cleanToken;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(TOKEN_KEY, cleanToken);
        } catch (e) {
          // Ignore
        }
      }
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, cleanToken);
    }
  },

  async getToken(): Promise<string | null> {
    if (isWeb) {
      if (webToken) return webToken;
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(TOKEN_KEY);
          if (stored) webToken = stored;
          return stored;
        } catch (e) {
          return null;
        }
      }
      return null;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    if (isWeb) {
      webToken = null;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch (e) {
          // Ignore
        }
      }
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },
};

export default apiClient;
