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

// FIX #1: UTC timezone bug — use local date instead of toISOString
function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLocalYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

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

  // Placement Test
  savePlacementResult: (data: {
    level: 'beginner' | 'intermediate' | 'advanced';
    score: number;
    beginnerScore: number;
    intermediateScore: number;
    advancedScore: number;
    weakTopics: string[];
    strongTopics: string[];
    detailedStats: Record<string, { correct: number; total: number; topicName: string }>;
  }) => void;

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
          const xpToNext = (level) * 100 - newXP;
          return {
            profile: {
              ...state.profile,
              xp: newXP,
              level,
              xpToNext: xpToNext > 0 ? xpToNext : 100,
            },
          };
        }),
      // FIX #1: UTC → local date
      updateStreak: () =>
        set((state) => {
          const today = getLocalDateString();
          const lastDate = state.profile.streakLastDate;
          if (lastDate === today) return state;

          const yesterdayStr = getLocalYesterdayDateString();
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

      // Tutor — FIX #2: unbounded array → limit to 50 messages
      tutorMessages: [],
      addTutorMessage: (message) =>
        set((state) => ({
          tutorMessages: [...state.tutorMessages, message].slice(-50),
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

      // Placement Test
      savePlacementResult: (data) =>
        set((state) => {
          // Set initial skill map from placement results
          const initialSkillMap: Record<string, number> = {};
          for (const [topicId, topicStats] of Object.entries(data.detailedStats)) {
            const pct = topicStats.total > 0
              ? Math.round((topicStats.correct / topicStats.total) * 100)
              : 0;
            initialSkillMap[topicId] = pct;
          }

          return {
            profile: {
              ...state.profile,
              determinedLevel: data.level,
              placementCompleted: true,
              placementScore: data.score,
              placementDate: getLocalDateString(),
              placementDetails: {
                beginnerScore: data.beginnerScore,
                intermediateScore: data.intermediateScore,
                advancedScore: data.advancedScore,
                weakTopics: data.weakTopics,
                strongTopics: data.strongTopics,
              },
              // Merge initial skill map
              skillMap: { ...initialSkillMap },
            },
          };
        }),

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
