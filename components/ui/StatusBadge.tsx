import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { COLORS } from '../../utils/constants';
import { AvailabilityStatus } from '../../api/types';

interface StatusBadgeProps {
  status: AvailabilityStatus;
  availableCount?: number;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  availableCount,
  size = 'medium',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return {
          text: `${availableCount ?? ''} left`,
          backgroundColor: COLORS.available,
          icon: 'check-circle',
        };
      case 'limited':
        return {
          text: `${availableCount} left`,
          backgroundColor: COLORS.limited,
          icon: 'alert-circle',
        };
      case 'full':
        return {
          text: 'Full',
          backgroundColor: COLORS.full,
          icon: 'close-circle',
        };
      case 'locked':
        return {
          text: 'Locked',
          backgroundColor: COLORS.locked,
          icon: 'lock',
        };
      default:
        return {
          text: 'Unknown',
          backgroundColor: COLORS.textSecondary,
          icon: 'help-circle',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      style={[styles.chip, { backgroundColor: config.backgroundColor + '20' }]} // 20 = 12% opacity
      textStyle={[styles.text, { color: config.backgroundColor }]}
      icon={size === 'medium' ? config.icon : undefined}
      compact={size === 'small'}
    >
      {config.text}
    </Chip>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 16,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
