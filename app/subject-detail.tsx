import { useSubjects } from '@/contexts/SubjectsContext';
import { AppAttendanceRecord } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  // Alert, // Removed Alert
  Animated, // Added Animated
  Easing,   // Added Easing
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type AttendanceStatus = 'Present' | 'Absent' | 'OD' | 'Holiday';

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'Present',
  'Absent',
  'OD',
  'Holiday'
];

// StatusPicker Component (remains unchanged from previous version)
const StatusPicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelect: (status: AttendanceStatus) => void;
  currentStatus?: AttendanceStatus;
}> = ({ visible, onClose, onSelect, currentStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | undefined>(currentStatus);

  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus, visible]);

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present': return { icon: 'checkmark-circle' as const, color: '#10b981' };
      case 'Absent': return { icon: 'close-circle' as const, color: '#ef4444' };
      case 'OD': return { icon: 'briefcase' as const, color: '#f59e0b' };
      case 'Holiday': return { icon: 'home' as const, color: '#3b82f6' };
      default: return { icon: 'help-circle' as const, color: '#6b7280' };
    }
  };

  const handleSelect = () => {
    if (selectedStatus) {
      onSelect(selectedStatus);
    }
    // onClose(); // Parent handles closing
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.statusPicker} onStartShouldSetResponder={() => true}>
          <Text style={styles.pickerTitle}>Select Status</Text>
          <View style={styles.statusList}>
            {ATTENDANCE_STATUSES.map((status) => {
              const { icon, color } = getStatusIcon(status);
              const isSelected = selectedStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    isSelected && { backgroundColor: `${color}20`, borderColor: color }
                  ]}
                  onPress={() => setSelectedStatus(status)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={24} color={color} />
                  </View>
                  <Text style={[styles.statusText, isSelected && { color, fontWeight: '600' }]}>
                    {status}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={color} style={styles.selectedCheckmark} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.pickerActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectButton, !selectedStatus && styles.selectButtonDisabled]}
              onPress={handleSelect}
              disabled={!selectedStatus}
              activeOpacity={0.7}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};


export default function SubjectDetailScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const router = useRouter();
  const { subjects, loading: subjectsLoading, error: subjectsError, addAttendance, updateAttendance, deleteAttendance } = useSubjects();

  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<AppAttendanceRecord | null>(null);

  // --- Start: Added Toast Logic ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
    }
    setToastMessage(message);
    setToastType(type);
    Animated.timing(toastAnim, {
        toValue: 60, // Position below status bar
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
    }).start();
    toastTimeout.current = setTimeout(() => {
        Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
        }).start(() => {
        setToastMessage(null); // Clear message after hiding
        });
    }, 3000); // Hide after 3 seconds
  };

  useEffect(() => { // Cleanup timeout on unmount
    return () => {
        if (toastTimeout.current) {
            clearTimeout(toastTimeout.current);
        }
    };
  }, []);
  // --- End: Added Toast Logic ---

  const subject = subjects.find(s => s.id === subjectId);

  // Loading State
  if (subjectsLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading subject details...</Text>
        </View>
      </View>
    );
  }

  // Error State
  if (subjectsError || !subject) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Error Loading Subject</Text>
          <Text style={styles.errorText}>
            {subjectsError || 'The requested subject could not be found.'}
          </Text>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Local date formatter
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Calculate stats (memoize if becomes complex, but likely fine here)
  const calculateStats = () => {
    const attended = subject.history.filter(h => h.status === 'Present' || h.status === 'OD').length;
    const total = subject.history.filter(h => h.status === 'Present' || h.status === 'Absent').length;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    const minRequired = Math.ceil((subject.minAttendance / 100) * total);
    const maxSkips = total - minRequired;
    const skipsUsed = total - attended;
    const safeToSkip = Math.max(0, maxSkips - skipsUsed);
    return { attended, total, percentage, safeToSkip };
  };
  const stats = calculateStats();

  // Get status color and icon helpers
  const getStatusColor = (status: AttendanceStatus): string => {
      switch (status) {
          case 'Present': return '#10b981';
          case 'Absent': return '#ef4444';
          case 'OD': return '#f59e0b';
          case 'Holiday': return '#3b82f6';
          default: return '#6b7280';
      }
  };
  const getStatusIcon = (status: AttendanceStatus): keyof typeof Ionicons.glyphMap => {
      switch (status) {
          case 'Present': return 'checkmark-circle';
          case 'Absent': return 'close-circle';
          case 'OD': return 'briefcase';
          case 'Holiday': return 'home';
          default: return 'help-circle';
      }
  };


  // Handle status selection from StatusPicker
  const handleStatusSelect = async (status: AttendanceStatus) => {
    if (!selectedDate || !subject) return;

    setStatusPickerVisible(false); // Close picker first

    try {
      let success = false;
      let message = '';
      if (editingRecord) { // If editing an existing record
        success = await updateAttendance(subject.id, selectedDate, status, editingRecord.notes); // Pass existing notes if needed
        message = success ? 'Attendance updated!' : 'Failed to update attendance.';
      } else { // If adding a new record
        const record: AppAttendanceRecord = { date: selectedDate, status, notes: null };
        success = await addAttendance(subject.id, record);
        message = success ? 'Attendance marked!' : 'Failed to mark attendance.';
      }

      showToast(message, success ? 'success' : 'error'); // Show feedback using toast

    } catch (error) {
       console.error("Error saving/updating attendance:", error);
      showToast('An unexpected error occurred.', 'error');
    } finally {
        // Reset state regardless of success/failure after showing toast
        setSelectedDate(null);
        setEditingRecord(null);
    }
  };

  // Open picker to edit an existing record
  const handleRecordPress = (record: AppAttendanceRecord) => {
    setEditingRecord(record);
    setSelectedDate(record.date);
    setStatusPickerVisible(true);
  };

  // Open picker to add today's record
  const handleAddAttendance = () => {
    const todayStr = toLocalYMD(new Date());
    setEditingRecord(null); // Ensure not editing
    setSelectedDate(todayStr);
    setStatusPickerVisible(true);
  };

  const todayStr = toLocalYMD(new Date());
  const todayRecord = subject.history.find(record => record.date === todayStr);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

       {/* --- Start: Added Toast Rendering --- */}
       {toastMessage && (
        <Animated.View style={[
          styles.toastContainer,
          { transform: [{ translateY: toastAnim }] },
          toastType === 'error' ? styles.toastError : styles.toastSuccess
        ]}>
          <Ionicons
              name={toastType === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={22} color="#ffffff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
       )}
       {/* --- End: Added Toast Rendering --- */}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
                <Text style={styles.subjectName} numberOfLines={1} ellipsizeMode='tail'>{subject.name}</Text>
                <Text style={styles.subjectDetails} numberOfLines={1} ellipsizeMode='tail'>
                {subject.staffName} • {subject.classType}
                </Text>
            </View>
        </View>

        {/* Statistics Card */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Attendance Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.percentage}%</Text>
              <Text style={styles.statLabel}>Overall</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.attended}</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Held</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.safeToSkip}</Text>
              <Text style={styles.statLabel}>Safe Skips</Text>
            </View>
          </View>
        </View>

        {/* Critical Warning */}
        {stats.percentage < subject.minAttendance && stats.total > 0 && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={24} color="#f59e0b" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Attendance Alert</Text>
              <Text style={styles.warningText}>
                Attendance is below the required {subject.minAttendance}%.
                {stats.safeToSkip <= 0 && " You cannot skip any more classes."}
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            {!todayRecord ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddAttendance}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Mark Today's Attendance</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: getStatusColor(todayRecord.status)}]}
                onPress={() => handleRecordPress(todayRecord)}
                activeOpacity={0.7}
               >
                 <Ionicons name="pencil-outline" size={18} color={getStatusColor(todayRecord.status)} />
                <Text style={[styles.secondaryButtonText, { color: getStatusColor(todayRecord.status)}]}>
                  Edit Today ({todayRecord.status})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Attendance History */}
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>Attendance History</Text>
          {subject.history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="calendar-clear-outline" size={48} color="#4b5563" />
              <Text style={styles.emptyTitle}>No Records Yet</Text>
              <Text style={styles.emptySubtitle}>
                Mark attendance to see the history here.
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {[...subject.history]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record, index) => (
                  <TouchableOpacity
                    key={`${record.date}-${index}`}
                    style={styles.historyItem}
                    onPress={() => handleRecordPress(record)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historyLeft}>
                      <View
                        style={[
                          styles.statusIndicator,
                          { backgroundColor: getStatusColor(record.status) },
                        ]}
                      >
                        <Ionicons
                          name={getStatusIcon(record.status)}
                          size={16}
                          color="#ffffff"
                        />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>
                          {new Date(record.date + 'T00:00:00').toLocaleDateString('en-GB', {
                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </Text>
                        <Text style={[styles.historyStatus, { color: getStatusColor(record.status) }]}>
                           {record.status}
                           {record.notes ? ` (${record.notes})` : ''}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Status Picker Modal */}
      <StatusPicker
        visible={statusPickerVisible}
        onClose={() => {
          setStatusPickerVisible(false);
          setSelectedDate(null);
          setEditingRecord(null);
        }}
        onSelect={handleStatusSelect}
        currentStatus={editingRecord?.status}
      />
    </View>
  );
}

// --- Styles (Add toast styles) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
      },
       // --- Added Toast Styles ---
      toastContainer: {
        position: 'absolute',
        top: 0, // Animated in
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
      },
      toastSuccess: { backgroundColor: '#10b981' },
      toastError: { backgroundColor: '#ef4444' },
      toastText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flex: 1 },
      // --- End Toast Styles ---
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
      },
      loadingText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '500',
        marginTop: 16,
      },
      errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        padding: 20,
      },
      errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
      },
      errorText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
      },
       backButtonError: {
        marginTop: 20,
        backgroundColor: '#262626',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
      },
      backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
      },
       editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
      },
      backButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
      },
      headerInfo: {
        flex: 1,
      },
      subjectName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
      },
      subjectDetails: {
        fontSize: 14,
        color: '#6b7280',
      },
      statsCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      },
      cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 16,
      },
      statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
      },
      statItem: {
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 5,
      },
      statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
      },
      statLabel: {
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
      },
      warningCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
        alignItems: 'center',
      },
      warningContent: {
        flex: 1,
        marginLeft: 12,
      },
      warningTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f59e0b',
        marginBottom: 4,
      },
      warningText: {
        fontSize: 14,
        color: '#fcd34d',
        lineHeight: 20,
      },
      actionsCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      },
      actionButtons: {
        gap: 12,
      },
      primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        padding: 16,
        gap: 8,
      },
      primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
      },
      secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderRadius: 12,
        padding: 16,
        gap: 8,
        borderWidth: 1.5,
      },
      secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
      },
      historyCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      },
      emptyHistory: {
        alignItems: 'center',
        paddingVertical: 40,
      },
      emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
      },
      emptySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
      },
      historyList: {
        gap: 10,
      },
      historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#262626',
        borderRadius: 12,
        padding: 16,
      },
      historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
      },
      statusIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      historyInfo: {
        flex: 1,
      },
      historyDate: {
        fontSize: 15,
        fontWeight: '500',
        color: '#e5e7eb',
        marginBottom: 2,
      },
      historyStatus: {
        fontSize: 13,
        fontWeight: '600',
      },
      bottomPadding: {
        height: 100,
      },
      // StatusPicker Modal Styles
      modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20, // Add padding to overlay
      },
      statusPicker: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 24,
        width: '100%', // Take full width within padding
        maxWidth: 400, // Max width
        borderWidth: 1,
        borderColor: '#262626',
      },
      pickerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 24,
      },
      statusList: {
        gap: 12,
        marginBottom: 24,
      },
      statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#3a3a3a',
      },
      statusIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      },
      statusText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
      },
       selectedCheckmark: {
        marginLeft: 8,
      },
      pickerActions: {
        flexDirection: 'row',
        gap: 12,
      },
      cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#262626',
        alignItems: 'center',
      },
      cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
      },
      selectButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
      },
      selectButtonDisabled: {
        backgroundColor: '#4b5563',
        opacity: 0.7,
      },
      selectButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
      },
    });