import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Animated,
  Modal,
} from 'react-native';
// Removed RNPickerSelect import as we're building a custom one
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

type AttendanceStatus = 'Present' | 'Absent' | 'On Duty' | 'Holiday';

interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
}

interface Subject {
  id: number;
  name: string;
  staffName: string;
  minAttendance: number;
  days: string[];
  timeSlot: string;
  classType: string;
  history: AttendanceRecord[];
}

const mockSubject: Subject = {
  id: 2,
  name: 'Crown & Bridge',
  staffName: 'Dr. Sharma',
  minAttendance: 75,
  days: ['Tue', 'Thu'],
  timeSlot: '9:00 AM',
  classType: 'Lab',
  history: [],
};

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'Present',
  'Absent',
  'On Duty',
  'Holiday'
];

// --- NEW CUSTOM STATUS PICKER COMPONENT ---
interface StatusPickerProps {
  label: string;
  selectedValue: AttendanceStatus | null;
  onValueChange: (value: AttendanceStatus) => void;
  items: { label: string; value: AttendanceStatus }[];
}

const StatusPicker: React.FC<StatusPickerProps> = ({ label, selectedValue, onValueChange, items }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const displayLabel = selectedValue ? selectedValue : label;

  return (
    <View>
      <TouchableOpacity
        style={styles.pickerBoxCustom} // Custom style for the button that opens the picker
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerTextCustom, !selectedValue && styles.placeholderText]}>
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={22} color="#8b5cf6" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade" // Fade animation for a smoother look
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)} // Close modal when clicking outside
        >
          <View style={styles.customPickerModalContent}>
            <Text style={styles.modalTitle}>Select attendance status...</Text>
            {items.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.customPickerItem,
                  selectedValue === item.value && styles.customPickerSelectedItem,
                ]}
                onPress={() => {
                  onValueChange(item.value);
                  setModalVisible(false);
                }}
              >
                <Text style={[
                  styles.customPickerItemText,
                  selectedValue === item.value && styles.customPickerSelectedItemText
                ]}>
                  {item.label}
                </Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={20} color="#8b5cf6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
// --- END NEW CUSTOM STATUS PICKER COMPONENT ---


export default function SubjectDetailScreen() {
  const router = useRouter();
  const { subjectId } = useLocalSearchParams();

  const [subject, setSubject] = useState<Subject>(mockSubject);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [saveAnim] = useState(new Animated.Value(0));
  const [saveText, setSaveText] = useState('Save Attendance');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false); // Renamed for clarity

  const getStats = () => {
    const attended = subject.history.filter(h => h.status === 'Present' || h.status === 'On Duty').length;
    const total = subject.history.filter(
      h => h.status === 'Present' || h.status === 'Absent'
    ).length;
    const absent = subject.history.filter(h => h.status === 'Absent').length;
    
    return { attended, total, absent };
  };

  const stats = getStats();
  const percentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  const calculateSafeToSkip = () => {
    if (stats.total === 0) return 0;
    const minClassesRequired = Math.ceil((subject.minAttendance / 100) * stats.total);
    const maxSkipsAllowed = stats.total - minClassesRequired;
    return Math.max(0, maxSkipsAllowed - stats.absent);
  };

  const safeToSkip = calculateSafeToSkip();
  const showCriticalWarning = percentage < subject.minAttendance && safeToSkip <= 0;

  const handleSaveAttendance = () => {
    if (!selectedStatus) {
      Alert.alert('Error', 'Please select an attendance status');
      return;
    }
    const newHistory = [...subject.history, { date: selectedDate, status: selectedStatus }];
    setSubject({ ...subject, history: newHistory });
    setSelectedStatus(null);
    animateSave();
  };

  const animateSave = () => {
    setSaveText('Saved!');
    Animated.timing(saveAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(saveAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setSaveText('Save Attendance');
        });
      }, 1000);
    });
  };

  const handleEditRecord = (index: number) => {
    setEditIndex(index);
    setEditStatus(subject.history[index].status);
    setEditModalVisible(true); // Use the renamed state
  };

  const saveEditStatus = () => {
    if (!editStatus || editIndex === null) {
      Alert.alert('Error', 'Please select an attendance status');
      return;
    }
    const newHistory = subject.history.slice();
    newHistory[editIndex].status = editStatus;
    setSubject({ ...subject, history: newHistory });
    setEditModalVisible(false); // Use the renamed state
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return { icon: 'checkmark-circle' as const, color: '#10b981' };
      case 'Absent':
        return { icon: 'close-circle' as const, color: '#ef4444' };
      case 'On Duty':
        return { icon: 'briefcase' as const, color: '#f59e0b' };
      case 'Holiday':
        return { icon: 'home' as const, color: '#3b82f6' };
      default:
        return { icon: 'help-circle' as const, color: '#6b7280' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#9ca3af" />
          <Text style={styles.backText}>Back to Subjects</Text>
        </TouchableOpacity>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.subjectTitle}>{subject.name}</Text>
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{subject.classType}</Text>
              </View>
              <Text style={styles.staffName}>{subject.staffName}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{percentage}
                <Text style={styles.statPercent}>%</Text>
              </Text>
              <Text style={styles.statLabel}>Current Attendance</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.attended}
                <Text style={styles.statPercent}>/{stats.total}</Text>
              </Text>
              <Text style={styles.statLabel}>Classes Attended</Text>
            </View>
          </View>
        </View>

        {/* Critical Warning */}
        {showCriticalWarning && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Critical: Cannot Miss Classes</Text>
              <Text style={styles.warningText}>
                You need to attend all remaining classes to maintain {subject.minAttendance}% attendance.
              </Text>
            </View>
          </View>
        )}

        {/* Mark Attendance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mark Attendance</Text>
          <View style={styles.card}>
            <View style={styles.dateInputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            </View>

            {/* Custom Status Picker */}
            <StatusPicker
              label="Select attendance status..."
              selectedValue={selectedStatus}
              onValueChange={setSelectedStatus}
              items={ATTENDANCE_STATUSES.map(s => ({ label: s, value: s }))}
            />

            <Animated.View style={{
              opacity: saveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }),
              transform: [{
                scale: saveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] })
              }]
            }}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveAttendance}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>{saveText}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Recent History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent History</Text>
          {subject.history.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#4b5563" />
              <Text style={styles.emptyStateText}>No attendance history yet</Text>
              <Text style={styles.emptyStateSubtext}>Start marking your attendance above</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {[...subject.history].reverse().slice(0, 5).map((record, idx) => {
                const actualIdx = subject.history.length - 1 - idx;
                const { icon, color } = getStatusIcon(record.status);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.historyItem}
                    activeOpacity={0.7}
                    onPress={() => handleEditRecord(actualIdx)}
                  >
                    <View style={styles.historyLeft}>
                      <View style={[styles.historyIcon, { backgroundColor: `${color}20` }]}>
                        <Ionicons name={icon} size={20} color={color} />
                      </View>
                      <Text style={styles.historyStatus}>{record.status}</Text>
                    </View>
                    <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- BOTTOM SUMMARY REMOVED ---
      <View style={styles.bottomSummary}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNumber}>{stats.attended}</Text>
          <Text style={styles.summaryLabel}>Total Present</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNumber, { color: '#ef4444' }]}>{stats.absent}</Text>
          <Text style={styles.summaryLabel}>Total Absent</Text>
        </View>
      </View>
      */}

      {/* Modal for Editing History (now using the custom picker's style) */}
      <Modal
        transparent
        visible={editModalVisible} // Use the renamed state
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customPickerModalContent}> {/* Reusing this style */}
            <Text style={styles.modalTitle}>Edit Attendance Status</Text>
            {ATTENDANCE_STATUSES.map((statusItem) => (
              <TouchableOpacity
                key={statusItem}
                style={[
                  styles.customPickerItem,
                  editStatus === statusItem && styles.customPickerSelectedItem,
                ]}
                onPress={() => setEditStatus(statusItem)}
              >
                <Text style={[
                  styles.customPickerItemText,
                  editStatus === statusItem && styles.customPickerSelectedItemText
                ]}>
                  {statusItem}
                </Text>
                {editStatus === statusItem && (
                  <Ionicons name="checkmark" size={20} color="#8b5cf6" />
                )}
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' }}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={saveEditStatus}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollView: { flex: 1 },
  // --- ADJUSTED PADDINGBOTTOM ---
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  headerCard: { backgroundColor: '#8b5cf6', padding: 20, borderRadius: 16, marginBottom: 16 },
  headerTop: { marginBottom: 20 },
  subjectTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  staffName: { color: '#ffffff', fontSize: 14, opacity: 0.9 },
  statsGrid: { flexDirection: 'row', gap: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  statPercent: { fontSize: 20, color: '#ffffff', opacity: 0.8 },
  statLabel: { fontSize: 11, color: '#ffffff', opacity: 0.7, marginTop: 4 },
  warningCard: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, marginBottom: 16 },
  warningContent: { flex: 1 },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#ef4444', marginBottom: 4 },
  warningText: { fontSize: 13, color: '#ef4444', opacity: 0.9 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#262626' },
  dateInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#262626', padding: 16, borderRadius: 12, marginBottom: 16 },
  dateText: { fontSize: 16, color: '#ffffff', flex: 1 },
  saveBtn: { backgroundColor: '#8b5cf6', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  emptyState: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  emptyStateText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  emptyStateSubtext: { color: '#6b7280', fontSize: 14 },
  historyList: { gap: 8 },
  historyItem: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  historyStatus: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  historyDate: { fontSize: 13, color: '#6b7280' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#222', borderRadius: 16, padding: 24, width: '90%', alignItems: 'center' },
  modalTitle: { color: '#fff', fontWeight: '700', fontSize: 18, marginBottom: 20 },
  modalBtn: { backgroundColor: '#8b5cf6', padding: 12, borderRadius: 6, alignItems: 'center', flex: 1 },
  modalBtnText: { color: '#fff', fontWeight: '700' },

  // --- NEW CUSTOM PICKER STYLES ---
  pickerBoxCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    marginBottom: 16,
    height: 56, // Match height of date input
  },
  pickerTextCustom: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  customPickerModalContent: {
    backgroundColor: '#1a1a1a', // Darker background for the modal content
    borderRadius: 16,
    padding: 20,
    width: '90%', // Wider modal
    maxHeight: '70%', // Limit height
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  customPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  customPickerSelectedItem: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)', // Light purple background for selected
    borderRadius: 8, // Rounded corners for selected item
  },
  customPickerItemText: {
    color: '#ffffff',
    fontSize: 16,
  },
  customPickerSelectedItemText: {
    fontWeight: '600',
    color: '#8b5cf6', // Purple text for selected
  },
  // --- END NEW CUSTOM PICKER STYLES ---
});