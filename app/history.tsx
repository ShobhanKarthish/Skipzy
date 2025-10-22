import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSubjects } from '@/contexts/SubjectsContext';
import { AttendanceRecord } from '@/types/subjects';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
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
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  analyticsCard: {
    flexDirection: 'row',
    backgroundColor: '#8b5cf6',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyticsLeft: {
    flex: 1,
  },
  analyticsTitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 8,
  },
  analyticsPercentage: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
  },
  analyticsRight: {
    alignItems: 'flex-end',
  },
  analyticsRatio: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  calendarCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayLabel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDaySelected: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderRadius: 12,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  calendarDayTextSelected: {
    color: '#ffffff',
  },
  holidayText: {
    color: '#ef4444',
  },
  absenceDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ef4444',
  },
  jumpButton: {
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  jumpButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  dailySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dailySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  noClasses: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  noClassesText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 12,
  },
  attendanceList: {
    gap: 12,
  },
  attendanceItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  attendanceTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  attendanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8b5cf6',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  statusOptions: {
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#262626',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3a3a3a',
  },
  statusOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  textArea: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#262626',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

type AttendanceStatus = 'Present' | 'Absent' | 'On Duty' | 'Holiday';
const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'On Duty', 'Holiday'];

export default function HistoryScreen() {
  const router = useRouter();
  const { subjectId } = useLocalSearchParams();
  const { subjects, updateAttendance } = useSubjects();
  
  const subject = subjects.find(s => s.id === Number(subjectId));
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{
    index: number;
    date: string;
    status: AttendanceStatus;
    notes: string;
  } | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }

    setToastMessage(message);
    setToastType(type);

    Animated.timing(toastAnim, {
      toValue: 50,
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
        setToastMessage(null);
      });
    }, 3000);
  };

  if (!subject) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Subject not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate month stats
  const getMonthStats = (date: Date) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthRecords = subject.history.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    const attended = monthRecords.filter(
      r => r.status === 'Present' || r.status === 'On Duty'
    ).length;
    const total = monthRecords.filter(
      r => r.status === 'Present' || r.status === 'Absent'
    ).length;

    return {
      attended,
      total,
      percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
    };
  };

  // Get attendance for specific date
  const getAttendanceForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return subject.history.filter(record => record.date === dateStr);
  };

  // Check if date has absence
  const hasAbsence = (date: Date) => {
    const records = getAttendanceForDate(date);
    return records.some(r => r.status === 'Absent');
  };

  // Check if date is holiday
  const isHoliday = (date: Date) => {
    return date.getDay() === 0; // Sunday
  };

  // Calendar navigation
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Get calendar days
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    // Add padding days
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
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
    }
  };

  const handleEditRecord = (recordIndex: number, record: AttendanceRecord) => {
    setEditingRecord({
      index: recordIndex,
      date: record.date,
      status: record.status,
      notes: '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;

    updateAttendance(subject.id, editingRecord.index, editingRecord.status);
    setEditModalVisible(false);
    setEditingRecord(null);
    showToast('Attendance updated successfully!', 'success');
  };

  const monthStats = getMonthStats(currentMonth);
  const calendarDays = getCalendarDays();
  const selectedDateAttendance = getAttendanceForDate(selectedDate);
  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && 
                         currentMonth.getFullYear() === new Date().getFullYear();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Toast */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: toastAnim }] },
            toastType === 'error' ? styles.toastError : styles.toastSuccess,
          ]}
        >
          <Ionicons
            name={toastType === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={22}
            color="#ffffff"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Analytics Card */}
        <View style={styles.analyticsCard}>
          <View style={styles.analyticsLeft}>
            <Text style={styles.analyticsTitle}>
              {isCurrentMonth ? "This Month's Attendance" : `${monthName.split(' ')[0]}'s Attendance`}
            </Text>
            <Text style={styles.analyticsPercentage}>{monthStats.percentage}%</Text>
          </View>
          <View style={styles.analyticsRight}>
            <Text style={styles.analyticsRatio}>{monthStats.attended}/{monthStats.total}</Text>
            <Text style={styles.analyticsLabel}>Classes Attended</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={previousMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>{monthName}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Day Labels */}
          <View style={styles.dayLabelsRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <View key={index} style={styles.dayLabel}>
                <Text style={styles.dayLabelText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (!day) {
                return <View key={index} style={styles.emptyDay} />;
              }

              const selected = isSameDate(day, selectedDate);
              const today = isToday(day);
              const holiday = isHoliday(day);
              const absence = hasAbsence(day);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    selected && styles.calendarDaySelected,
                    today && !selected && styles.calendarDayToday,
                  ]}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      selected && styles.calendarDayTextSelected,
                      holiday && !selected && styles.holidayText,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {absence && !selected && <View style={styles.absenceDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Jump to Today */}
          <TouchableOpacity style={styles.jumpButton} onPress={jumpToToday}>
            <Text style={styles.jumpButtonText}>Jump to Today</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Attendance Details */}
        <View style={styles.dailySection}>
          <Text style={styles.dailySectionTitle}>
            {isToday(selectedDate)
              ? "Today's Classes"
              : `Attendance for ${selectedDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}`}
          </Text>

          {selectedDateAttendance.length === 0 ? (
            <View style={styles.noClasses}>
              <Ionicons name="calendar-outline" size={48} color="#4b5563" />
              <Text style={styles.noClassesText}>No classes on this day</Text>
            </View>
          ) : (
            <View style={styles.attendanceList}>
              {selectedDateAttendance.map((record, index) => {
                const actualIndex = subject.history.findIndex(
                  r => r.date === record.date && r.status === record.status
                );
                const { icon, color } = getStatusIcon(record.status);
                return (
                  <View key={index} style={[styles.attendanceItem, { borderLeftColor: color }]}>
                    <View style={styles.attendanceLeft}>
                      <View style={[styles.statusIcon, { backgroundColor: `${color}20` }]}>
                        <Ionicons name={icon} size={20} color={color} />
                      </View>
                      <View style={styles.attendanceInfo}>
                        <Text style={styles.attendanceSubject}>{subject.name}</Text>
                        <Text style={styles.attendanceTime}>{subject.timeSlot}</Text>
                      </View>
                    </View>
                    <View style={styles.attendanceRight}>
                      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.statusBadgeText, { color }]}>{record.status}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleEditRecord(actualIndex, record)}
                        style={styles.editBtn}
                      >
                        <Ionicons name="pencil" size={18} color="#8b5cf6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Attendance</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {editingRecord && (
              <View style={styles.modalBody}>
                <Text style={styles.modalSubtitle}>
                  {subject.name} •{' '}
                  {new Date(editingRecord.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.statusOptions}>
                    {ATTENDANCE_STATUSES.map(status => {
                      const { icon, color } = getStatusIcon(status);
                      const isSelected = editingRecord.status === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            isSelected && { borderColor: color, backgroundColor: `${color}10` },
                          ]}
                          onPress={() =>
                            setEditingRecord({ ...editingRecord, status })
                          }
                        >
                          <Ionicons name={icon} size={20} color={color} />
                          <Text style={[styles.statusOptionText, isSelected && { color }]}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Add a note..."
                    placeholderTextColor="#6b7280"
                    multiline
                    numberOfLines={3}
                    value={editingRecord.notes}
                    onChangeText={text =>
                      setEditingRecord({ ...editingRecord, notes: text })
                    }
                  />
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
