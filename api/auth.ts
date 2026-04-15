import apiClient from './client';
import { AuthResponse } from './types';

export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public isNetworkError = false
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function checkAuth(): Promise<AuthResponse | null> {
  try {
    const response = await apiClient.get<any>('/auth/isAuth');

    const data = response.data;

    if (data.login || data.email) {
      const nameParts = data.full_name ? data.full_name.split(' ') : ['', ''];
      return {
        user: {
          id: data.id || 0,
          login: data.login || data.email,
          first_name: data.first_name || nameParts[0] || '',
          last_name: data.last_name || nameParts.slice(1).join(' ') || '',
          image: data.avatar || data.image || null,
        }
      };
    }

    if (data.user) {
      return data as AuthResponse;
    }

    if (typeof data === 'object' && Object.keys(data).length > 0) {
      return {
        user: {
          id: data.id || 0,
          login: data.login || data.username || data.email || 'unknown',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          image: data.image || null,
        }
      };
    }

    return null;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }

    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      throw new AuthError(
        'Network error connecting to the server. If using web browser, this might be a CORS issue.',
        error.code,
        true
      );
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new AuthError('Connection timed out', error.code, true);
    }

    const message = error.response?.data?.message || error.message || 'Authentication failed';
    throw new AuthError(message);
  }
}
