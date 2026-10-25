/**
 * DS Icons — единый реестр иконок ветлерна (канон DS: «Иконки — только Lucide»).
 *
 * Контракт:
 * - В данных (tracks/topics/achievements/tests/…) поле `icon` хранит СТРОКУ-ключ
 *   этого реестра. Компоненты в данных не хранятся — данные сериализуемы
 *   (zustand persist, API routes, fallback-сценарии).
 * - Рендер — только через <DsIcon name={x.icon} className="w-5 h-5" />.
 *   Неизвестный/пустой ключ деградирует в нейтральную иконку Activity,
 *   а не в пустой бокс (урок Task 158: icon:'' после эмодзи-зачистки).
 * - Для видов, которых нет в lucide (КРС, МРС, свиньи, лошади), здесь
 *   самодельные морды в стиле lucide: 24×24, stroke-2, round caps/joins,
 *   точки глаз/ноздрей приёмом «h.01».
 */

import React from 'react';
import {
  Activity, ArrowDown, ArrowUp, Award, Baby, BadgeCheck, Bird, Bone, BookOpen,
  Brain, Bug, CalendarCheck, Cat, Circle, CircleDashed, CircleDot, ClipboardCheck,
  ClipboardList, Crosshair, Crown, Dog, Droplet, Droplets, Dumbbell, Ear, Eye,
  FileQuestion, FlaskConical, FlaskRound, Flame, GraduationCap, Hand,
  HeartPulse, Layers, Medal, Mic, Milk, Microscope, Minus, PawPrint, Pill,
  Radiation, Rocket, Scan, ScanLine, Scissors, Search, ShieldAlert, ShieldCheck,
  Skull, Slice, Sparkles, Star, Stethoscope, Syringe, Target, TestTube,
  TestTubeDiagonal, TestTubes, Thermometer, Tractor, Trophy, Waves, Wind, Zap,
  type LucideIcon,
} from 'lucide-react';

/* ---------- Кастомные иконки в стиле lucide (viewBox 24×24, stroke 2) ---------- */

type SvgProps = React.SVGProps<SVGSVGElement> & { strokeWidth?: number };

function baseSvgProps({ strokeWidth = 2, ...rest }: SvgProps) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
}

/** Лошадь, профиль: силуэт коня (короткие уши, длинная морда, шея) */
const HorseFace: React.FC<SvgProps> = (props) => (
  <svg {...baseSvgProps(props)}>
    <path d="M7 22 L9.2 13.6 C8.2 12.8 7 11.6 7 9.9 C7 8.6 7.7 7.3 9 6.5 C9.9 6 11 5.6 11.9 5.6 L12 3.6 L13.4 5 L14.8 3.8 L15.2 5.7 C16.7 6.6 17.2 8.2 16.6 9.6 C16 11 14.6 11.7 14.6 11.7 L16.5 22" />
    <path d="M9.8 8.2h.01" />
    <path d="M7.9 10.1h.01" />
  </svg>
);

/** Корова, анфас: рога, боковые уши, широкая морда */
const CowFace: React.FC<SvgProps> = (props) => (
  <svg {...baseSvgProps(props)}>
    <path d="M9.5 4.5 C9 3 9.8 1.4 11.3 1.8" />
    <path d="M14.5 4.5 C15 3 14.2 1.4 12.7 1.8" />
    <path d="M6.5 5.5 C4.8 4.8 3 5.6 2.6 7.4 C4.2 8.2 5.9 7.6 6.6 6.3" />
    <path d="M17.5 5.5 C19.2 4.8 21 5.6 21.4 7.4 C19.8 8.2 18.1 7.6 17.4 6.3" />
    <path d="M6.5 5.5 C6.2 6.5 6 8 6.1 9.8 C6.3 14 8.2 19.5 12 19.5 C15.8 19.5 17.7 14 17.9 9.8 C18 8 17.8 6.5 17.5 5.5 C16.5 4.2 14.4 3.7 12 3.7 C9.6 3.7 7.5 4.2 6.5 5.5" />
    <path d="M12 13.2 C9.8 13.2 8.3 14.6 8.3 16.2 C8.3 17.8 9.9 18.9 12 18.9 C14.1 18.9 15.7 17.8 15.7 16.2 C15.7 14.6 14.2 13.2 12 13.2" />
    <path d="M9.4 9.5h.01" />
    <path d="M14.6 9.5h.01" />
    <path d="M10.6 16h.01" />
    <path d="M13.4 16h.01" />
  </svg>
);

/** Свинья, анфас: треугольные уши, крупный пятачок */
const PigFace: React.FC<SvgProps> = (props) => (
  <svg {...baseSvgProps(props)}>
    <path d="M9.3 5.6 L8.6 2.6 L12 4" />
    <path d="M14.7 5.6 L15.4 2.6 L12 4" />
    <path d="M9.5 5.5 C8.8 7.5 8.7 10.5 9 13 C9.3 16.5 10.3 19.3 12 19.3 C13.7 19.3 14.7 16.5 15 13 C15.3 10.5 15.2 7.5 14.5 5.5 C13.7 4.5 10.3 4.5 9.5 5.5" />
    <path d="M12 12.2 C10.2 12.2 8.8 13.5 8.8 15.2 C8.8 16.9 10.2 18.2 12 18.2 C13.8 18.2 15.2 16.9 15.2 15.2 C15.2 13.5 13.8 12.2 12 12.2" />
    <path d="M9.6 9h.01" />
    <path d="M14.4 9h.01" />
    <path d="M10.8 15h.01" />
    <path d="M13.2 15h.01" />
  </svg>
);

/** Овца, анфас: руно, висячие уши-листья, глаза, рот-дуга */
const SheepFace: React.FC<SvgProps> = (props) => (
  <svg {...baseSvgProps(props)}>
    <path d="M12 3.2 C10.9 2.4 9.4 2.8 8.9 4 C7.5 3.7 6.2 4.7 6.1 6.1 C4.7 6.5 4 8 4.6 9.2 C3.6 10.3 3.8 12 5 12.8 C4.8 14.3 6 15.7 7.6 15.8 C8 17.2 9.6 18 11 17.4 C12 18.4 13.6 18.4 14.6 17.4 C16 18 17.6 17.2 18 15.8 C19.6 15.7 20.8 14.3 20.6 12.8 C21.8 12 22 10.3 21 9.2 C21.6 8 20.9 6.5 19.5 6.1 C19.4 4.7 18.1 3.7 16.7 4 C16.2 2.8 13.1 2.4 12 3.2" />
    <path d="M5.2 9.8 C3.2 9.6 1.8 10.8 1.8 12.6 C3.4 13.6 5.2 13.2 5.9 11.8" />
    <path d="M18.8 9.8 C20.8 9.6 22.2 10.8 22.2 12.6 C20.6 13.6 18.8 13.2 18.1 11.8" />
    <path d="M11 14.4 C11.4 14.9 12.6 14.9 13 14.4" />
    <path d="M9.5 10h.01" />
    <path d="M14.5 10h.01" />
  </svg>
);

/* ---------- Реестр: ключ → компонент ---------- */

type DsIconComponent = LucideIcon | React.FC<SvgProps>;

export const DS_ICONS: Record<string, DsIconComponent> = {
  // Виды животных
  cattle: CowFace,
  sheep: SheepFace,
  pig: PigFace,
  horse: HorseFace,
  dog: Dog,
  cat: Cat,
  bird: Bird,

  // Специализации (tracks)
  'small-animal': Dog,
  'large-animal': Tractor,
  equine: HorseFace,
  exotic: Bird,
  mixed: PawPrint,

  // Темы курса (ключ = topic id)
  pharmacology: Pill,
  surgery: Scissors,
  diagnostics: Search,
  therapy: Stethoscope,
  parasitology: Bug,
  epizootology: ShieldAlert,
  obstetrics: Baby,
  hematology: Droplet,
  anatomy: Bone,
  pathophysiology: HeartPulse,
  microbiology: Microscope,
  zoohygiene: ShieldCheck,

  // Лиги недели
  bronze: Medal,
  silver: Award,
  gold: Trophy,
  platinum: Crown,

  // Достижения (ключ = achievement id)
  'streak-3': Flame,
  'streak-7': CalendarCheck,
  'streak-30': CalendarCheck,
  'answers-50': BookOpen,
  'answers-200': BookOpen,
  'answers-500': Brain,
  'accuracy-70': Target,
  'accuracy-90': Crosshair,
  'level-5': Star,
  'level-10': Rocket,
  'cases-10': ClipboardCheck,
  'sim-5': Dumbbell,
  'challenges-7': Zap,
  'mastery-3': BadgeCheck,
  'mastery-all': GraduationCap,

  // Ежедневные челленджи (ключ = ChallengeType)
  flashcards: Layers,
  case: ClipboardList,
  simulator: Activity,
  assessment: FileQuestion,
  tutor: Mic,
  osce: ScanLine,

  // Области тела (симулятор)
  head: CircleDot,
  neck: Minus,
  thorax: HeartPulse,
  abdomen: Circle,
  skin: CircleDashed,
  front_legs: ArrowUp,
  hind_legs: ArrowDown,
  tail: Wind,

  // Физикальные инструменты (ключ = VetTool id)
  inspection: ClipboardCheck,
  stethoscope: Stethoscope,
  thermometer: Thermometer,
  palpation: Hand,
  otoscope: Ear,
  ophthalmoscope: Eye,
  percussion: Activity,
  skin_scrape: Slice,

  // Лабораторные тесты (ключ = test id)
  cbc: TestTube,
  biochemistry: FlaskConical,
  urinalysis: Droplets,
  coagulation: TestTubeDiagonal,
  milk_test: Milk,
  bacteriology: TestTubes,
  serology: FlaskRound,
  abdominocentesis: Syringe,
  autopsy: Skull,

  // Визуальные модальности (OSCE + атлас + темы)
  radiology: Radiation,
  xray: Radiation,
  ultrasound: Waves,
  cytology: Microscope,
  histopathology: Layers,
  physical_exam: Stethoscope,

  // Универсальные
  wildcard: Sparkles,
};

export interface DsIconProps {
  /** Ключ из DS_ICONS (поле icon из данных) */
  name?: string;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

/**
 * Рендер иконки по ключу. Пустой/неизвестный ключ → нейтральная Activity
 * (никогда не пустой бокс).
 */
export function DsIcon({ name, className, style, strokeWidth = 2 }: DsIconProps) {
  const C = (name && DS_ICONS[name]) || Activity;
  return <C className={className} style={style} strokeWidth={strokeWidth} />;
}
