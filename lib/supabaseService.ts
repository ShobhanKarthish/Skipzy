import {
  AppAttendanceRecord,
  AppSubject,
  AppUserProfile,
  CreateAttendanceRecordData,
  CreateSubjectData,
  UpdateSubjectData
} from '@/types/supabase';
import { supabase } from './supabase';

// Helper functions
const dayNumberToName = (dayNumber: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayNumber - 1] || 'Unknown';
};

const slotNumberToName = (slotNumber: number): string => {
  return `Slot ${slotNumber}`;
};

// User operations
export const userService = {
  // Get current user profile
  async getCurrentUser(): Promise<AppUserProfile | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        attendanceTarget: data.attendance_target,
        profilePictureUrl: data.profile_picture_url,
      };
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(updates: Partial<AppUserProfile>): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.attendanceTarget !== undefined) updateData.attendance_target = updates.attendanceTarget;
      if (updates.profilePictureUrl !== undefined) updateData.profile_picture_url = updates.profilePictureUrl;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('auth_id', user.id);

      if (error) {
        console.error('Error updating user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return false;
    }
  },
};

// Subject operations
export const subjectService = {
  // Get all subjects for current user with timetable slots and attendance records
  async getSubjects(): Promise<AppSubject[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return [];

      // Get subjects first
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: true });

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        return [];
      }

      // If no subjects, return empty array immediately
      if (!subjects || subjects.length === 0) {
        return [];
      }

      // Execute timetable slots and attendance records queries in parallel
      const subjectIds = subjects.map(s => s.id);
      const [timetableSlotsResult, attendanceRecordsResult] = await Promise.all([
        supabase
          .from('timetable_slots')
          .select('subject_id, day_of_week, slot_number')
          .in('subject_id', subjectIds),
        supabase
          .from('attendance_records')
          .select('subject_id, date, status, notes')
          .in('subject_id', subjectIds)
          .order('date', { ascending: false })
      ]);

      const timetableSlots = timetableSlotsResult.data || [];
      const attendanceRecords = attendanceRecordsResult.data || [];

      // Transform data to AppSubject format
      const transformedSubjects = subjects.map(subject => {
        // Get timetable slots for this subject
        const subjectTimetableSlots = timetableSlots.filter(slot => slot.subject_id === subject.id);
        const days = subjectTimetableSlots.map(slot => dayNumberToName(slot.day_of_week));
        const timeSlot = subjectTimetableSlots.length > 0 ? slotNumberToName(subjectTimetableSlots[0].slot_number) : '';

        const subjectAttendanceRecords = attendanceRecords
          .filter(record => record.subject_id === subject.id)
          .map(record => ({
            date: record.date,
            status: record.status,
            notes: record.notes,
          }));

        return {
          id: subject.id,
          name: subject.subject_name,
          staffName: subject.staff_name || '',
          minAttendance: subject.required_attendance_percentage,
          days: [...new Set(days)] as string[], // Remove duplicates and ensure string array
          timeSlot,
          classType: subject.subject_type,
          history: subjectAttendanceRecords,
        };
      });
      
      return transformedSubjects;
    } catch (error) {
      console.error('Error in getSubjects:', error);
      return [];
    }
  },

  // Create a new subject
  async createSubject(subjectData: CreateSubjectData): Promise<string | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return null;

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return null;

      // Create subject
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          user_id: userData.id,
          subject_name: subjectData.subject_name,
          staff_name: subjectData.staff_name,
          subject_type: subjectData.subject_type,
          required_attendance_percentage: subjectData.required_attendance_percentage,
        })
        .select('id')
        .single();

      if (subjectError) {
        console.error('Error creating subject:', subjectError);
        return null;
      }

      // Create timetable slots
      if (subjectData.timetable_slots.length > 0) {
        const slotsData = subjectData.timetable_slots.map(slot => ({
          user_id: userData.id,
          subject_id: subject.id,
          day_of_week: slot.day_of_week,
          slot_number: slot.slot_number,
        }));

        const { error: slotsError } = await supabase
          .from('timetable_slots')
          .insert(slotsData);

        if (slotsError) {
          console.error('Error creating timetable slots:', slotsError);
          // Don't return null here, subject was created successfully
        }
      }

      return subject.id;
    } catch (error) {
      console.error('Error in createSubject:', error);
      return null;
    }
  },

  // Update a subject
  async updateSubject(subjectId: string, updates: UpdateSubjectData): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return false;

      const { error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', subjectId)
        .eq('user_id', userData.id);

      if (error) {
        console.error('Error updating subject:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSubject:', error);
      return false;
    }
  },

  // Delete a subject
  async deleteSubject(subjectId: string): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return false;

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId)
        .eq('user_id', userData.id);

      if (error) {
        console.error('Error deleting subject:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSubject:', error);
      return false;
    }
  },
};

// Attendance operations
export const attendanceService = {
  // Add attendance record
  async addAttendanceRecord(recordData: CreateAttendanceRecordData): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return false;

      const { error } = await supabase
        .from('attendance_records')
        .insert({
          user_id: userData.id,
          subject_id: recordData.subject_id,
          date: recordData.date,
          status: recordData.status,
          notes: recordData.notes || null,
        });

      if (error) {
        console.error('Error adding attendance record:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addAttendanceRecord:', error);
      return false;
    }
  },

  // Update attendance record
  async updateAttendanceRecord(
    subjectId: string,
    date: string,
    status: 'Present' | 'Absent' | 'Holiday' | 'OD',
    notes?: string | null
  ): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return false;

      const { error } = await supabase
        .from('attendance_records')
        .update({
          status,
          notes: notes || null,
        })
        .eq('user_id', userData.id)
        .eq('subject_id', subjectId)
        .eq('date', date);

      if (error) {
        console.error('Error updating attendance record:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateAttendanceRecord:', error);
      return false;
    }
  },

  // Delete attendance record
  async deleteAttendanceRecord(subjectId: string, date: string): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return false;

      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('user_id', userData.id)
        .eq('subject_id', subjectId)
        .eq('date', date);

      if (error) {
        console.error('Error deleting attendance record:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAttendanceRecord:', error);
      return false;
    }
  },

  // Get attendance records for a specific subject
  async getAttendanceRecords(subjectId: string): Promise<AppAttendanceRecord[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];

      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('date, status, notes')
        .eq('user_id', userData.id)
        .eq('subject_id', subjectId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance records:', error);
        return [];
      }

      return data.map(record => ({
        date: record.date,
        status: record.status,
        notes: record.notes,
      }));
    } catch (error) {
      console.error('Error in getAttendanceRecords:', error);
      return [];
    }
  },
};

// Auth operations
export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string, name: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;

      // Create user profile immediately after successful signup
      if (data.user) {
        try {
          await supabase
            .from('users')
            .insert({
              auth_id: data.user.id,
              name: name,
              email: email,
              attendance_target: 75, // Default value
            });
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't fail the signup if profile creation fails
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { data: null, error };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { data: null, error };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error in signOut:', error);
      return { error };
    }
  },

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'skipzy://reset-password',
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { error };
    }
  },

  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error in getSession:', error);
      return { data: null, error };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
