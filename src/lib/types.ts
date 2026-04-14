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
export type DifficultyType = 'beginner' | 'intermediate' | 'advanced';

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
