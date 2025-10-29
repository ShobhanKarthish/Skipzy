import { useSubjects } from '@/contexts/SubjectsContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { authService } from '@/lib/supabaseService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react'; // Added useEffect
import {
  Animated,
  Easing, // Added Easing
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface EditForm {
  name: string;
  email: string;
  attendanceTarget: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { subjects, refreshSubjects } = useSubjects();
  const {
    userProfile,
    loading: profileLoading,
    error: profileError,
    updateUserProfile,
    darkMode, // Note: darkMode/toggleDarkMode not used in UI, can be removed if not needed
    toggleDarkMode, // Note: Can be removed if not needed
    resetAllData,
  } = useUserProfile();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  // --- Start: Updated Toast Logic ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success'); // Added type state
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null); // Added timeout ref
  // --- End: Updated Toast Logic ---

  const [editForm, setEditForm] = useState<EditForm>({
    name: userProfile?.name || '',
    email: userProfile?.email || '',
    attendanceTarget: userProfile?.attendanceTarget || 75,
  });

   // Update form when userProfile changes (e.g., after initial load or update)
   useEffect(() => {
    if (userProfile) {
        setEditForm({
            name: userProfile.name || '',
            email: userProfile.email || '',
            attendanceTarget: userProfile.attendanceTarget || 75,
        });
    }
   }, [userProfile]);

  // Calculate overall attendance
  const calculateOverallAttendance = () => {
    let totalAttended = 0;
    let totalClasses = 0;

    subjects.forEach(subject => {
      const attended = subject.history.filter(
        h => h.status === 'Present' || h.status === 'OD'
      ).length;
      // Use Present and Absent for total calculation to match subjects.tsx logic
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

  // Calculate last 6 months attendance from real data
  const calculateMonthlyAttendance = () => {
    const now = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthShort = targetDate.toLocaleDateString('en-US', { month: 'short' });
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();

      let totalAttended = 0;
      let totalClasses = 0;

      subjects.forEach(subject => {
        subject.history.forEach(record => {
          const recordDate = new Date(record.date);

          if (recordDate.getFullYear() === year && recordDate.getMonth() === month) {
            if (record.status === 'Present' || record.status === 'OD') {
              totalAttended++;
            }
            // Use Present and Absent for total to match overall calculation
            if (record.status === 'Present' || record.status === 'Absent') {
              totalClasses++;
            }
          }
        });
      });

      const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
      monthlyData.push({ month: monthShort, percentage });
    }

    return monthlyData;
  };

  const monthlyData = calculateMonthlyAttendance();

  // --- Start: Updated showToast Function ---
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
    }

    setToastMessage(message);
    setToastType(type); // Set the type

    Animated.timing(toastAnim, {
        toValue: 60, // Position below status bar
        duration: 300,
        easing: Easing.out(Easing.ease), // Added easing
        useNativeDriver: true,
    }).start();

    toastTimeout.current = setTimeout(() => {
        Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        easing: Easing.in(Easing.ease), // Added easing
        useNativeDriver: true,
        }).start(() => {
        setToastMessage(null); // Clear message after hiding
        });
    }, 2500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
        if (toastTimeout.current) {
            clearTimeout(toastTimeout.current);
        }
    };
  }, []);
  // --- End: Updated showToast Function ---


  const handleSignOut = async () => {
    try {
      const { error } = await authService.signOut();
      if (error) {
        showToast('Failed to sign out', 'error');
      } else {
        // No need for success toast, navigation handles feedback
        router.replace('/auth'); // Navigate immediately
      }
    } catch (error) {
      console.error("Sign out error:", error); // Log the actual error
      showToast('An unexpected error occurred during sign out', 'error');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const success = await updateUserProfile(editForm);
      if (success) {
        setEditModalVisible(false);
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast('Failed to update profile', 'error');
      }
    } catch (error) {
       console.error("Save profile error:", error); // Log the actual error
      showToast('An unexpected error occurred updating profile', 'error');
    }
  };


  const handleResetData = () => {
    setResetModalVisible(true);
  };

  const onConfirmReset = async () => {
    try {
      setResetModalVisible(false); // Close modal immediately
      await resetAllData();
      await refreshSubjects(); // Refresh subjects to reflect cleared data
      showToast('All app data has been reset.', 'success');
      // Sign out and navigate after showing success
      await authService.signOut(); // Ensure sign out happens
      router.replace('/auth');
    } catch (error) {
      // Modal is already closed
      console.error("Reset data error:", error); // Log the actual error
      showToast('Failed to reset data. Please try again.', 'error');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U'; // Handle case where name might be null/empty
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean) // Remove empty strings if there are multiple spaces
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

      {/* --- Start: Updated Toast Rendering --- */}
      {/* Conditionally render based on toastMessage */}
      {toastMessage && (
        <Animated.View style={[
          styles.toastContainer,
          { transform: [{ translateY: toastAnim }] },
          toastType === 'error' ? styles.toastError : styles.toastSuccess // Apply style based on type
        ]}>
           <Ionicons
            name={toastType === 'error' ? 'alert-circle' : 'checkmark-circle'} // Icon based on type
            size={22}
            color="#ffffff"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
      {/* --- End: Updated Toast Rendering --- */}


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(userProfile?.name || 'User')}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{userProfile?.name || 'User'}</Text>
              {/* Optional: Add email or other info if needed */}
              {/* <Text style={styles.userEmail}>{userProfile?.email}</Text> */}
            </View>
          </View>
           {/* Edit Button */}
          <TouchableOpacity style={styles.editIcon} onPress={() => setEditModalVisible(true)}>
             <Ionicons name="pencil-outline" size={24} color="#9ca3af" />
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
              {/* Optional: Add target attendance display */}
              {/* <Text style={styles.statsTarget}>Target: {userProfile?.attendanceTarget || 75}%</Text> */}
            </View>
          </View>
        </View>

        {/* Last 6 Months Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 6 Months Attendance</Text>
          <View style={styles.chartContainer}>
            {/* Y-Axis Labels */}
            <View style={styles.chartYAxis}>
              {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map(val => (
                 <Text key={val} style={styles.yAxisLabel}>{val}</Text>
              ))}
            </View>
             {/* Chart Area */}
            <View style={styles.chartArea}>
              {/* Background Lines (Optional) */}
              <View style={styles.chartLines}>
                {[...Array(10)].map((_, i) => <View key={i} style={styles.chartLine} />)}
              </View>
               {/* Bars Container */}
              <View style={styles.barsContainer}>
                {monthlyData.map((data, index) => (
                  <View key={index} style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                      <Text style={styles.barValue}>{data.percentage}%</Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${data.percentage}%`, // Use percentage directly
                            backgroundColor: data.percentage < (userProfile?.attendanceTarget || 75) ? '#f59e0b' : '#8b5cf6', // Color based on target
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

        {/* Data Management Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Management</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleResetData}
            activeOpacity={0.7}
          >
            <Text style={styles.actionTextDanger}>Reset All App Data</Text>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.actionTextDanger}>Sign Out</Text>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.appVersion}>App Version 1.0.0</Text>
        <Text style={styles.madeWithLove}>Made With Love ❤️</Text>

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
                  autoCapitalize="words" // Capitalize names
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]} // Style for disabled
                  placeholder="Email address"
                  placeholderTextColor="#6b7280"
                  value={editForm.email}
                  editable={false} // Disable email editing
                  selectTextOnFocus={false} // Prevent selection
                />
                 <Text style={styles.inputHelpText}>Email cannot be changed.</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Attendance Target (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 75"
                  placeholderTextColor="#6b7280"
                  value={String(editForm.attendanceTarget)} // Ensure value is string
                  onChangeText={(text) => {
                    const num = parseInt(text.replace(/[^0-9]/g, ''), 10); // Allow only numbers
                    if (!isNaN(num)) {
                      if (num >= 0 && num <= 100) {
                        setEditForm({ ...editForm, attendanceTarget: num });
                      } else if (num > 100) {
                        setEditForm({ ...editForm, attendanceTarget: 100 }); // Cap at 100
                      } else {
                         // Allow empty string or 0, handle case where user deletes input
                         setEditForm({ ...editForm, attendanceTarget: 0 });
                      }
                    } else if (text === '') {
                        // Handle empty input explicitly if needed, e.g., default to 0
                        setEditForm({ ...editForm, attendanceTarget: 0 });
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={3} // Limit input length
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

      {/* Reset Confirmation Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="warning-outline" size={48} color="#ef4444" />
            </View>

            <Text style={styles.confirmModalTitle}>Reset All Data</Text>

            <Text style={styles.confirmModalText}>
              This will **permanently delete** all your attendance records. This action cannot be undone.
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
  // --- Start: Added Toast Styles ---
  toastContainer: {
    position: 'absolute',
    top: 0, // Position controlled by Animated.Value
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000, // Ensure it's above other content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10, // For Android shadow
  },
  toastSuccess: {
    backgroundColor: '#10b981', // Green for success
  },
  toastError: {
    backgroundColor: '#ef4444', // Red for error
  },
  toastText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flex: 1 },
   // --- End: Added Toast Styles ---
  scrollContent: { paddingTop: 60, paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 }, // Added flexShrink
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  headerInfo: { justifyContent: 'center', flexShrink: 1 }, // Added flexShrink
  userName: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  userEmail: { fontSize: 14, color: '#9ca3af' }, // Example style if email is added
  editIcon: { padding: 8 }, // Ensure easier tap target

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
  statsTarget: { fontSize: 12, color: '#6b7280', marginTop: 4 }, // Example style for target

  // Chart
  chartContainer: { flexDirection: 'row', height: 220, marginTop: 8 },
  chartYAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginRight: 8,
  },
  yAxisLabel: { fontSize: 10, color: '#6b7280', textAlign: 'right' },
  chartArea: { flex: 1, position: 'relative' }, // Added position relative for lines
   // Optional: Add background lines
  chartLines: {
    position: 'absolute',
    top: 8, // Align with Y-axis padding
    bottom: 8, // Align with Y-axis padding
    left: 0,
    right: 0,
    justifyContent: 'space-between',
  },
  chartLine: {
    height: 1,
    backgroundColor: '#2a2a2a', // Subtle line color
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%', // Use full height of chartArea
    paddingTop: 20, // Space for barValue text above bar
    paddingBottom: 24, // Space for barLabel text below bar
  },
  barWrapper: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  barContainer: { flexGrow: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', position: 'relative'}, // Added position relative
  barValue: {
      position: 'absolute', // Position above the bar
      top: -18, // Adjust as needed
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      textAlign: 'center',
      width: '100%',
   },
  bar: { width: '80%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 }, // Added minHeight
  barLabel: {
      position: 'absolute', // Position below the bar
      bottom: -22, // Adjust as needed
      fontSize: 11,
      color: '#9ca3af',
      textAlign: 'center',
      width: '100%',
   },

  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  actionTextDanger: { fontSize: 16, fontWeight: '500', color: '#ef4444' },
  actionDivider: { height: 1, backgroundColor: '#2a2a2a', marginVertical: 4 },

  // App Version
  appVersion: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
  madeWithLove: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
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
    fontSize: 16,
  },
   inputDisabled: { // Style for disabled email input
    color: '#6b7280',
    backgroundColor: '#1f1f1f',
  },
  inputHelpText: { // Style for help text below email
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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

  // Confirm Reset Modal (centered)
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
    width: '100%', // Ensure buttons take full width
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
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmResetBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});