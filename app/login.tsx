import React, { useState, useEffect } from 'react';
import { View, Text, Platform, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import WebViewLogin from '../components/WebViewLogin';
import { IconSymbol } from '../components/ui/icon-symbol';
import { COLORS, BORDER_RADIUS, SPACING } from '../utils/constants';

export default function LoginScreen() {
  const [showWebView, setShowWebView] = useState(false);
  const { isAuthenticated, isLoading } = useAuthStore();
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading]);

  if (isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol name="bus.fill" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>42 Bus Graber</Text>
          <Text style={styles.subtitle}>Fast bus booking for 1337</Text>

          <View style={styles.errorCard}>
            <View style={styles.warningIcon}>
              <IconSymbol name="exclamationmark.triangle.fill" size={28} color={COLORS.warning} />
            </View>
            <Text style={styles.errorTitle}>Web Not Supported</Text>
            <Text style={styles.errorText}>
              Browser security prevents this app from working on web.
              Please install the Android or iOS app.
            </Text>
            <Text style={styles.errorDetail}>
              The bus API requires cookie-based authentication that browsers block.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showWebView) {
    return <WebViewLogin />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <View style={styles.logo}>
            <IconSymbol name="bus.fill" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>42 Bus Graber</Text>
          <Text style={styles.subtitle}>Fast bus booking for 1337</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.lockIcon}>
              <IconSymbol name="lock" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Secure Login</Text>
            <Text style={styles.cardDesc}>
              Login with your 42 Intra credentials. Your token will be stored securely.
            </Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowWebView(true)}
            >
              <IconSymbol name="arrow.right" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Login with 42 Intra</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/manual-login')}
            >
              <IconSymbol name="key.fill" size={18} color={COLORS.textSecondary} />
              <Text style={styles.secondaryButtonText}>Enter Token Manually</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>
          Your credentials are only sent to bus-med.1337.ma
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  lockIcon: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardActions: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: SPACING.md,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    maxWidth: 360,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  warningIcon: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.warningMuted,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  errorDetail: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
