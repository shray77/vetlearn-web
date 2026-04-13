import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  StudentProfile,
  ClinicalCase,
  AssessmentResult,
  TutorMessage,
  Resource,
  LearningPathItem,
} from './types';

const DEFAULT_PROFILE: StudentProfile = {
  id: 'demo-student-1',
  name: 'Студент',
  level: 1,
  xp: 0,
  xpToNext: 100,
  streak: 0,
  streakLastDate: new Date().toISOString().split('T')[0],
  skillMap: {},
  completedCases: 0,
  totalAnswers: 0,
  correctAnswers: 0,
  learningPath: [],
  assessmentsCompleted: 0,
  joinedDate: new Date().toISOString().split('T')[0],
};

interface VetLearnStore {
  // Profile
  profile: StudentProfile;
  updateProfile: (updates: Partial<StudentProfile>) => void;
  addXP: (amount: number) => void;
  updateStreak: () => void;

  // Assessment
  currentAssessment: AssessmentResult | null;
  setCurrentAssessment: (assessment: AssessmentResult | null) => void;
  assessmentHistory: AssessmentResult[];
  addAssessmentToHistory: (assessment: AssessmentResult) => void;

  // Clinical Cases
  currentCase: ClinicalCase | null;
  setCurrentCase: (case_: ClinicalCase | null) => void;
  caseHistory: ClinicalCase[];
  addCaseToHistory: (case_: ClinicalCase) => void;

  // Tutor
  tutorMessages: TutorMessage[];
  addTutorMessage: (message: TutorMessage) => void;
  clearTutorMessages: () => void;

  // Resources
  resources: Resource[];
  setResources: (resources: Resource[]) => void;
  bookmarkedResources: string[];
  toggleBookmark: (resourceId: string) => void;

  // Learning Path
  updateLearningPath: (path: LearningPathItem[]) => void;

  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAssessmentActive: boolean;
  setIsAssessmentActive: (active: boolean) => void;
  isCaseActive: boolean;
  setIsCaseActive: (active: boolean) => void;

  // Skill Map
  updateSkillMap: (updates: Record<string, number>) => void;
  setSkillMap: (updates: Record<string, number>) => void;

  // Clear all data
  clearAllData: () => void;
}

export const useStore = create<VetLearnStore>()(
  persist(
    (set, get) => ({
      // Profile
      profile: DEFAULT_PROFILE,
      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      addXP: (amount) =>
        set((state) => {
          const newXP = state.profile.xp + amount;
          const level = Math.floor(newXP / 100) + 1;
          const xpToNext = ((level) * 100) - newXP;
          return {
            profile: {
              ...state.profile,
              xp: newXP,
              level,
              xpToNext: xpToNext > 0 ? xpToNext : 100,
            },
          };
        }),
      updateStreak: () =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const lastDate = state.profile.streakLastDate;
          if (lastDate === today) return state;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const newStreak = lastDate === yesterdayStr ? state.profile.streak + 1 : 1;
          return {
            profile: {
              ...state.profile,
              streak: newStreak,
              streakLastDate: today,
            },
          };
        }),

      // Assessment
      currentAssessment: null,
      setCurrentAssessment: (assessment) => set({ currentAssessment: assessment }),
      assessmentHistory: [],
      addAssessmentToHistory: (assessment) =>
        set((state) => ({
          assessmentHistory: [assessment, ...state.assessmentHistory].slice(0, 20),
          currentAssessment: assessment,
          profile: {
            ...state.profile,
            assessmentsCompleted: state.profile.assessmentsCompleted + 1,
          },
        })),

      // Clinical Cases
      currentCase: null,
      setCurrentCase: (case_) => set({ currentCase: case_ }),
      caseHistory: [],
      addCaseToHistory: (case_) =>
        set((state) => ({
          caseHistory: [case_, ...state.caseHistory].slice(0, 50),
          currentCase: case_,
        })),

      // Tutor
      tutorMessages: [],
      addTutorMessage: (message) =>
        set((state) => ({
          tutorMessages: [...state.tutorMessages, message],
        })),
      clearTutorMessages: () => set({ tutorMessages: [] }),

      // Resources
      resources: [],
      setResources: (resources) => set({ resources }),
      bookmarkedResources: [],
      toggleBookmark: (resourceId) =>
        set((state) => ({
          bookmarkedResources: state.bookmarkedResources.includes(resourceId)
            ? state.bookmarkedResources.filter((id) => id !== resourceId)
            : [...state.bookmarkedResources, resourceId],
        })),

      // Learning Path
      updateLearningPath: (path) =>
        set((state) => ({
          profile: { ...state.profile, learningPath: path },
        })),

      // UI State
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      isAssessmentActive: false,
      setIsAssessmentActive: (active) => set({ isAssessmentActive: active }),
      isCaseActive: false,
      setIsCaseActive: (active) => set({ isCaseActive: active }),

      // Skill Map (averages with existing)
      updateSkillMap: (updates) =>
        set((state) => {
          const newSkillMap = { ...state.profile.skillMap };
          for (const [key, value] of Object.entries(updates)) {
            const current = newSkillMap[key] || 0;
            newSkillMap[key] = Math.min(100, Math.max(0, Math.round((current + value) / 2)));
          }
          return {
            profile: { ...state.profile, skillMap: newSkillMap },
          };
        }),

      // Skill Map (direct set — for admin)
      setSkillMap: (updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            skillMap: { ...state.profile.skillMap, ...updates },
          },
        })),

      // Clear all data
      clearAllData: () =>
        set({
          profile: DEFAULT_PROFILE,
          currentAssessment: null,
          assessmentHistory: [],
          currentCase: null,
          caseHistory: [],
          tutorMessages: [],
          resources: [],
          bookmarkedResources: [],
          activeTab: 'dashboard',
          isAssessmentActive: false,
          isCaseActive: false,
        }),
    }),
    {
      name: 'vetlearn-storage',
      version: 2,
    }
  )
);
