import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Subject, AttendanceRecord } from '@/types/subjects';

interface SubjectsContextType {
  subjects: Subject[];
  addSubject: (subject: Subject) => void;
  updateSubject: (id: number, updates: Partial<Subject>) => void;
  addAttendance: (subjectId: number, record: AttendanceRecord) => void;
  updateAttendance: (subjectId: number, recordIndex: number, status: AttendanceRecord['status']) => void;
  getSubjectById: (id: number) => Subject | undefined;
}

const SubjectsContext = createContext<SubjectsContextType | undefined>(undefined);

// Initial mock data
const initialSubjects: Subject[] = [
  {
    id: 1,
    name: 'Oral Pathology',
    staffName: 'Dr. Kumar',
    minAttendance: 75,
    days: ['Mon', 'Wed', 'Fri'],
    timeSlot: '7:45 AM',
    classType: 'Lecture',
    history: [
      { date: '2025-10-02', status: 'Present' },
      { date: '2025-10-04', status: 'Absent' },
      { date: '2025-10-09', status: 'Present' },
    ],
  },
  {
    id: 2,
    name: 'Crown & Bridge',
    staffName: 'Dr. Sharma',
    minAttendance: 75,
    days: ['Tue', 'Thu'],
    timeSlot: '9:00 AM',
    classType: 'Lab',
    history: [],
  },
  {
    id: 3,
    name: 'Prosthodontics',
    staffName: 'Dr. Patel',
    minAttendance: 75,
    days: ['Mon', 'Tue', 'Thu'],
    timeSlot: '11:00 AM',
    classType: 'Lecture',
    history: [],
  },
];

export const SubjectsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);

  const addSubject = (subject: Subject) => {
    setSubjects(prev => [...prev, subject]);
  };

  const updateSubject = (id: number, updates: Partial<Subject>) => {
    setSubjects(prev =>
      prev.map(subject =>
        subject.id === id ? { ...subject, ...updates } : subject
      )
    );
  };

  const addAttendance = (subjectId: number, record: AttendanceRecord) => {
    setSubjects(prev =>
      prev.map(subject =>
        subject.id === subjectId
          ? { ...subject, history: [...subject.history, record] }
          : subject
      )
    );
  };

  const updateAttendance = (
    subjectId: number,
    recordIndex: number,
    status: AttendanceRecord['status']
  ) => {
    setSubjects(prev =>
      prev.map(subject => {
        if (subject.id === subjectId) {
          const newHistory = [...subject.history];
          newHistory[recordIndex] = { ...newHistory[recordIndex], status };
          return { ...subject, history: newHistory };
        }
        return subject;
      })
    );
  };

  const getSubjectById = (id: number) => {
    return subjects.find(subject => subject.id === id);
  };

  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        addSubject,
        updateSubject,
        addAttendance,
        updateAttendance,
        getSubjectById,
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