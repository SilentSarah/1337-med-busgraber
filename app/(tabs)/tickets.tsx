import React, { useEffect, useCallback, useState, useRef } from 'react';
import { FlatList, RefreshControl, View, Text, Alert, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useTicketsStore } from '../../stores/ticketsStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ticket } from '../../api/types';
import { formatDateTime } from '../../utils/time';
import { cancelTicket } from '../../api/tickets';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { COLORS, BORDER_RADIUS, SPACING } from '../../utils/constants';

export default function TicketsScreen() {
  const { tickets, isLoading, loadMyTickets, silentRefresh, error } = useTicketsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      silentRefresh();
    }, 10000);
  }, [stopPolling, silentRefresh]);

  useEffect(() => {
    loadMyTickets();
    startPolling();
    return () => stopPolling();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMyTickets();
    setRefreshing(false);
    startPolling();
  }, [loadMyTickets, startPolling]);

  const handleCancelTicket = async (ticket: Ticket) => {
    Alert.alert(
      'Cancel Ticket?',
      `Are you sure you want to cancel your ticket for ${ticket.departure?.route?.name}?`,
      [
        { text: 'Keep Ticket', style: 'cancel' },
        {
          text: 'Cancel Ticket',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(ticket.id);
            try {
              await cancelTicket(ticket.id);
              Alert.alert('Success', 'Ticket cancelled successfully');
              loadMyTickets();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || error.message || 'Failed to cancel ticket'
              );
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const renderTicket = ({ item }: { item: Ticket }) => {
    const departureTime = item.departure?.departure_time
      ? new Date(item.departure.departure_time)
      : null;
    const isPast = departureTime ? departureTime < new Date() : false;

    return (
      <View style={[styles.card, isPast && styles.cardPast]}>
        <View style={styles.cardHeader}>
          <View style={styles.routeBadge}>
            <Text style={styles.routeText}>{item.departure?.route?.name || 'Unknown'}</Text>
          </View>
          <View style={[styles.directionBadge, item.to_campus ? styles.directionCampus : styles.directionHome]}>
            <Text style={styles.directionText}>{item.to_campus ? 'To Campus' : 'To Home'}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <IconSymbol name="bus.fill" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{item.departure?.route?.bus?.name || 'Unknown Bus'}</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="clock" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              {item.departure?.departure_time
                ? formatDateTime(item.departure.departure_time)
                : 'Unknown time'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="number" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoTextBold}>Position #{item.position}</Text>
          </View>
        </View>

        {!isPast ? (
          <TouchableOpacity
            style={[styles.cancelButton, cancellingId === item.id && styles.cancelButtonDisabled]}
            onPress={() => handleCancelTicket(item)}
            disabled={cancellingId === item.id}
          >
            <Text style={styles.cancelButtonText}>
              {cancellingId === item.id ? 'Cancelling...' : 'Cancel Ticket'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>COMPLETED</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && !tickets.length && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tickets</Text>
          <Text style={styles.headerSubtitle}>Your bookings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tickets</Text>
        </View>
        <EmptyState
          icon="exclamationmark.circle.fill"
          title="Failed to Load"
          message={error}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{tickets.length} TICKETS</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Tickets</Text>
        <Text style={styles.headerSubtitle}>Your bookings</Text>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderTicket}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="ticket.fill"
            title="No Tickets"
            message="You haven't booked any tickets yet. Head to Departures to book one!"
          />
        }
      />

      {cancellingId !== null && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.overlayText}>Cancelling ticket...</Text>
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
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: SPACING.sm,
  },
  countBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPast: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routeBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  routeText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  directionCampus: {
    backgroundColor: COLORS.primaryMuted,
  },
  directionHome: {
    backgroundColor: COLORS.successMuted,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoText: {
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 8,
  },
  infoTextBold: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.errorMuted,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  completedBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
  },
  completedText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    borderRadius: 2,
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
