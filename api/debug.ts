// Debug utilities for API connectivity
import { Platform } from 'react-native';
import { BASE_URL } from './types';

export interface DebugResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function testApiConnectivity(): Promise<DebugResult> {
  const platform = Platform.OS;

  console.log('[Debug] Testing API connectivity...');
  console.log('[Debug] Platform:', platform);
  console.log('[Debug] API URL:', BASE_URL);

  try {
    // Test with a simple fetch to see if we can reach the API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BASE_URL}/auth/isAuth`, {
      method: 'GET',
      signal: controller.signal,
      // Note: 'include' might not work in web due to CORS
      credentials: platform === 'web' ? 'same-origin' : 'include',
    });

    clearTimeout(timeoutId);

    console.log('[Debug] Response status:', response.status);
    console.log('[Debug] Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('[Debug] Response body:', text);

    return {
      success: response.ok,
      message: `HTTP ${response.status} - ${response.statusText}`,
      details: {
        status: response.status,
        body: text,
        headers: Object.fromEntries(response.headers.entries()),
      },
    };
  } catch (error: any) {
    console.error('[Debug] Connection failed:', error);

    let message = 'Unknown error';
    if (error.name === 'AbortError') {
      message = 'Connection timed out (5s)';
    } else if (error.message?.includes('Network request failed')) {
      message = 'Network request failed - Possible CORS issue or no internet';
    } else if (error.message?.includes('CORS')) {
      message = 'CORS error - Web browser blocked the request';
    } else {
      message = error.message || String(error);
    }

    return {
      success: false,
      message,
      details: {
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code,
      },
    };
  }
}

// Direct test with a token - mimics browser request exactly
export async function testAuthWithToken(token: string): Promise<DebugResult> {
  const platform = Platform.OS;
  console.log('[AuthDebug] Testing with token (length:', token.length + ')');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Build headers exactly like browser
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    };

    // Only add Cookie header if we have a token
    if (token) {
      // This is the critical part - send cookie exactly like browser
      headers['Cookie'] = `le_token=${token.trim()}`;
    }

    console.log('[AuthDebug] Sending request with headers:', JSON.stringify(headers));

    const response = await fetch(`${BASE_URL}/auth/isAuth`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    console.log('[AuthDebug] Status:', response.status, 'Body:', text);

    let success = false;
    let message = `HTTP ${response.status}`;

    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        if (data.user) {
          success = true;
          message = `Authenticated as ${data.user.login}`;
        }
      } catch (e) {
        message = 'Invalid JSON response';
      }
    } else if (response.status === 401) {
      message = 'Token not found or invalid - Check that the token is correct';
    }

    return {
      success,
      message,
      details: {
        status: response.status,
        body: text.slice(0, 500),
        headersSent: headers,
      },
    };
  } catch (error: any) {
    console.error('[AuthDebug] Error:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      details: { error: error.name, message: error.message },
    };
  }
}

export function getPlatformInfo(): { platform: string; userAgent: string } {
  return {
    platform: Platform.OS,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}
