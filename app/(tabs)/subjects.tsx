import { useSubjects } from '@/contexts/SubjectsContext';
import { AppSubject } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function SubjectsScreen() {
  const { subjects: allSubjects, loading, error } = useSubjects();

  // Local month state for filtering display only
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth] = useState<number>(new Date().getMonth());

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

  const getStats = (history: any[]) => {
    const attended = history.filter(h => h.status === 'Present' || h.status === 'OD').length;
    // Ensure 'total' calculation is based on relevant statuses (Present, Absent, OD)
    const total = history.filter(
        h => h.status === 'Present' || h.status === 'Absent' || h.status === 'OD'
    ).length;
    const absent = history.filter(h => h.status === 'Absent').length;
    return { attended, total, absent };
  };


  const calculateSafeToSkip = (subject: AppSubject) => {
    const { attended, total } = getStats(subject.history);
    if (total === 0) return 0; // Or Infinity if preferred when no classes held

    // Calculate required classes, ensuring minAttendance is treated as percentage
    const minClassesRequired = Math.ceil((subject.minAttendance / 100) * total);
    const maxSkipsAllowed = total - minClassesRequired;
    const skipsUsed = total - attended; // Skips are total relevant classes minus attended
    return Math.max(0, maxSkipsAllowed - skipsUsed);
  };


  const getStatusColor = (percentage: number, minPercentage: number, safeToSkip: number) => {
    if (percentage >= minPercentage) return { text: '#10b981', ring: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    // Consider safeToSkip only relevant if percentage is below target
    if (safeToSkip <= 0 && percentage < minPercentage) return { text: '#ef4444', ring: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    // If below target but skips are available, show warning color
    if (percentage < minPercentage) return { text: '#f59e0b', ring: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
     // Default to success color if exactly at or above target (covered by first condition but safe fallback)
    return { text: '#10b981', ring: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  };

  // Sort subjects: below 75% first, then 75% and above
  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => {
      const { attended: attendedA, total: totalA } = getStats(a.history);
      const { attended: attendedB, total: totalB } = getStats(b.history);
      const percentageA = totalA > 0 ? Math.round((attendedA / totalA) * 100) : 0;
      const percentageB = totalB > 0 ? Math.round((attendedB / totalB) * 100) : 0;

      // Group by below/above 75%
      const groupA = percentageA < 75 ? 0 : 1;
      const groupB = percentageB < 75 ? 0 : 1;

      if (groupA !== groupB) {
        return groupA - groupB; // Below 75% comes first
      }

      // Within same group, sort by percentage (ascending for below 75%, descending for above)
      if (groupA === 0) {
        return percentageA - percentageB; // Lower percentages first in "Needs Attention"
      } else {
        return percentageB - percentageA; // Higher percentages first in "Good Standing"
      }
    });
  }, [subjects]);

  const renderSubjectCard = (subject: AppSubject) => {
    const { attended, total } = getStats(subject.history);
    // Ensure percentage calculation uses the correct 'total'
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    const safeToSkip = calculateSafeToSkip(subject);
    const colors = getStatusColor(percentage, subject.minAttendance, safeToSkip);

    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View key={subject.id} style={styles.subjectCard}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <View style={styles.subjectMeta}>
                <Ionicons name="book-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{subject.classType}</Text>
                {subject.staffName && (
                  <>
                    <Text style={styles.metaDivider}>•</Text>
                    <Ionicons name="person-outline" size={14} color="#6b7280" />
                    <Text style={styles.metaText}>{subject.staffName}</Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.progressRing}>
              <Svg width={64} height={64}>
                <Circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#2a2a2a" // Background ring color
                  strokeWidth="4"
                  fill="transparent"
                />
                <Circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke={colors.ring}
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="32, 32"
                />
              </Svg>
              <View style={styles.progressText}>
                <Text style={[styles.percentage, { color: colors.text }]}>{percentage}%</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statsRow, { backgroundColor: colors.bg }]}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Attended</Text>
              <Text style={styles.statValue}>{attended}/{total}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Can Skip</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{safeToSkip} classes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statValue}>{subject.minAttendance}%</Text>
            </View>
          </View>

          {/* --- REMOVED SCHEDULE SECTION --- */}
          {/*
          <View style={styles.scheduleSection}>
            <View style={styles.scheduleHeader}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.scheduleTitle}>Schedule</Text>
            </View>
            {subject.schedule && subject.schedule.length > 0 ? (
              subject.schedule.map((entry, index) => (
                <View key={index} style={styles.scheduleEntry}>
                  <Text style={styles.scheduleDay}>{entry.day}</Text>
                  <Text style={styles.scheduleTime}>Slot {entry.slotNumber} • {entry.timeString}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.scheduleText}>No schedule available</Text>
            )}
          </View>
           */}
          {/* --- END REMOVED SCHEDULE SECTION --- */}

        </View>
      </View>
    );
  };

  // Removed blocking loading state - show UI immediately for instant navigation
  // Data will load in background and update when ready

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Toast */}
      {toastMessage && (
        <Animated.View style={[
          styles.toastContainer,
          { transform: [{ translateY: toastAnim }] },
          toastType === 'error' ? styles.toastError : styles.toastSuccess
        ]}>
          <Ionicons
            name={toastType === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={22}
            color="#ffffff"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Subjects</Text>
          <Text style={styles.subtitle}>
             {/* Dynamic year/month */}
            {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="book-outline" size={64} color="#4b5563" />
            </View>
            <Text style={styles.emptyTitle}>No Subjects Found</Text>
            <Text style={styles.emptySubtitle}>
              Subjects will appear here once added.
            </Text>
          </View>
        ) : (
          <>
            {/* Render subjects below 75% */}
            {sortedSubjects.filter(subject => {
              const { attended, total } = getStats(subject.history);
              const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
              return percentage < 75;
            }).length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text style={styles.sectionTitle}>Needs Attention</Text>
                  <Text style={styles.sectionBadge}>
                    {sortedSubjects.filter(subject => {
                      const { attended, total } = getStats(subject.history);
                      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
                      return percentage < 75;
                    }).length}
                  </Text>
                </View>
                {sortedSubjects
                  .filter(subject => {
                    const { attended, total } = getStats(subject.history);
                    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
                    return percentage < 75;
                  })
                  .map(renderSubjectCard)}
              </>
            )}

            {/* Render subjects at or above 75% */}
            {sortedSubjects.filter(subject => {
              const { attended, total } = getStats(subject.history);
              const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
              return percentage >= 75;
            }).length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.sectionTitle}>Good Standing</Text>
                  <Text style={styles.sectionBadge}>
                    {sortedSubjects.filter(subject => {
                      const { attended, total } = getStats(subject.history);
                      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
                      return percentage >= 75;
                    }).length}
                  </Text>
                </View>
                {sortedSubjects
                  .filter(subject => {
                    const { attended, total } = getStats(subject.history);
                    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
                    return percentage >= 75;
                  })
                  .map(renderSubjectCard)}
              </>
            )}
          </>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  toastContainer: {
    position: 'absolute',
    top: 60, // Position below status bar
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0, // Remove top padding as header handles it
  },
  subjectCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden', // Keep overflow hidden for button radius
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16, // Increased margin
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12, // Add margin to prevent text overlap with ring
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap', // Allow meta info to wrap if needed
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaDivider: {
    color: '#4b5563',
    marginHorizontal: 4,
  },
  progressRing: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  progressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    // marginBottom: 12, // Remove bottom margin as schedule is gone
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase', // Uppercase labels
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    backgroundColor: '#262626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bottomPadding: {
    height: 100, // Keep padding for scroll area below tabs
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    marginHorizontal: 16, // Keep horizontal margin
    marginBottom: 16, // Add bottom margin if needed
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    marginTop: 40, // Add margin if header is present
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
});