import { attendanceService, authService, subjectService } from '@/lib/supabaseService';
import { AppAttendanceRecord, AppSubject } from '@/types/supabase';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface SubjectsContextType {
  subjects: AppSubject[];
  loading: boolean;
  error: string | null;
  selectedYear: number;
  selectedMonth: number;
  setMonthFilter: (year: number, month: number) => void;
  addAttendance: (subjectId: string, record: AppAttendanceRecord) => Promise<boolean>;
  updateAttendance: (subjectId: string, date: string, status: AppAttendanceRecord['status'], notes?: string | null) => Promise<boolean>;
  deleteAttendance: (subjectId: string, date: string) => Promise<boolean>;
  getSubjectById: (id: string) => AppSubject | undefined;
  refreshSubjects: () => Promise<void>;
}

const SubjectsContext = createContext<SubjectsContextType | undefined>(undefined);

export const SubjectsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<AppSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Month filter state (for history and subjects screens only - doesn't affect data fetching)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const setMonthFilter = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // Load subjects from Supabase with simple caching
  const loadSubjects = async (forceRefresh = false, showLoading = true) => {
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache
    
    // Use cache if data is fresh and not forcing refresh
    if (!forceRefresh && subjects.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      return;
    }
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const data = await subjectService.getSubjects();
      setSubjects(data);
      setLastFetchTime(now);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError('Failed to load subjects');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Load in background without blocking UI
        loadSubjects(false, false);
      } else if (event === 'SIGNED_OUT') {
        setSubjects([]);
        setError(null);
      }
    });

    const checkAuthAndLoad = async () => {
      const { data } = await authService.getSession();
      if (data?.session) {
        // Load in background without showing loading state on initial mount
        loadSubjects(false, false);
      }
    };
    
    checkAuthAndLoad();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addAttendance = async (subjectId: string, record: AppAttendanceRecord): Promise<boolean> => {
    try {
      setError(null);
      const success = await attendanceService.addAttendanceRecord({
        subject_id: subjectId,
        date: record.date,
        status: record.status,
        notes: record.notes,
      });
      
      if (success) {
        // Update local state immediately for better UX
        setSubjects(prev => 
          prev.map(subject => 
            subject.id === subjectId 
              ? { ...subject, history: [record, ...subject.history] }
              : subject
          )
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding attendance:', err);
      setError('Failed to add attendance record');
      return false;
    }
  };

  const updateAttendance = async (
    subjectId: string, 
    date: string, 
    status: AppAttendanceRecord['status'],
    notes?: string | null
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await attendanceService.updateAttendanceRecord(subjectId, date, status, notes);
      
      if (success) {
        setSubjects(prev => 
          prev.map(subject => 
            subject.id === subjectId 
              ? {
                  ...subject,
                  history: subject.history.map(record => 
                    record.date === date 
                      ? { ...record, status, notes: notes || null }
                      : record
                  )
                }
              : subject
          )
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError('Failed to update attendance record');
      return false;
    }
  };

  const deleteAttendance = async (subjectId: string, date: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await attendanceService.deleteAttendanceRecord(subjectId, date);
      
      if (success) {
        setSubjects(prev => 
          prev.map(subject => 
            subject.id === subjectId 
              ? {
                  ...subject,
                  history: subject.history.filter(record => record.date !== date)
                }
              : subject
          )
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting attendance:', err);
      setError('Failed to delete attendance record');
      return false;
    }
  };

  const getSubjectById = (id: string) => {
    return subjects.find(subject => subject.id === id);
  };

  const refreshSubjects = async () => {
    await loadSubjects(true);
  };

  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        loading,
        error,
        selectedYear,
        selectedMonth,
        setMonthFilter,
        addAttendance,
        updateAttendance,
        deleteAttendance,
        getSubjectById,
        refreshSubjects,
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
};

export const useSubjects = () => {
  const context = useContext(SubjectsContext);
  if (!context) {
    throw new Error('useSubjects must be used within SubjectsProvider');
  }
  return context;
};