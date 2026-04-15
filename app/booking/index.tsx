import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Alert, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { bookTicket } from "../../api/tickets";
import { sendLocalNotification } from "../../utils/notifications";
import { formatDateTime } from "../../utils/time";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { Direction } from "../../api/types";
import { setBookingInProgress } from "../../api/client";
import { COLORS, BORDER_RADIUS, SPACING } from "../../utils/constants";

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [direction, setDirection] = useState<Direction>("home");
  const [booking, setBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ position: number } | null>(null);

  const departureId = parseInt(params.departureId as string) || 0;
  const routeName = (params.routeName as string) || "Unknown";
  const busName = (params.busName as string) || "Unknown";
  const departureTime = (params.departureTime as string) || "";
  const capacity = parseInt(params.capacity as string) || 0;
  const booked = parseInt(params.booked as string) || 0;
  const availableSeats = capacity - booked;

  const handleBook = useCallback(async () => {
    if (!departureId) {
      Alert.alert("Error", "Invalid departure ID");
      return;
    }

    setBooking(true);
    setBookingInProgress(true);

    try {
      const result = await bookTicket(departureId, direction === "campus");

      await sendLocalNotification(
        "Ticket Booked!",
        `Your ${routeName} ticket has been booked successfully!`
      );

      Alert.alert(
        "Success!",
        `Ticket booked!\n\nRoute: ${routeName}\nBus: ${busName}\nPosition: #${result.position}`,
        [
          {
            text: "View Tickets",
            onPress: () => {
              setBookingInProgress(false);
              router.replace("/(tabs)/tickets" as any);
            },
          },
          {
            text: "OK",
            onPress: () => {
              setBookingInProgress(false);
              setBookingResult({ position: result.position });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to book ticket";

      Alert.alert("Booking Failed", errorMessage, [{ text: "OK", style: "default" }], {
        cancelable: false,
      });
    } finally {
      setBooking(false);
      setBookingInProgress(false);
    }
  }, [departureId, direction, routeName, busName, router]);

  if (!departureId) {
    return (
      <View style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Invalid Departure</Text>
          <Text style={styles.errorMessage}>Missing departure information</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (bookingResult) {
    return (
      <View style={styles.container}>
        <View style={styles.successState}>
          <View style={styles.successIcon}>
            <IconSymbol name="checkmark.circle.fill" size={40} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>

          <View style={styles.ticketCard}>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Route</Text>
              <Text style={styles.ticketValue}>{routeName}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Bus</Text>
              <Text style={styles.ticketValue}>{busName}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Position</Text>
              <Text style={styles.ticketPosition}>#{bookingResult.position}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(tabs)/tickets" as any)}
          >
            <Text style={styles.primaryButtonText}>View My Tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back to Departures</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Book Ticket</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Route</Text>
            <Text style={styles.infoValue}>{routeName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bus</Text>
            <Text style={styles.infoValue}>{busName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Departure</Text>
            <Text style={styles.infoValue}>{formatDateTime(departureTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Available</Text>
            <Text style={[
              styles.infoValue,
              { color: availableSeats <= 5 ? COLORS.warning : COLORS.success }
            ]}>
              {availableSeats}/{capacity} seats
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select Direction</Text>
        <View style={styles.directionRow}>
          <TouchableOpacity
            style={[styles.directionButton, direction === "home" && styles.directionButtonActive]}
            onPress={() => setDirection("home")}
            disabled={booking}
          >
            <IconSymbol
              name="house.fill"
              size={20}
              color={direction === "home" ? "#fff" : COLORS.textMuted}
            />
            <Text style={[
              styles.directionText,
              direction === "home" && styles.directionTextActive
            ]}>To Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionButton, direction === "campus" && styles.directionButtonActive]}
            onPress={() => setDirection("campus")}
            disabled={booking}
          >
            <IconSymbol
              name="building.columns.fill"
              size={20}
              color={direction === "campus" ? "#fff" : COLORS.textMuted}
            />
            <Text style={[
              styles.directionText,
              direction === "campus" && styles.directionTextActive
            ]}>To Campus</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.bookButton, (booking || availableSeats <= 0) && styles.bookButtonDisabled]}
          onPress={handleBook}
          disabled={booking || availableSeats <= 0}
        >
          <Text style={styles.bookButtonText}>
            {booking ? "Booking..." : availableSeats <= 0 ? "No Seats" : "Book Ticket"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={booking}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {booking && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.overlayText}>Booking your ticket...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  directionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  directionButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  directionText: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontSize: 15,
  },
  directionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bookButtonDisabled: {
    opacity: 0.5,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  successState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  successIcon: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.successMuted,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xl,
  },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 280,
    marginBottom: SPACING.xl,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  ticketLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  ticketValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  ticketPosition: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  overlayText: {
    marginTop: SPACING.md,
    color: COLORS.text,
    fontSize: 14,
  },
});
