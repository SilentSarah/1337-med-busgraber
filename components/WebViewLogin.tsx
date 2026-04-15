import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { router } from 'expo-router';
import { IconSymbol } from './ui/icon-symbol';
import { COLORS, BORDER_RADIUS, SPACING } from '../utils/constants';

const LOGIN_URL = 'https://bus-med.1337.ma';

const INJECTED_JAVASCRIPT = `
(function() {
  function sendToken() {
    try {
      const cookies = document.cookie;
      if (cookies.includes('le_token')) {
        const tokenMatch = cookies.match(/le_token=([^;]+)/);
        if (tokenMatch && tokenMatch[1]) {
          const decodedToken = decodeURIComponent(tokenMatch[1]);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TOKEN_FOUND',
            token: decodedToken,
            rawCookie: cookies
          }));
        }
      }
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ERROR',
        message: e.message
      }));
    }
  }

  sendToken();
  setInterval(sendToken, 2000);

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(sendToken, 500);
    }
  }, 1000);
})();
`;

export default function WebViewLogin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [extractedToken, setExtractedToken] = useState<string>('');
  const webViewRef = useRef<WebView>(null);
  const { login } = useAuthStore();

  const handleClose = () => {
    router.replace('/login');
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'TOKEN_FOUND' && data.token) {
        setExtractedToken(data.token);
        setShowManual(true);
      }
    } catch (e) {}
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setLoading(navState.loading);
    if (!navState.loading) {
      setError(null);
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError('Failed to load page. Check your internet connection.');
    setLoading(false);
  };

  const attemptLogin = async () => {
    if (!extractedToken.trim()) {
      Alert.alert('Error', 'Please enter or paste a token');
      return;
    }

    try {
      await login(extractedToken.trim());
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        'Login Failed',
        err.message || 'Invalid token. Make sure you copied it correctly.'
      );
    }
  };

  const checkCookies = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        const cookies = document.cookie;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'TOKEN_FOUND',
          token: cookies.match(/le_token=([^;]+)/)?.[1]
            ? decodeURIComponent(cookies.match(/le_token=([^;]+)/)[1])
            : null,
          raw: cookies
        }));
      })();
    `);
  };

  const reload = () => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Login to 1337 Bus</Text>
        <Text style={styles.headerSubtitle}>Sign in with 42 Intra</Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleClose}>
          <IconSymbol name="close" size={18} color={COLORS.textSecondary} />
          <Text style={styles.toolbarButtonText}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={reload}>
          <IconSymbol name="arrow.clockwise" size={18} color={COLORS.textSecondary} />
          <Text style={styles.toolbarButtonText}>Reload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={checkCookies}>
          <IconSymbol name="key.fill" size={18} color={COLORS.primary} />
          <Text style={[styles.toolbarButtonText, { color: COLORS.primary }]}>Check</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorOverlay}>
            <IconSymbol name="exclamationmark.circle.fill" size={48} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={reload}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: LOGIN_URL }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={handleError}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          startInLoadingState={true}
          allowsBackForwardNavigationGestures={true}
          cacheEnabled={true}
        />
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Steps:</Text>
        <Text style={styles.instructionText}>1. Tap "Sign in with Intra 42"</Text>
        <Text style={styles.instructionText}>2. Complete login in the WebView</Text>
        <Text style={styles.instructionText}>3. Tap "Check" when done</Text>
      </View>

      <Modal
        visible={showManual}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowManual(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Token Found</Text>
            <Text style={styles.modalHint}>
              Your token has been extracted. Tap Login to continue.
            </Text>

            <TextInput
              style={styles.tokenInput}
              value={extractedToken}
              onChangeText={setExtractedToken}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={3}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.loginButton} onPress={attemptLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowManual(false)}
            >
              <Text style={styles.cancelModalButtonText}>Back to WebView</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: 6,
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  webViewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    padding: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  instructionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  tokenInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.md,
    fontSize: 12,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelModalButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
