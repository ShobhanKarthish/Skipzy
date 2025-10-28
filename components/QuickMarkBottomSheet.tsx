import { useSubjects } from '@/contexts/SubjectsContext';
import { AppAttendanceRecord, AppSubject } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, // Import ActivityIndicator
    Alert, // Import Alert
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    PanResponderGestureState, // Import type
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Adjust height slightly to accommodate the delete button
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.55; // Might need slight adjustment

type AttendanceStatus = 'Present' | 'Absent' | 'OD' | 'Holiday';

interface QuickMarkBottomSheetProps {
  visible: boolean;
  subject: AppSubject | null;
  selectedDate?: Date | null;
  isEditing?: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void; // Pass message back
  onError?: (message: string) => void;   // Pass error message back
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'OD', 'Holiday'];

const QuickMarkBottomSheet: React.FC<QuickMarkBottomSheetProps> = ({
  visible,
  subject,
  selectedDate,
  isEditing = false,
  onClose,
  onSuccess,
  onError, // Add onError prop
}) => {
  // Add deleteAttendance
  const { addAttendance, updateAttendance, deleteAttendance } = useSubjects();
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false); // Add deleting state
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  // Internal toast state (optional, can use parent's toast via callbacks)
  const [internalToastMsg, setInternalToastMsg] = useState<string | null>(null);
  const [internalToastType, setInternalToastType] = useState<'success' | 'error'>('success');
  const internalToastAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Preselect existing status when editing
      if (isEditing && subject && selectedDate) {
        const dateToMatch = selectedDate.toISOString().split('T')[0];
        const existing = subject.history.find(r => r.date === dateToMatch);
        setSelectedStatus(existing ? (existing.status as AttendanceStatus) : null);
      } else {
        setSelectedStatus(null); // Reset status when opening for a new record
      }
    } else {
      Animated.timing(translateY, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
          setSelectedStatus(null); // Reset after closing
      });
    }
  }, [visible, isEditing, subject, selectedDate]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        return gestureState.dy > 5; // Only allow dragging down
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const newY = Math.max(0, gestureState.dy); // Prevent dragging up
        translateY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50, friction: 7,
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

  // Internal Toast logic (optional)
   const showInternalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setInternalToastMsg(message);
    setInternalToastType(type);
    Animated.timing(internalToastAnim, { toValue: 20, duration: 300, useNativeDriver: true }).start();
    const timer = setTimeout(hideInternalToast, 2500);
    return () => clearTimeout(timer);
  };
   const hideInternalToast = () => {
     Animated.timing(internalToastAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => setInternalToastMsg(null));
  }


  const handleSave = async () => {
    if (saving || deleting || !subject || !selectedStatus) {
       if (!selectedStatus) showInternalToast('Please select a status', 'error');
      return;
    }
    setSaving(true);
    const dateToMark = selectedDate ? toLocalYMD(selectedDate) : toLocalYMD(new Date());
    let success = false;
    let message = '';
    let isError = false;

    try {
      if (isEditing) {
        success = await updateAttendance(subject.id, dateToMark, selectedStatus);
        message = success ? 'Attendance updated!' : 'Failed to update';
        isError = !success;
      } else {
        const alreadyMarked = subject.history.some(record => record.date === dateToMark);
        if (alreadyMarked) {
          message = 'Already marked for this date'; isError = true; success = false;
        } else {
          const record: AppAttendanceRecord = { date: dateToMark, status: selectedStatus, notes: null };
          success = await addAttendance(subject.id, record);
          message = success ? 'Attendance marked!' : 'Failed to mark';
          isError = !success;
        }
      }
    } catch (err: unknown) {
      console.error("Error saving attendance:", err);
      message = err instanceof Error ? `Error: ${err.message}` : 'Unknown error saving';
      isError = true; success = false;
    } finally {
      setSaving(false);
      if (success && onSuccess) onSuccess(message);
      else if (isError && onError) onError(message);
      else if (isError) showInternalToast(message, 'error'); // Fallback internal toast
      if (success) setTimeout(handleClose, 800);
    }
  };

  // Helper: format local date to YYYY-MM-DD (timezone-safe)
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // *** NEW: Handle Delete Function ***
  const handleDelete = () => {
    if (!subject || !selectedDate || !isEditing || deleting || saving) return;

    Alert.alert(
      "Clear Attendance",
      `Remove attendance for ${subject.name} on ${toLocalYMD(selectedDate)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            let success = false;
            let message = '';
            const dateStr = toLocalYMD(selectedDate);
            try {
              success = await deleteAttendance(subject.id, dateStr);
              message = success ? 'Attendance cleared!' : 'Failed to clear';
            } catch (err: unknown) {
              console.error("Error deleting attendance:", err);
              message = err instanceof Error ? `Error: ${err.message}` : 'Unknown error clearing';
              success = false;
            } finally {
              setDeleting(false);
              if (success && onSuccess) onSuccess(message);
              else if (!success && onError) onError(message);
              else if (!success) showInternalToast(message, 'error'); // Fallback
              if (success) setTimeout(handleClose, 800);
            }
          }
        }
      ]
    );
  };

  const getStatusIcon = (status: AttendanceStatus) => {
     switch (status) {
      case 'Present': return { icon: 'checkmark-circle' as const, color: '#10b981' };
      case 'Absent': return { icon: 'close-circle' as const, color: '#ef4444' };
      case 'OD': return { icon: 'briefcase' as const, color: '#f59e0b' };
      case 'Holiday': return { icon: 'home' as const, color: '#3b82f6' };
      default: return { icon: 'help-circle' as const, color: '#6b7280' };
    }
  };

  if (!subject) return null;
  const displayDate = selectedDate || new Date();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
          <View style={styles.handleBar} />

          {/* Internal Toast Area */}
          <Animated.View style={[ styles.internalToast, { transform: [{ translateY: internalToastAnim }] }, internalToastType === 'error' ? styles.toastError : styles.toastSuccess ]}>
            <Ionicons name={internalToastType === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color="#ffffff" />
            <Text style={styles.toastText}>{internalToastMsg}</Text>
          </Animated.View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{isEditing ? "Edit Attendance" : "Mark Attendance"}</Text>
              <Text style={styles.subtitle}>{subject.name}</Text>
              <View style={styles.metaRow}>
                 <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                 <Text style={styles.metaText}> {displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={28} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Status Options */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionLabel}>Select Status</Text>
            <View style={styles.statusGrid}>
              {ATTENDANCE_STATUSES.map((status) => {
                const { icon, color } = getStatusIcon(status);
                const isSelected = selectedStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[ styles.statusCard, isSelected && { borderColor: color, backgroundColor: `${color}20` } ]}
                    onPress={() => setSelectedStatus(status)}
                    activeOpacity={0.7}
                    disabled={saving || deleting}
                  >
                    <View style={[styles.statusIconContainer, { backgroundColor: `${color}20` }]}>
                      <Ionicons name={icon} size={32} color={color} />
                    </View>
                    <Text style={[styles.statusCardText, isSelected && { color, fontWeight: '700' }]}> {status} </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {/* Delete Button - Conditionally Rendered */}
            {isEditing && (
              <TouchableOpacity style={[styles.deleteButton, (deleting || saving) && styles.buttonDisabled]} onPress={handleDelete} disabled={deleting || saving} activeOpacity={0.8}>
                {deleting ? ( <ActivityIndicator color="#ef4444" size="small" /> ) : ( <Ionicons name="trash-outline" size={20} color="#ef4444" /> )}
                <Text style={styles.deleteButtonText}> {deleting ? 'Clearing...' : 'Clear'} </Text>
              </TouchableOpacity>
            )}
            {/* Save/Mark Button */}
            <TouchableOpacity style={[styles.saveButton, !selectedStatus && styles.buttonDisabled, isEditing && styles.saveButtonFlex]} onPress={handleSave} disabled={!selectedStatus || saving || deleting} activeOpacity={0.8}>
              {saving ? ( <ActivityIndicator color="#ffffff" size="small" /> ) : ( <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" /> )}
              <Text style={styles.saveButtonText}> {saving ? 'Saving...' : (isEditing ? 'Update' : 'Mark')} </Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
};

// --- Styles (Keep styles from the previous response) ---
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker overlay
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject, // Make backdrop cover entire screen
  },
  bottomSheet: {
    backgroundColor: '#1a1a1a', // Dark background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12, // Reduced top padding
    paddingBottom: 40, // Space for buttons and safe area
    minHeight: BOTTOM_SHEET_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#262626', // Subtle border
    shadowColor: '#000', // Add shadow for elevation effect
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#4b5563', // Grey handle bar
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16, // Space below handle
  },
    internalToast: { // For toast inside the sheet
    position: 'absolute',
    top: 10, // Position it near the top handle
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10, // Ensure it's above other content
     minHeight: 48, // Ensure consistent height
  },
  toastSuccess: { backgroundColor: '#10b981' }, // Keep existing toast colors
  toastError: { backgroundColor: '#ef4444' },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1, // Allow text to wrap
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align items to the top
    marginBottom: 24, // Space below header
  },
  headerLeft: {
    flex: 1, // Allow text to take space
    marginRight: 16, // Space before close button
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b5cf6', // Accent color for subject
    fontWeight: '600',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.8, // Slightly fade meta info
  },
  metaText: {
    fontSize: 13,
    color: '#9ca3af', // Lighter grey
  },
   closeBtn: {
     padding: 4, // Add padding for easier tap target
     marginTop: -4, // Adjust vertical alignment slightly
  },
  // Removed dateContainer styles

  statusSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 16, // Increased space
    textTransform: 'uppercase', // Uppercase label
    letterSpacing: 0.5,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // justifyContent: 'space-between', // Use gap for spacing
    gap: 12, // Gap between cards
  },
  statusCard: { // Revised card style
    flexBasis: '47%', // Fit two cards per row with gap
    backgroundColor: '#262626',
    borderRadius: 16, // More rounded
    paddingVertical: 20, // Vertical padding
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3a', // Default border color
    aspectRatio: 1, // Make cards square-ish
    minHeight: 110, // Minimum height if content is short
  },
  statusIconContainer: { // Container for the icon itself
     width: 48,
     height: 48,
     borderRadius: 24,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 12, // Space below icon
  },
  statusCardText: { // Text below the icon
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff', // Default text color
    marginTop: 4,
  },
   actionButtonsContainer: { // Container for Save and Delete buttons
    flexDirection: 'row',
    gap: 12,
    marginTop: 16, // Add margin above buttons
  },
  saveButton: {
    flex: 1, // Take full width if no delete button
    flexDirection: 'row', // Icon and text side-by-side
    backgroundColor: '#8b5cf6',
    paddingVertical: 16, // Consistent padding
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center', // Center content
    gap: 8,
  },
   saveButtonFlex: {
    flex: 2, // Take more space when delete is present
  },
  buttonDisabled: { // General disabled style for buttons
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: { // Style for the new delete button
    flex: 1, // Take up available space
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // Red tint background
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)', // Red border
  },
  deleteButtonText: {
    color: '#ef4444', // Red text
    fontSize: 16,
    fontWeight: '700',
  },
});

export default QuickMarkBottomSheet;