// types/supabase.ts

// Database interfaces matching your Supabase schema exactly
export interface DbUser {
  id: string; // UUID -> string in JS/TS
  auth_id: string; // UUID -> string in JS/TS
  name: string;
  email: string;
  attendance_target: number;
  profile_picture_url: string | null;
  created_at: string; // Timestamptz -> string
  updated_at: string; // Timestamptz -> string
}

export interface DbSubject {
  id: string; // UUID -> string
  user_id: string; // UUID -> string
  subject_name: string;
  staff_name: string | null;
  subject_type: 'Lecture' | 'Lab' | 'OPD';
  required_attendance_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface DbTimetableSlot {
  id: string; // UUID -> string
  user_id: string; // UUID -> string
  subject_id: string; // UUID -> string
  day_of_week: number; // 1-7 (1=Monday, 7=Sunday)
  slot_number: number; // 1-4
  created_at: string;
  updated_at: string;
}

export interface DbAttendanceRecord {
  id: string; // UUID -> string
  user_id: string; // UUID -> string
  subject_id: string; // UUID -> string
  date: string; // Date -> string (YYYY-MM-DD)
  status: 'Present' | 'Absent' | 'Holiday' | 'OD';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Client-side interfaces for the app
export interface AppAttendanceRecord {
  date: string;
  status: 'Present' | 'Absent' | 'Holiday' | 'OD';
  notes: string | null;
}

export interface AppSubject {
  id: string;
  name: string;
  staffName: string;
  minAttendance: number;
  days: string[]; // e.g., ['Mon', 'Wed'] derived from DbTimetableSlot
  timeSlot: string; // e.g., 'Slot 1' derived from DbTimetableSlot
  classType: 'Lecture' | 'Lab' | 'OPD';
  history: AppAttendanceRecord[];
}

export interface AppUserProfile {
  id: string;
  name: string;
  email: string;
  attendanceTarget: number;
  profilePictureUrl: string | null;
  // Additional fields for the app
  course?: string;
  year?: string;
  institution?: string;
  studentId?: string;
}

// Helper types for API responses
export interface CreateSubjectData {
  subject_name: string;
  staff_name: string | null;
  subject_type: 'Lecture' | 'Lab' | 'OPD';
  required_attendance_percentage: number;
  timetable_slots: {
    day_of_week: number;
    slot_number: number;
  }[];
}

export interface UpdateSubjectData {
  subject_name?: string;
  staff_name?: string | null;
  subject_type?: 'Lecture' | 'Lab' | 'OPD';
  required_attendance_percentage?: number;
}

export interface CreateAttendanceRecordData {
  subject_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Holiday' | 'OD';
  notes?: string | null;
}

