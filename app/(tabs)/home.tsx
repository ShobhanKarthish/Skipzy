import QuickMarkBottomSheet from '@/components/QuickMarkBottomSheet';
import { useSubjects } from '@/contexts/SubjectsContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
// Added AppAttendanceRecord to the import below
import { AppSubject, AppTimetableEntry, AppAttendanceRecord } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Define the type for schedule items explicitly
interface ScheduleItem {
    name: string;
    time: string;
    icon: keyof typeof Ionicons.glyphMap; // Use Ionicons keys
    subjectId: string;
    slotNumber: number;
    isParallel?: boolean;
    parallelOptions?: Array<{ name: string; subjectId: string; icon: keyof typeof Ionicons.glyphMap }>;
}


// Generate schedule from subjects data using the schedule array
const generateScheduleFromSubjects = (subjects: AppSubject[], dayName: string): ScheduleItem[] => {
  const scheduleItems: ScheduleItem[] = [];

  const slotMap = new Map<number, Array<{ subject: AppSubject; entry: AppTimetableEntry }>>();

  subjects.forEach(subject => {
    if (subject.schedule && subject.schedule.length > 0) {
      subject.schedule
        .filter(entry => entry.day === dayName)
        .forEach(entry => {
          if (!slotMap.has(entry.slotNumber)) {
            slotMap.set(entry.slotNumber, []);
          }
          slotMap.get(entry.slotNumber)!.push({ subject, entry });
        });
    }
  });

  slotMap.forEach((items, slotNumber) => {
    const getIcon = (classType: string): keyof typeof Ionicons.glyphMap => {
        return classType === 'Lecture' ? 'school-outline' :
               classType === 'Lab' ? 'flask-outline' :
               'medical-outline'; // Default or OPD icon
    };

    if (items.length > 1) {
      // Find preferred subject or use first one (removed preference logic for simplicity here)
      const selectedItem = items[0];
      const combinedName = items.map(i => i.subject.name).join(' / ');

      scheduleItems.push({
        name: combinedName,
        time: selectedItem.entry.timeString,
        icon: getIcon(selectedItem.subject.classType),
        subjectId: selectedItem.subject.id,
        slotNumber: slotNumber,
        isParallel: true,
        parallelOptions: items.map(item => ({
          name: item.subject.name,
          subjectId: item.subject.id,
          icon: getIcon(item.subject.classType),
        })),
      });
    } else if (items.length === 1) { // Ensure items array is not empty
      const item = items[0];
      scheduleItems.push({
        name: item.subject.name,
        time: item.entry.timeString,
        icon: getIcon(item.subject.classType),
        subjectId: item.subject.id,
        slotNumber: slotNumber,
      });
    }
  });

  return scheduleItems.sort((a, b) => a.slotNumber - b.slotNumber);
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPercentageText = Animated.createAnimatedComponent(Text);

const HomeScreen = () => {
  const { subjects, loading: subjectsLoading, refreshSubjects } = useSubjects();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [progressAnim] = useState(new Animated.Value(0));
  const [percentageAnim] = useState(new Animated.Value(0));
  const [percentageText, setPercentageText] = useState('0');
  const [quickMarkVisible, setQuickMarkVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<AppSubject | null>(null);
  const [parallelClassModalVisible, setParallelClassModalVisible] = useState(false);
  const [selectedParallelClass, setSelectedParallelClass] = useState<ScheduleItem | null>(null);

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
        toValue: 60,
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

  useEffect(() => { // Cleanup timeout
    return () => {
        if (toastTimeout.current) {
            clearTimeout(toastTimeout.current);
        }
    };
  }, []);
  // --- End: Added Toast Logic ---

  const subjectsById = useMemo(() => {
    const map = new Map<string, AppSubject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calculateOverallAttendance = () => {
    let totalAttended = 0;
    let totalClasses = 0;

    subjects.forEach(subject => {
      const attended = subject.history.filter(
        h => h.status === 'Present' || h.status === 'OD'
      ).length;
      // Consistent total calculation
      const total = subject.history.filter(
        h => h.status === 'Present' || h.status === 'Absent'
      ).length;

      totalAttended += attended;
      totalClasses += total;
    });

    return totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  };

  const targetPercentage = useMemo(calculateOverallAttendance, [subjects]);

  useEffect(() => {
     const listenerId = percentageAnim.addListener(({ value }) => {
        setPercentageText(Math.max(0, Math.min(100, Math.round(value))).toString());
     });

    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: targetPercentage,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(percentageAnim, {
        toValue: targetPercentage,
        duration: 1000,
        useNativeDriver: false,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();

    return () => {
      percentageAnim.removeListener(listenerId);
      progressAnim.stopAnimation();
      percentageAnim.stopAnimation();
    };
  }, [targetPercentage]);

  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  const getWeekDates = () => {
    const dayOfWeek = selectedDate.getDay();
    const startOfWeek = new Date(selectedDate);
    const diff = selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    startOfWeek.setDate(diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getScheduleForDate = (date: Date) => {
    const dayName = dayNames[date.getDay()];
    return generateScheduleFromSubjects(subjects, dayName);
  };

  const handleScheduleItemPress = (item: ScheduleItem) => {
    if (item.isParallel && item.parallelOptions && item.parallelOptions.length > 1) {
      setSelectedParallelClass(item);
      setParallelClassModalVisible(true);
    } else {
      const subject = subjectsById.get(item.subjectId);
      if (subject) {
        setSelectedSubject(subject);
        setQuickMarkVisible(true);
      } else {
         console.warn(`Subject with ID ${item.subjectId} not found for schedule item: ${item.name}`);
         showToast(`Could not find subject: ${item.name}`, 'error');
      }
    }
  };

   const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const weekDates = getWeekDates();
  const calendarDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const schedule = useMemo(() => getScheduleForDate(selectedDate), [subjects, selectedDate]);
  const selectedDateKey = toLocalYMD(selectedDate);

  const totalClassesAttended = useMemo(() => subjects.reduce((acc, subject) => {
    return acc + subject.history.filter(h => h.status === 'Present' || h.status === 'OD').length;
  }, 0), [subjects]);

  const calculateSafeToSkip = () => {
    let totalSafe = 0;
    subjects.forEach(subject => {
      const attended = subject.history.filter(
        h => h.status === 'Present' || h.status === 'OD'
      ).length;
      const total = subject.history.filter(
        h => h.status === 'Present' || h.status === 'Absent'
      ).length;

      if (total > 0) {
        const minRequired = Math.ceil((subject.minAttendance / 100) * total);
        const maxSkips = total - minRequired;
        const skipsUsed = total - attended;
        totalSafe += Math.max(0, maxSkips - skipsUsed);
      }
    });
    return totalSafe;
  };
  const safeToSkipCount = useMemo(calculateSafeToSkip, [subjects]);


  const handleParallelClassSelection = (subjectId: string) => {
    const subject = subjectsById.get(subjectId);
    if (subject) {
      setSelectedSubject(subject);
      setParallelClassModalVisible(false);
      setQuickMarkVisible(true);
    } else {
        showToast(`Selected parallel subject (ID: ${subjectId}) not found.`, 'error');
        setParallelClassModalVisible(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Night owl?';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

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
              name={toastType === 'error' ? 'alert-circle-outline' : 'information-circle-outline'}
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
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}, <Text style={styles.userName}>{userProfile?.name?.split(' ')[0] || 'Student'}</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.profilePic} activeOpacity={0.7} onPress={() => { /* Consider router.push('/profile'); */ }}>
             <Ionicons name="person-circle-outline" size={30} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsCardInner}>
            {/* Circular Progress */}
            <View style={styles.progressSection}>
              <View style={styles.circularProgressContainer}>
                <Svg width={140} height={140} viewBox="0 0 140 140">
                  <Circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="rgba(139, 92, 246, 0.15)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <AnimatedCircle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#8b5cf6"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="70, 70"
                  />
                </Svg>
                <View style={styles.progressTextContainer}>
                  <AnimatedPercentageText style={styles.progressPercentage}>
                    {percentageText}
                    <Text style={styles.percentSymbol}>%</Text>
                  </AnimatedPercentageText>
                  <Text style={styles.progressLabel}>Attendance</Text>
                </View>
              </View>
            </View>

            {/* Stats Right */}
            <View style={styles.statsRight}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
                  <Ionicons name="checkmark-done" size={24} color="#10b981" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statNumber}>{totalClassesAttended}</Text>
                  <Text style={styles.statLabel}>Classes Attended</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                 <View style={[styles.statIconContainer, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
                  <Ionicons name="play-skip-forward" size={20} color="#3b82f6" />
                 </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statNumber}>{safeToSkipCount}</Text>
                  <Text style={styles.statLabel}>Safe Skips Left</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Week Days Selector */}
        <View style={styles.weekSection}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daySelectorContainer}
          >
            {weekDates.map((date, index) => {
              const isSelected = isSameDate(date, selectedDate);
              const isTodayDate = isToday(date);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateItem,
                    isSelected && styles.dateItemActive,
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                    {calendarDayNames[index]}
                  </Text>
                  <Text style={[styles.dateLabel, isSelected && styles.dateLabelActive]}>
                    {date.getDate()}
                  </Text>
                  {isTodayDate && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Schedule Section */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleTitleRow}>
            <Text style={styles.sectionTitle}>
              {isToday(selectedDate) ? "Today's Classes" : `${dayNames[selectedDate.getDay()]}'s Classes`}
            </Text>
            <Text style={styles.classCount}>{schedule.length} {schedule.length === 1 ? 'class' : 'classes'}</Text>
          </View>

          {schedule.length === 0 ? (
            <View style={styles.noClassesContainer}>
              <View style={styles.noClassesIcon}>
                <Ionicons name="calendar-outline" size={48} color="#4b5563" />
              </View>
              <Text style={styles.noClassesText}>No classes scheduled</Text>
              <Text style={styles.noClassesSubtext}>Enjoy your free time!</Text>
            </View>
          ) : (
            <View style={styles.scheduleList}>
              {schedule.map((item, index) => {
                const subjectData = subjectsById.get(item.subjectId);
                let dateRecord: AppAttendanceRecord | undefined; // Use the imported type
                if (subjectData) {
                  dateRecord = subjectData.history.find(record => record.date === selectedDateKey);
                }
                const isMarked = !!dateRecord;

                return (
                  <TouchableOpacity
                    key={`${item.subjectId}-${item.slotNumber}-${index}`} // More unique key
                    style={styles.scheduleCard}
                    activeOpacity={0.7}
                    onPress={() => handleScheduleItemPress(item)}
                  >
                    <View style={styles.scheduleLeft}>
                      <View style={styles.scheduleIconContainer}>
                         <Ionicons name={item.icon} size={22} color="#8b5cf6" />
                      </View>
                      <View style={styles.scheduleContent}>
                        <View style={styles.scheduleNameRow}>
                          <Text style={styles.scheduleName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                          {item.isParallel && (
                            <View style={styles.parallelTag}>
                              <Text style={styles.parallelTagText}>Choice</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.scheduleTimeContainer}>
                          <Ionicons name="time-outline" size={14} color="#6b7280" />
                          <Text style={styles.scheduleTime}>{item.time}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Status Badge or Mark Button */}
                     {isMarked && dateRecord ? (() => {
                        const status = dateRecord.status;
                         const cfg = status === 'Present'
                            ? { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', color: '#10b981', icon: 'checkmark-circle' as const }
                            : status === 'Absent'
                            ? { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', color: '#ef4444', icon: 'close-circle' as const }
                            : status === 'OD'
                            ? { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', color: '#f59e0b', icon: 'briefcase' as const }
                            : { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', color: '#3b82f6', icon: 'home' as const }; // Holiday
                        return (
                           <View style={[styles.markAttendanceBtn, { backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border }]}>
                            <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                            <Text style={[styles.markAttendanceText, { color: cfg.color }]}>{status}</Text>
                           </View>
                        );
                     })() : (
                        <View style={styles.markAttendanceBtn}>
                            <Ionicons name="create-outline" size={18} color="#8b5cf6" />
                            <Text style={styles.markAttendanceText}>Mark</Text>
                        </View>
                     )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

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
          onPress={() => setParallelClassModalVisible(false)} // Close on overlay press
        >
          {/* Prevent modal closure when clicking inside content */}
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Class</Text>
              <Text style={styles.modalSubtitle}>Choose which class you attended/will attend</Text>
            </View>

            {selectedParallelClass?.parallelOptions?.map((option: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.parallelOption}
                onPress={() => handleParallelClassSelection(option.subjectId)}
                activeOpacity={0.7}
              >
                <View style={styles.parallelOptionLeft}>
                  <View style={styles.parallelIconContainer}>
                     <Ionicons name={option.icon} size={24} color="#8b5cf6" />
                  </View>
                  <Text style={styles.parallelOptionText}>{option.name}</Text>
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
        selectedDate={selectedDate} // Pass selectedDate
        onClose={() => {
          setQuickMarkVisible(false);
          setSelectedSubject(null); // Clear selected subject on close
        }}
        onSuccess={(message) => {
          showToast(message, 'success'); // Show toast on success
          refreshSubjects(); // Refresh subjects data in context
        }}
        onError={(message) => {
          showToast(message, 'error'); // Show error toast
        }}
      />
    </View>
  );
};

// --- Styles (Includes toast styles now) ---
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
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      },
      headerLeft: {
        flex: 1,
        marginRight: 16,
      },
      greeting: {
        fontSize: 24,
        fontWeight: '600',
        color: '#9ca3af',
        flexWrap: 'wrap',
      },
      userName: {
        fontWeight: '700',
        color: '#ffffff',
      },
      profilePic: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1a1a1a',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      statsCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#262626',
      },
      statsCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
      },
      progressSection: {
        alignItems: 'center',
      },
      circularProgressContainer: {
        width: 140,
        height: 140,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
      },
      progressTextContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
      },
      progressPercentage: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
      },
      percentSymbol: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8b5cf6',
      },
      progressLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 2,
        fontWeight: '500',
        textTransform: 'uppercase',
      },
      statsRight: {
        flex: 1,
        gap: 16,
      },
      statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
      },
      statTextContainer: {
        flex: 1,
      },
      statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 2,
      },
      statLabel: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
      },
      statDivider: {
        height: 1,
        backgroundColor: '#262626',
      },
      weekSection: {
        marginBottom: 24,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 16,
      },
      daySelectorContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingRight: 20,
      },
      dateItem: {
        width: 56,
        height: 72,
        borderRadius: 16,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#262626',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      },
      dateItemActive: {
        backgroundColor: '#8b5cf6',
        borderColor: '#8b5cf6',
      },
      dayLabel: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
      },
      dayLabelActive: {
        color: '#ffffff',
      },
      dateLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
      },
      dateLabelActive: {
        color: '#ffffff',
      },
      todayDot: {
        position: 'absolute',
        bottom: 6,
        left: '50%',
        marginLeft: -3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3b82f6',
      },
      scheduleSection: {
        marginBottom: 24,
      },
      scheduleTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      },
      classCount: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
      },
      scheduleList: {
        gap: 12,
      },
      scheduleCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#262626',
      },
      scheduleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
        marginRight: 8,
      },
      scheduleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      scheduleContent: {
        flex: 1,
      },
      scheduleNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
      },
      scheduleName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
        flexShrink: 1,
      },
      parallelTag: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.4)',
      },
      parallelTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#f59e0b',
        textTransform: 'uppercase',
      },
      scheduleTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      },
      scheduleTime: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
      },
      markAttendanceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 80,
        justifyContent: 'center',
      },
      markAttendanceText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8b5cf6',
      },
      noClassesContainer: {
        paddingVertical: 48,
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#262626',
        marginTop: 16,
      },
      noClassesIcon: {
        marginBottom: 16,
      },
      noClassesText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
      },
      noClassesSubtext: {
        color: '#6b7280',
        fontSize: 14,
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
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 6,
      },
      modalSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
      },
      parallelOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0a0a0a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#262626',
      },
      parallelOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
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
        flex: 1,
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
// --- End: Styles ---

export default HomeScreen;