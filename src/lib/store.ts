import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  StudentProfile,
  ClinicalCase,
  AssessmentResult,
  TutorMessage,
  Resource,
  LearningPathItem,
  Flashcard,
  FlashcardDeck,
  SRCardData,
  SRRating,
  SpecializationTrack,
  ImportedDocument,
  OSCEResult,
  OSCEStationType,
} from './types';
import { createSRCard, reviewSRCard } from './sm2';
import { deleteDocumentText } from './indexeddb';
import type { SimulatorSession } from './simulator-types';

/** Slim entry stored in history to avoid localStorage bloat */
export type SimulatorHistoryEntry = {
  id: string;
  species: string;
  breed: string;
  chiefComplaint: string;
  difficulty: string;
  score: number;
  completedAt?: string;
};

const DEFAULT_PROFILE: StudentProfile = {
  id: 'demo-student-1',
  name: 'Студент',
  level: 1,
  xp: 0,
  xpToNext: 100,
  streak: 0,
  // Task 204 (fix 204-a#9): локальные даты вместо UTC-ISOString — в UTC+3
  // после 21:00 дефолтный streakLastDate оказывался «завтра» локально
  streakLastDate: getLocalDateString(),
  skillMap: {},
  completedCases: 0,
  totalAnswers: 0,
  correctAnswers: 0,
  learningPath: [],
  assessmentsCompleted: 0,
  joinedDate: getLocalDateString(),
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

export interface VetLearnStore {
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

  // Flashcards
  flashcards: Flashcard[];
  setFlashcards: (cards: Flashcard[]) => void;
  flashcardHistory: FlashcardDeck[];
  addFlashcardDeckToHistory: (deck: FlashcardDeck) => void;

  // Spaced Repetition (SM-2)
  srCards: Record<string, SRCardData>;
  /** Add a new card to the SR system (called when cards are generated) */
  registerSRCard: (cardId: string) => void;
  /** Register multiple cards at once */
  registerSRCards: (cardIds: string[]) => void;
  /** Process a review: update the card's SR state based on rating */
  reviewCard: (cardId: string, rating: SRRating) => void;
  /** Process multiple reviews at once (batch) */
  reviewCards: (reviews: Array<{ cardId: string; rating: SRRating }>) => void;
  /** Get SR data for a specific card */
  getSRCard: (cardId: string) => SRCardData | undefined;

  // Notifications
  notificationPermission: 'default' | 'granted' | 'denied';
  setNotificationPermission: (perm: 'default' | 'granted' | 'denied') => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  lastReminderDate: string;
  setLastReminderDate: (date: string) => void;

  // Simulator
  simulatorHistory: SimulatorHistoryEntry[];
  addSimulatorToHistory: (session: SimulatorSession) => void;
  completedSimulations: number;
  isSimulatorActive: boolean;
  setIsSimulatorActive: (active: boolean) => void;

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
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    score: number;
    beginnerScore: number;
    intermediateScore: number;
    advancedScore: number;
    weakTopics: string[];
    strongTopics: string[];
    detailedStats: Record<string, { correct: number; total: number; topicName: string }>;
  }) => void;

  // ===== Specialization Tracks =====
  setSpecializationTrack: (track: SpecializationTrack) => void;

  // ===== Imported Documents =====
  importedDocuments: ImportedDocument[];
  addImportedDocument: (doc: ImportedDocument) => void;
  deleteImportedDocument: (id: string) => void;
  updateImportedDocument: (id: string, updates: Partial<ImportedDocument>) => void;

  // ===== OSCE =====
  osceHistory: OSCEResult[];
  osceSkillMap: Partial<Record<OSCEStationType, number>>;
  addOSCEResult: (result: OSCEResult) => void;

  // ===== Daily Challenges =====
  completedChallenges: Record<string, string>; // date -> challenge type completed
  markChallengeCompleted: (date: string, type: string) => void;

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
          // Центральный кламп: отрицательный/дробный/гигантский XP не проходит
          // (даже если какой-то UI-поток окажется скомпрометирован)
          const safeAmount = Math.max(0, Math.min(1000, Math.round(Number(amount) || 0)));
          if (safeAmount === 0) return state;
          const newXP = state.profile.xp + safeAmount;
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

      // Flashcards
      flashcards: [],
      setFlashcards: (cards) => set({ flashcards: cards }),
      flashcardHistory: [],
      addFlashcardDeckToHistory: (deck) =>
        set((state) => ({
          flashcardHistory: [deck, ...state.flashcardHistory].slice(0, 30),
        })),

      // Spaced Repetition (SM-2)
      srCards: {},
      registerSRCard: (cardId) =>
        set((state) => ({
          srCards: {
            ...state.srCards,
            [cardId]: createSRCard(cardId),
          },
        })),
      registerSRCards: (cardIds) =>
        set((state) => {
          const newSR = { ...state.srCards };
          for (const id of cardIds) {
            if (!newSR[id]) {
              newSR[id] = createSRCard(id);
            }
          }
          return { srCards: newSR };
        }),
      reviewCard: (cardId, rating) =>
        set((state) => {
          const card = state.srCards[cardId];
          if (!card) return state;
          return {
            srCards: {
              ...state.srCards,
              [cardId]: reviewSRCard(card, rating),
            },
          };
        }),
      reviewCards: (reviews) =>
        set((state) => {
          const newSR = { ...state.srCards };
          for (const { cardId, rating } of reviews) {
            const card = newSR[cardId];
            if (card) {
              newSR[cardId] = reviewSRCard(card, rating);
            }
          }
          return { srCards: newSR };
        }),
      getSRCard: (cardId) => get().srCards[cardId],

      // Notifications
      notificationPermission: 'default',
      setNotificationPermission: (perm) => set({ notificationPermission: perm }),
      notificationsEnabled: false,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      lastReminderDate: '',
      setLastReminderDate: (date) => set({ lastReminderDate: date }),

      // Simulator
      simulatorHistory: [],
      addSimulatorToHistory: (session) =>
        set((state) => ({
          simulatorHistory: [{
            id: session.scenario.id,
            species: session.scenario.species,
            breed: session.scenario.breed,
            chiefComplaint: session.scenario.ownerComplaint,
            difficulty: session.scenario.difficulty,
            score: session.evaluation?.score ?? 0,
            completedAt: session.completedAt,
          }, ...state.simulatorHistory].slice(0, 20),
          completedSimulations: state.completedSimulations + 1,
        })),
      completedSimulations: 0,
      isSimulatorActive: false,
      setIsSimulatorActive: (active) => set({ isSimulatorActive: active }),

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
            newSkillMap[key] = Math.min(100, Math.max(0, Math.round(current * 0.6 + value * 0.4)));
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
          flashcards: [],
          flashcardHistory: [],
          srCards: {},
          activeTab: 'dashboard',
          isAssessmentActive: false,
          isCaseActive: false,
          simulatorHistory: [],
          completedSimulations: 0,
          isSimulatorActive: false,
          notificationPermission: 'default',
          notificationsEnabled: false,
          lastReminderDate: '',
          importedDocuments: [],
          osceHistory: [],
          osceSkillMap: {},
          completedChallenges: {},
        }),

      // ===== Specialization Tracks =====
      setSpecializationTrack: (track) =>
        set((state) => {
          const today = getLocalDateString();
          const prevTrack = state.profile.specializationTrack;
          const isFirstSet = !prevTrack;
          return {
            profile: {
              ...state.profile,
              specializationTrack: track,
              trackStartDate: isFirstSet ? today : state.profile.trackStartDate,
              trackSwitchHistory: prevTrack && prevTrack !== track
                ? [...(state.profile.trackSwitchHistory || []), { track: prevTrack, date: today }].slice(-20)
                : state.profile.trackSwitchHistory,
            },
          };
        }),

      // ===== Imported Documents =====
      importedDocuments: [],
      addImportedDocument: (doc) =>
        set((state) => {
          // Task 204 (fix 204-a#7): выселяемые за кап 50 документы раньше
          // оставляли полные тексты в IndexedDB навсегда (write-only рост
          // квоты) — теперь текст выселяемого чистится сразу.
          const next = [doc, ...state.importedDocuments].slice(0, 50);
          for (const d of state.importedDocuments) {
            if (!next.some((n) => n.id === d.id)) {
              void deleteDocumentText(d.id);
            }
          }
          return { importedDocuments: next };
        }),
      deleteImportedDocument: (id) => {
        // Task 204 (fix 204-a#7): симметричная чистка IDB-текста
        void deleteDocumentText(id);
        set((state) => ({
          importedDocuments: state.importedDocuments.filter((d) => d.id !== id),
        }));
      },
      updateImportedDocument: (id, updates) =>
        set((state) => ({
          importedDocuments: state.importedDocuments.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      // ===== OSCE =====
      osceHistory: [],
      osceSkillMap: {},
      addOSCEResult: (result) =>
        set((state) => {
          // Average new score into osceSkillMap
          const stationType = result.stationType;
          const prevScore = state.osceSkillMap[stationType] ?? 0;
          const newScore = Math.round(prevScore * 0.5 + result.totalScore * 0.5);
          // Also update topicId skill map via updateSkillMap pattern
          return {
            osceHistory: [result, ...state.osceHistory].slice(0, 30),
            osceSkillMap: { ...state.osceSkillMap, [stationType]: newScore },
          };
        }),

      // ===== Daily Challenges =====
      completedChallenges: {},
      markChallengeCompleted: (date, type) =>
        set((state) => ({
          completedChallenges: { ...state.completedChallenges, [date]: type },
        })),
    }),
    {
      name: 'vetlearn-storage',
      version: 6,
      // Persist только доменные данные: транзиент UI (activeTab, currentCase,
      // tutorMessages, is*-флаги) не должен писаться в localStorage и восстанавливаться
      // после перезагрузки в «залипшем» состоянии.
      partialize: (state) => ({
        profile: state.profile,
        assessmentHistory: state.assessmentHistory,
        caseHistory: state.caseHistory,
        bookmarkedResources: state.bookmarkedResources,
        flashcards: state.flashcards,
        flashcardHistory: state.flashcardHistory,
        srCards: state.srCards,
        notificationPermission: state.notificationPermission,
        notificationsEnabled: state.notificationsEnabled,
        lastReminderDate: state.lastReminderDate,
        simulatorHistory: state.simulatorHistory,
        completedSimulations: state.completedSimulations,
        importedDocuments: state.importedDocuments,
        osceHistory: state.osceHistory,
        osceSkillMap: state.osceSkillMap,
        completedChallenges: state.completedChallenges,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const s = (persistedState as Record<string, unknown>) || {};
        const profile = (s.profile as StudentProfile) || DEFAULT_PROFILE;

        // v3 → v4: Specialization tracks
        if (version < 4) {
          if (!profile.specializationTrack) {
            profile.specializationTrack = 'mixed';
          }
          if (!profile.trackStartDate) {
            // 206-a#8: локальная дата, не UTC — тот же класс бага, что streakLastDate (204-a#9):
            // в UTC+3 между 00:00 и 03:00 датой старта трека писалось «вчера»
            profile.trackStartDate = getLocalDateString();
          }
        }

        // v4 → v5: Imported documents
        if (version < 5) {
          if (!Array.isArray(s.importedDocuments)) {
            s.importedDocuments = [];
          }
        }

        // v5 → v6: OSCE
        if (version < 6) {
          if (!Array.isArray(s.osceHistory)) {
            s.osceHistory = [];
          }
          if (!s.osceSkillMap || typeof s.osceSkillMap !== 'object') {
            s.osceSkillMap = {};
          }
        }

        s.profile = profile;
        return s as unknown as VetLearnStore;
      },
    }
  )
);
