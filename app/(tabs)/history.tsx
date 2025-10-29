import QuickMarkBottomSheet from '@/components/QuickMarkBottomSheet';
import { useSubjects } from '@/contexts/SubjectsContext';
import { AppAttendanceRecord, AppSubject } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState, useEffect } from 'react'; // Added useEffect
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type AttendanceStatus = 'Present' | 'Absent' | 'OD' | 'Holiday';
const ALL_ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'OD', 'Holiday'];

export default function HistoryScreen() {
  const { subjects: allSubjects, loading, error, addAttendance, refreshSubjects, selectedYear, selectedMonth, setMonthFilter } = useSubjects();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quickMarkVisible, setQuickMarkVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<AppSubject | null>(null);
  const [editingRecord, setEditingRecord] = useState<boolean>(false);
  const [parallelClassModalVisible, setParallelClassModalVisible] = useState(false);
  const [selectedParallelClasses, setSelectedParallelClasses] = useState<any[]>([]);

  const [isMarkingAll, setIsMarkingAll] = useState(false);

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
      useNativeDriver: true,
    }).start();

    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 3000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);
  // --- End: Added Toast Logic ---

  // Filter subjects to only show attendance records for the selected month
  const subjects = useMemo(() => {
    return allSubjects.map(subject => ({
      ...subject,
      history: subject.history.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === selectedYear && recordDate.getMonth() === selectedMonth;
      })
    }));
  }, [allSubjects, selectedYear, selectedMonth]);

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

    setMonthFilter(newYear, newMonth);
  };

  // Check if we're viewing current month
  const isCurrentMonth = () => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  };

  // Local date formatter for YYYY-MM-DD (timezone-safe)
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
    let displayStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek -1; // Make Monday index 0
    for (let i = 0; i < displayStartingDay; i++) {
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
      const dateStr = toLocalYMD(date);

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


  // Get subjects for a specific date (based on day of week) with their schedule details
  const getSubjectsForDate = (date: Date): Array<AppSubject & { scheduleEntry?: any; isParallel?: boolean; parallelOptions?: any[] }> => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[dayOfWeek];

    // Group subjects by slot number to detect parallel classes
    const slotMap = new Map<number, Array<{ subject: AppSubject; entry: any }>>();

    subjects.forEach(subject => {
      if (subject.schedule && subject.schedule.length > 0) {
        const daySchedules = subject.schedule.filter(entry => entry.day === dayName);

        daySchedules.forEach(entry => {
          if (!slotMap.has(entry.slotNumber)) {
            slotMap.set(entry.slotNumber, []);
          }
          slotMap.get(entry.slotNumber)!.push({ subject, entry });
        });
      }
    });

    const subjectsWithSchedule: Array<AppSubject & { scheduleEntry?: any; isParallel?: boolean; parallelOptions?: any[] }> = [];

    // Process each slot
    slotMap.forEach((items, slotNumber) => {
      if (items.length > 1) {
        // Parallel classes - show first one with parallel flag
        const firstItem = items[0];
        subjectsWithSchedule.push({
          ...firstItem.subject,
          scheduleEntry: firstItem.entry,
          isParallel: true,
          parallelOptions: items.map(item => ({
            subject: item.subject,
            entry: item.entry,
          })),
        });
      } else {
        // Single class
        const item = items[0];
        subjectsWithSchedule.push({
          ...item.subject,
          scheduleEntry: item.entry,
        });
      }
    });

    // Sort by slot number
    return subjectsWithSchedule.sort((a, b) => {
      const slotA = a.scheduleEntry?.slotNumber || 0;
      const slotB = b.scheduleEntry?.slotNumber || 0;
      return slotA - slotB;
    });
  };


  const handleParallelClassSelection = (subject: AppSubject) => {
    setSelectedSubject(subject);
    setParallelClassModalVisible(false);
    setEditingRecord(false);
    setQuickMarkVisible(true);
  };

  // Handle date selection
  const handleDatePress = (day: any) => {
    if (!day.date || !day.isCurrentMonth) return;

    setSelectedDate(day.date);

    // Get subjects for this day
    const daySubjects = getSubjectsForDate(day.date);

    if (daySubjects.length === 0) {
      showToast('No classes scheduled for this day', 'error'); // Use error type for info message
      return;
    }
  };


  // Calculate monthly statistics
  const getMonthlyStats = () => {
    let totalRecords = 0;
    let presentCount = 0;
    let absentCount = 0;

    subjects.forEach(subject => {
        subject.history.forEach(h => {
            if (h.status === 'Present' || h.status === 'Absent' || h.status === 'OD') {
                totalRecords++;
            }
            if (h.status === 'Present' || h.status === 'OD') {
                presentCount++;
            }
            if (h.status === 'Absent') {
                absentCount++;
            }
        });
    });

    const percentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    return { totalRecords: totalRecords, presentCount, absentCount, percentage };
  };

  const confirmAndMarkAll = (status: AttendanceStatus) => {
    if (!selectedDate || isMarkingAll) return;

    const dateStr = toLocalYMD(selectedDate);
    const subjectsToMark = selectedDaySubjects.filter(subject =>
      !subject.history.some(h => h.date === dateStr) && !subject.isParallel
    );
     const count = subjectsToMark.length;

    if (count === 0) {
      showToast('All eligible classes already marked.', 'success');
      return;
    }

    Alert.alert(
      "Confirm Mark All",
      `Mark all ${count} unmarked classes as "${status}" for this day?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: status === 'Absent' ? 'destructive' : 'default',
          onPress: async () => {
              setIsMarkingAll(true);
              let successCount = 0;
              let errorCount = 0;

              try {
                  await Promise.all(
                    subjectsToMark.map(async (subject) => {
                      const record: AppAttendanceRecord = {
                        date: dateStr,
                        status: status,
                        notes: null,
                      };
                       const subjectData = subjects.find(s => s.id === subject.id);
                       const alreadyExists = subjectData?.history.some(h => h.date === dateStr);
                       if (!alreadyExists) {
                           const success = await addAttendance(subject.id, record);
                           if (success) successCount++;
                           else errorCount++;
                       } else {
                            console.warn(`Skipping already marked (race condition?): ${subject.name}`);
                       }
                    })
                  );
              } catch (err) {
                   console.error("Error during bulk mark:", err);
                   errorCount = count - successCount;
              } finally {
                  setIsMarkingAll(false);
                  if (errorCount > 0) {
                    showToast(`Marked ${successCount}. Failed for ${errorCount}.`, 'error');
                  } else if (successCount > 0) {
                    showToast(`Marked ${successCount} classes as ${status}.`, 'success');
                  }
              }
            }
        }
      ]
    );
  };

   const showMarkAllStatusOptions = () => {
       if (!selectedDate || isMarkingAll || unmarkedSubjectsCount === 0) return;

       const options = ALL_ATTENDANCE_STATUSES.map(status => ({
           text: status,
           onPress: () => confirmAndMarkAll(status),
           style: status === 'Absent' ? 'destructive' : 'default' as 'default' | 'cancel' | 'destructive' | undefined
       }));

       Alert.alert(
           `Mark All Unmarked (${unmarkedSubjectsCount})`,
           "Choose a status to apply:",
           [
               ...options,
               {
                   text: "Cancel",
                   style: "cancel",
               },
           ],
           { cancelable: true }
       );
   };


  const calendarDays = getCalendarDays();
  const monthlyStats = getMonthlyStats();
  const selectedDateStr = selectedDate ? toLocalYMD(selectedDate) : undefined;
  const selectedDaySubjects = selectedDate ? getSubjectsForDate(selectedDate) : [];
  const unmarkedSubjectsCount = selectedDaySubjects.filter(subject =>
    selectedDateStr && !subject.history.some(h => h.date === selectedDateStr) && !subject.isParallel
  ).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Toast */}
      {/* Moved toast rendering here */}
      <Animated.View style={[
        styles.toastContainer,
        { transform: [{ translateY: toastAnim }] },
        toastType === 'error' ? styles.toastError : styles.toastSuccess
      ]}>
        <Ionicons
          name={toastType === 'error' ? 'alert-circle-outline' : 'information-circle-outline'}
          size={22}
          color="#ffffff"
        />
        {/* Render toastMessage only if it's not null */}
        {toastMessage && <Text style={styles.toastText}>{toastMessage}</Text>}
      </Animated.View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
            <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth('prev')} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.monthInfo}>
                <Text style={styles.monthText}>{getMonthName(selectedYear, selectedMonth)}</Text>
                {isCurrentMonth() && (<View style={styles.currentMonthBadge}><Text style={styles.currentMonthText}>Current</Text></View>)}
            </View>
            <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth('next')} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>

        {/* Monthly Statistics */}
         <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Monthly Overview</Text>
            <View style={styles.statsGrid}>
                <View style={styles.statItem}><Text style={styles.statNumber}>{monthlyStats.percentage}%</Text><Text style={styles.statLabel}>Attendance</Text></View>
                <View style={styles.statItem}><Text style={styles.statNumber}>{monthlyStats.presentCount}</Text><Text style={styles.statLabel}>Present/OD</Text></View>
                <View style={styles.statItem}><Text style={styles.statNumber}>{monthlyStats.absentCount}</Text><Text style={styles.statLabel}>Absent</Text></View>
                <View style={styles.statItem}><Text style={styles.statNumber}>{monthlyStats.totalRecords}</Text><Text style={styles.statLabel}>Total Relevant</Text></View>
            </View>
        </View>

        {/* Calendar */}
         <View style={styles.calendarCard}>
             <View style={styles.weekDaysHeader}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (<Text key={day} style={styles.weekDayText}>{day}</Text>))}
            </View>
            <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                      let hasAbsence = false;
                    if (day.date) {
                        const dateStr = toLocalYMD(day.date);
                        hasAbsence = subjects.some(subject =>
                            subject.history.some(h => h.date === dateStr && h.status === 'Absent')
                        );
                    }
                     return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.calendarDay,
                                !day.isCurrentMonth && styles.calendarDayDisabled,
                                day.isToday && styles.calendarDayToday,
                                day.date && selectedDateStr === toLocalYMD(day.date) && styles.calendarDaySelected,
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
                                        day.date && selectedDateStr === toLocalYMD(day.date) && styles.dayNumberSelected,
                                    ]}>
                                        {day.dateNumber}
                                    </Text>
                                    {day.hasAttendance && (
                                        <View style={[
                                            styles.attendanceDot,
                                            hasAbsence && styles.attendanceDotAbsent
                                        ]}>
                                            <Text style={styles.attendanceDotText}>{day.attendanceCount}</Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>


        {/* Selected Date Classes */}
        {selectedDate && (
          <View style={styles.selectedDateCard}>
            <View style={styles.selectedDateHeader}>
              <View style={styles.selectedDateTitleContainer}>
                <Text style={styles.selectedDateTitle}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.selectedDateSubtitle}>
                  {selectedDaySubjects.length} {selectedDaySubjects.length === 1 ? 'class' : 'classes'} scheduled
                </Text>
              </View>
              {/* Mark All Button */}
              {selectedDaySubjects.length > 0 && unmarkedSubjectsCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={showMarkAllStatusOptions}
                  disabled={isMarkingAll}
                  activeOpacity={0.7}
                >
                  {isMarkingAll ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle-outline" size={20} color="#8b5cf6" />
                      <Text style={styles.markAllButtonText}>Mark All</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Class List Rendering Logic */}
              {selectedDaySubjects.length === 0 ? (
              <View style={styles.noClassesBox}>
                <Ionicons name="calendar-outline" size={32} color="#6b7280" />
                <Text style={styles.noClassesText}>No classes scheduled</Text>
              </View>
            ) : (
              <View style={styles.classList}>
                {selectedDaySubjects.map((subject, index) => {
                  const dateRecord = subject.history.find(h => h.date === selectedDateStr);
                  const isMarked = !!dateRecord;

                  const uniqueKey = subject.scheduleEntry
                    ? `${subject.id}_slot_${subject.scheduleEntry.slotNumber}`
                    : `${subject.id}_${index}`;

                  return (
                    <View key={uniqueKey} style={styles.classItem}>
                      <TouchableOpacity
                        style={styles.classMainContent}
                        onPress={() => {
                          if (!isMarked) {
                            if (subject.isParallel && subject.parallelOptions) {
                              setSelectedParallelClasses(subject.parallelOptions);
                              setParallelClassModalVisible(true);
                            } else {
                              setSelectedSubject(subject);
                              setEditingRecord(false);
                              setQuickMarkVisible(true);
                            }
                          } else {
                            setSelectedSubject(subject);
                            setEditingRecord(true);
                            setQuickMarkVisible(true);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.classLeft}>
                          <View style={[
                            styles.classIcon,
                            isMarked && dateRecord && { // Ensure dateRecord exists before accessing status
                              backgroundColor: dateRecord.status === 'Present' || dateRecord.status === 'OD'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : dateRecord.status === 'Absent'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(59, 130, 246, 0.2)' // Holiday or other
                            }
                          ]}>
                            <Ionicons
                              name={subject.classType === 'Lecture' ? 'school-outline' : subject.classType === 'Lab' ? 'flask-outline' : 'medical-outline'}
                              size={20}
                              color={
                                isMarked && dateRecord // Ensure dateRecord exists
                                  ? (dateRecord.status === 'Present' || dateRecord.status === 'OD'
                                      ? '#10b981'
                                      : dateRecord.status === 'Absent'
                                      ? '#ef4444'
                                      : '#3b82f6') // Holiday or other
                                  : '#8b5cf6' // Default color if not marked
                              }
                            />
                          </View>
                          <View style={styles.classInfo}>
                            <View style={styles.classNameRow}>
                              {(() => {
                                const displayName = subject.isParallel && subject.parallelOptions
                                  ? subject.parallelOptions.map((opt: any) => opt.subject.name).join(' / ')
                                  : subject.name;
                                return (
                                  <Text style={styles.className} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
                                );
                              })()}
                              {subject.isParallel && (
                                <View style={styles.parallelTag}>
                                  <Text style={styles.parallelTagText}>Choice</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.classTime}>
                              {subject.scheduleEntry ? `Slot ${subject.scheduleEntry.slotNumber} • ${subject.scheduleEntry.timeString}` : subject.timeSlot}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.classRight}>
                          {isMarked && dateRecord ? ( // Ensure dateRecord exists
                            <View style={[styles.statusBadge, {
                              backgroundColor: dateRecord.status === 'Present' || dateRecord.status === 'OD'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : dateRecord.status === 'Absent'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(59, 130, 246, 0.2)', // Holiday or other
                              borderColor: dateRecord.status === 'Present' || dateRecord.status === 'OD'
                                ? '#10b981'
                                : dateRecord.status === 'Absent'
                                ? '#ef4444'
                                : '#3b82f6' // Holiday or other
                            }]}>
                              <Ionicons
                                name={
                                  dateRecord.status === 'Present' ? 'checkmark-circle' :
                                  dateRecord.status === 'Absent' ? 'close-circle' :
                                  dateRecord.status === 'OD' ? 'briefcase' :
                                  dateRecord.status === 'Holiday' ? 'home' : 'help-circle'
                                }
                                size={16}
                                color={
                                  dateRecord.status === 'Present' || dateRecord.status === 'OD'
                                    ? '#10b981'
                                    : dateRecord.status === 'Absent'
                                    ? '#ef4444'
                                    : '#3b82f6' // Holiday or other
                                }
                              />
                              <Text style={[styles.statusText, {
                                color: dateRecord.status === 'Present' || dateRecord.status === 'OD'
                                  ? '#10b981'
                                  : dateRecord.status === 'Absent'
                                  ? '#ef4444'
                                  : '#3b82f6' // Holiday or other
                              }]}>
                                {dateRecord.status}
                              </Text>
                            </View>
                          ) : (
                            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}


        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Parallel Class Selection Modal */}
       <Modal
          visible={parallelClassModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setParallelClassModalVisible(false)}
      >
          <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setParallelClassModalVisible(false)}
          >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Parallel Class</Text>
                      <Text style={styles.modalSubtitle}>Choose the class you attended</Text>
                  </View>

                  {selectedParallelClasses.map((option: any, index: number) => (
                      <TouchableOpacity
                          key={index}
                          style={styles.parallelOption}
                          onPress={() => handleParallelClassSelection(option.subject)} // Pass the whole subject
                          activeOpacity={0.7}
                      >
                          <View style={styles.parallelOptionLeft}>
                              <View style={styles.parallelIconContainer}>
                                  <Ionicons
                                      name={option.subject.classType === 'Lecture' ? 'school-outline' : option.subject.classType === 'Lab' ? 'flask-outline' : 'medical-outline'}
                                      size={24}
                                      color="#8b5cf6"
                                  />
                              </View>
                              <Text style={styles.parallelOptionText}>{option.subject.name}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                      </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setParallelClassModalVisible(false)}
                      activeOpacity={0.7}
                  >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      </Modal>

      {/* Quick Mark Bottom Sheet */}
      <QuickMarkBottomSheet
          visible={quickMarkVisible}
          subject={selectedSubject}
          selectedDate={selectedDate}
          isEditing={editingRecord}
          onClose={() => {
              setQuickMarkVisible(false);
              setSelectedSubject(null);
              setEditingRecord(false);
          }}
           onSuccess={(message) => { showToast(message, 'success'); refreshSubjects(); }} // Added 'success' type
           onError={(message) => showToast(message, 'error')} // Added 'error' type
      />
    </View>
  );
}


// --- Add Toast styles ---
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
        top: 0, // Will be animated in
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
      // Added styles for different toast types
      toastSuccess: {
        backgroundColor: '#10b981', // Green for success
      },
      toastError: {
        backgroundColor: '#ef4444', // Red for error
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
        paddingHorizontal: 20, // Keep horizontal padding consistent
        paddingTop: 60, // Ensure space below status bar
        paddingBottom: 20, // Add some bottom padding before tab bar space
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
        flex: 1,
        paddingHorizontal: 4,
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
        width: `${100 / 7}%`,
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
        // Style for today's date container if needed
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
        color: '#3b82f6', // Make today's number blue
        fontWeight: '700',
      },
      dayNumberSelected: {
        color: '#ffffff',
        fontWeight: '700',
      },
      attendanceDot: {
        position: 'absolute',
        bottom: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      attendanceDotAbsent: {
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      },
       selectedDateTitleContainer: {
        flex: 1,
        marginRight: 12,
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
       markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
      },
      markAllButtonText: {
        color: '#8b5cf6',
        fontSize: 14,
        fontWeight: '600',
      },
      noClassesBox: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#262626', // Slightly different background
        borderRadius: 12,
      },
      noClassesText: {
        color: '#9ca3af', // Lighter grey
        fontSize: 14,
        marginTop: 8,
      },
      classList: {
        gap: 12,
      },
      classItem: {
        backgroundColor: '#262626',
        borderRadius: 12,
      },
      classMainContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
      },
      classLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
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
      classNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
      },
      className: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
        flexShrink: 1,
      },
      parallelTag: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
      },
      parallelTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#f59e0b',
        textTransform: 'uppercase',
      },
      classTime: {
        fontSize: 13,
        color: '#6b7280',
      },
      classRight: {
         marginLeft: 'auto',
      },
      statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
      },
      statusText: {
        fontSize: 13,
        fontWeight: '600',
      },
      bottomPadding: {
        height: 100,
      },
       modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      },
       modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#262626',
      },
        modalHeader: {
        marginBottom: 20,
        alignItems: 'center',
      },
       modalTitle: {
        fontSize: 18, // Adjusted size
        fontWeight: '600',
        color: '#E0E0E0',
        marginBottom: 8,
        textAlign: 'center',
      },
      modalSubtitle: {
        fontSize: 14,
        color: '#A0A0A0',
        textAlign: 'center',
        marginBottom: 24,
      },
      parallelOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0a0a0a', // Darker background for options
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1, // Changed to 1
        borderColor: '#262626',
      },
      parallelOptionSelected: {
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
      },
      parallelOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1, // Allow text to take space
      },
      parallelIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      parallelOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        flex: 1, // Allow text wrapping
      },
      modalCancelBtn: {
        backgroundColor: '#262626',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
      },
      modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
      },
});

// REMOVED the placeholder showToast function