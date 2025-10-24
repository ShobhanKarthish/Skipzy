import { useSubjects } from '@/contexts/SubjectsContext';
import { AppAttendanceRecord } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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

const StatusPicker: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelect: (status: AttendanceStatus) => void;
  currentStatus?: AttendanceStatus;
}> = ({ visible, onClose, onSelect, currentStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | undefined>(currentStatus);

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return { icon: 'checkmark-circle' as const, color: '#10b981' };
      case 'Absent':
        return { icon: 'close-circle' as const, color: '#ef4444' };
      case 'OD':
        return { icon: 'briefcase' as const, color: '#f59e0b' };
      case 'Holiday':
        return { icon: 'home' as const, color: '#3b82f6' };
    }
  };

  const handleSelect = () => {
    if (selectedStatus) {
      onSelect(selectedStatus);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.statusPicker}>
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
                  <Text style={[styles.statusText, isSelected && { color }]}>
                    {status}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={color} />
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
      </View>
    </Modal>
  );
};

export default function SubjectDetailScreen() {
  const { subjectId } = useLocalSearchParams();
  const router = useRouter();
  const { subjects, loading, error, addAttendance, updateAttendance, deleteAttendance } = useSubjects();
  
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<AppAttendanceRecord | null>(null);

  // Find the subject by ID
  const subject = subjects.find(s => s.id === subjectId);

  // Show loading state
  if (loading) {
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

  // Show error state
  if (error || !subject) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Subject Not Found</Text>
          <Text style={styles.errorText}>
            {error || 'The requested subject could not be found.'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate attendance statistics
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

  // Get status color
  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return '#10b981';
      case 'Absent':
        return '#ef4444';
      case 'OD':
        return '#f59e0b';
      case 'Holiday':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  // Get status icon
  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return 'checkmark-circle';
      case 'Absent':
        return 'close-circle';
      case 'OD':
        return 'briefcase';
      case 'Holiday':
        return 'home';
      default:
        return 'help-circle';
    }
  };

  // Handle status selection
  const handleStatusSelect = async (status: AttendanceStatus) => {
    if (!selectedDate) return;

    try {
      if (editingRecord) {
        // Update existing record
        const success = await updateAttendance(subject.id, selectedDate, status);
        if (success) {
          Alert.alert('Success', 'Attendance updated successfully!');
        } else {
          Alert.alert('Error', 'Failed to update attendance. Please try again.');
        }
      } else {
        // Add new record
        const record: AppAttendanceRecord = {
          date: selectedDate,
          status,
          notes: null,
        };
        const success = await addAttendance(subject.id, record);
        if (success) {
          Alert.alert('Success', 'Attendance marked successfully!');
        } else {
          Alert.alert('Error', 'Failed to mark attendance. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }

    setSelectedDate(null);
    setEditingRecord(null);
  };

  // Handle record press
  const handleRecordPress = (record: AppAttendanceRecord) => {
    setEditingRecord(record);
    setSelectedDate(record.date);
    setStatusPickerVisible(true);
  };

  // Handle add new attendance
  const handleAddAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingRecord(null);
    setSelectedDate(today);
    setStatusPickerVisible(true);
  };

  // Check if today is already marked
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = subject.history.find(record => record.date === today);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.subjectName}>{subject.name}</Text>
            <Text style={styles.subjectDetails}>
              {subject.staffName} • {subject.classType} • {subject.timeSlot}
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
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.safeToSkip}</Text>
              <Text style={styles.statLabel}>Safe to Skip</Text>
            </View>
          </View>
        </View>

        {/* Critical Warning */}
        {stats.percentage < subject.minAttendance && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Critical Warning</Text>
              <Text style={styles.warningText}>
                Your attendance is below the required {subject.minAttendance}%. 
                You need to attend more classes to meet the requirement.
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
                <Ionicons name="add-circle" size={20} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Mark Today's Attendance</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.todayMarked}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.todayMarkedText}>
                  Today marked as: {todayRecord.status}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Attendance History */}
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>Attendance History</Text>
          {subject.history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="calendar-outline" size={48} color="#4b5563" />
              <Text style={styles.emptyTitle}>No Records Yet</Text>
              <Text style={styles.emptySubtitle}>
                Start marking your attendance to see history here
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {subject.history
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record, index) => (
                  <TouchableOpacity
                    key={index}
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
                          name={getStatusIcon(record.status) as any}
                          size={16}
                          color="#ffffff"
                        />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                        <Text style={styles.historyStatus}>{record.status}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
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
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
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
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
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
    color: '#f59e0b',
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
  todayMarked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  todayMarkedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#10b981',
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
    gap: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  historyStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPicker: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
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
    borderWidth: 1,
    borderColor: '#262626',
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
  pickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
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
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});