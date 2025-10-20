import React, { useState, useRef } from 'react'; // Added useRef
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  // Alert, // We are removing Alert
  Animated, // Added Animated
  Easing, // Added Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Subject } from '@/types/subjects';

export default function SubjectsScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: 1,
      name: 'Oral Pathology',
      staffName: 'Dr. Kumar',
      minAttendance: 75,
      days: ['Mon', 'Wed', 'Fri'],
      timeSlot: '7:45 AM',
      classType: 'Lecture',
      history: [
        { date: '2025-10-02', status: 'Present' },
        { date: '2025-10-04', status: 'Absent' },
        { date: '2025-10-09', status: 'Present' },
      ],
    },
    {
      id: 2,
      name: 'Crown & Bridge',
      staffName: 'Dr. Sharma',
      minAttendance: 75,
      days: ['Tue', 'Thu'],
      timeSlot: '9:00 AM',
      classType: 'Lab',
      history: [],
    },
    {
      id: 3,
      name: 'Prosthodontics',
      staffName: 'Dr. Patel',
      minAttendance: 75,
      days: ['Mon', 'Tue', 'Thu'],
      timeSlot: '11:00 AM',
      classType: 'Lecture',
      history: [],
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    staffName: '',
    minAttendance: '75',
    days: [] as string[],
    timeSlot: '',
    classType: 'Lecture' as 'Lecture' | 'Lab' | 'OPD',
  });

  // --- NEW TOAST STATE ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastAnim = useRef(new Animated.Value(-100)).current; // Start off-screen
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // --- END TOAST STATE ---

  // --- NEW TOAST FUNCTION ---
  const showToast = (message: string, type: 'success' | 'error') => {
    // If a toast is already shown, clear its timeout
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }

    setToastMessage(message);
    setToastType(type);

    // Animate in
    Animated.timing(toastAnim, {
      toValue: 50, // Slide down to just below the status bar
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Set timeout to hide
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100, // Slide back up
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null); // Clear message after animation
      });
    }, 3000); // Show for 3 seconds
  };
  // --- END TOAST FUNCTION ---

  const getStats = (history: any[]) => {
    const attended = history.filter(h => h.status === 'Present' || h.status === 'On Duty').length;
    const total = history.filter(h => h.status === 'Present' || h.status === 'Absent').length;
    const absent = history.filter(h => h.status === 'Absent').length;
    return { attended, total, absent };
  };

  const calculateSafeToSkip = (subject: Subject) => {
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

  const renderSubjectCard = (subject: Subject) => {
    const { attended, total } = getStats(subject.history);
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    const safeToSkip = calculateSafeToSkip(subject);
    const colors = getStatusColor(percentage, subject.minAttendance, safeToSkip);

    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <TouchableOpacity
        key={subject.id}
        style={styles.subjectCard}
        onPress={() => router.push({
          pathname: '/subject-detail',
          params: { subjectId: subject.id }
        })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
            <View style={styles.subjectMeta}>
              <Ionicons name="book-outline" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{subject.classType}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Ionicons name="person-outline" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{subject.staffName}</Text>
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
      </TouchableOpacity>
    );
  };

  const handleAddSubject = () => {
    if (!newSubject.name.trim() || !newSubject.staffName.trim()) {
      // --- MODIFIED: Show custom toast instead of Alert ---
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const subject: Subject = {
      id: Date.now(),
      name: newSubject.name.trim(),
      staffName: newSubject.staffName.trim(),
      minAttendance: parseInt(newSubject.minAttendance) || 75,
      days: newSubject.days,
      timeSlot: newSubject.timeSlot,
      classType: newSubject.classType,
      history: [],
    };

    setSubjects([...subjects, subject]);
    setModalVisible(false);
    setNewSubject({
      name: '',
      staffName: '',
      minAttendance: '75',
      days: [],
      timeSlot: '',
      classType: 'Lecture',
    });
    
    // --- ADDED: Success toast ---
    showToast('Subject added successfully!', 'success');
  };

  const toggleDay = (day: string) => {
    setNewSubject(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      {/* --- NEW TOAST COMPONENT RENDER --- */}
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
      {/* --- END TOAST COMPONENT RENDER --- */}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Subjects</Text>
          <Text style={styles.subtitle}>Track attendance for all your subjects</Text>
        </View>
        {/* Settings Icon Removed */}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {subjects.map(renderSubjectCard)}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* Add Subject Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Subject</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter subject name"
                  placeholderTextColor="#6b7280"
                  value={newSubject.name}
                  onChangeText={(text) => setNewSubject({...newSubject, name: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Staff Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter staff name"
                  placeholderTextColor="#6b7280"
                  value={newSubject.staffName}
                  onChangeText={(text) => setNewSubject({...newSubject, staffName: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time Slot</Text>
                <View style={styles.buttonGrid}>
                  {['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4'].map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.optionBtn, newSubject.timeSlot === slot && styles.optionBtnActive]}
                      onPress={() => setNewSubject({...newSubject, timeSlot: slot})}
                    >
                      <Text style={[styles.optionText, newSubject.timeSlot === slot && styles.optionTextActive]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Days of Week</Text>
                <View style={styles.buttonGrid}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.optionBtn, newSubject.days.includes(day) && styles.optionBtnActive]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text style={[styles.optionText, newSubject.days.includes(day) && styles.optionTextActive]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Class Type</Text>
                <View style={styles.buttonGrid}>
                  {(['Lecture', 'Lab', 'OPD'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.optionBtn, newSubject.classType === type && styles.optionBtnActive]}
                      onPress={() => setNewSubject({...newSubject, classType: type})}
                    >
                      <Text style={[styles.optionText, newSubject.classType === type && styles.optionTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Required %</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 75"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  value={newSubject.minAttendance}
                  onChangeText={(text) => setNewSubject({...newSubject, minAttendance: text})}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleAddSubject}
              >
                <Text style={styles.addBtnText}>Add Subject</Text>
              </TouchableOpacity>
            </View>
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
  // --- NEW TOAST STYLES ---
  toastContainer: {
    position: 'absolute',
    top: 0, // Animated `translateY` will push it down
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
    backgroundColor: '#10b981', // Green
  },
  toastError: {
    backgroundColor: '#ef4444', // Red
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  // --- END TOAST STYLES ---
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
  // --- settingsBtn style removed ---
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  subjectCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
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
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomPadding: {
    height: 100,
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
    maxHeight: '90%',
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
  modalScroll: {
    padding: 20,
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
  input: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  optionBtnActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  optionText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#ffffff',
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
  addBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
