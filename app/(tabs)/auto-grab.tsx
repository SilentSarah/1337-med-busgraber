import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Alert, ScrollView, Modal, Dimensions, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeparturesStore } from '../../stores/departuresStore';
import { useAutoGrab } from '../../hooks/useAutoGrab';
import { VALID_ROUTES, VALID_BUSES, Direction } from '../../api/types';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { COLORS, BORDER_RADIUS, SPACING } from '../../utils/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;

interface PickerWheelProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { label: string; value: number | string }[];
  selectedValue: number | string;
  onSelect: (value: number | string) => void;
  disabledValues?: Set<number | string>;
}

const PickerWheel = ({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  disabledValues = new Set(),
}: PickerWheelProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const selectedIndex = options.findIndex((o) => o.value === selectedValue);
  const [scrollIndex, setScrollIndex] = useState(selectedIndex);

  useEffect(() => {
    if (visible && scrollViewRef.current && selectedIndex >= 0) {
      setScrollIndex(selectedIndex);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      }, 100);
    }
  }, [visible, selectedIndex, options.length]);

  const handleScrollEnd = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < options.length) {
      setScrollIndex(index);
      onSelect(options[index].value);
    }
  };

  const handleDone = () => {
    if (scrollIndex >= 0 && scrollIndex < options.length) {
      onSelect(options[scrollIndex].value);
    }
    onClose();
  };

  const handleSelect = (index: number) => {
    setScrollIndex(index);
    scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    setTimeout(() => onSelect(options[index].value), 300);
  };

  const paddingTop = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;
  const totalHeight = VISIBLE_ITEMS * ITEM_HEIGHT;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={handleDone} style={styles.pickerDone}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: totalHeight }}>
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              onMomentumScrollEnd={handleScrollEnd}
              decelerationRate="fast"
              contentContainerStyle={{ paddingTop, paddingBottom: paddingTop }}
            >
              {options.map((option, index) => {
                const isSelected = index === scrollIndex;
                const isDisabled = disabledValues.has(option.value);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.pickerItem, isDisabled && styles.pickerItemDisabled]}
                    onPress={() => !isDisabled && handleSelect(index)}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      isSelected && styles.pickerItemTextSelected,
                    ]}>
                      {option.label}
                      {isDisabled && ' (passed)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.pickerHighlight} pointerEvents="none" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function AutoGrabScreen() {
  const router = useRouter();
  const { currentDepartures, upcomingDepartures, loadCurrentDepartures, loadUpcomingDepartures } = useDeparturesStore();
  const autoGrab = useAutoGrab();

  const [route, setRoute] = useState<string>(VALID_ROUTES[0]);
  const [bus, setBus] = useState<string>(VALID_BUSES[0]);
  const [hour, setHour] = useState(19);
  const [direction, setDirection] = useState<Direction>('home');
  const [intervalSecs, setIntervalSecs] = useState(1000);

  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [showBusPicker, setShowBusPicker] = useState(false);
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  useEffect(() => {
    loadCurrentDepartures();
    loadUpcomingDepartures();
    const interval = setInterval(() => {
      loadCurrentDepartures();
      loadUpcomingDepartures();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadCurrentDepartures, loadUpcomingDepartures]);

  const hourOptions = React.useMemo(() => {
    const hours = new Set<number>();
    currentDepartures.forEach((d) => {
      const date = new Date(d.departure_time);
      const h = date.getHours();
      if (!isNaN(h)) hours.add(h);
    });
    upcomingDepartures.forEach((d) => {
      const hourMatch = d.departure_time.match(/^(\d{1,2}):/);
      if (hourMatch) hours.add(parseInt(hourMatch[1], 10));
    });
    if (hours.size === 0) for (let h = 0; h <= 23; h++) hours.add(h);
    return Array.from(hours).sort((a, b) => a - b).map((h) => ({
      label: `${h.toString().padStart(2, '0')}:00`,
      value: h
    }));
  }, [currentDepartures, upcomingDepartures]);

  useEffect(() => {
    const hourExists = hourOptions.some((o) => o.value === hour);
    if (!hourExists && hourOptions.length > 0) setHour(hourOptions[0].value);
  }, [hourOptions, hour]);

  const departuresAtHour = React.useMemo(() => {
    const result: Array<{ route: string; bus: string }> = [];
    currentDepartures.forEach((d) => {
      const date = new Date(d.departure_time);
      if (!isNaN(date.getHours()) && date.getHours() === hour) {
        result.push({ route: d.route.name.toLowerCase(), bus: d.route.bus.name.toLowerCase() });
      }
    });
    upcomingDepartures.forEach((d) => {
      const hourMatch = d.departure_time.match(/^(\d{1,2}):/);
      if (hourMatch && parseInt(hourMatch[1], 10) === hour) {
        result.push({ route: d.name.toLowerCase(), bus: d.bus.name.toLowerCase() });
      }
    });
    return result;
  }, [currentDepartures, upcomingDepartures, hour]);

  const availableRoutes = React.useMemo(() => {
    const routes = new Set<string>();
    departuresAtHour.forEach(d => routes.add(d.route));
    return Array.from(routes);
  }, [departuresAtHour]);

  const routeOptions = React.useMemo(() => {
    const routes = availableRoutes.length > 0
      ? VALID_ROUTES.filter(r => availableRoutes.includes(r.toLowerCase()))
      : [...VALID_ROUTES];
    const options = routes.map((r) => ({
      label: r.charAt(0).toUpperCase() + r.slice(1),
      value: r
    }));
    if (routes.length > 1) options.unshift({ label: 'All Routes', value: 'any' });
    return options;
  }, [availableRoutes]);

  const availableBusesForRoute = React.useMemo(() => {
    const buses = new Set<string>();
    if (route === 'any') {
      departuresAtHour.forEach(d => buses.add(d.bus));
    } else {
      departuresAtHour.filter(d => d.route === route.toLowerCase()).forEach(d => buses.add(d.bus));
    }
    return Array.from(buses);
  }, [departuresAtHour, route]);

  const busOptions = React.useMemo(() => {
    const buses = availableBusesForRoute.length > 0
      ? VALID_BUSES.filter(b => availableBusesForRoute.includes(b.toLowerCase()))
      : [...VALID_BUSES];
    const options = buses.map((b) => ({ label: b, value: b }));
    if (buses.length > 1) options.unshift({ label: 'All Buses', value: 'any' });
    return options;
  }, [availableBusesForRoute]);

  useEffect(() => {
    if (!routeOptions.some(r => r.value === route) && routeOptions.length > 0)
      setRoute(routeOptions[0].value);
  }, [routeOptions, route]);

  useEffect(() => {
    if (!busOptions.some(b => b.value === bus) && busOptions.length > 0)
      setBus(busOptions[0].value);
  }, [busOptions, bus]);

  const intervalOptions = [
    { label: '0.5s', value: 500 },
    { label: '1s', value: 1000 },
    { label: '2s', value: 2000 },
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
  ];

  const getIntervalLabel = (ms: number) =>
    intervalOptions.find((o) => o.value === ms)?.label || `${ms}ms`;

  const handleStart = useCallback(() => {
    Alert.alert(
      'Start Auto-Grab?',
      `Route: ${route}\nBus: ${bus}\nTime: ${hour}:00\nDirection: ${direction === 'campus' ? 'To Campus' : 'To Home'}\nInterval: ${getIntervalLabel(intervalSecs)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => autoGrab.start({
            route, bus, hour, toCampus: direction === 'campus', intervalMs: intervalSecs
          }),
        },
      ]
    );
  }, [route, bus, hour, direction, intervalSecs, autoGrab]);

  const handleStop = useCallback(() => {
    Alert.alert('Stop Auto-Grab?', null, [
      { text: 'Keep Running', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: autoGrab.stop },
    ]);
  }, [autoGrab]);

  const getStatusColor = () => {
    switch (autoGrab.status) {
      case 'polling':
      case 'available': return COLORS.warning;
      case 'success': return COLORS.success;
      case 'error': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusText = () => {
    switch (autoGrab.status) {
      case 'polling': return 'Checking...';
      case 'success': return 'Booked!';
      case 'error': return autoGrab.error || 'Error';
      case 'available': return 'Booking...';
      default: return 'Idle';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Auto-Grab Ticket</Text>
      <Text style={styles.subtitle}>Automatically book when a seat becomes available</Text>

      {autoGrab.isActive ? (
        <View style={styles.activeCard}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor() + '20' }]}>
            <IconSymbol
              name={autoGrab.status === 'success' ? 'checkmark.circle.fill' : 'timer'}
              size={40}
              color={getStatusColor()}
            />
          </View>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Attempts</Text>
              <Text style={styles.statValue}>{autoGrab.attempts}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Elapsed</Text>
              <Text style={styles.statValue}>{formatElapsed(autoGrab.elapsed)}</Text>
            </View>
          </View>

          {autoGrab.status !== 'success' ? (
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopButtonText}>Stop Auto-Grab</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => router.push('/(tabs)/tickets' as any)}
            >
              <Text style={styles.viewButtonText}>View My Tickets</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Bus Details</Text>

            <Text style={styles.inputLabel}>Route</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowRoutePicker(true)}>
              <Text style={styles.selectButtonText}>
                {route.charAt(0).toUpperCase() + route.slice(1)}
              </Text>
              <IconSymbol name="chevron.right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Bus</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowBusPicker(true)}>
              <Text style={styles.selectButtonText}>{bus}</Text>
              <IconSymbol name="chevron.right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Departure Hour</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowHourPicker(true)}>
              <Text style={styles.selectButtonText}>{hour}:00</Text>
              <IconSymbol name="chevron.right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Direction</Text>
            <View style={styles.directionRow}>
              <TouchableOpacity
                style={[styles.directionButton, direction === 'home' && styles.directionButtonActive]}
                onPress={() => setDirection('home')}
              >
                <IconSymbol
                  name="house.fill"
                  size={18}
                  color={direction === 'home' ? '#fff' : COLORS.textMuted}
                />
                <Text style={[
                  styles.directionText,
                  direction === 'home' && styles.directionTextActive
                ]}>To Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.directionButton, direction === 'campus' && styles.directionButtonActive]}
                onPress={() => setDirection('campus')}
              >
                <IconSymbol
                  name="building.columns.fill"
                  size={18}
                  color={direction === 'campus' ? '#fff' : COLORS.textMuted}
                />
                <Text style={[
                  styles.directionText,
                  direction === 'campus' && styles.directionTextActive
                ]}>To Campus</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Check Interval</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowIntervalPicker(true)}
            >
              <Text style={styles.selectButtonText}>{getIntervalLabel(intervalSecs)}</Text>
              <IconSymbol name="chevron.right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <IconSymbol name="play.fill" size={18} color="#fff" />
            <Text style={styles.startButtonText}>Start Auto-Grab</Text>
          </TouchableOpacity>
        </>
      )}

      <PickerWheel
        visible={showRoutePicker}
        onClose={() => setShowRoutePicker(false)}
        title="Select Route"
        options={routeOptions}
        selectedValue={route}
        onSelect={(v) => setRoute(String(v))}
      />
      <PickerWheel
        visible={showBusPicker}
        onClose={() => setShowBusPicker(false)}
        title="Select Bus"
        options={busOptions}
        selectedValue={bus}
        onSelect={(v) => setBus(String(v))}
      />
      <PickerWheel
        visible={showHourPicker}
        onClose={() => setShowHourPicker(false)}
        title="Select Hour"
        options={hourOptions.map((opt) => {
          const now = new Date();
          const hourValue = Number(opt.value);
          const isPassed = hourValue < now.getHours() &&
            !(now.getHours() >= 20 && hourValue < 12);
          return { ...opt, label: isPassed ? `${opt.label} (passed)` : opt.label };
        })}
        selectedValue={hour}
        onSelect={(v) => setHour(Number(v))}
      />
      <PickerWheel
        visible={showIntervalPicker}
        onClose={() => setShowIntervalPicker(false)}
        title="Check Interval"
        options={intervalOptions}
        selectedValue={intervalSecs}
        onSelect={(v) => setIntervalSecs(Number(v))}
      />
    </ScrollView>
  );
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  activeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  stopButton: {
    backgroundColor: COLORS.errorMuted,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xs,
    width: '100%',
    alignItems: 'center',
  },
  stopButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xs,
    width: '100%',
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  selectButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    color: COLORS.text,
    fontSize: 15,
  },
  directionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  directionButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.md,
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
    fontSize: 14,
  },
  directionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  pickerContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
    paddingBottom: SPACING.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickerDone: {
    padding: SPACING.sm,
  },
  pickerDoneText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemDisabled: {
    opacity: 0.4,
  },
  pickerItemText: {
    fontSize: 17,
    color: COLORS.textMuted,
  },
  pickerItemTextSelected: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.text,
  },
  pickerHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    backgroundColor: COLORS.primaryMuted,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.primary,
  },
});
