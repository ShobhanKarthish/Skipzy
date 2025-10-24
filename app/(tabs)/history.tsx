import { useSubjects } from '@/contexts/SubjectsContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type AttendanceStatus = 'Present' | 'Absent' | 'OD' | 'Holiday';

export default function HistoryScreen() {
  const { subjects, loading, error } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{
    subjectId: string;
    date: string;
    status: AttendanceStatus;
  } | null>(null);

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

  // Get filtered subjects based on selection
  const getFilteredSubjects = () => {
    if (selectedSubject === 'all') {
      return subjects;
    }
    return subjects.filter(subject => subject.id === selectedSubject);
  };

  // Get attendance records for selected month
  const getMonthlyRecords = () => {
    const filteredSubjects = getFilteredSubjects();
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const records: Array<{
      subjectId: string;
      subjectName: string;
      date: string;
      status: AttendanceStatus;
    }> = [];

    filteredSubjects.forEach(subject => {
      subject.history.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate.getFullYear() === year && recordDate.getMonth() === month) {
          records.push({
            subjectId: subject.id,
            subjectName: subject.name,
            date: record.date,
            status: record.status,
          });
        }
      });
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Calculate monthly statistics
  const getMonthlyStats = () => {
    const records = getMonthlyRecords();
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.status === 'Present' || r.status === 'OD').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    const percentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    return { totalRecords, presentCount, absentCount, percentage };
  };

  // Get month name
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedMonth(newDate);
  };

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

  const monthlyRecords = getMonthlyRecords();
  const monthlyStats = getMonthlyStats();

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
          <Text style={styles.title}>Attendance History</Text>
          <Text style={styles.subtitle}>Track your attendance over time</Text>
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
          
          <Text style={styles.monthText}>{getMonthName(selectedMonth)}</Text>
          
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

        {/* Subject Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter by Subject</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedSubject === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedSubject('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSubject === 'all' && styles.filterChipTextActive,
                ]}
              >
                All Subjects
              </Text>
            </TouchableOpacity>
            {subjects.map(subject => (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.filterChip,
                  selectedSubject === subject.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedSubject(subject.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSubject === subject.id && styles.filterChipTextActive,
                  ]}
                >
                  {subject.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Attendance Records */}
        <View style={styles.recordsSection}>
          <Text style={styles.recordsTitle}>Attendance Records</Text>
          {monthlyRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#4b5563" />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptySubtitle}>
                No attendance records for {getMonthName(selectedMonth)}
              </Text>
            </View>
          ) : (
            <View style={styles.recordsList}>
              {monthlyRecords.map((record, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recordCard}
                  onPress={() => {
                    setSelectedRecord({
                      subjectId: record.subjectId,
                      date: record.date,
                      status: record.status,
                    });
                    setEditModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.recordLeft}>
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
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordSubject}>{record.subjectName}</Text>
                      <Text style={styles.recordDate}>
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recordRight}>
                    <Text
                      style={[
                        styles.recordStatus,
                        { color: getStatusColor(record.status) },
                      ]}
                    >
                      {record.status}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Attendance</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            {selectedRecord && (
              <>
                <Text style={styles.modalText}>
                  Subject: {subjects.find(s => s.id === selectedRecord.subjectId)?.name}
                </Text>
                <Text style={styles.modalText}>
                  Date: {new Date(selectedRecord.date).toLocaleDateString()}
                </Text>
                <Text style={styles.modalText}>
                  Current Status: {selectedRecord.status}
                </Text>
                <Text style={styles.modalNote}>
                  Note: Attendance editing will be available in a future update.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
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
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  filterContainer: {
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#262626',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#8b5cf6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  recordsSection: {
    marginBottom: 24,
  },
  recordsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyContainer: {
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
  recordsList: {
    gap: 12,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  recordLeft: {
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
  recordInfo: {
    flex: 1,
  },
  recordSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  recordDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 100,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
  },
  modalNote: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 20,
  },
});