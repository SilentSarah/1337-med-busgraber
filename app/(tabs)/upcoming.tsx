import React, { useEffect, useCallback, useState, useRef } from 'react';
import { FlatList, RefreshControl, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useDeparturesStore } from '../../stores/departuresStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { UpcomingDeparture } from '../../api/types';
import { COLORS, BORDER_RADIUS, SPACING } from '../../utils/constants';

const UpcomingCard = ({ departure }: { departure: UpcomingDeparture }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.routeBadge}>
          <Text style={styles.routeText}>{departure.name}</Text>
        </View>
      </View>

      <View style={styles.busRow}>
        <Text style={styles.busName}>{departure.bus.name}</Text>
        <Text style={styles.capacityText}>Capacity: {departure.bus.capacity}</Text>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{departure.departure_time}</Text>
          <Text style={styles.timeLabel}>DEPARTURE</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{departure.available_time}</Text>
          <Text style={styles.timeLabel}>AVAILABLE</Text>
        </View>
      </View>

      {departure.no_return && (
        <View style={styles.warningBadge}>
          <IconSymbol name="exclamationmark.triangle.fill" size={14} color={COLORS.warning} />
          <Text style={styles.warningText}>No Return Trip</Text>
        </View>
      )}
    </View>
  );
};

export default function UpcomingScreen() {
  const { upcomingDepartures, isLoading, loadUpcomingDepartures, silentRefreshUpcoming, error } =
    useDeparturesStore();
  const [refreshing, setRefreshing] = useState(false);
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
      silentRefreshUpcoming();
    }, 10000);
  }, [stopPolling, silentRefreshUpcoming]);

  useEffect(() => {
    loadUpcomingDepartures();
    startPolling();
    return () => stopPolling();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUpcomingDepartures();
    setRefreshing(false);
    startPolling();
  }, [loadUpcomingDepartures, startPolling]);

  if (isLoading && !upcomingDepartures.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Schedule</Text>
          <Text style={styles.headerSubtitle}>Today's full schedule</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Schedule</Text>
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
            <Text style={styles.countText}>{upcomingDepartures.length} DEPARTURES</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Schedule</Text>
        <Text style={styles.headerSubtitle}>Today's full schedule</Text>
      </View>

      <FlatList
        data={upcomingDepartures}
        keyExtractor={(item) => `${item.id}`}
        renderItem={({ item }) => <UpcomingCard departure={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="No Schedule"
            message="No upcoming departures scheduled for today"
          />
        }
      />
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
  cardHeader: {
    marginBottom: SPACING.md,
  },
  routeBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  routeText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  busRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  busName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  capacityText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    marginTop: 4,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warningMuted,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
  },
  warningText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
