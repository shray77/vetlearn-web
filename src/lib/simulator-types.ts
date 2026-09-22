// ===== Simulator Types for Interactive Veterinary Simulator =====

export type BodyRegion = 'head' | 'neck' | 'thorax' | 'abdomen' | 'skin' | 'front_legs' | 'hind_legs' | 'tail';

export interface VetTool {
  id: string;
  name: string;
  icon: string;
  description: string;
  applicableRegions: BodyRegion[];
}

export interface ExaminationFinding {
  region: BodyRegion;
  toolId: string;
  finding: string;
  isNormal: boolean;
  relevance: 'critical' | 'important' | 'minor';
}

export interface LabTest {
  id: string;
  name: string;
  icon: string;
  cost: number;
  category: 'blood' | 'imaging' | 'microscopy' | 'other';
  result?: string;
  isRevealed: boolean;
}

export interface SimulatorScenario {
  id: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  weight: string;
  difficulty: string;
  topic: string;
  ownerComplaint: string;
  // Правильные ответы НЕ приходят с сервера (анти-спойлер и анти-чит: /evaluate
  // сверяет их с каноном в памяти сервера). Опциональны, чтобы случайный доступ
  // из клиентского кода ловился компилятором.
  correctDiagnosis?: string;
  diagnosisOptions: string[];
  treatmentPlan?: string;
  treatmentOptions: string[];
  correctTreatment?: string;
  findings: ExaminationFinding[];
  availableTests: LabTest[];
  budget: number;
  xpReward: number;
  anamnesisQuestions?: AnamnesisQA[];
}

export interface AnamnesisQA {
  question: string;
  answer: string;
}

export interface SimulatorSession {
  scenario: SimulatorScenario;
  currentPhase: 'anamnesis' | 'examination' | 'laboratory' | 'diagnosis' | 'treatment' | 'results';
  selectedTool: string | null;
  selectedRegion: BodyRegion | null;
  discoveredFindings: ExaminationFinding[];
  budgetSpent: number;
  diagnosisSubmitted: string | null;
  treatmentSubmitted: string | null;
  evaluation: SimulatorEvaluation | null;
  startedAt: string;
  completedAt?: string;
  anamnesisQuestionsAsked: number;
}

export interface SimulatorEvaluation {
  score: number;
  diagnosisCorrect: boolean;
  treatmentCorrect: boolean;
  examinationScore: number;
  economyScore: number;
  feedback: string;
  diagnosisFeedback: string;
  treatmentFeedback: string;
  examinationFeedback: string;
  keyTakeaways: string[];
  xpEarned: number;
  grade: 'excellent' | 'good' | 'satisfactory' | 'unsatisfactory';
}

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  head: 'Голова',
  neck: 'Шея',
  thorax: 'Грудная клетка',
  abdomen: 'Живот',
  skin: 'Кожа / Шерсть',
  front_legs: 'Передние лапы',
  hind_legs: 'Задние лапы',
  tail: 'Хвост',
};

export const BODY_REGION_ICONS: Record<BodyRegion, string> = {
  head: '🧠',
  neck: '🦴',
  thorax: '🫁',
  abdomen: '🫃',
  skin: '🐾',
  front_legs: '🦵',
  hind_legs: '🦿',
  tail: '🦊',
};

export const VET_TOOLS: VetTool[] = [
  {
    id: 'inspection',
    name: 'Осмотр',
    icon: '👁️',
    description: 'Визуальный осмотр области',
    applicableRegions: ['head', 'neck', 'thorax', 'abdomen', 'skin', 'front_legs', 'hind_legs', 'tail'],
  },
  {
    id: 'stethoscope',
    name: 'Стетоскоп',
    icon: '🩺',
    description: 'Аускультация сердца и лёгких',
    applicableRegions: ['thorax', 'abdomen'],
  },
  {
    id: 'thermometer',
    name: 'Термометр',
    icon: '🌡️',
    description: 'Измерение температуры тела',
    applicableRegions: ['abdomen'],
  },
  {
    id: 'palpation',
    name: 'Пальпация',
    icon: '✋',
    description: 'Пальпация области (прощупывание)',
    applicableRegions: ['head', 'neck', 'thorax', 'abdomen', 'skin', 'front_legs', 'hind_legs', 'tail'],
  },
  {
    id: 'otoscope',
    name: 'Отоскоп',
    icon: '🔦',
    description: 'Осмотр ушей',
    applicableRegions: ['head'],
  },
  {
    id: 'ophthalmoscope',
    name: 'Офтальмоскоп',
    icon: '👁️‍🗨️',
    description: 'Осмотр глаз',
    applicableRegions: ['head'],
  },
  {
    id: 'percussion',
    name: 'Перкуссия',
    icon: '👆',
    description: 'Перкуссия (постукивание)',
    applicableRegions: ['thorax', 'abdomen'],
  },
  {
    id: 'skin_scrape',
    name: 'Соскоб',
    icon: '🔬',
    description: 'Соскоб кожи для анализа',
    applicableRegions: ['skin'],
  },
];

export const SPECIES_EMOJIS: Record<string, string> = {
  'КРС': '🐄',
  'МРС': '🐑',
  'свиньи': '🐷',
  'птица': '🐔',
  'собаки': '🐕',
  'кошки': '🐈',
  'лошади': '🐴',
};
