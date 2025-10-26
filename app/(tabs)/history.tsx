import QuickMarkBottomSheet from '@/components/QuickMarkBottomSheet';
import { useSubjects } from '@/contexts/SubjectsContext';
import { AppSubject, AppAttendanceRecord } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

type AttendanceStatus = 'Present' | 'Absent' | 'OD' | 'Holiday';

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'OD', 'Holiday'];

// QuickMarkBottomSheet Component
interface QuickMarkBottomSheetProps {
  visible: boolean;
  subject: AppSubject | null;
  selectedDate?: Date | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickMarkBottomSheet: React.FC<QuickMarkBottomSheetProps> = ({
  visible,
  subject,
  selectedDate,
  onClose,
  onSuccess,
}) => {
  const { addAttendance } = useSubjects();
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
      setSelectedStatus(null);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.timing(toastAnim, {
      toValue: 20,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 2000);
  };

  const handleSave = async () => {
    if (!subject || !selectedStatus) {
      showToast('Please select an attendance status');
      return;
    }

    setSaving(true);
    
    // Use selectedDate if provided, otherwise use today
    const dateToMark = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Check if already marked
    const alreadyMarked = subject.history.some(record => record.date === dateToMark);
    if (alreadyMarked) {
      showToast('Attendance already marked for this date');
      setSaving(false);
      return;
    }

    const record: AppAttendanceRecord = {
      date: dateToMark,
      status: selectedStatus,
      notes: null,
    };

    const success = await addAttendance(subject.id, record);
    
    if (success) {
      showToast('Attendance marked successfully!');
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } else {
      showToast('Failed to mark attendance');
    }
    
    setSaving(false);
  };

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

  if (!subject) return null;

  const displayDate = selectedDate || new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={markStyles.overlay}>
        <TouchableOpacity 
          style={markStyles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            markStyles.bottomSheet,
            { transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={markStyles.handleBar} />

          {toastMessage && (
            <Animated.View
              style={[
                markStyles.toast,
                { transform: [{ translateY: toastAnim }] },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={markStyles.toastText}>{toastMessage}</Text>
            </Animated.View>
          )}

          <View style={markStyles.header}>
            <View style={markStyles.headerLeft}>
              <Text style={markStyles.title}>Mark Attendance</Text>
              <Text style={markStyles.subtitle}>{subject.name}</Text>
              <View style={markStyles.metaRow}>
                <Ionicons name="person-outline" size={14} color="#6b7280" />
                <Text style={markStyles.metaText}>{subject.staffName}</Text>
                <Text style={markStyles.metaDot}>•</Text>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={markStyles.metaText}>{subject.timeSlot}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={markStyles.closeBtn}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View style={markStyles.dateContainer}>
            <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
            <Text style={markStyles.dateText}>
              {displayDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={markStyles.statusSection}>
            <Text style={markStyles.sectionLabel}>Select Status</Text>
            <View style={markStyles.statusGrid}>
              {ATTENDANCE_STATUSES.map((status) => {
                const { icon, color } = getStatusIcon(status);
                const isSelected = selectedStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      markStyles.statusCard,
                      isSelected && { borderColor: color, backgroundColor: `${color}10` },
                    ]}
                    onPress={() => setSelectedStatus(status)}
                    activeOpacity={0.7}
                  >
                    <View style={[markStyles.statusIcon, { backgroundColor: `${color}20` }]}>
                      <Ionicons name={icon} size={24} color={color} />
                    </View>
                    <Text style={[markStyles.statusText, isSelected && { color }]}>
                      {status}
                    </Text>
                    {isSelected && (
                      <View style={[markStyles.checkmark, { backgroundColor: color }]}>
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[
              markStyles.saveButton,
              !selectedStatus && markStyles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!selectedStatus || saving}
            activeOpacity={0.8}
          >
            <Text style={markStyles.saveButtonText}>
              {saving ? 'Saving...' : 'Mark Attendance'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const markStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: BOTTOM_SHEET_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#3a3a3a',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '600',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaDot: {
    color: '#4b5563',
    marginHorizontal: 4,
  },
  closeBtn: {
    padding: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 15,
    color: '#ffffff',
    flex: 1,
    fontWeight: '500',
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    alignItems: 'center',
    position: 'relative',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

// Main History Screen Component
export default function HistoryScreen() {
  const { subjects, loading, error, selectedYear, selectedMonth, setSelectedMonth } = useSubjects();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quickMarkVisible, setQuickMarkVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<AppSubject | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.timing(toastAnim, {
      toValue: 50,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 2000);
  };

  // Get month name
  const getMonthName = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    let newYear = selectedYear;
    let newMonth = selectedMonth;
    
    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
    }
    
    setSelectedMonth(newYear, newMonth);
  };

  // Check if we're viewing current month
  const isCurrentMonth = () => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  };

  // Get calendar days for the selected month
  const getCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: Array<{
      date: Date | null;
      dateNumber: number | null;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasAttendance: boolean;
      attendanceCount: number;
    }> = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({
        date: null,
        dateNumber: null,
        isCurrentMonth: false,
        isToday: false,
        hasAttendance: false,
        attendanceCount: 0,
      });
    }

    // Add all days in the month
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count attendance records for this date
      let attendanceCount = 0;
      subjects.forEach(subject => {
        if (subject.history.some(h => h.date === dateStr)) {
          attendanceCount++;
        }
      });

      days.push({
        date,
        dateNumber: day,
        isCurrentMonth: true,
        isToday: 
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
        hasAttendance: attendanceCount > 0,
        attendanceCount,
      });
    }

    return days;
  };

  // Get subjects for a specific date (based on day of week)
  const getSubjectsForDate = (date: Date): AppSubject[] => {
    const dayOfWeek = date.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[dayOfWeek];

    return subjects.filter(subject => subject.days.includes(dayName));
  };

  // Handle date selection
  const handleDatePress = (day: any) => {
    if (!day.date || !day.isCurrentMonth) return;
    
    setSelectedDate(day.date);
    
    // Get subjects for this day
    const daySubjects = getSubjectsForDate(day.date);
    
    if (daySubjects.length === 0) {
      showToast('No classes scheduled for this day');
      return;
    }
    
    // If only one subject, select it automatically
    if (daySubjects.length === 1) {
      setSelectedSubject(daySubjects[0]);
      setQuickMarkVisible(true);
    }
  };

  // Calculate monthly statistics
  const getMonthlyStats = () => {
    let totalRecords = 0;
    let presentCount = 0;
    let absentCount = 0;

    subjects.forEach(subject => {
      totalRecords += subject.history.length;
      presentCount += subject.history.filter(h => h.status === 'Present' || h.status === 'OD').length;
      absentCount += subject.history.filter(h => h.status === 'Absent').length;
    });

    const percentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    return { totalRecords, presentCount, absentCount, percentage };
  };

  const calendarDays = getCalendarDays();
  const monthlyStats = getMonthlyStats();
  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDaySubjects = selectedDate ? getSubjectsForDate(selectedDate) : [];

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Toast */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Calendar</Text>
          <Text style={styles.subtitle}>Mark and view daily attendance</Text>
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.monthInfo}>
            <Text style={styles.monthText}>{getMonthName(selectedYear, selectedMonth)}</Text>
            {isCurrentMonth() && (
              <View style={styles.currentMonthBadge}>
                <Text style={styles.currentMonthText}>Current</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Monthly Statistics */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Monthly Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{monthlyStats.percentage}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{monthlyStats.presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{monthlyStats.absentCount}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{monthlyStats.totalRecords}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.weekDaysHeader}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !day.isCurrentMonth && styles.calendarDayDisabled,
                  day.isToday && styles.calendarDayToday,
                  selectedDateStr === day.date?.toISOString().split('T')[0] && styles.calendarDaySelected,
                ]}
                onPress={() => handleDatePress(day)}
                activeOpacity={0.7}
                disabled={!day.isCurrentMonth}
              >
                {day.dateNumber && (
                  <>
                    <Text style={[
                      styles.dayNumber,
                      !day.isCurrentMonth && styles.dayNumberDisabled,
                      day.isToday && styles.dayNumberToday,
                      selectedDateStr === day.date?.toISOString().split('T')[0] && styles.dayNumberSelected,
                    ]}>
                      {day.dateNumber}
                    </Text>
                    {day.hasAttendance && (
                      <View style={styles.attendanceDot}>
                        <Text style={styles.attendanceDotText}>{day.attendanceCount}</Text>
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Date Classes */}
        {selectedDate && (
          <View style={styles.selectedDateCard}>
            <View style={styles.selectedDateHeader}>
              <Text style={styles.selectedDateTitle}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={styles.selectedDateSubtitle}>
                {selectedDaySubjects.length} {selectedDaySubjects.length === 1 ? 'class' : 'classes'} scheduled
              </Text>
            </View>

            {selectedDaySubjects.length === 0 ? (
              <View style={styles.noClassesBox}>
                <Ionicons name="calendar-outline" size={32} color="#6b7280" />
                <Text style={styles.noClassesText}>No classes scheduled</Text>
              </View>
            ) : (
              <View style={styles.classList}>
                {selectedDaySubjects.map(subject => {
                  const dateRecord = subject.history.find(h => h.date === selectedDateStr);
                  const isMarked = !!dateRecord;

                  return (
                    <TouchableOpacity
                      key={subject.id}
                      style={styles.classItem}
                      onPress={() => {
                        setSelectedSubject(subject);
                        setQuickMarkVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.classLeft}>
                        <View style={[
                          styles.classIcon,
                          isMarked && { backgroundColor: dateRecord.status === 'Present' || dateRecord.status === 'OD' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
                        ]}>
                          <Ionicons 
                            name={subject.classType === 'Lecture' ? 'school-outline' : subject.classType === 'Lab' ? 'flask-outline' : 'medical-outline'} 
                            size={20} 
                            color={isMarked ? (dateRecord.status === 'Present' || dateRecord.status === 'OD' ? '#10b981' : '#ef4444') : '#8b5cf6'}
                          />
                        </View>
                        <View style={styles.classInfo}>
                          <Text style={styles.className}>{subject.name}</Text>
                          <Text style={styles.classTime}>{subject.timeSlot}</Text>
                        </View>
                      </View>
                      <View style={styles.classRight}>
                        {isMarked ? (
                          <View style={[styles.statusBadge, { 
                            backgroundColor: dateRecord.status === 'Present' || dateRecord.status === 'OD' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderColor: dateRecord.status === 'Present' || dateRecord.status === 'OD' ? '#10b981' : '#ef4444'
                          }]}>
                            <Text style={[styles.statusText, {
                              color: dateRecord.status === 'Present' || dateRecord.status === 'OD' ? '#10b981' : '#ef4444'
                            }]}>
                              {dateRecord.status}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.markButton}>
                            <Ionicons name="add-circle-outline" size={20} color="#8b5cf6" />
                            <Text style={styles.markButtonText}>Mark</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Quick Mark Bottom Sheet */}
      <QuickMarkBottomSheet
        visible={quickMarkVisible}
        subject={selectedSubject}
        selectedDate={selectedDate}
        onClose={() => {
          setQuickMarkVisible(false);
          setSelectedSubject(null);
        }}
        onSuccess={() => {
          showToast('Attendance marked successfully!');
        }}
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
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
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
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  currentMonthBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentMonthText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
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
  calendarCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  weekDayText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative',
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
  },
  dayNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  dayNumberDisabled: {
    color: '#4b5563',
  },
  dayNumberToday: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  attendanceDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceDotText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  selectedDateCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  selectedDateHeader: {
    marginBottom: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  selectedDateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  noClassesBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noClassesText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  classList: {
    gap: 12,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 12,
  },
  classLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  classTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  classRight: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  markButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  bottomPadding: {
    height: 100,
  },
});