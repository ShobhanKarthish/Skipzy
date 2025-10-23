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
  Switch,
  Animated,
  // Alert, // We no longer need the default Alert
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubjects } from '@/contexts/SubjectsContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import Svg, { Circle } from 'react-native-svg';
// import RNHTMLtoPDF from 'react-native-html-to-pdf'; // Removed for Expo Go compatibility

interface EditForm {
  name: string;
  course: string;
  year: string;
  institution: string;
  studentId: string;
  email: string;
}

export default function ProfileScreen() {
  const { subjects } = useSubjects();
  const {
    userProfile,
    updateUserProfile,
    darkMode,
    toggleDarkMode,
    resetAllData,
  } = useUserProfile();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false); // State for the new modal
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const [editForm, setEditForm] = useState<EditForm>({
    name: userProfile.name,
    course: userProfile.course,
    year: userProfile.year,
    institution: userProfile.institution,
    studentId: userProfile.studentId,
    email: userProfile.email,
  });

  // Calculate overall attendance
  const calculateOverallAttendance = () => {
    let totalAttended = 0;
    let totalClasses = 0;

    subjects.forEach(subject => {
      const attended = subject.history.filter(
        h => h.status === 'Present' || h.status === 'On Duty'
      ).length;
      const total = subject.history.filter(
        h => h.status === 'Present' || h.status === 'Absent'
      ).length;
      
      totalAttended += attended;
      totalClasses += total;
    });

    return {
      percentage: totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0,
      attended: totalAttended,
      total: totalClasses,
    };
  };

  const overallStats = calculateOverallAttendance();

  // Calculate last 6 months attendance
  const calculateMonthlyAttendance = () => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const monthlyData = months.map(month => {
      // Mock data - in real app, calculate from actual history
      const percentages: Record<string, number> = {
        'May': 78,
        'Jun': 85,
        'Jul': 90,
        'Aug': 72,
        'Sep': 88,
        'Oct': overallStats.percentage || 75,
      };
      return { month, percentage: percentages[month] };
    });
    return monthlyData;
  };

  const monthlyData = calculateMonthlyAttendance();

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
    }, 2500);
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile(editForm);
      setEditModalVisible(false);
      showToast('Profile updated successfully!');
    } catch (error) {
      showToast('Failed to update profile');
    }
  };

  // --- REVERTED to CSV/Text Export ---
  // This will work in Expo Go
  const handleExportData = async () => {
    showToast('Generating export...'); // Give user feedback

    // 1. Calculate Per-Subject Stats
    const subjectStats = subjects.map(subject => {
      const attended = subject.history.filter(
        h => h.status === 'Present' || h.status === 'On Duty'
      ).length;
      const total = subject.history.filter(
        h => h.status === 'Present' || h.status === 'Absent'
      ).length;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { name: subject.name, attended, total, percentage };
    });

    const allAbsences = subjects.flatMap(subject => 
      subject.history
        .filter(h => h.status === 'Absent')
        .map(h => ({ name: subject.name, date: h.date }))
    );

    // 2. Generate CSV/Text Content
    let csvContent = 'ATTENDANCE REPORT\n';
    csvContent += `Student: ${userProfile.name}\n`;
    csvContent += '============================\n\n';
    
    csvContent += 'OVERALL INSIGHTS\n';
    csvContent += `Overall Attendance: ${overallStats.percentage}%\n`;
    csvContent += `Classes Attended: ${overallStats.attended} / ${overallStats.total}\n\n`;

    csvContent += 'ATTENDANCE BY SUBJECT\n';
    csvContent += 'Subject,Percentage,Classes (Attended/Total)\n';
    subjectStats.forEach(stat => {
      csvContent += `"${stat.name}",${stat.percentage}%,${stat.attended}/${stat.total}\n`;
    });
    csvContent += '\n';

    csvContent += 'ABSENCE LOG\n';
    if (allAbsences.length > 0) {
      csvContent += 'Subject,Date\n';
      allAbsences.forEach(absence => {
        const dateString = new Date(absence.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        csvContent += `"${absence.name}","${dateString}"\n`;
      });
    } else {
      csvContent += 'No absences recorded.\n';
    }

    // 3. Share the text content
    try {
      await Share.share({
        title: 'My Attendance Report',
        message: csvContent, // Share the generated text
      });
      showToast('Export shared successfully!');

    } catch (error) {
      console.error('Failed to share report:', error);
      showToast('Failed to export report');
    }
  };

  // This function now *opens* the confirmation modal
  const handleResetData = () => {
    setResetModalVisible(true);
  };

  // This new function handles the actual reset logic
  const onConfirmReset = async () => {
    try {
      await resetAllData();
      setResetModalVisible(false);
      showToast('All data has been reset');
    } catch (error) {
      setResetModalVisible(false);
      showToast('Failed to reset data');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallStats.percentage / 100) * circumference;

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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(userProfile.name)}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.userName}>{userProfile.name}</Text>
              <Text style={styles.userRole}>Student</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editIcon}
            onPress={() => {
              setEditForm({
                name: userProfile.name,
                course: userProfile.course,
                year: userProfile.year,
                institution: userProfile.institution,
                studentId: userProfile.studentId,
                email: userProfile.email,
              });
              setEditModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Statistics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistics</Text>
          <View style={styles.statsContent}>
            <View style={styles.circularProgress}>
              <Svg width={90} height={90}>
                <Circle
                  cx="45"
                  cy="45"
                  r={radius}
                  stroke="#2a2a2a"
                  strokeWidth="6"
                  fill="transparent"
                />
                <Circle
                  cx="45"
                  cy="45"
                  r={radius}
                  stroke="#8b5cf6"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="45, 45"
                />
              </Svg>
              <View style={styles.circularProgressText}>
                <Text style={styles.percentageText}>{overallStats.percentage}%</Text>
              </View>
            </View>
            <View style={styles.statsInfo}>
              <Text style={styles.statsLabel}>Overall Attendance</Text>
              <Text style={styles.statsValue}>{overallStats.attended}/{overallStats.total} Classes</Text>
            </View>
          </View>
        </View>

        {/* Last 6 Months Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 6 Months Attendance</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartYAxis}>
              <Text style={styles.yAxisLabel}>100</Text>
              <Text style={styles.yAxisLabel}>90</Text>
              <Text style={styles.yAxisLabel}>80</Text>
              <Text style={styles.yAxisLabel}>70</Text>
              <Text style={styles.yAxisLabel}>60</Text>
              <Text style={styles.yAxisLabel}>50</Text>
              <Text style={styles.yAxisLabel}>40</Text>
              <Text style={styles.yAxisLabel}>30</Text>
              <Text style={styles.yAxisLabel}>20</Text>
              <Text style={styles.yAxisLabel}>10</Text>
              <Text style={styles.yAxisLabel}>0</Text>
            </View>
            <View style={styles.chartArea}>
              <View style={styles.barsContainer}>
                {monthlyData.map((data, index) => (
                  <View key={index} style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                      <Text style={styles.barValue}>{data.percentage}%</Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${data.percentage}%`,
                            backgroundColor: '#8b5cf6',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{data.month}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Preferences Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="moon" size={20} color="#8b5cf6" style={styles.preferenceIcon} />
              <Text style={styles.preferenceText}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#3a3a3a', true: '#8b5cf6' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Data Management Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Management</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportData}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>Export Attendance (CSV)</Text>
            <Ionicons name="download-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleResetData} // This now opens the modal
            activeOpacity={0.7}
          >
            <Text style={styles.actionTextDanger}>Reset All App Data</Text>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.appVersion}>App Version 1.0.0</Text>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={28} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#6b7280"
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., BDS, MBBS"
                  placeholderTextColor="#6b7280"
                  value={editForm.course}
                  onChangeText={(text) => setEditForm({ ...editForm, course: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3rd Year"
                  placeholderTextColor="#6b7280"
                  value={editForm.year}
                  onChangeText={(text) => setEditForm({ ...editForm, year: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Institution</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter institution name"
                  placeholderTextColor="#6b7280"
                  value={editForm.institution}
                  onChangeText={(text) => setEditForm({ ...editForm, institution: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: Reset Confirmation Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade" // Fade is nice for confirmation
        transparent={true}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          {/* This modal is smaller and centered */}
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="warning-outline" size={48} color="#ef4444" />
            </View>
            
            <Text style={styles.confirmModalTitle}>Reset All Data</Text>
            
            <Text style={styles.confirmModalText}>
              This will permanently delete all attendance records and subjects. This action cannot be undone.
            </Text>
            
            <Text style={styles.confirmModalText}>
              Are you absolutely sure?
            </Text>

            <View style={styles.confirmModalFooter}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmResetBtn}
                onPress={onConfirmReset}
              >
                <Text style={styles.confirmResetBtnText}>Reset Everything</Text>
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
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
  },
  toastText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  scrollContent: { paddingTop: 60, paddingHorizontal: 20 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  headerInfo: { justifyContent: 'center' },
  userName: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  userRole: { fontSize: 14, color: '#9ca3af' },
  editIcon: { padding: 8 },
  
  // Card
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 16 },
  
  // Statistics
  statsContent: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  circularProgress: { position: 'relative', width: 90, height: 90 },
  circularProgressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: { fontSize: 22, fontWeight: '700', color: '#8b5cf6' },
  statsInfo: { flex: 1 },
  statsLabel: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  statsValue: { fontSize: 14, color: '#9ca3af' },
  
  // Chart
  chartContainer: { flexDirection: 'row', height: 220, marginTop: 8 },
  chartYAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginRight: 8,
  },
  yAxisLabel: { fontSize: 10, color: '#6b7280', textAlign: 'right' },
  chartArea: { flex: 1, justifyContent: 'flex-end' },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 200,
  },
  barWrapper: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  barContainer: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 },
  barValue: { fontSize: 11, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  bar: { width: '80%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { fontSize: 11, color: '#9ca3af', marginTop: 8 },
  
  // Preferences
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preferenceIcon: { marginRight: 0 },
  preferenceText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  
  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  actionText: { fontSize: 16, fontWeight: '500', color: '#ffffff' },
  actionTextDanger: { fontSize: 16, fontWeight: '500', color: '#ef4444' },
  actionDivider: { height: 1, backgroundColor: '#2a2a2a', marginVertical: 4 },
  
  // App Version
  appVersion: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 16,
  },
  bottomPadding: { height: 100 },
  
  // Edit Modal (slide-up)
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#1a1a1a', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '80%' 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  modalScroll: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#9ca3af', marginBottom: 8 },
  input: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16.
  },
  modalFooter: { 
    flexDirection: 'row', 
    padding: 20, 
    gap: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#262626' 
  },
  cancelBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: '#262626', 
    alignItems: 'center' 
  },
  cancelBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  saveBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: '#8b5cf6', 
    alignItems: 'center' 
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  // NEW: Confirm Reset Modal (centered)
  confirmModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  confirmModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  confirmModalFooter: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#262626',
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmResetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ef4444', // Red color for destructive action
    alignItems: 'center',
  },
  confirmResetBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

