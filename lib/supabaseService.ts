import {
  AppAttendanceRecord,
  AppSubject,
  AppTimetableEntry,
  AppUserProfile,
  CreateAttendanceRecordData
} from '@/types/supabase';
import { supabase } from './supabase';

type AuthResponse<T = any> = {
  data: T | null;
  error: { message: string } | null;
};

// Helper functions
// Database stores: 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday, 1=Sunday
// This matches JavaScript Date.getDay() + 1 where getDay() returns 0=Sunday, 1=Monday, etc.
const dayNumberToName = (dayNumber: number): string => {
  const dayMap: Record<number, string> = {
    1: 'Sun',
    2: 'Mon',
    3: 'Tue',
    4: 'Wed',
    5: 'Thu',
    6: 'Fri',
    7: 'Sat'
  };
  return dayMap[dayNumber] || 'Unknown';
};

const slotNumberToTimeSlot = (slotNumber: number): string => {
  const slots: Record<number, string> = {
    1: '7:45 AM - 8:45 AM',
    2: '8:45 AM - 9:45 AM',
    3: '9:45 AM - 1:30 PM',
    4: '2:15 PM - 3:15 PM',
  };
  return slots[slotNumber] || 'Unknown';
};

// Get month start and end dates for any month
const getMonthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

// Get current month start and end dates
const getCurrentMonthRange = () => {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth());
};

// User operations
export const userService = {
  // Get current user profile
  async getCurrentUser(): Promise<AppUserProfile | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return null;

      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!data) {
        const name = (user.user_metadata && (user.user_metadata.name as string)) || user.email?.split('@')[0] || 'User';
        const insertRes = await supabase
          .from('users')
          .insert({ auth_id: user.id, name, email: user.email ?? '' })
          .select('*')
          .maybeSingle();
        if (insertRes.error) {
          // If duplicate key (trigger already created it), re-fetch
          if (insertRes.error.code === '23505') {
            const refetch = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', user.id)
              .maybeSingle();
            data = refetch.data as any;
          } else {
            console.error('Error creating user profile:', insertRes.error);
            return null;
          }
        } else {
          data = insertRes.data as any;
        }
      }

      if (error) {
        console.error('Error fetching user:', error);
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

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return false;

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
  // Get all subjects with timetable slots and attendance records for a specific month
  async getSubjects(year?: number, month?: number): Promise<AppSubject[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];

      // Ensure user profile exists
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!userData) {
        const name = (user.user_metadata && (user.user_metadata.name as string)) || user.email?.split('@')[0] || 'User';
        const insertRes = await supabase
          .from('users')
          .insert({ auth_id: user.id, name, email: user.email ?? '' })
          .select('id')
          .maybeSingle();
        if (insertRes.error) {
          // If duplicate key (trigger already created it), re-fetch
          if (insertRes.error.code === '23505') {
            const refetch = await supabase
              .from('users')
              .select('id')
              .eq('auth_id', user.id)
              .maybeSingle();
            userData = refetch.data as any;
          } else {
            console.error('Error ensuring user profile exists:', insertRes.error);
            return [];
          }
        } else {
          userData = insertRes.data;
        }
      }

      // Ensure userData is not null before proceeding
      if (!userData) {
        console.error('Failed to get or create user profile');
        return [];
      }

      // Get all subjects (fixed timetable)
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('subject_name', { ascending: true });

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        return [];
      }

      if (!subjects || subjects.length === 0) {
        return [];
      }

      const subjectIds = subjects.map(s => s.id);
      
      // Use provided year/month or default to current month
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth();
      const monthRange = getMonthRange(targetYear, targetMonth);

      // Execute timetable slots and attendance records queries in parallel
      const [timetableSlotsResult, attendanceRecordsResult] = await Promise.all([
        supabase
          .from('timetable_slots')
          .select('subject_id, day_of_week, slot_number')
          .in('subject_id', subjectIds),
        supabase
          .from('attendance_records')
          .select('subject_id, date, status, notes')
          .eq('user_id', userData.id)
          .in('subject_id', subjectIds)
          .gte('date', monthRange.start)
          .lte('date', monthRange.end)
          .order('date', { ascending: false })
      ]);

      const timetableSlots = timetableSlotsResult.data || [];
      const attendanceRecords = attendanceRecordsResult.data || [];

      // Transform data to AppSubject format
      const transformedSubjects = subjects.map(subject => {
        const subjectTimetableSlots = timetableSlots.filter(slot => slot.subject_id === subject.id);
        
        // Create detailed schedule array
        const schedule: AppTimetableEntry[] = subjectTimetableSlots.map(slot => ({
          day: dayNumberToName(slot.day_of_week),
          slotNumber: slot.slot_number,
          timeString: slotNumberToTimeSlot(slot.slot_number),
        }));

        // For backward compatibility, keep days and timeSlot
        const days = subjectTimetableSlots.map(slot => dayNumberToName(slot.day_of_week));
        const timeSlot = subjectTimetableSlots.length > 0 
          ? slotNumberToTimeSlot(subjectTimetableSlots[0].slot_number) 
          : '';

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
          minAttendance: 75, // Default minimum attendance
          days: [...new Set(days)] as string[],
          timeSlot,
          classType: subject.subject_type,
          history: subjectAttendanceRecords,
          schedule: schedule, // Add the detailed schedule
        };
      });
      
      return transformedSubjects;
    } catch (error) {
      console.error('Error in getSubjects:', error);
      return [];
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

      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!userData) {
        const name = (user.user_metadata && (user.user_metadata.name as string)) || user.email?.split('@')[0] || 'User';
        const insertRes = await supabase
          .from('users')
          .insert({ auth_id: user.id, name, email: user.email ?? '' })
          .select('id')
          .maybeSingle();
        if (insertRes.error) {
          // If duplicate key (trigger already created it), re-fetch
          if (insertRes.error.code === '23505') {
            const refetch = await supabase
              .from('users')
              .select('id')
              .eq('auth_id', user.id)
              .maybeSingle();
            userData = refetch.data as any;
          } else {
            console.error('Error ensuring user profile exists:', insertRes.error);
            return false;
          }
        } else {
          userData = insertRes.data;
        }
      }

      // Ensure userData is not null before proceeding
      if (!userData) {
        console.error('Failed to get or create user profile');
        return false;
      }

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

  // Get attendance records for a specific subject and month
  async getAttendanceRecords(subjectId: string, year?: number, month?: number): Promise<AppAttendanceRecord[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return [];

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) return [];

      // Use provided year/month or default to current month
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth();
      const monthRange = getMonthRange(targetYear, targetMonth);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('date, status, notes')
        .eq('user_id', userData.id)
        .eq('subject_id', subjectId)
        .gte('date', monthRange.start)
        .lte('date', monthRange.end)
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
  async signUp(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;

      // Profile is created by DB trigger on auth.users insert
      // No need to manually insert here

      return { data, error: null };
    } catch (error: any) {
      console.error('Error in signUp:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'An error occurred during sign up' 
        } 
      };
    }
  },

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

  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'skipzy://reset-password',
      });

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { 
        data: null,
        error: { message: errorMessage } 
      };
    }
  },

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

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};