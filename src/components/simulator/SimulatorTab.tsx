'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { SPECIES_OPTIONS, DIFFICULTY_OPTIONS, VET_TOPICS } from '@/lib/vet-topics';
import type { SpeciesType, DifficultyType } from '@/lib/types';
import { LoadingSpinner, AnimatedNumber } from '@/components/ui/utility';
import { AnimalSVG } from '@/components/simulator/AnimalSVG';
import type {
  BodyRegion,
  SimulatorSession,
  SimulatorScenario,
  SimulatorEvaluation,
  ExaminationFinding,
} from '@/lib/simulator-types';
import {
  BODY_REGION_LABELS,
  VET_TOOLS,
  SPECIES_EMOJIS,
} from '@/lib/simulator-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Activity, ArrowRight, ArrowLeft, ChevronRight, Loader2,
  CheckCircle2, XCircle, Coins,
  Stethoscope, FlaskConical, ClipboardList, Pill, Star,
  RotateCcw, X, Lightbulb, MessageCircle, Eye, Beaker,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

// ===== Constants =====
const MAX_ANAMNESIS_QUESTIONS = 6;

// ===== Session persistence across tab switches (sessionStorage) =====
const SIM_STORAGE_KEY = 'vetlearn_simulator_session_v1';

interface PersistedSimState {
  phase: 'playing';
  simPhase: SimulatorSession['currentPhase'];
  session: SimulatorSession;
  scenario: SimulatorScenario;
  discoveredFindings: ExaminationFinding[];
  budgetSpent: number;
  anamnesisAsked: number;
  anamnesisRevealed: number[];
  selectedDiagnosis: string | null;
  selectedTreatment: string | null;
  evaluation: SimulatorEvaluation | null;
}

function loadPersistedSim(): PersistedSimState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SIM_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedSimState;
    if (p?.phase !== 'playing' || !p.scenario || !p.session) return null;
    return p;
  } catch {
    return null;
  }
}
const PHASE_LABELS: Record<string, string> = {
  setup: 'Настройка',
  anamnesis: 'Анамнез',
  examination: 'Осмотр',
  laboratory: 'Лаборатория',
  diagnosis: 'Диагноз',
  treatment: 'Лечение',
  results: 'Результаты',
};

const GRADE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  excellent: { label: 'Отлично', emoji: '🏆', color: '#28CD41' },
  good: { label: 'Хорошо', emoji: '⭐', color: '#007AFF' },
  satisfactory: { label: 'Удовлетворительно', emoji: '📖', color: '#FF9500' },
  unsatisfactory: { label: 'Неудовлетворительно', emoji: '📚', color: '#FF3B30' },
};

// ===== Main Component =====
export function SimulatorTab() {
  const { addXP, addSimulatorToHistory, completedSimulations, setIsSimulatorActive } = useStore();

  // Phase & state
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup');
  const [simPhase, setSimPhase] = useState<SimulatorSession['currentPhase']>('anamnesis');
  const [session, setSession] = useState<SimulatorSession | null>(null);
  const [scenario, setScenario] = useState<SimulatorScenario | null>(null);

  // Setup
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesType>('собаки');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyType>('intermediate');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Examination
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [discoveredFindings, setDiscoveredFindings] = useState<ExaminationFinding[]>([]);
  const [budgetSpent, setBudgetSpent] = useState(0);
  const [lastFinding, setLastFinding] = useState<ExaminationFinding | null>(null);

  // Anamnesis
  const [anamnesisAsked, setAnamnesisAsked] = useState<number>(0);
  const [anamnesisRevealed, setAnamnesisRevealed] = useState<Set<number>>(new Set());

  // Diagnosis/Treatment
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<'diagnosis' | 'treatment' | null>(null);

  // Results
  const [evaluation, setEvaluation] = useState<SimulatorEvaluation | null>(null);

  // Abort controllers: гасим in-flight AI-запросы при выходе/размонтировании
  const generateAbortRef = useRef<AbortController | null>(null);
  const evalAbortRef = useRef<AbortController | null>(null);

  // ===== Restore session once after mount (переход между табами больше не теряет прогресс) =====
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const p = loadPersistedSim();
    if (!p) return;
    setPhase('playing');
    setSimPhase(p.simPhase);
    setSession(p.session);
    setScenario(p.scenario);
    setDiscoveredFindings(p.discoveredFindings);
    setBudgetSpent(p.budgetSpent);
    setAnamnesisAsked(p.anamnesisAsked);
    setAnamnesisRevealed(new Set(p.anamnesisRevealed));
    setSelectedDiagnosis(p.selectedDiagnosis);
    setSelectedTreatment(p.selectedTreatment);
    setEvaluation(p.evaluation);
    setIsSimulatorActive(true);
  }, [setIsSimulatorActive]);

  // ===== Persist session on every meaningful change =====
  useEffect(() => {
    if (phase !== 'playing' || !session || !scenario) return;
    try {
      const payload: PersistedSimState = {
        phase: 'playing',
        simPhase,
        session,
        scenario,
        discoveredFindings,
        budgetSpent,
        anamnesisAsked,
        anamnesisRevealed: [...anamnesisRevealed],
        selectedDiagnosis,
        selectedTreatment,
        evaluation,
      };
      sessionStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // quota/приватный режим — не критично
    }
  }, [phase, simPhase, session, scenario, discoveredFindings, budgetSpent, anamnesisAsked, anamnesisRevealed, selectedDiagnosis, selectedTreatment, evaluation]);

  // Abort in-flight requests + clear timers on unmount
  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      evalAbortRef.current?.abort();
      if (findingTimeoutRef.current) clearTimeout(findingTimeoutRef.current);
    };
  }, []);

  // Derived sets for SVG
  const examinedRegions = useMemo(() => {
    const set = new Set<string>();
    discoveredFindings.forEach(f => set.add(f.region));
    return set;
  }, [discoveredFindings]);

  const abnormalRegions = useMemo(() => {
    const set = new Set<string>();
    discoveredFindings.filter(f => !f.isNormal).forEach(f => set.add(f.region));
    return set;
  }, [discoveredFindings]);

  // ===== Scenario Generation =====
  // Timeout ref for lastFinding auto-clear
  const findingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (findingTimeoutRef.current) clearTimeout(findingTimeoutRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setIsSimulatorActive(true);
    const controller = new AbortController();
    generateAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await fetch('/api/simulator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species: selectedSpecies,
          difficulty: selectedDifficulty,
          topic: selectedTopic || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      // Пользователь вышел из симуляции/таба пока летел запрос — тихо выходим, ничего не применяем
      if (controller.signal.aborted) return;
      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        console.error('[Simulator] generate failed:', res.status, errorBody.substring(0, 200));
        toast.error(`Ошибка сервера (${res.status})`);
        setIsSimulatorActive(false);
        return;
      }
      const data = await res.json();
      if (data.success && data.scenario) {
        const s = data.scenario as SimulatorScenario;
        setScenario(s);
        setSession({
          scenario: s,
          currentPhase: 'anamnesis',
          selectedTool: null,
          selectedRegion: null,
          discoveredFindings: [],
          budgetSpent: 0,
          diagnosisSubmitted: null,
          treatmentSubmitted: null,
          evaluation: null,
          startedAt: new Date().toISOString(),
          anamnesisQuestionsAsked: 0,
        });
        setSimPhase('anamnesis');
        setPhase('playing');
        setDiscoveredFindings([]);
        setBudgetSpent(0);
        setSelectedTool(null);
        setSelectedDiagnosis(null);
        setSelectedTreatment(null);
        setAnamnesisAsked(0);
        setAnamnesisRevealed(new Set());
        setLastFinding(null);
        setEvaluation(null);
        toast.success('Симуляция начата! Осмотрите пациента.');
        if (data.isFallback) {
          toast.info('Загружен учебный сценарий.');
        }
      } else {
        toast.error(data.error || 'Ошибка генерации');
        setIsSimulatorActive(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Тихий выход: запрос отменён (unmount/reset) — не показываем ложные ошибки
      if (controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Сервер не отвечает. Попробуйте ещё раз.');
      } else {
        toast.error('Ошибка соединения');
      }
      setIsSimulatorActive(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // ===== Examination: Tool + Region =====
  const handleRegionClick = useCallback((region: BodyRegion) => {
    if (!selectedTool || !scenario) return;
    const tool = VET_TOOLS.find(t => t.id === selectedTool);
    if (!tool) return;

    if (!tool.applicableRegions.includes(region)) {
      toast.error(`${tool.name} не применяется к области "${BODY_REGION_LABELS[region]}"`);
      return;
    }

    // Check if already examined this combination
    const existing = discoveredFindings.find(f => f.region === region && f.toolId === selectedTool);
    if (existing) {
      toast.info('Эта комбинация уже исследована');
      return;
    }

    // Find finding
    const finding = scenario.findings.find(f => f.region === region && f.toolId === selectedTool);
    if (finding) {
      setDiscoveredFindings(prev => [...prev, finding]);
      setLastFinding(finding);
      if (!finding.isNormal) {
        toast.warning(`⚠️ ${finding.finding}`);
      } else {
        toast.success(`✅ ${finding.finding}`);
      }
    } else {
      // No specific finding — normal result
      const normalFinding: ExaminationFinding = {
        region,
        toolId: selectedTool,
        finding: `При ${tool.name.toLowerCase()} области "${BODY_REGION_LABELS[region]}" патологий не выявлено.`,
        isNormal: true,
        relevance: 'minor',
      };
      setDiscoveredFindings(prev => [...prev, normalFinding]);
      setLastFinding(normalFinding);
      toast.success(`✅ Норма — ${BODY_REGION_LABELS[region]}`);
    }

    // Auto-clear last finding after delay
    if (findingTimeoutRef.current) clearTimeout(findingTimeoutRef.current);
    findingTimeoutRef.current = setTimeout(() => setLastFinding(null), 3000);
  }, [selectedTool, scenario, discoveredFindings]);

  // ===== Lab Tests =====
  const handleOrderTest = useCallback((testIndex: number) => {
    if (!scenario) return;
    const test = scenario.availableTests[testIndex];
    if (!test || test.isRevealed) return;

    // Use optimistic budget tracking to prevent race conditions
    const cost = test.cost;
    const newBudgetSpent = budgetSpent + cost;
    const budget = scenario?.budget || 6000;
    if (cost > budget - budgetSpent) {
      toast.error('Недостаточно средств');
      return;
    }

    // Update budget first (optimistic) to block double-clicks
    setBudgetSpent(newBudgetSpent);
    setScenario(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.availableTests = [...prev.availableTests];
      updated.availableTests[testIndex] = { ...updated.availableTests[testIndex], isRevealed: true };
      return updated;
    });

    toast.success(`🧪 ${test.name}: результат получен`);
  }, [scenario, budgetSpent]);

  // ===== Anamnesis =====
  const handleAskQuestion = useCallback((index: number) => {
    if (anamnesisRevealed.has(index)) return;
    if (anamnesisAsked >= MAX_ANAMNESIS_QUESTIONS) {
      toast.error('Лимит вопросов исчерпан');
      return;
    }
    setAnamnesisRevealed(prev => new Set(prev).add(index));
    setAnamnesisAsked(prev => prev + 1);
  }, [anamnesisRevealed, anamnesisAsked]);

  // ===== Submit Evaluation =====
  const handleSubmitEvaluation = async () => {
    if (isEvaluating) return;
    if (!session || !scenario) return;
    if (!selectedDiagnosis) {
      toast.error('Поставьте диагноз перед завершением');
      return;
    }
    if (!selectedTreatment) {
      toast.error('Выберите лечение перед завершением');
      return;
    }
    setIsEvaluating(true);
    const evalController = new AbortController();
    evalAbortRef.current = evalController;
    try {
      const evalSession: SimulatorSession = {
        ...session,
        scenario,
        currentPhase: 'results',
        discoveredFindings,
        budgetSpent,
        diagnosisSubmitted: selectedDiagnosis,
        treatmentSubmitted: selectedTreatment,
      };

      const evalTimeout = setTimeout(() => evalController.abort(), 90000);

      const res = await fetch('/api/simulator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: evalSession }),
        signal: evalController.signal,
      });
      clearTimeout(evalTimeout);
      // Запрос отменён (выход/размонтирование) — не начисляем XP и не трогаем UI
      if (evalController.signal.aborted) return;
      if (!res.ok) {
        console.error('[Simulator] evaluate failed:', res.status);
        toast.error(`Ошибка сервера (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        const ev: SimulatorEvaluation = {
          score: data.score,
          diagnosisCorrect: data.diagnosisCorrect,
          treatmentCorrect: data.treatmentCorrect,
          examinationScore: data.examinationScore,
          economyScore: data.economyScore,
          feedback: data.feedback,
          diagnosisFeedback: data.diagnosisFeedback,
          treatmentFeedback: data.treatmentFeedback,
          examinationFeedback: data.examinationFeedback,
          keyTakeaways: data.keyTakeaways || [],
          xpEarned: data.xpEarned,
          grade: data.grade,
        };
        setEvaluation(ev);
        setSimPhase('results');
        addXP(ev.xpEarned);
        addSimulatorToHistory({ ...evalSession, evaluation: ev, completedAt: new Date().toISOString() });
        toast.success(`+${ev.xpEarned} XP!`);
      } else {
        toast.error(data.error || 'Ошибка оценки');
      }
    } catch {
      // Тихий выход при отмене (unmount/reset), иначе — ошибка соединения
      if (evalController.signal.aborted) return;
      toast.error('Ошибка соединения');
    } finally {
      setIsEvaluating(false);
    }
  };

  // ===== Reset =====
  const handleReset = useCallback(() => {
    // Гасим in-flight AI-запросы — их ответы не должны примениться к закрытой сессии
    generateAbortRef.current?.abort();
    evalAbortRef.current?.abort();
    setPhase('setup');
    setSimPhase('anamnesis');
    setSession(null);
    setScenario(null);
    setSelectedTool(null);
    setDiscoveredFindings([]);
    setBudgetSpent(0);
    setSelectedDiagnosis(null);
    setSelectedTreatment(null);
    setConfirmDialog(null);
    setAnamnesisAsked(0);
    setAnamnesisRevealed(new Set());
    setEvaluation(null);
    setLastFinding(null);
    try { sessionStorage.removeItem(SIM_STORAGE_KEY); } catch {}
    setIsSimulatorActive(false);
  }, [setIsSimulatorActive]);

  // ===== Anamnesis questions with defaults =====
  const anamnesisQuestions = useMemo(() => {
    if (scenario?.anamnesisQuestions && scenario.anamnesisQuestions.length > 0) {
      return scenario.anamnesisQuestions;
    }
    return [
      { question: 'Когда появились первые симптомы?', answer: 'Около 3 дней назад.' },
      { question: 'Изменился ли аппетит?', answer: 'Аппетит снижен.' },
      { question: 'Есть ли рвота или диарея?', answer: 'Нет.' },
      { question: 'Изменилась ли активность?', answer: 'Животное вялое.' },
      { question: 'Были ли прививки?', answer: 'Прививки по графику.' },
      { question: 'Обрабатывали ли от паразитов?', answer: 'Обработка была давно.' },
    ];
  }, [scenario]);

  // ===== Phase navigation helpers =====
  const goNextPhase = () => {
    const phases: SimulatorSession['currentPhase'][] = ['anamnesis', 'examination', 'laboratory', 'diagnosis', 'treatment'];
    const idx = phases.indexOf(simPhase);
    if (idx < phases.length - 1) {
      setSimPhase(phases[idx + 1]);
    }
  };
  const goPrevPhase = () => {
    const phases: SimulatorSession['currentPhase'][] = ['anamnesis', 'examination', 'laboratory', 'diagnosis', 'treatment'];
    const idx = phases.indexOf(simPhase);
    if (idx > 0) {
      setSimPhase(phases[idx - 1]);
    }
  };

  const remainingBudget = (scenario?.budget || 6000) - budgetSpent;

  // ==================== SETUP PHASE ====================
  if (phase === 'setup') {
    return (
      <div className="space-y-4 pb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-[#007AFF]" />
            <h2 className="text-lg font-bold">Ветеринарный симулятор</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Практикуйтесь в диагностике: осматривайте пациента, назначайте анализы, ставьте диагноз и выбирайте лечение.
          </p>
        </motion.div>

        <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#007AFF]/5 to-[#AF52DE]/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-[#007AFF]" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p className="font-semibold text-foreground text-sm">Как это работает?</p>
                <p>1. Выберите вид животного и сложность</p>
                <p>2. Опросите владельца (анамнез)</p>
                <p>3. Осмотрите животное инструментами</p>
                <p>4. Назначьте необходимые анализы (в рамках бюджета)</p>
                <p>5. Поставьте диагноз и назначьте лечение</p>
                <p>6. Получите оценку и обратную связь от AI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {completedSimulations > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Star className="w-4 h-4 text-[#FF9500]" />
            <span className="text-xs text-muted-foreground">Симуляций пройдено: {completedSimulations}</span>
          </div>
        )}

        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Вид животного</h3>
            <div className="grid grid-cols-4 gap-2">
              {SPECIES_OPTIONS.map(sp => (
                <button
                  key={sp.value}
                  onClick={() => setSelectedSpecies(sp.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    selectedSpecies === sp.value
                      ? 'bg-[#E8F9EC] dark:bg-[#1A3D22] border-2 border-[#28CD41]/30 scale-105 shadow-sm'
                      : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                  }`}
                >
                  <span className="text-2xl">{sp.icon}</span>
                  <span className="text-[10px] font-medium">{sp.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="squircle-sm border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Сложность</h3>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.filter(d => d.value !== 'expert').map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedDifficulty(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    selectedDifficulty === opt.value
                      ? 'text-white shadow-md scale-105'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  style={selectedDifficulty === opt.value ? { backgroundColor: opt.color } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="squircle-sm border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Тема (необязательно)</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTopic('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !selectedTopic ? 'bg-[#007AFF] text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Любая
              </button>
              {VET_TOPICS.slice(0, 8).map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t.id === selectedTopic ? '' : t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTopic === t.id ? 'bg-[#007AFF] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-14 text-sm font-bold shadow-lg"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерация сценария...</>
          ) : (
            <><Activity className="w-4 h-4 mr-2" /> Начать приём</>
          )}
        </Button>

        {isGenerating && <LoadingSpinner text="AI создаёт клинический сценарий..." />}
      </div>
    );
  }

  // ==================== RESULTS PHASE ====================
  if (simPhase === 'results' && evaluation) {
    const gc = GRADE_CONFIG[evaluation.grade] || GRADE_CONFIG.unsatisfactory;
    return (
      <div className="space-y-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            {/* Score card */}
            <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#007AFF]/5 to-[#AF52DE]/5">
              <CardContent className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="text-5xl mb-2"
                >
                  {gc.emoji}
                </motion.div>
                <div className="text-4xl font-bold mb-1" style={{ color: gc.color }}>
                  <AnimatedNumber value={evaluation.score} />
                  <span className="text-xl">/100</span>
                </div>
                <Badge className="text-sm px-4 py-1" style={{ backgroundColor: gc.color + '20', color: gc.color, border: `1px solid ${gc.color}40` }}>
                  {gc.label}
                </Badge>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Star className="w-4 h-4 text-[#FF9500]" />
                  <span className="text-sm font-semibold text-[#FF9500]">+{evaluation.xpEarned} XP</span>
                </div>
              </CardContent>
            </Card>

            {/* Score breakdown */}
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Разбор баллов</h3>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    {evaluation.diagnosisCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-[#28CD41]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#FF3B30]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Диагноз</span>
                      <span className="text-xs text-muted-foreground">0-40</span>
                    </div>
                    <Progress value={(evaluation.diagnosisCorrect ? 40 : 0) / 40 * 100} className="h-1.5 mt-1" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    {evaluation.treatmentCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-[#28CD41]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#FF3B30]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Лечение</span>
                      <span className="text-xs text-muted-foreground">0-25</span>
                    </div>
                    <Progress value={(evaluation.treatmentCorrect ? 25 : 0) / 25 * 100} className="h-1.5 mt-1" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Полнота обследования</span>
                      <span className="text-xs text-muted-foreground">{evaluation.examinationScore}/20</span>
                    </div>
                    <Progress value={evaluation.examinationScore / 20 * 100} className="h-1.5 mt-1" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF9500]/10 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5 text-[#FF9500]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Экономность</span>
                      <span className="text-xs text-muted-foreground">{evaluation.economyScore}/15</span>
                    </div>
                    <Progress value={evaluation.economyScore / 15 * 100} className="h-1.5 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback cards */}
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#007AFF]" /> Обратная связь
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{evaluation.feedback}</p>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Диагноз</p>
                  <p className="text-sm leading-relaxed">{evaluation.diagnosisFeedback}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Лечение</p>
                  <p className="text-sm leading-relaxed">{evaluation.treatmentFeedback}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Обследование</p>
                  <p className="text-sm leading-relaxed">{evaluation.examinationFeedback}</p>
                </div>
              </CardContent>
            </Card>

            {/* Key takeaways */}
            {evaluation.keyTakeaways.length > 0 && (
              <Card className="squircle-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#FF9500]" /> Главные выводы
                  </h3>
                  <ul className="space-y-1.5">
                    {evaluation.keyTakeaways.map((t, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-[#28CD41] mt-0.5">•</span> {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 squircle-sm h-12"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Вернуться
              </Button>
              <Button
                className="flex-1 squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-12"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Activity className="w-4 h-4 mr-2" /> Новый пациент</>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ==================== PLAYING PHASE ====================
  return (
    <div className="space-y-4 pb-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={isEvaluating}>
          <X className="w-4 h-4 mr-1" /> Выход
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {PHASE_LABELS[simPhase]}
          </Badge>
          {scenario && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF9500]/10">
              <Coins className="w-3.5 h-3.5 text-[#FF9500]" />
              <span className="text-[11px] font-semibold text-[#FF9500]">{remainingBudget}₽</span>
            </div>
          )}
        </div>
      </div>

      {/* Patient info */}
      {scenario && (
        <Card className="squircle-sm border-0 shadow-sm bg-gradient-to-br from-[#007AFF]/5 to-transparent">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#007AFF]/10 flex items-center justify-center text-2xl">
                {SPECIES_EMOJIS[scenario.species] || '🐾'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{scenario.breed}, {scenario.age}</p>
                <p className="text-[11px] text-muted-foreground">
                  {scenario.sex} • {scenario.weight} •{' '}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {scenario.topic}
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase progress bar */}
      <Progress
        value={(['anamnesis', 'examination', 'laboratory', 'diagnosis', 'treatment'].indexOf(simPhase) + 1) / 5 * 100}
        className="h-1"
      />

      <AnimatePresence mode="wait">
        {/* ===== ANAMNESIS PHASE ===== */}
        {simPhase === 'anamnesis' && scenario && (
          <motion.div key="anamnesis" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Owner complaint speech bubble */}
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0 text-lg">
                    👤
                  </div>
                  <div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 relative">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Владелец:</p>
                      <p className="text-sm leading-relaxed">{scenario.ownerComplaint}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#007AFF]" /> Вопросы владельцу
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    {anamnesisAsked}/{MAX_ANAMNESIS_QUESTIONS} вопросов
                  </span>
                </div>
                <Progress value={anamnesisAsked / MAX_ANAMNESIS_QUESTIONS * 100} className="h-1" />

                <div className="space-y-2">
                  {anamnesisQuestions.map((qa, i) => {
                    const isRevealed = anamnesisRevealed.has(i);
                    const canAsk = !isRevealed && anamnesisAsked < MAX_ANAMNESIS_QUESTIONS;
                    return (
                      <div key={i} className="finding-slide">
                        <button
                          onClick={() => canAsk && handleAskQuestion(i)}
                          disabled={!canAsk}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            isRevealed
                              ? 'bg-muted/50 border-border/50'
                              : canAsk
                                ? 'border-[#007AFF]/30 hover:border-[#007AFF]/50 hover:bg-[#007AFF]/5 cursor-pointer'
                                : 'border-transparent bg-muted/30 opacity-50'
                          }`}
                        >
                          <p className="text-sm font-medium">{qa.question}</p>
                          <AnimatePresence>
                            {isRevealed && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-muted-foreground mt-2 pl-3 border-l-2 border-[#007AFF]/30"
                              >
                                {qa.answer}
                              </motion.p>
                            )}
                          </AnimatePresence>
                          {!isRevealed && canAsk && (
                            <p className="text-[10px] text-[#007AFF] mt-1">Нажмите, чтобы спросить →</p>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-12 text-sm font-semibold"
              onClick={goNextPhase}
            >
              Перейти к осмотру <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* ===== EXAMINATION PHASE ===== */}
        {simPhase === 'examination' && scenario && (
          <motion.div key="examination" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Animal SVG */}
            <Card className="squircle border-0 shadow-sm">
              <CardContent className="p-2">
                <AnimalSVG
                  species={scenario.species}
                  onRegionClick={handleRegionClick}
                  selectedRegion={null}
                  examinedRegions={examinedRegions}
                  abnormalRegions={abnormalRegions}
                />
              </CardContent>
            </Card>

            {/* Tool panel */}
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">🛠 Инструменты</h3>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {VET_TOOLS.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] shrink-0 transition-all border-2 ${
                        selectedTool === tool.id
                          ? 'border-[#007AFF] bg-[#007AFF]/10 shadow-sm'
                          : 'border-transparent bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <span className="text-xl">{tool.icon}</span>
                      <span className="text-[10px] font-medium text-center leading-tight">{tool.name}</span>
                    </button>
                  ))}
                </div>
                {selectedTool && (
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    {VET_TOOLS.find(t => t.id === selectedTool)?.description} — нажмите на область животного
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Findings panel */}
            {discoveredFindings.length > 0 && (
              <Card className="squircle-sm border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold flex items-center gap-1.5">
                      📋 Находки ({discoveredFindings.length})
                    </h3>
                  </div>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1.5">
                      {discoveredFindings.map((f, i) => {
                        const borderColor = f.relevance === 'critical'
                          ? 'border-l-[#FF3B30]'
                          : f.relevance === 'important'
                            ? 'border-l-[#FF9500]'
                            : 'border-l-[#28CD41]';
                        return (
                          <div key={`${f.region}-${f.toolId}-${i}`} className={`finding-slide pl-3 border-l-2 ${borderColor}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {BODY_REGION_LABELS[f.region as BodyRegion]} • {VET_TOOLS.find(t => t.id === f.toolId)?.icon} {VET_TOOLS.find(t => t.id === f.toolId)?.name}
                              </span>
                              {f.isNormal ? (
                                <Badge className="text-[9px] px-1.5 py-0 bg-[#28CD41]/10 text-[#28CD41]">норма</Badge>
                              ) : (
                                <Badge className="text-[9px] px-1.5 py-0 bg-[#FF3B30]/10 text-[#FF3B30]">
                                  {f.relevance === 'critical' ? 'критично' : 'патология'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed">{f.finding}</p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Last finding toast */}
            <AnimatePresence>
              {lastFinding && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`p-3 rounded-xl border-2 text-sm ${
                    lastFinding.isNormal
                      ? 'bg-[#28CD41]/10 border-[#28CD41]/30 text-[#28CD41]'
                      : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
                  }`}
                >
                  {lastFinding.finding}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 squircle-sm h-11 text-xs"
                onClick={goPrevPhase}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Анамнез
              </Button>
              <Button
                className="flex-1 squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-11 text-xs"
                onClick={() => setSimPhase('laboratory')}
              >
                <FlaskConical className="w-3.5 h-3.5 mr-1" /> Лаб. тесты
              </Button>
              <Button
                className="flex-1 squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-11 text-xs"
                onClick={() => setSimPhase('diagnosis')}
              >
                Диагноз <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ===== LABORATORY PHASE ===== */}
        {simPhase === 'laboratory' && scenario && (
          <motion.div key="laboratory" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-[#AF52DE]" /> Лабораторные тесты
                  </h3>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF9500]/10">
                    <Coins className="w-3.5 h-3.5 text-[#FF9500]" />
                    <span className="text-xs font-semibold text-[#FF9500]">{remainingBudget}₽</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {scenario.availableTests.map((test, i) => {
                    const canAfford = test.cost <= remainingBudget;
                    return (
                      <button
                        key={test.id}
                        onClick={() => !test.isRevealed && canAfford && handleOrderTest(i)}
                        disabled={test.isRevealed || !canAfford}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          test.isRevealed
                            ? 'bg-muted/30 border-border/50'
                            : canAfford
                              ? 'border-[#AF52DE]/30 hover:border-[#AF52DE]/50 hover:bg-[#AF52DE]/5'
                              : 'border-transparent bg-muted/20 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{test.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{test.name}</p>
                              <span className="text-xs font-semibold text-muted-foreground ml-2 shrink-0">
                                {test.cost}₽
                              </span>
                            </div>
                            <AnimatePresence>
                              {test.isRevealed && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="text-[11px] text-muted-foreground mt-1 leading-relaxed"
                                >
                                  {test.result}
                                </motion.p>
                              )}
                            </AnimatePresence>
                            {!test.isRevealed && canAfford && (
                              <p className="text-[10px] text-[#AF52DE] mt-0.5">Нажмите, чтобы назначить →</p>
                            )}
                            {!canAfford && !test.isRevealed && (
                              <p className="text-[10px] text-[#FF3B30] mt-0.5">Недостаточно средств</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 squircle-sm h-11 text-xs"
                onClick={goPrevPhase}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Осмотр
              </Button>
              <Button
                className="flex-1 squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-11 text-xs"
                onClick={() => setSimPhase('diagnosis')}
              >
                Поставить диагноз <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ===== DIAGNOSIS PHASE ===== */}
        {simPhase === 'diagnosis' && scenario && (
          <motion.div key="diagnosis" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Summary */}
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#007AFF]" /> Ваши находки
                </h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  {discoveredFindings.filter(f => !f.isNormal).slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[#FF3B30]">•</span>
                      <span>{f.finding}</span>
                    </div>
                  ))}
                  {discoveredFindings.filter(f => !f.isNormal).length > 5 && (
                    <p className="text-muted-foreground">...и ещё {discoveredFindings.filter(f => !f.isNormal).length - 5}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#FF9500]" /> Ваш диагноз
                </h3>
                <div className="space-y-2">
                  {scenario.diagnosisOptions.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDiagnosis(option)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                        selectedDiagnosis === option
                          ? 'border-[#007AFF] bg-[#007AFF]/5 shadow-sm'
                          : 'border-border hover:border-[#007AFF]/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          selectedDiagnosis === option ? 'bg-[#007AFF] text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {['А', 'Б', 'В', 'Г'][i] || '•'}
                        </div>
                        <span className="text-sm">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 squircle-sm h-11 text-xs" onClick={goPrevPhase}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Назад
              </Button>
              <Button
                className="flex-1 squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-11 text-xs"
                disabled={!selectedDiagnosis}
                onClick={() => setConfirmDialog('diagnosis')}
              >
                Подтвердить диагноз <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ===== TREATMENT PHASE ===== */}
        {simPhase === 'treatment' && scenario && (
          <motion.div key="treatment" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <Card className="squircle-sm border-0 shadow-sm bg-gradient-to-br from-[#28CD41]/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#007AFF]" />
                  <p className="text-xs font-semibold">Ваш диагноз:</p>
                </div>
                <p className="text-sm font-medium mt-1">{selectedDiagnosis}</p>
              </CardContent>
            </Card>

            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#28CD41]" /> Назначьте лечение
                </h3>
                <div className="space-y-2">
                  {scenario.treatmentOptions.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTreatment(option)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                        selectedTreatment === option
                          ? 'border-[#28CD41] bg-[#28CD41]/5 shadow-sm'
                          : 'border-border hover:border-[#28CD41]/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          selectedTreatment === option ? 'bg-[#28CD41] text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {['А', 'Б', 'В', 'Г'][i] || '•'}
                        </div>
                        <span className="text-sm">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 squircle-sm h-11 text-xs" onClick={() => setSimPhase('diagnosis')}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Назад
              </Button>
              <Button
                className="flex-1 squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-11 text-xs"
                disabled={!selectedTreatment}
                onClick={() => setConfirmDialog('treatment')}
              >
                Подтвердить лечение <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Confirm Dialog ===== */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {confirmDialog === 'diagnosis' ? 'Подтвердить диагноз?' : 'Подтвердить лечение?'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {confirmDialog === 'diagnosis' ? (
                <>Ваш диагноз: <strong className="text-foreground">{selectedDiagnosis}</strong></>
              ) : (
                <>Ваше лечение: <strong className="text-foreground">{selectedTreatment}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (confirmDialog === 'diagnosis') {
                  setConfirmDialog(null);
                  setSimPhase('treatment');
                } else if (confirmDialog === 'treatment') {
                  setConfirmDialog(null);
                  handleSubmitEvaluation();
                }
              }}
            >
              {confirmDialog === 'diagnosis' ? 'Подтвердить' : 'Отправить на оценку'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEvaluating && <LoadingSpinner text="AI оценивает вашу работу..." />}
    </div>
  );
}
