import { useSubjects } from '@/contexts/SubjectsContext';
import { AppAttendanceRecord, AppSubject } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    PanResponderGestureState,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

type AttendanceStatus = 'Present' | 'Absent' | 'OD' | 'Holiday';

interface QuickMarkBottomSheetProps {
  visible: boolean;
  subject: AppSubject | null;
  selectedDate?: Date | null;
  isEditing?: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'OD', 'Holiday'];

const QuickMarkBottomSheet: React.FC<QuickMarkBottomSheetProps> = ({
  visible,
  subject,
  selectedDate,
  isEditing = false,
  onClose,
  onSuccess,
  onError,
}) => {
  const { addAttendance, updateAttendance, deleteAttendance } = useSubjects();
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  // Helper function to format date consistently
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Preselect status if editing
      if (isEditing && subject && selectedDate) {
        const dateToMatch = toLocalYMD(selectedDate);
        const existing = subject.history.find(r => r.date === dateToMatch);
        setSelectedStatus(existing ? (existing.status as AttendanceStatus) : null);
      } else {
        setSelectedStatus(null); // Reset for new entry
      }
    } else {
      // Animate out if not visible
      Animated.timing(translateY, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Reset status *after* animation completes
        setSelectedStatus(null);
      });
    }
    // Dependency includes ISO string to re-run effect if the date *instance* changes but represents the same day
  }, [visible, isEditing, subject, selectedDate?.toISOString()]);


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        return gestureState.dy > 5; // Only allow dragging down
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const newY = Math.max(0, gestureState.dy); // Prevent dragging up past initial position
        translateY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose(); // Trigger close animation and callback
        } else {
          // Snap back to open position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50, friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Function to handle closing animation and callback
  const handleClose = () => {
     // Check if already animating or closed - optional, but can prevent redundant calls
     // if (translateY === BOTTOM_SHEET_HEIGHT) return; // Note: Can't directly compare Animated.Value like this

    Animated.timing(translateY, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose(); // Call the callback *after* animation finishes
    });
  };

  const handleSave = async () => {
    if (saving || deleting || !subject || !selectedStatus) {
       if (!selectedStatus && onError) onError('Please select a status');
       else if (!selectedStatus) console.warn('Please select a status');
      return;
    }
    setSaving(true);
    const dateToMark = selectedDate ? toLocalYMD(selectedDate) : toLocalYMD(new Date());
    let success = false;
    let message = '';

    try {
      if (isEditing) {
        success = await updateAttendance(subject.id, dateToMark, selectedStatus);
        message = success ? 'Attendance updated!' : 'Failed to update';
      } else {
        const alreadyMarked = subject.history.some(record => record.date === dateToMark);
        if (alreadyMarked) {
          message = 'Already marked for this date';
          success = false; // Indicate not a successful *new* save
        } else {
          const record: AppAttendanceRecord = { date: dateToMark, status: selectedStatus, notes: null };
          success = await addAttendance(subject.id, record);
          message = success ? 'Attendance marked!' : 'Failed to mark';
        }
      }
    } catch (err: unknown) {
      console.error("Error saving attendance:", err);
      message = err instanceof Error ? `Error: ${err.message}` : 'Unknown error saving';
      success = false;
    } finally {
      setSaving(false);
      if (success && onSuccess) onSuccess(message);
      else if (!success && onError) onError(message); // Call onError for failures/errors

      if (success || message === 'Already marked for this date') { // Close even if already marked
         setTimeout(handleClose, 300); // Close after showing feedback
      }
    }
  };


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

               if (success) {
                   setTimeout(handleClose, 300); // Close after showing feedback
               }
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

  // Prevent rendering content if subject is not available
  if (!subject) return (
       <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
         {/* Render backdrop only to allow closing */}
         <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
         </View>
       </Modal>
   );

  const displayDate = selectedDate || new Date(); // Use current date if none selected

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {/* Backdrop closes the modal on press */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        {/* Bottom Sheet Content */}
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
          {/* Handle Bar for dragging */}
          <View style={styles.handleBar} />

          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{isEditing ? "Edit Attendance" : "Mark Attendance"}</Text>
              <Text style={styles.subtitle}>{subject.name}</Text>
              <View style={styles.metaRow}>
                 <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                 <Text style={styles.metaText}>
                   {/* Format date consistently */}
                   {displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                 </Text>
              </View>
            </View>
            {/* Close Button */}
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={28} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Status Selection Grid */}
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
                    disabled={saving || deleting} // Disable during operations
                  >
                    <View style={[styles.statusIconContainer, { backgroundColor: `${color}20` }]}>
                      <Ionicons name={icon} size={32} color={color} />
                    </View>
                    <Text style={[styles.statusCardText, isSelected && { color, fontWeight: '700' }]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons (Save/Update and Delete) */}
          <View style={styles.actionButtonsContainer}>
            {/* Delete Button (only shown when editing) */}
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

// Styles remain the same as previous response
const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    bottomSheet: {
      backgroundColor: '#1a1a1a',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40, // Increased padding for safe area / buttons
      minHeight: BOTTOM_SHEET_HEIGHT,
      borderTopWidth: 1,
      borderTopColor: '#262626',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 10,
    },
    handleBar: {
      width: 40,
      height: 5,
      backgroundColor: '#4b5563',
      borderRadius: 2.5,
      alignSelf: 'center',
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    headerLeft: {
      flex: 1,
      marginRight: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: '#8b5cf6',
      fontWeight: '600',
      marginBottom: 8,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      opacity: 0.8,
    },
    metaText: {
      fontSize: 13,
      color: '#9ca3af',
    },
     closeBtn: {
       padding: 4,
       marginTop: -4,
    },
    statusSection: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#9ca3af',
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statusCard: {
      flexBasis: '47%', // Aim for 2 columns with gap
      backgroundColor: '#262626',
      borderRadius: 16,
      paddingVertical: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#3a3a3a', // Default border
      aspectRatio: 1, // Make them square-ish
      minHeight: 110,
    },
    statusIconContainer: {
       width: 48,
       height: 48,
       borderRadius: 24,
       justifyContent: 'center',
       alignItems: 'center',
       marginBottom: 12,
    },
    statusCardText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
      marginTop: 4,
    },
     actionButtonsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    saveButton: {
      flex: 1, // Take full width if delete button isn't present
      flexDirection: 'row',
      backgroundColor: '#8b5cf6',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
     saveButtonFlex: {
      flex: 2, // Take more space when delete button is present
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },
    deleteButton: {
      flex: 1, // Take up remaining space
      flexDirection: 'row',
      backgroundColor: 'rgba(239, 68, 68, 0.15)', // Red tint
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
    // --- Styles for internal toast (kept for reference) ---
    internalToast: {
        position: 'absolute',
        top: 10,
        left: 20,
        right: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 10,
        minHeight: 48,
    },
    toastSuccess: { backgroundColor: '#10b981' },
    toastError: { backgroundColor: '#ef4444' },
    toastText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    // --- End Styles for internal toast ---
});

export default QuickMarkBottomSheet;