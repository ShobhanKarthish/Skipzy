import QuickMarkBottomSheet from '@/components/QuickMarkBottomSheet';
import { useSubjects } from '@/contexts/SubjectsContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { AppSubject } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
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

// Generate schedule from subjects data using the schedule array
const generateScheduleFromSubjects = (subjects: AppSubject[], dayName: string, userPreferences?: Record<string, string>) => {
  const scheduleItems: Array<{
    name: string;
    time: string;
    icon: string;
    subjectId: string;
    slotNumber: number;
    isParallel?: boolean;
    parallelOptions?: Array<{ name: string; subjectId: string; icon: string }>;
  }> = [];
  
  // Collect all schedule entries for this day from all subjects
  const slotMap = new Map<number, Array<{ subject: AppSubject; entry: any }>>();
  
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
  
  // Process each slot
  slotMap.forEach((items, slotNumber) => {
    if (items.length > 1) {
      // Parallel classes detected
      const preferenceKey = `${dayName}_${slotNumber}`;
      const preferredSubjectId = userPreferences?.[preferenceKey];
      
      // Find preferred subject or use first one
      const selectedItem = preferredSubjectId 
        ? items.find(item => item.subject.id === preferredSubjectId) || items[0]
        : items[0];
      
      // Build combined display name for UI
      const combinedName = items.map(i => i.subject.name).join(' / ');
      
      scheduleItems.push({
        name: combinedName,
        time: selectedItem.entry.timeString,
        icon: selectedItem.subject.classType === 'Lecture' ? 'school-outline' : 
              selectedItem.subject.classType === 'Lab' ? 'flask-outline' : 'medical-outline',
        subjectId: selectedItem.subject.id,
        slotNumber: slotNumber,
        isParallel: true,
        parallelOptions: items.map(item => ({
          name: item.subject.name,
          subjectId: item.subject.id,
          icon: item.subject.classType === 'Lecture' ? 'school-outline' : 
                item.subject.classType === 'Lab' ? 'flask-outline' : 'medical-outline',
        })),
      });
    } else {
      // Single class
      const item = items[0];
      scheduleItems.push({
        name: item.subject.name,
        time: item.entry.timeString,
        icon: item.subject.classType === 'Lecture' ? 'school-outline' : 
              item.subject.classType === 'Lab' ? 'flask-outline' : 'medical-outline',
        subjectId: item.subject.id,
        slotNumber: slotNumber,
      });
    }
  });
  
  // Sort by slot number to show in correct order
  return scheduleItems.sort((a, b) => a.slotNumber - b.slotNumber);
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HomeScreen = () => {
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [progressAnim] = useState(new Animated.Value(0));
  const [percentageAnim] = useState(new Animated.Value(0));
  const [percentageText, setPercentageText] = useState('0');
  const [quickMarkVisible, setQuickMarkVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<AppSubject | null>(null);
  const [parallelClassModalVisible, setParallelClassModalVisible] = useState(false);
  const [selectedParallelClass, setSelectedParallelClass] = useState<any>(null);

  // Fast lookups: build a subject map once per subjects change
  const subjectsById = useMemo(() => {
    const map = new Map<string, AppSubject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate overall attendance from all subjects
  const calculateOverallAttendance = () => {
    let totalAttended = 0;
    let totalClasses = 0;

    subjects.forEach(subject => {
      const attended = subject.history.filter(
        h => h.status === 'Present' || h.status === 'OD'
      ).length;
      const total = subject.history.filter(
        h => h.status === 'Present' || h.status === 'Absent'
      ).length;
      
      totalAttended += attended;
      totalClasses += total;
    });

    return totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  };

  const targetPercentage = calculateOverallAttendance();

  useEffect(() => {
    const listenerId = percentageAnim.addListener(({ value }) => {
      setPercentageText(Math.round(value).toString());
    });

    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: targetPercentage,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(percentageAnim, {
        toValue: targetPercentage,
        duration: 1500,
        useNativeDriver: false,
      }),
    ]).start();

    return () => {
      percentageAnim.removeListener(listenerId);
    };
  }, [targetPercentage, subjects]);

  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const getWeekDates = () => {
    const dayOfWeek = selectedDate.getDay();
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

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

  const handleScheduleItemPress = (item: any) => {
    // Check if this is a parallel class
    if (item.isParallel && item.parallelOptions && item.parallelOptions.length > 1) {
      // Show parallel class selection modal
      setSelectedParallelClass(item);
      setParallelClassModalVisible(true);
    } else {
      // Find subject by ID if available, otherwise by name
      const subject = item.subjectId 
        ? subjectsById.get(item.subjectId)
        : subjects.find(s => 
            s.name.toLowerCase().includes(item.name.toLowerCase()) || 
            item.name.toLowerCase().includes(s.name.toLowerCase())
          );
      
      if (subject) {
        setSelectedSubject(subject);
        setQuickMarkVisible(true);
      }
    }
  };

  const weekDates = getWeekDates();
  const calendarDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const schedule = useMemo(() => getScheduleForDate(selectedDate), [subjects, selectedDate]);
  // Use local YYYY-MM-DD to match records and other screens
  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  // Calculate total classes attended
  const totalClassesAttended = subjects.reduce((acc, subject) => {
    return acc + subject.history.filter(h => h.status === 'Present' || h.status === 'OD').length;
  }, 0);

  // Calculate safe to skip
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

  // Removed blocking loading state - show UI immediately for better UX
  // Data will load in background and update when ready

  const handleParallelClassSelection = (subjectId: string) => {
    // Find the selected subject
    const subject = subjects.find(s => s.id === subjectId);
    
    if (subject) {
      setSelectedSubject(subject);
      setParallelClassModalVisible(false);
      setQuickMarkVisible(true);
    }
  };

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
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.userName}>{userProfile?.name || 'Student'}</Text>
          </View>
          <TouchableOpacity style={styles.profilePic} activeOpacity={0.7}>
            <Ionicons name="person" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsCardInner}>
            {/* Circular Progress */}
            <View style={styles.progressSection}>
              <View style={styles.circularProgressContainer}>
                <Svg width={140} height={140}>
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
                  <Animated.Text style={styles.progressPercentage}>
                    {percentageText}
                    <Text style={styles.percentSymbol}>%</Text>
                  </Animated.Text>
                  <Text style={styles.progressLabel}>Attendance</Text>
                </View>
              </View>
            </View>

            {/* Stats Right */}
            <View style={styles.statsRight}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statNumber}>{totalClassesAttended}</Text>
                  <Text style={styles.statLabel}>Classes Attended</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statNumber}>{calculateSafeToSkip()}</Text>
                  <Text style={styles.statLabel}>Safe to Skip</Text>
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
              <Text style={styles.noClassesText}>No classes today</Text>
              <Text style={styles.noClassesSubtext}>Enjoy your free time!</Text>
            </View>
          ) : (
            <View style={styles.scheduleList}>
              {schedule.map((item, index) => {
                // Find matching subject and check if marked for selected date
                const subject = item.subjectId 
                  ? subjects.find(s => s.id === item.subjectId)
                  : subjects.find(s => 
                      s.name.toLowerCase().includes(item.name.toLowerCase()) || 
                      item.name.toLowerCase().includes(s.name.toLowerCase())
                    );
                
                let isMarked = false;
                let dateRecord: { status: 'Present'|'Absent'|'Holiday'|'OD' } | undefined;
                if (subject) {
                  dateRecord = subject.history.find(record => record.date === selectedDateKey);
                  isMarked = !!dateRecord;
                }

                return (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.scheduleCard}
                    activeOpacity={0.7}
                    onPress={() => handleScheduleItemPress(item)}
                  >
                    <View style={styles.scheduleLeft}>
                      <View style={styles.scheduleIconContainer}>
                        <Ionicons name={item.icon as any} size={22} color="#8b5cf6" />
                      </View>
                      <View style={styles.scheduleContent}>
                        <View style={styles.scheduleNameRow}>
                          <Text style={styles.scheduleName}>{item.name}</Text>
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
                    
                    {/* Conditionally render Mark or specific status badge */}
                    {isMarked && dateRecord ? (() => {
                      const status = dateRecord.status;
                      const cfg = status === 'Present'
                        ? { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', color: '#10b981', icon: 'checkmark-circle' as const }
                        : status === 'Absent'
                          ? { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', color: '#ef4444', icon: 'close-circle' as const }
                          : status === 'OD'
                            ? { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', color: '#f59e0b', icon: 'briefcase' as const }
                            : { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', color: '#3b82f6', icon: 'home' as const };
                      return (
                        <View style={[styles.markAttendanceBtn, { backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border }] }>
                          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                          <Text style={[styles.markAttendanceText, { color: cfg.color }]}>{status}</Text>
                        </View>
                      );
                    })() : (
                      <View style={styles.markAttendanceBtn}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#8b5cf6" />
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
          onPress={() => setParallelClassModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Class</Text>
              <Text style={styles.modalSubtitle}>Choose which class you're attending</Text>
            </View>
            
            {selectedParallelClass?.parallelOptions?.map((option: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.parallelOption,
                  option.subjectId === selectedParallelClass.subjectId && styles.parallelOptionSelected
                ]}
                onPress={() => handleParallelClassSelection(option.subjectId)}
                activeOpacity={0.7}
              >
                <View style={styles.parallelOptionLeft}>
                  <View style={styles.parallelIconContainer}>
                    <Ionicons name={option.icon as any} size={24} color="#8b5cf6" />
                  </View>
                  <Text style={styles.parallelOptionText}>{option.name}</Text>
                </View>
                {option.subjectId === selectedParallelClass.subjectId && (
                  <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
                )}
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
        onClose={() => {
          setQuickMarkVisible(false);
          setSelectedSubject(null);
        }}
        onSuccess={() => {
          // No network refresh needed: SubjectsContext updates optimistically
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#8b5cf6',
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
    backgroundColor: '#262626',
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
    top: 8,
    right: 8,
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
    flexShrink: 1, // Allow text to shrink and wrap if needed
  },
  parallelTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  parallelTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b5cf6',
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
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markAttendanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  // --- New Styles ---
  markAttendanceBtnMarked: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // Green tint
  },
  markAttendanceTextMarked: {
    color: '#10b981', // Green text
  },
  // --- End of New Styles ---
  noClassesContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
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
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  parallelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0a0a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
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

export default HomeScreen;
