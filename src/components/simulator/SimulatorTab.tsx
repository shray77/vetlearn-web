'use client';

// ===== SimulatorTab — оркестратор фаз симулятора =====
// Стейт, персистенс сессии и AI-запросы живут здесь; UI фаз вынесен в
// src/components/simulator/phases/* (Setup, Results, Anamnesis, Examination,
// Laboratory, Diagnosis, Treatment).

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { SpeciesType, DifficultyType } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/utility';
import type {
  BodyRegion,
  SimulatorSession,
  SimulatorScenario,
  SimulatorEvaluation,
  ExaminationFinding,
} from '@/lib/simulator-types';
import { SPECIES_EMOJIS } from '@/lib/simulator-types';
import { SimulatorSetup } from '@/components/simulator/phases/SimulatorSetup';
import { SimulatorResults } from '@/components/simulator/phases/SimulatorResults';
import { AnamnesisPanel, MAX_ANAMNESIS_QUESTIONS } from '@/components/simulator/phases/AnamnesisPanel';
import { ExaminationPanel } from '@/components/simulator/phases/ExaminationPanel';
import { LaboratoryPanel } from '@/components/simulator/phases/LaboratoryPanel';
import { DiagnosisPanel } from '@/components/simulator/phases/DiagnosisPanel';
import { TreatmentPanel } from '@/components/simulator/phases/TreatmentPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Coins, X } from 'lucide-react';
import { toast } from 'sonner';
import { VET_TOOLS, BODY_REGION_LABELS } from '@/lib/simulator-types';

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

const PLAY_PHASES: SimulatorSession['currentPhase'][] = ['anamnesis', 'examination', 'laboratory', 'diagnosis', 'treatment'];

// ===== Main Component =====
export function SimulatorTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const addXP = useStore((s) => s.addXP);
  const addSimulatorToHistory = useStore((s) => s.addSimulatorToHistory);
  const completedSimulations = useStore((s) => s.completedSimulations);
  const setIsSimulatorActive = useStore((s) => s.setIsSimulatorActive);

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
    const idx = PLAY_PHASES.indexOf(simPhase);
    if (idx < PLAY_PHASES.length - 1) {
      setSimPhase(PLAY_PHASES[idx + 1]);
    }
  };
  const goPrevPhase = () => {
    const idx = PLAY_PHASES.indexOf(simPhase);
    if (idx > 0) {
      setSimPhase(PLAY_PHASES[idx - 1]);
    }
  };

  const remainingBudget = (scenario?.budget || 6000) - budgetSpent;

  // ==================== SETUP PHASE ====================
  if (phase === 'setup') {
    return (
      <SimulatorSetup
        selectedSpecies={selectedSpecies}
        onSelectSpecies={setSelectedSpecies}
        selectedDifficulty={selectedDifficulty}
        onSelectDifficulty={setSelectedDifficulty}
        selectedTopic={selectedTopic}
        onSelectTopic={setSelectedTopic}
        onStart={handleGenerate}
        isGenerating={isGenerating}
        completedSimulations={completedSimulations}
      />
    );
  }

  // ==================== RESULTS PHASE ====================
  if (simPhase === 'results' && evaluation) {
    return (
      <SimulatorResults
        evaluation={evaluation}
        onReset={handleReset}
        onNewPatient={handleGenerate}
        isGenerating={isGenerating}
      />
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
        value={(PLAY_PHASES.indexOf(simPhase) + 1) / 5 * 100}
        className="h-1"
      />

      <AnimatePresence mode="wait">
        {simPhase === 'anamnesis' && scenario && (
          <AnamnesisPanel
            key="anamnesis"
            ownerComplaint={scenario.ownerComplaint}
            questions={anamnesisQuestions}
            asked={anamnesisAsked}
            revealed={anamnesisRevealed}
            onAsk={handleAskQuestion}
            onNext={goNextPhase}
          />
        )}

        {simPhase === 'examination' && scenario && (
          <ExaminationPanel
            key="examination"
            scenario={scenario}
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
            onRegionClick={handleRegionClick}
            examinedRegions={examinedRegions}
            abnormalRegions={abnormalRegions}
            discoveredFindings={discoveredFindings}
            lastFinding={lastFinding}
            onBack={goPrevPhase}
            onLaboratory={() => setSimPhase('laboratory')}
            onDiagnosis={() => setSimPhase('diagnosis')}
          />
        )}

        {simPhase === 'laboratory' && scenario && (
          <LaboratoryPanel
            key="laboratory"
            scenario={scenario}
            remainingBudget={remainingBudget}
            onOrderTest={handleOrderTest}
            onBack={goPrevPhase}
            onDiagnosis={() => setSimPhase('diagnosis')}
          />
        )}

        {simPhase === 'diagnosis' && scenario && (
          <DiagnosisPanel
            key="diagnosis"
            scenario={scenario}
            discoveredFindings={discoveredFindings}
            selectedDiagnosis={selectedDiagnosis}
            onSelectDiagnosis={setSelectedDiagnosis}
            onBack={goPrevPhase}
            onConfirm={() => setConfirmDialog('diagnosis')}
          />
        )}

        {simPhase === 'treatment' && scenario && (
          <TreatmentPanel
            key="treatment"
            scenario={scenario}
            selectedDiagnosis={selectedDiagnosis}
            selectedTreatment={selectedTreatment}
            onSelectTreatment={setSelectedTreatment}
            onBack={() => setSimPhase('diagnosis')}
            onConfirm={() => setConfirmDialog('treatment')}
          />
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
