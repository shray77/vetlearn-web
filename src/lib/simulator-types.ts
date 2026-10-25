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
  head: 'head',
  neck: 'neck',
  thorax: 'thorax',
  abdomen: 'abdomen',
  skin: 'skin',
  front_legs: 'front_legs',
  hind_legs: 'hind_legs',
  tail: 'tail',
};

export const VET_TOOLS: VetTool[] = [
  {
    id: 'inspection',
    name: 'Осмотр',
    icon: 'inspection',
    description: 'Визуальный осмотр области',
    applicableRegions: ['head', 'neck', 'thorax', 'abdomen', 'skin', 'front_legs', 'hind_legs', 'tail'],
  },
  {
    id: 'stethoscope',
    name: 'Стетоскоп',
    icon: 'stethoscope',
    description: 'Аускультация сердца и лёгких',
    applicableRegions: ['thorax', 'abdomen'],
  },
  {
    id: 'thermometer',
    name: 'Термометр',
    icon: 'thermometer',
    description: 'Измерение температуры тела',
    applicableRegions: ['abdomen'],
  },
  {
    id: 'palpation',
    name: 'Пальпация',
    icon: 'palpation',
    description: 'Пальпация области (прощупывание)',
    applicableRegions: ['head', 'neck', 'thorax', 'abdomen', 'skin', 'front_legs', 'hind_legs', 'tail'],
  },
  {
    id: 'otoscope',
    name: 'Отоскоп',
    icon: 'otoscope',
    description: 'Осмотр ушей',
    applicableRegions: ['head'],
  },
  {
    id: 'ophthalmoscope',
    name: 'Офтальмоскоп',
    icon: 'ophthalmoscope',
    description: 'Осмотр глаз',
    applicableRegions: ['head'],
  },
  {
    id: 'percussion',
    name: 'Перкуссия',
    icon: 'percussion',
    description: 'Перкуссия (постукивание)',
    applicableRegions: ['thorax', 'abdomen'],
  },
  {
    id: 'skin_scrape',
    name: 'Соскоб',
    icon: 'skin_scrape',
    description: 'Соскоб кожи для анализа',
    applicableRegions: ['skin'],
  },
];

export const SPECIES_EMOJIS: Record<string, string> = {
  'КРС': 'cattle',
  'МРС': 'sheep',
  'свиньи': 'pig',
  'птица': 'bird',
  'собаки': 'dog',
  'кошки': 'cat',
  'лошади': 'horse',
};
