import { attendanceService, authService, subjectService } from '@/lib/supabaseService';
import { AppAttendanceRecord, AppSubject, CreateSubjectData, UpdateSubjectData } from '@/types/supabase';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface SubjectsContextType {
  subjects: AppSubject[];
  loading: boolean;
  error: string | null;
  addSubject: (subjectData: CreateSubjectData) => Promise<boolean>;
  updateSubject: (id: string, updates: UpdateSubjectData) => Promise<boolean>;
  deleteSubject: (id: string) => Promise<boolean>;
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

  // Load subjects from Supabase with simple caching
  const loadSubjects = async (forceRefresh = false) => {
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache
    
    // Use cache if data is fresh and not forcing refresh
    if (!forceRefresh && subjects.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await subjectService.getSubjects();
      setSubjects(data);
      setLastFetchTime(now);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Load subjects in background without blocking UI
        loadSubjects();
      } else if (event === 'SIGNED_OUT') {
        setSubjects([]);
        setError(null);
      }
    });

    // Load subjects on mount if user is already signed in
    const checkAuthAndLoad = async () => {
      const { data } = await authService.getSession();
      if (data?.session) {
        loadSubjects();
      }
    };
    
    checkAuthAndLoad();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addSubject = async (subjectData: CreateSubjectData): Promise<boolean> => {
    try {
      setError(null);
      const subjectId = await subjectService.createSubject(subjectData);
      
      if (subjectId) {
        // Create a temporary subject object for immediate UI update
        const tempSubject = {
          id: subjectId,
          name: subjectData.subject_name,
          staffName: subjectData.staff_name || '',
          minAttendance: subjectData.required_attendance_percentage,
          days: [], // Will be populated when we refresh
          timeSlot: '',
          classType: subjectData.subject_type,
          history: [],
        };
        
        // Add to local state immediately for better UX
        setSubjects(prev => [...prev, tempSubject]);
        
        // Refresh subjects in background to get complete data
        loadSubjects();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding subject:', err);
      setError('Failed to add subject');
      return false;
    }
  };

  const updateSubject = async (id: string, updates: UpdateSubjectData): Promise<boolean> => {
    try {
      setError(null);
      const success = await subjectService.updateSubject(id, updates);
      
      if (success) {
        // Refresh subjects to get the updated one
        await loadSubjects();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating subject:', err);
      setError('Failed to update subject');
      return false;
    }
  };

  const deleteSubject = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await subjectService.deleteSubject(id);
      
      if (success) {
        // Remove from local state immediately for better UX
        setSubjects(prev => prev.filter(subject => subject.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError('Failed to delete subject');
      return false;
    }
  };

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
        // Update local state immediately for better UX
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
        // Update local state immediately for better UX
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
    await loadSubjects(true); // Force refresh
  };

  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        loading,
        error,
        addSubject,
        updateSubject,
        deleteSubject,
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