import { useSubjects } from '@/contexts/SubjectsContext';
import { AppAttendanceRecord, AppSubject } from '@/types/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

type AttendanceStatus = 'Present' | 'Absent' | 'OD' | 'Holiday';

interface QuickMarkBottomSheetProps {
  visible: boolean;
  subject: AppSubject | null;
  selectedDate?: Date | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'OD', 'Holiday'];

const QuickMarkBottomSheet: React.FC<QuickMarkBottomSheetProps> = ({
  visible,
  subject,
  selectedDate,
  onClose,
  onSuccess,
}) => {
  const { addAttendance } = useSubjects();
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
      setSelectedStatus(null);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
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

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.timing(toastAnim, {
      toValue: 20,
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

  const handleSave = async () => {
    if (!subject || !selectedStatus) {
      showToast('Please select an attendance status');
      return;
    }

    setSaving(true);
    // Use selectedDate if provided, otherwise use today
    const dateToMark = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Check if already marked
    const alreadyMarked = subject.history.some(record => record.date === dateToMark);
    if (alreadyMarked) {
      showToast('Attendance already marked for this date');
      setSaving(false);
      return;
    }

    const record: AppAttendanceRecord = {
      date: dateToMark,
      status: selectedStatus,
      notes: null,
    };

    const success = await addAttendance(subject.id, record);
    
    if (success) {
      showToast('Attendance marked successfully!');
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } else {
      showToast('Failed to mark attendance');
    }
    
    setSaving(false);
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return { icon: 'checkmark-circle' as const, color: '#10b981' };
      case 'Absent':
        return { icon: 'close-circle' as const, color: '#ef4444' };
      case 'OD':
        return { icon: 'briefcase' as const, color: '#f59e0b' };
      case 'Holiday':
        return { icon: 'home' as const, color: '#3b82f6' };
    }
  };

  if (!subject) return null;

  const displayDate = selectedDate || new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Toast */}
          {toastMessage && (
            <Animated.View
              style={[
                styles.toast,
                { transform: [{ translateY: toastAnim }] },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </Animated.View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Mark Attendance</Text>
              <Text style={styles.subtitle}>{subject.name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{subject.staffName}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.metaText}>{subject.timeSlot}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Date Display */}
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
            <Text style={styles.dateText}>
              {displayDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
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
                    style={[
                      styles.statusCard,
                      isSelected && { borderColor: color, backgroundColor: `${color}10` },
                    ]}
                    onPress={() => setSelectedStatus(status)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusIcon, { backgroundColor: `${color}20` }]}>
                      <Ionicons name={icon} size={24} color={color} />
                    </View>
                    <Text style={[styles.statusText, isSelected && { color }]}>
                      {status}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: color }]}>
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              !selectedStatus && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!selectedStatus || saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Mark Attendance'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: BOTTOM_SHEET_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#3a3a3a',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
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
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaDot: {
    color: '#4b5563',
    marginHorizontal: 4,
  },
  closeBtn: {
    padding: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 15,
    color: '#ffffff',
    flex: 1,
    fontWeight: '500',
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    alignItems: 'center',
    position: 'relative',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default QuickMarkBottomSheet;