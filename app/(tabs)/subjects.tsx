import QuickMarkBottomSheet from '@/components/QuickMarkBottomSheet';
import { useSubjects } from '@/contexts/SubjectsContext';
import { AppSubject } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Easing,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function SubjectsScreen() {
  const { subjects, loading, error, selectedYear, selectedMonth } = useSubjects();
  const [quickMarkVisible, setQuickMarkVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<AppSubject | null>(null);

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
    const total = history.filter(h => h.status === 'Present' || h.status === 'Absent').length;
    const absent = history.filter(h => h.status === 'Absent').length;
    return { attended, total, absent };
  };

  const calculateSafeToSkip = (subject: AppSubject) => {
    const { attended, total } = getStats(subject.history);
    if (total === 0) return 0;
    
    const minClassesRequired = Math.ceil((subject.minAttendance / 100) * total);
    const maxSkipsAllowed = total - minClassesRequired;
    const skipsUsed = total - attended;
    return Math.max(0, maxSkipsAllowed - skipsUsed);
  };

  const getStatusColor = (percentage: number, minPercentage: number, safeToSkip: number) => {
    if (percentage >= minPercentage) return { text: '#10b981', ring: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (safeToSkip <= 0) return { text: '#ef4444', ring: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    return { text: '#f59e0b', ring: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
  };

  const handleQuickMark = (subject: AppSubject) => {
    setSelectedSubject(subject);
    setQuickMarkVisible(true);
  };

  const renderSubjectCard = (subject: AppSubject) => {
    const { attended, total } = getStats(subject.history);
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
                  stroke="#2a2a2a"
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

          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text style={styles.scheduleText}>{subject.days.join(', ')} - {subject.timeSlot}</Text>
          </View>
        </View>

        {/* Quick Mark Button - Full Width */}
        <TouchableOpacity
          style={styles.quickMarkBtnFull}
          onPress={() => handleQuickMark(subject)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
          <Text style={styles.quickMarkText}>Quick Mark</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading subjects...</Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.subtitle}>Third Year BDS - Current Month</Text>
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
              The timetable will appear once the database is set up
            </Text>
          </View>
        ) : (
          subjects.map(renderSubjectCard)
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Quick Mark Bottom Sheet */}
      <QuickMarkBottomSheet
        visible={quickMarkVisible}
        subject={selectedSubject}
        onClose={() => {
          setQuickMarkVisible(false);
          setSelectedSubject(null);
        }}
        onSuccess={() => {
          showToast('Attendance marked successfully!', 'success');
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
  },
  subjectCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleSection: {
    flex: 1,
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
    marginBottom: 12,
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
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleText: {
    fontSize: 13,
    color: '#6b7280',
  },
  quickMarkBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    padding: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  quickMarkText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    margin: 16,
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