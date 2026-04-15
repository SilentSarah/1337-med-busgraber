import React, { useState } from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeparturesStore } from '../../stores/departuresStore';
import { ScheduledBooking } from '../../api/types';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useTicketsStore } from '../../stores/ticketsStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { COLORS, BORDER_RADIUS, SPACING } from '../../utils/constants';

export default function ScheduledScreen() {
  const { scheduledBookings, addScheduledBooking, removeScheduledBooking } = useDeparturesStore();
  const { loadMyTickets } = useTicketsStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    route: 'Martil',
    bus: 'BUS 01',
    hour: '18',
    minute: '00',
    to_campus: false,
  });

  const handleAddScheduled = () => {
    const hour = parseInt(newBooking.hour);
    const minute = parseInt(newBooking.minute);

    if (isNaN(hour) || hour < 0 || hour > 23) {
      Alert.alert('Invalid Time', 'Hour must be between 0 and 23');
      return;
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Invalid Time', 'Minute must be between 0 and 59');
      return;
    }

    addScheduledBooking({
      route: newBooking.route,
      bus: newBooking.bus,
      hour: hour + minute / 60,
      to_campus: newBooking.to_campus,
    });

    setShowAddModal(false);
    setNewBooking({
      route: 'Martil',
      bus: 'BUS 01',
      hour: '18',
      minute: '00',
      to_campus: false,
    });
  };

  const handleDeleteBooking = (id: string) => {
    Alert.alert(
      'Remove Scheduled Booking?',
      'This will cancel the auto-grab for this departure.',
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeScheduledBooking(id) },
      ]
    );
  };

  const renderBooking = ({ item }: { item: ScheduledBooking }) => {
    const hour = Math.floor(item.hour);
    const minute = Math.round((item.hour - hour) * 60);
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.routeBadge}>
            <Text style={styles.routeText}>{item.route}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteBooking(item.id)}>
            <IconSymbol name="trash" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <IconSymbol name="bus.fill" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{item.bus}</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="clock" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{timeStr}</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="arrow.right" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              {item.to_campus ? 'To Campus' : 'To Home'}
            </Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          {item.booked ? (
            <View style={styles.bookedBadge}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={COLORS.success} />
              <Text style={styles.bookedText}>Booked</Text>
              {item.ticket_hash && (
                <Text style={styles.hashText}>
                  #{item.ticket_hash.slice(0, 8)}
                </Text>
              )}
            </View>
          ) : item.error ? (
            <View style={styles.errorBadge}>
              <IconSymbol name="exclamationmark.circle.fill" size={14} color={COLORS.error} />
              <Text style={styles.errorText}>{item.error}</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.pendingText}>Monitoring...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{scheduledBookings.length} SCHEDULED</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Scheduled Bookings</Text>
        <Text style={styles.headerSubtitle}>Auto-grab when seats become available</Text>
      </View>

      <FlatList
        data={scheduledBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="clock"
            title="No Scheduled Bookings"
            message="Add scheduled bookings to automatically grab tickets"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <IconSymbol name="plus" size={18} color="#fff" />
        <Text style={styles.addButtonText}>Add Scheduled Booking</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Scheduled Booking</Text>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>Route</Text>
              <View style={styles.optionsRow}>
                {['Martil', 'Tetouan', 'Mdiq'].map((route) => (
                  <TouchableOpacity
                    key={route}
                    style={[
                      styles.optionButton,
                      newBooking.route === route && styles.optionButtonActive,
                    ]}
                    onPress={() => setNewBooking({ ...newBooking, route })}
                  >
                    <Text style={[
                      styles.optionText,
                      newBooking.route === route && styles.optionTextActive,
                    ]}>
                      {route}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Bus</Text>
              <View style={styles.optionsRow}>
                {['BUS 01', 'BUS 02', 'BUS 03'].map((bus) => (
                  <TouchableOpacity
                    key={bus}
                    style={[
                      styles.optionButton,
                      newBooking.bus === bus && styles.optionButtonActive,
                    ]}
                    onPress={() => setNewBooking({ ...newBooking, bus })}
                  >
                    <Text style={[
                      styles.optionText,
                      newBooking.bus === bus && styles.optionTextActive,
                    ]}>
                      {bus}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Time (HH:MM)</Text>
              <View style={styles.timeInputRow}>
                <TextInput
                  style={styles.timeInput}
                  value={newBooking.hour}
                  onChangeText={(text) => setNewBooking({ ...newBooking, hour: text })}
                  placeholder="18"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={newBooking.minute}
                  onChangeText={(text) => setNewBooking({ ...newBooking, minute: text })}
                  placeholder="00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <Text style={styles.label}>Direction</Text>
              <View style={styles.optionsRow}>
                {[
                  { label: 'To Home', value: false },
                  { label: 'To Campus', value: true },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.optionButton,
                      newBooking.to_campus === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => setNewBooking({ ...newBooking, to_campus: option.value })}
                  >
                    <Text style={[
                      styles.optionText,
                      newBooking.to_campus === option.value && styles.optionTextActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleAddScheduled}>
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  cardContent: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoText: {
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 14,
  },
  statusContainer: {
    marginTop: SPACING.sm,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successMuted,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
  },
  bookedText: {
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 6,
  },
  hashText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorMuted,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
  },
  errorText: {
    color: COLORS.error,
    marginLeft: 6,
    flex: 1,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningMuted,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
  },
  pendingText: {
    color: COLORS.warning,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  addButton: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  optionText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.md,
    width: 80,
    textAlign: 'center',
    fontSize: 20,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeSeparator: {
    fontSize: 20,
    color: COLORS.text,
    marginHorizontal: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xs,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
