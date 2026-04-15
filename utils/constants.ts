import { Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Modern Dark Theme - Sharp edges, minimal roundness
export const COLORS = {
  background: '#0A0A0A',
  surface: '#141414',
  surfaceLight: '#1A1A1A',
  surfaceHover: '#222222',

  primary: '#14B8A6',
  primaryHover: '#0D9488',
  primaryMuted: 'rgba(20, 184, 166, 0.15)',

  secondary: '#64748B',
  secondaryHover: '#475569',

  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  border: '#27272A',
  borderLight: '#3F3F46',

  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
};

export const BORDER_RADIUS = {
  xs: 2,
  sm: 3,
  md: 4,
  lg: 6,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
