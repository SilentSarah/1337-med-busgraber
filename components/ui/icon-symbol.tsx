// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const MAPPING: Record<string, IconName> = {
  'house.fill': 'home',
  'building.2': 'location-city',
  'bus.fill': 'directions-bus',
  'calendar': 'calendar-today',
  'ticket.fill': 'confirmation-number',
  'timer': 'timer',
  'list.bullet': 'list',
  'play.fill': 'play-arrow',
  'checkmark.circle.fill': 'check-circle',
  'clock': 'schedule',
  'lock': 'lock',
  'logout': 'exit-to-app',
  'chevron.right': 'chevron-right',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'error',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
  'eye': 'visibility',
  'eye.slash': 'visibility-off',
  'key.fill': 'vpn-key',
  'number': 'format-list-numbered',
  'trash': 'delete',
  'plus': 'add',
  'building.columns.fill': 'account-balance',
  'close': 'close',
  'arrow.clockwise': 'refresh',
};

type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
