import React, { useEffect, useCallback, useState, useRef } from 'react';
import { FlatList, RefreshControl, View, Text, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeparturesStore } from '../../stores/departuresStore';
import { useTicketsStore } from '../../stores/ticketsStore';
import { DepartureCard } from '../../components/ui/DepartureCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Departure, Ticket } from '../../api/types';
import { cancelTicket } from '../../api/tickets';
import { COLORS, SPACING } from '../../utils/constants';

export default function DeparturesScreen() {
  const { currentDepartures, isLoading, loadCurrentDepartures, silentRefreshCurrent, error } =
    useDeparturesStore();
  const { tickets, loadMyTickets, silentRefresh } = useTicketsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const userTicketsByDeparture = React.useMemo(() => {
    const map = new Map<number, Ticket>();
    tickets.forEach((ticket) => {
      if (ticket.departure?.id) {
        map.set(ticket.departure.id, ticket);
      }
    });
    return map;
  }, [tickets]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      silentRefreshCurrent();
      silentRefresh();
    }, 10000);
  }, [stopPolling, silentRefreshCurrent, silentRefresh]);

  useEffect(() => {
    loadCurrentDepartures();
    loadMyTickets();
    startPolling();
    return () => stopPolling();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCurrentDepartures(), loadMyTickets()]);
    setRefreshing(false);
    startPolling();
  }, [loadCurrentDepartures, loadMyTickets, startPolling]);

  const handleBook = (departure: Departure) => {
    router.push({
      pathname: '/booking',
      params: {
        departureId: departure.id,
        routeName: departure.route.name,
        busName: departure.route.bus.name,
        departureTime: departure.departure_time,
        capacity: departure.route.bus.capacity,
        booked: departure.tickets?.length || 0,
      },
    });
  };

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
              loadCurrentDepartures();
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

  if (isLoading && !currentDepartures.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.headerTitle}>Departures</Text>
          <Text style={styles.headerSubtitle}>Next available buses</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading departures...</Text>
        </View>
      </View>
    );
  }

  if (error?.includes('401')) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Departures</Text>
        </View>
        <EmptyState
          icon="lock"
          title="Session Expired"
          message="Your session has expired. Please log in again."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Departures</Text>
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
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{currentDepartures.length} BUSES</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Departures</Text>
        <Text style={styles.headerSubtitle}>Next available buses</Text>
      </View>

      <FlatList
        data={currentDepartures}
        keyExtractor={(item) => `${item.id}`}
        renderItem={({ item }) => (
          <DepartureCard
            departure={item}
            userTicket={userTicketsByDeparture.get(item.id) || null}
            onBook={handleBook}
            onCancelTicket={handleCancelTicket}
            showActions={true}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="bus.fill"
            title="No Departures"
            message="No bus departures available at this time"
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
