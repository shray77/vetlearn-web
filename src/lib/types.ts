// ===== Core Data Types for VetLearn AI =====

export interface StudentProfile {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  streakLastDate: string;
  skillMap: Record<string, number>; // topicId -> mastery 0-100
  completedCases: number;
  totalAnswers: number;
  correctAnswers: number;
  learningPath: LearningPathItem[];
  assessmentsCompleted: number;
  joinedDate: string;
  avatarUrl?: string;
  // Placement Test — определённый уровень студента
  determinedLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  placementCompleted?: boolean;
  placementScore?: number;
  placementDate?: string;
  placementDetails?: {
    beginnerScore: number;
    intermediateScore: number;
    advancedScore: number;
    weakTopics: string[];
    strongTopics: string[];
  };
}

export interface LearningPathItem {
  topicId: string;
  topicName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  resources: Resource[];
  mastery: number;
}

export interface ClinicalCase {
  id: string;
  species: string;
  difficulty: string;
  topic: string;
  title: string;
  presentation: string;
  history: string;
  examination: string;
  labResults?: string;
  questions: CaseQuestion[];
  createdAt: string;
}

export interface CaseQuestion {
  id: string;
  question: string;
  type: 'diagnosis' | 'treatment' | 'differential' | 'lab' | 'prognosis';
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: string;
}

export interface AssessmentQuestion {
  id: string;
  topicId: string;
  topicName: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
}

export interface AssessmentResult {
  id: string;
  questions: AssessmentQuestion[];
  answers: number[];
  score: number;
  skillMap: Record<string, number>;
  gaps: SkillGap[];
  strengths: string[];
  learningPath: LearningPathItem[];
  completedAt: string;
  summary?: string;
}

export interface SkillGap {
  topicId: string;
  topicName: string;
  currentLevel: number;
  targetLevel: number;
  priority: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface Resource {
  id: string;
  type: 'book' | 'video' | 'article' | 'course';
  title: string;
  description: string;
  url?: string;
  topicId: string;
  author?: string;
  duration?: string;
  urlVerified?: boolean;
  fromCurated?: boolean;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: string;
  topic?: string;
}

export interface VetTopic {
  id: string;
  name: string;
  icon: string;
  color: string;
  subtopics: VetSubtopic[];
  description: string;
}

export interface VetSubtopic {
  id: string;
  name: string;
  parentTopicId: string;
  description: string;
  questionCount: number;
}

export type SpeciesType = 'КРС' | 'МРС' | 'свиньи' | 'птица' | 'собаки' | 'кошки' | 'лошади';
export type DifficultyType = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CaseGenerationParams {
  species: SpeciesType;
  difficulty: DifficultyType;
  topic?: string;
  subtopic?: string;
}

export interface TutorChatRequest {
  message: string;
  topic?: string;
  context?: string;
  history?: { role: string; content: string }[];
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  example?: string;
}

export interface FlashcardDeck {
  id: string;
  topic: string;
  subtopic?: string;
  cards: Flashcard[];
  known: number;
  unknown: number;
  createdAt: string;
}

// ===== Spaced Repetition (SM-2) Types =====

export interface SRCardData {
  cardId: string;
  /** Days until next review (after last review) */
  interval: number;
  /** Ease factor (1.3 – 2.5+). Higher = easier. Affects interval growth. */
  easeFactor: number;
  /** Consecutive successful reviews. Resets to 0 on "Again". */
  repetitions: number;
  /** ISO date string (YYYY-MM-DD) when the card is next due */
  nextReview: string;
  /** ISO date string of the last review (if any) */
  lastReview?: string;
}

/** Rating for SM-2 review: 0=Again, 1=Hard, 2=Good, 3=Easy */
export type SRRating = 0 | 1 | 2 | 3;

// ===== Mind Map Types =====

export interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  color?: string;
  children: MindMapNode[];
}
