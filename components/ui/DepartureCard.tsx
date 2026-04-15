import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Departure, Ticket } from '../../api/types';
import { getTimeUntilDeparture } from '../../utils/time';
import { IconSymbol } from './icon-symbol';
import { COLORS, BORDER_RADIUS, SPACING } from '../../utils/constants';

interface DepartureCardProps {
  departure: Departure;
  userTicket?: Ticket | null;
  onPress?: (departure: Departure) => void;
  onBook?: (departure: Departure) => void;
  onCancelTicket?: (ticket: Ticket) => void;
  showActions?: boolean;
}

export const DepartureCard: React.FC<DepartureCardProps> = ({
  departure,
  userTicket,
  onPress,
  onBook,
  onCancelTicket,
  showActions = true,
}) => {
  const { route, tickets, nbr_to_home, nbr_to_campus } = departure;
  const hasUserTicket = !!userTicket;
  const bus = route.bus;

  const totalBooked = tickets?.length || 0;
  const capacity = bus?.capacity || 0;
  const available = Math.max(0, capacity - totalBooked);
  const isLocked = departure.locked;
  const percentage = Math.min(100, Math.round((totalBooked / capacity) * 100));

  const getStatus = () => {
    if (isLocked) return 'locked';
    if (available <= 0) return 'full';
    if (available <= 5) return 'limited';
    return 'available';
  };

  const status = getStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'available': return COLORS.success;
      case 'limited': return COLORS.warning;
      case 'full': return COLORS.error;
      case 'locked': return COLORS.textMuted;
      default: return COLORS.textMuted;
    }
  };

  const departureDate = new Date(departure.departure_time);
  const hours = departureDate.getHours().toString().padStart(2, '0');
  const minutes = departureDate.getMinutes().toString().padStart(2, '0');

  const statusLabels: Record<string, string> = {
    available: 'AVAILABLE',
    limited: 'LIMITED',
    full: 'FULL',
    locked: 'LOCKED',
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(departure)}
      activeOpacity={0.8}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.routeBadge}>
          <Text style={styles.routeText}>{route.name}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: getStatusColor() }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {statusLabels[status]}
          </Text>
        </View>
      </View>

      {/* Bus Info */}
      <View style={styles.busRow}>
        <Text style={styles.busName}>{bus?.name}</Text>
        <Text style={styles.seatsText}>
          <Text style={[styles.seatsAvailable, { color: getStatusColor() }]}>{available}</Text>
          <Text style={styles.seatsTotal}> / {capacity} seats</Text>
        </Text>
      </View>

      {/* Time Section */}
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{hours}:{minutes}</Text>
          <Text style={styles.timeLabel}>DEPARTURE</Text>
        </View>
        <View style={styles.timeDivider} />
        <Text style={styles.timeUntil}>{getTimeUntilDeparture(departure.departure_time)}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${percentage}%`, backgroundColor: getStatusColor() }
            ]}
          />
        </View>
        <Text style={styles.progressText}>{percentage}%</Text>
      </View>

      {/* Direction Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <IconSymbol name="house.fill" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{nbr_to_home || 0} to home</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <IconSymbol name="building.2" size={14} color={COLORS.textMuted} />
          <Text style={styles.statText}>{nbr_to_campus || 0} to campus</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {showActions && hasUserTicket && userTicket && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => onCancelTicket?.(userTicket)}
        >
          <Text style={styles.cancelButtonText}>CANCEL TICKET</Text>
        </TouchableOpacity>
      )}

      {showActions && !hasUserTicket && status !== 'locked' && status !== 'full' && (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => onBook?.(departure)}
        >
          <Text style={styles.bookButtonText}>BOOK NOW</Text>
        </TouchableOpacity>
      )}

      {!hasUserTicket && status === 'full' && (
        <View style={styles.fullBadge}>
          <Text style={styles.fullBadgeText}>FULLY BOOKED</Text>
        </View>
      )}

      {!hasUserTicket && status === 'locked' && (
        <View style={styles.lockedBadge}>
          <IconSymbol name="lock" size={14} color={COLORS.textMuted} />
          <Text style={styles.lockedBadgeText}>LOCKED</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routeBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xs,
  },
  routeText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  seatsText: {
    fontSize: 14,
  },
  seatsAvailable: {
    fontWeight: '700',
  },
  seatsTotal: {
    color: COLORS.textMuted,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  timeBlock: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xs,
  },
  timeText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1,
    marginTop: 2,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  timeUntil: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    marginLeft: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginLeft: 6,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: COLORS.errorMuted,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  fullBadge: {
    backgroundColor: COLORS.errorMuted,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  fullBadgeText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  lockedBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
    marginTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  lockedBadgeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
});
