export interface AttendanceRecord {
  date: string;
  status: 'Present' | 'Absent' | 'On Duty' | 'Holiday';
}

export interface Subject {
  id: number;
  name: string;
  staffName: string;
  minAttendance: number;
  days: string[];
  timeSlot: string;
  classType: 'Lecture' | 'Lab' | 'OPD';
  history: AttendanceRecord[];
}

export interface SubjectStats {
  attended: number;
  total: number;
  absent: number;
  percentage: number;
  safeToSkip: number;
}