export { SubjectsProvider, useSubjects } from './SubjectsContext';
export { UserProfileProvider, useUserProfile } from './UserProfileContext';
// In UserProfileContext.tsx, add this line
export type { AppUserProfile } from '@/types/supabase';