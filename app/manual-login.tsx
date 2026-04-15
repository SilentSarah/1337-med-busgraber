import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { IconSymbol } from '../components/ui/icon-symbol';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { COLORS, BORDER_RADIUS, SPACING } from '../utils/constants';

export default function ManualLoginScreen() {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      Alert.alert('Token Required', 'Please enter your le_token');
      inputRef.current?.focus();
      return;
    }

    const jwtParts = trimmedToken.split('.');
    if (jwtParts.length !== 3) {
      Alert.alert(
        'Invalid Token Format',
        'The token should be in JWT format (three parts separated by dots).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedToken);
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'Failed to authenticate. Please check your token.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Enter Token</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconCircle}>
              <IconSymbol name="key.fill" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.infoTitle}>Manual Token Entry</Text>
            <Text style={styles.infoText}>
              Paste your le_token here if you extracted it from your browser's developer tools.
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>le_token (JWT Cookie Value)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={token}
                onChangeText={setToken}
                placeholder="Paste your le_token here..."
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showToken}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowToken(!showToken)}
              >
                <IconSymbol
                  name={showToken ? 'eye.slash' : 'eye'}
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Expected format: xxxxx.yyyyy.zzzzz (JWT format)
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting || isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isSubmitting ? 'Authenticating...' : 'Login with Token'}
            </Text>
          </TouchableOpacity>

          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>How to get your token:</Text>
            {[
              'Open bus-med.1337.ma in Chrome/Firefox',
              'Login with your 42 Intra credentials',
              'Press F12 → Application → Cookies → bus-med.1337.ma',
              'Copy the value of the le_token cookie',
            ].map((step, i) => (
              <View key={i} style={styles.helpStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.helpText}>{step}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={isSubmitting || isLoading} message="Authenticating..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    minHeight: 100,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toggleButton: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.md,
    padding: SPACING.sm,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
