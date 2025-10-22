import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- Mock Data and Types (for standalone running) ---
type AttendanceStatus = 'Present' | 'Absent' | 'On Duty' | 'Holiday';

interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

interface Subject {
  id: string;
  name: string;
  history: AttendanceRecord[];
  timeSlot: string;
}

const mockSubjectsData: Subject[] = [
  {
    id: '1',
    name: 'Oral Pathology',
    timeSlot: '10:00 AM - 11:00 AM',
    history: [
      { date: '2025-10-01', status: 'Present' }, { date: '2025-10-03', status: 'Present' },
      { date: '2025-10-06', status: 'Absent' }, { date: '2025-10-08', status: 'Present' },
      { date: '2025-10-10', status: 'On Duty' }, { date: '2025-10-13', status: 'Present' },
      { date: '2025-10-15', status: 'Present' }, { date: '2025-10-17', status: 'Present' },
      { date: '2025-10-20', status: 'Present' }, { date: '2025-10-22', status: 'Present' },
    ],
  },
  {
    id: '2',
    name: 'Crown & Bridge',
    timeSlot: '11:00 AM - 12:00 PM',
    history: [
      { date: '2025-10-01', status: 'Present' }, { date: '2025-10-03', status: 'Absent' },
      { date: '2025-10-06', status: 'Present' }, { date: '2025-10-08', status: 'Present' },
      { date: '2025-10-10', status: 'Present' }, { date: '2025-10-13', status: 'Present' },
      { date: '2025-10-15', status: 'Absent' }, { date: '2025-10-17', status: 'Present' },
      { date: '2025-10-20', status: 'Present' }, { date: '2025-10-22', status: 'Present' },
    ],
  },
  {
    id: '3',
    name: 'Prosthodontics',
    timeSlot: '01:00 PM - 02:00 PM',
    history: [
        { date: '2025-10-02', status: 'Present' }, { date: '2025-10-04', status: 'On Duty' },
        { date: '2025-10-09', status: 'Present' }, { date: '2025-10-11', status: 'Present' },
        { date: '2025-10-16', status: 'Absent' }, { date: '2025-10-18', status: 'Present' },
        { date: '2025-10-21', status: 'Present' },
    ],
  },
];

const useSubjects = () => {
    const [subjects, setSubjects] = useState(mockSubjectsData);
    
    const updateAttendance = (subjectId: string, recordIndex: number, newStatus: AttendanceStatus) => {
        setSubjects(prevSubjects => 
            prevSubjects.map(subject => {
                if (subject.id === subjectId) {
                    const newHistory = [...subject.history];
                    if (newHistory[recordIndex]) {
                        newHistory[recordIndex].status = newStatus;
                    }
                    return { ...subject, history: newHistory };
                }
                return subject;
            })
        );
    };

    return { subjects, updateAttendance };
};
// --- End of Mock Data ---


const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'On Duty', 'Holiday'];

export default function HistoryScreen() {
  const { subjects, updateAttendance } = useSubjects();
  const [selectedView, setSelectedView] = useState<'all' | string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date(2025, 9, 22)); // Set to Oct 22, 2025
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 9, 1)); // Set to Oct 2025
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  const [editingRecord, setEditingRecord] = useState<{
    subjectId: string;
    recordIndex: number;
    date: string;
    status: AttendanceStatus;
    notes: string;
    subjectName: string;
  } | null>(null);

  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.timing(toastAnim, { toValue: 50, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => {
        setToastMessage(null);
      });
    }, 3000);
  };
  
  if (subjects.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.errorContainer}>
          <Ionicons name="book-outline" size={64} color="#4b5563" />
          <Text style={styles.errorText}>No subjects found</Text>
        </View>
      </View>
    );
  }

  const getMonthStats = (date: Date) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const subjectsToProcess = selectedView === 'all' 
      ? subjects 
      : subjects.filter(s => s.id === selectedView);

    let totalAttended = 0;
    let totalClasses = 0;

    subjectsToProcess.forEach(subject => {
        const monthRecords = subject.history.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= monthStart && recordDate <= monthEnd;
        });
        totalAttended += monthRecords.filter(r => r.status === 'Present' || r.status === 'On Duty').length;
        totalClasses += monthRecords.filter(r => r.status === 'Present' || r.status === 'Absent').length;
    });

    return {
      attended: totalAttended,
      total: totalClasses,
      percentage: totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0,
    };
  };

  const getDayStatus = (date: Date) => {
    if (date.getDay() === 0) return 'absent'; // Sunday is a holiday

    const subjectsToProcess = selectedView === 'all' 
      ? subjects 
      : subjects.filter(s => s.id === selectedView);
    
    const dateStr = date.toISOString().split('T')[0];
    let hasAbsence = false;
    let hasClass = false;

    for (const subject of subjectsToProcess) {
        for (const record of subject.history) {
            if (record.date === dateStr) {
                hasClass = true;
                if (record.status === 'Absent') {
                    hasAbsence = true;
                    break;
                }
            }
        }
        if (hasAbsence) break;
    }

    if (hasAbsence) return 'absent';
    if (hasClass) return 'present';
    return 'none';
  };
  
  const getAttendanceForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const records: (AttendanceRecord & { subjectName: string; subjectId: string; timeSlot: string})[] = [];
    
    subjects.forEach(subject => {
        subject.history.forEach(record => {
            if (record.date === dateStr) {
                records.push({ ...record, subjectName: subject.name, subjectId: subject.id, timeSlot: subject.timeSlot });
            }
        });
    });
    return records;
  };

  const previousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const jumpToToday = () => {
      const today = new Date(2025, 9, 22);
      setCurrentMonth(today);
      setSelectedDate(today);
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = Array(startPadding).fill(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleEditRecord = (record: any) => {
    const subject = subjects.find(s => s.id === record.subjectId);
    if(!subject) return;

    const recordIndex = subject.history.findIndex(r => r.date === record.date);

    setEditingRecord({
        subjectId: record.subjectId,
        recordIndex: recordIndex,
        date: record.date,
        status: record.status,
        notes: '',
        subjectName: record.subjectName,
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateAttendance(editingRecord.subjectId, editingRecord.recordIndex, editingRecord.status);
    setEditModalVisible(false);
    showToast('Attendance updated successfully!');
  };

  const monthStats = getMonthStats(currentMonth);
  const calendarDays = getCalendarDays();
  const selectedDateAttendance = getAttendanceForDate(selectedDate);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isToday = (date: Date) => new Date(2025, 9, 22).toDateString() === date.toDateString();
  const isSameDate = (date1: Date, date2: Date) => date1.toDateString() === date2.toDateString();
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {toastMessage && (
        <Animated.View style={[ styles.toastContainer, { transform: [{ translateY: toastAnim }] } ]}>
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.subjectSelector}>
          <Text style={styles.selectorLabel}>Select Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectChips}>
            <TouchableOpacity
              style={[styles.subjectChip, selectedView === 'all' && styles.subjectChipActive]}
              onPress={() => setSelectedView('all')}
            >
              <Text style={[styles.subjectChipText, selectedView === 'all' && styles.subjectChipTextActive]}>All Subjects</Text>
            </TouchableOpacity>
            {subjects.map(subject => (
              <TouchableOpacity
                key={subject.id}
                style={[styles.subjectChip, selectedView === subject.id && styles.subjectChipActive]}
                onPress={() => setSelectedView(subject.id)}
              >
                <Text style={[styles.subjectChipText, selectedView === subject.id && styles.subjectChipTextActive]}>{subject.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.analyticsCard}>
          <View>
            <Text style={styles.analyticsTitle}>{monthName.split(' ')[0]}'s Attendance</Text>
            <Text style={styles.analyticsPercentage}>{monthStats.percentage}%</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.analyticsRatio}>{monthStats.attended}/{monthStats.total}</Text>
            <Text style={styles.analyticsLabel}>Classes Attended</Text>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={previousMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>{monthName}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.dayLabelsRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <Text key={i} style={styles.dayLabelText}>{day}</Text>)}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (!day) return <View key={index} style={styles.dayCell} />;
              const dayStatus = getDayStatus(day);
              return (
                <TouchableOpacity key={index} style={[styles.dayCell, isSameDate(day, selectedDate) && styles.calendarDaySelected]} onPress={() => setSelectedDate(day)}>
                  <Text style={[
                      styles.calendarDayText,
                      isToday(day) && styles.calendarDayToday,
                      dayStatus === 'present' && { color: '#10b981' },
                      dayStatus === 'absent' && { color: '#ef4444' },
                  ]}>
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.jumpButton} onPress={jumpToToday}>
            <Text style={styles.jumpButtonText}>Jump to Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dailySection}>
          <Text style={styles.sectionTitle}>Today's Classes</Text>
          {selectedDateAttendance.length > 0 ? (
            selectedDateAttendance.map((record, index) => (
              <View key={index} style={styles.attendanceItem}>
                <Text style={styles.attendanceSubject}>{record.subjectName}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={[styles.statusBadge, {backgroundColor: record.status === 'Present' || record.status === 'On Duty' ? '#10b98120' : '#ef444420', color: record.status === 'Present' || record.status === 'On Duty' ? '#10b981' : '#ef4444'}]}>{record.status}</Text>
                    <TouchableOpacity style={{marginLeft: 10}} onPress={() => handleEditRecord(record)}>
                        <Ionicons name="pencil" size={18} color="#8b5cf6"/>
                    </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noClasses}>
              <Ionicons name="calendar-outline" size={48} color="#4b5563" />
              <Text style={styles.noClassesText}>No classes on this day</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
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
                <Text style={styles.modalSubtitle}>{editingRecord.subjectName}</Text>
                 <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.statusOptions}>
                    {ATTENDANCE_STATUSES.map(status => {
                      const isSelected = editingRecord.status === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[styles.statusOption, isSelected && { borderColor: '#8b5cf6' }]}
                          onPress={() => setEditingRecord(prev => prev ? {...prev, status} : null)}
                        >
                          <Text style={[styles.statusOptionText, isSelected && { color: '#8b5cf6' }]}>{status}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
             <View style={styles.modalFooter}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  toastContainer: { position: 'absolute', top: 0, left: 20, right: 20, padding: 16, borderRadius: 12, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 1000 },
  toastText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  subjectSelector: { paddingHorizontal: 20, marginVertical: 10 },
  selectorLabel: { fontSize: 14, fontWeight: '600', color: '#9ca3af', marginBottom: 12 },
  subjectChips: { gap: 12 },
  subjectChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1f2937' },
  subjectChipActive: { backgroundColor: '#8b5cf6' },
  subjectChipText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  subjectChipTextActive: { color: '#ffffff' },
  analyticsCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#8b5cf6', marginHorizontal: 20, padding: 16, borderRadius: 16 },
  analyticsTitle: { fontSize: 14, color: '#e5e7eb' },
  analyticsPercentage: { fontSize: 40, fontWeight: '700', color: '#ffffff' },
  analyticsRatio: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  analyticsLabel: { fontSize: 12, color: '#e5e7eb' },
  calendarCard: { backgroundColor: '#1a1a1a', marginHorizontal: 20, marginTop: 20, padding: 20, borderRadius: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navBtn: { padding: 5, backgroundColor: '#262626', borderRadius: 999 },
  calendarTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  dayLabelsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  dayLabelText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  calendarDayText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  calendarDaySelected: { backgroundColor: '#8b5cf6', borderRadius: 12 },
  calendarDayToday: { color: '#8b5cf6', fontWeight: 'bold' },
  jumpButton: { backgroundColor: '#8b5cf6', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  jumpButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  dailySection: { paddingHorizontal: 20, marginTop: 20, marginBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  attendanceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#10b981' },
  attendanceSubject: { color: 'white', fontWeight: '600'},
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontWeight: '600', fontSize: 12, overflow: 'hidden' },
  noClasses: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 48, alignItems: 'center' },
  noClassesText: { color: '#6b7280', fontSize: 14, marginTop: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#ffffff', marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#262626' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  modalBody: { padding: 20 },
  modalSubtitle: { fontSize: 16, color: '#e5e7eb', marginBottom: 20, fontWeight: '600'},
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#9ca3af', marginBottom: 12 },
  statusOptions: { flexDirection: 'row', gap: 12 },
  statusOption: { flex: 1, padding: 14, backgroundColor: '#262626', borderRadius: 12, borderWidth: 2, borderColor: '#3a3a3a', alignItems: 'center' },
  statusOptionText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#262626' },
  saveBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

