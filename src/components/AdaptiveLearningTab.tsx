'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS, DIFFICULTY_OPTIONS, getTopicById } from '@/lib/vet-topics';
import type { AssessmentQuestion, DifficultyType } from '@/lib/types';
import { SkillRadarChart } from '@/components/SkillRadarChart';
import { ConfettiCanvas } from '@/components/ConfettiCanvas';
import { AnimatedNumber } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain, TrendingUp, BarChart3, ChevronRight, ChevronDown, CheckCircle2,
  Loader2, X, ArrowRight, RotateCcw, Sparkles, GraduationCap,
  Shield, Zap, Target, BookOpen, Lock, Unlock, AlertTriangle, Play, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { DsIcon } from '@/lib/ds-icons';

// ===== PHASE ENUM =====
type Phase = 'placement_intro' | 'placement_quiz' | 'placement_results' | 'adaptive_select' | 'adaptive_quiz' | 'adaptive_results';

export function AdaptiveLearningTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const updateSkillMap = useStore((s) => s.updateSkillMap);
  const updateLearningPath = useStore((s) => s.updateLearningPath);
  const addXP = useStore((s) => s.addXP);
  const addAssessmentToHistory = useStore((s) => s.addAssessmentToHistory);
  const updateProfile = useStore((s) => s.updateProfile);
  const savePlacementResult = useStore((s) => s.savePlacementResult);

  const [phase, setPhase] = useState<Phase>(
    profile.placementCompleted ? 'adaptive_select' : 'placement_intro'
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyType>(
    profile.determinedLevel || 'intermediate'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [checkedAnswer, setCheckedAnswer] = useState(false);
  const [showResultsReview, setShowResultsReview] = useState(false);
  const [sprintMode, setSprintMode] = useState(false);
  const [sprintTimeLeft, setSprintTimeLeft] = useState(120); // 2 minutes

  // ===== REAL-TIME ADAPTIVE DIFFICULTY TRACKER =====
  type DifficultyTrend = 'increasing' | 'decreasing' | 'stable';

  const runningDifficulty: DifficultyTrend = useMemo(() => {
    if (assessmentQuestions.length === 0) return 'stable';
    const answeredCount = currentQuestionIndex; // questions already moved past
    if (answeredCount < 2) return 'stable';

    const window = answers.slice(0, answeredCount).slice(-4);
    const baseIndex = answeredCount - window.length;
    const correctCount = window.filter((a, i) => {
      const qIdx = baseIndex + i;
      return a === assessmentQuestions[qIdx]?.correctIndex;
    }).length;

    if (correctCount === window.length) return 'increasing';
    if (correctCount === 0) return 'decreasing';
    if (correctCount >= window.length * 0.9) return 'increasing';
    if (correctCount <= window.length * 0.4) return 'decreasing';
    return 'stable';
  }, [answers, currentQuestionIndex, assessmentQuestions]);

  const difficultyIndicator = useMemo(() => {
    switch (runningDifficulty) {
      case 'increasing':
        return {
          gradient: 'from-[#B4531C] to-[#B3261E]',
          bgLight: 'bg-[#F3EAD3] dark:bg-[#33290F]',
          textColor: 'text-[#B4531C]',
          icon: TrendingUp,
          message: 'AI повышает сложность...',
          subtext: 'Отличные результаты — усложняем',
          pulseColor: '#B4531C',
        };
      case 'decreasing':
        return {
          gradient: 'from-[#4C7A3F] to-[#3D6332]',
          bgLight: 'bg-[#EDF3EA] dark:bg-[#203528]',
          textColor: 'text-[#4C7A3F]',
          icon: TrendingUp,
          message: 'AI адаптирует сложность',
          subtext: 'Снижаем сложность для закрепления',
          pulseColor: '#4C7A3F',
        };
      default:
        return {
          gradient: 'from-[#33608C] to-[#6D4FC4]',
          bgLight: 'bg-[#E9EEF2] dark:bg-[#1A2E44]',
          textColor: 'text-[#33608C]',
          icon: Brain,
          message: 'AI анализирует ответы...',
          subtext: 'Подбираем оптимальный уровень',
          pulseColor: '#33608C',
        };
    }
  }, [runningDifficulty]);

  // Placement specific
  const [placementCount] = useState(15);

  // Timer
  useEffect(() => {
    if (!quizStartTime) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - quizStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [quizStartTime]);

  // Ref to hold latest handleAdaptiveSubmit so the timer effect can call it safely
  const handleAdaptiveSubmitRef = useRef<(force?: boolean) => Promise<void>>(null!);

  // Sprint countdown timer
  useEffect(() => {
    if (!sprintMode || sprintTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setSprintTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sprintMode, sprintTimeLeft]);

  // Auto-submit when sprint timer hits 0
  useEffect(() => {
    if (sprintMode && sprintTimeLeft === 0) {
      // P2-фикс: автосабмит по таймеру — force=true. Раньше на нулевом таймере
      // срабатывал тот же гард «Ответьте на все вопросы», спринт зависал и
      // время сгорало без результата. Неотвеченные засчитываются как неверные.
      handleAdaptiveSubmitRef.current(true);
    }
  }, [sprintMode, sprintTimeLeft]);

  // ===== PLACEMENT TEST LOGIC =====

  const handleStartPlacement = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/assessment/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_questions', count: placementCount }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success) {
        setAssessmentQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
        setCurrentQuestionIndex(0);
        setPhase('placement_quiz');
        setQuizStartTime(Date.now());
        setElapsedSeconds(0);
      } else {
        toast.error(data.error || 'Ошибка загрузки вопросов');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlacementSubmit = async () => {
    if (answers.some(a => a === null)) {
      toast.error('Ответьте на все вопросы перед завершением');
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/assessment/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_results',
          questions: assessmentQuestions,
          answers,
        }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success) {
        // Save placement result to store
        savePlacementResult(data);

        const correctCount = answers.filter((a, i) => a === assessmentQuestions[i]?.correctIndex).length;
        addXP(correctCount * 5 + (data.score >= 80 ? 50 : 20));
        updateProfile({
          totalAnswers: profile.totalAnswers + assessmentQuestions.length,
          correctAnswers: profile.correctAnswers + correctCount,
        });

        setAssessmentResult(data);
        setPhase('placement_results');
        setQuizStartTime(null);

        toast.success(`Уровень определён: ${data.level === 'expert' ? 'Экспертный' : data.level === 'advanced' ? 'Продвинутый' : data.level === 'intermediate' ? 'Средний' : 'Начинающий'}`);
      } else {
        toast.error(data.error || 'Ошибка анализа');
      }
    } catch {
      toast.error('Ошибка анализа');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ===== ADAPTIVE AI TEST LOGIC =====

  const handleStartAdaptive = async () => {
    if (selectedTopics.length === 0) {
      toast.error('Выберите хотя бы одну тему');
      return;
    }
    setIsGenerating(true);
    try {
      const topics = selectedTopics.map(id => {
        const topic = getTopicById(id);
        return { id, name: topic?.name || id };
      });

      // If the user hasn't done placement, still allow AI tests with default difficulty
      const effectiveDifficulty = profile.determinedLevel || difficulty;

      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics, difficulty: effectiveDifficulty, count: questionCount }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success) {
        setAssessmentQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
        setCurrentQuestionIndex(0);
        setPhase('adaptive_quiz');
        setQuizStartTime(Date.now());
        setElapsedSeconds(0);
        setCheckedAnswer(false);
        addXP(5);
        toast.success(`Сгенерировано ${data.questions.length} вопросов`);
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdaptiveSubmit = async (force = false) => {
    setSprintMode(false);
    setSprintTimeLeft(120);
    if (!force && answers.some(a => a === null)) {
      toast.error('Ответьте на все вопросы');
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/assessment/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: assessmentQuestions,
          answers,
          previousSkillMap: profile.skillMap,
        }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success) {
        const correctCount = answers.filter((a, i) => a === assessmentQuestions[i]?.correctIndex).length;
        const xpEarned = correctCount * 10 + (data.score >= 80 ? 50 : data.score >= 60 ? 25 : 10);
        addXP(xpEarned);
        updateSkillMap(data.skillMap || {});
        if (data.learningPath) {
          updateLearningPath(data.learningPath);
        }
        const result = {
          ...data,
          id: `assess_${Date.now()}`,
          questions: assessmentQuestions,
          answers,
          completedAt: new Date().toISOString(),
        };
        setAssessmentResult(result);
        setPhase('adaptive_results');
        setQuizStartTime(null);
        setCheckedAnswer(false);
        // Default-expand review if there are wrong answers
        const hasWrong = answers.some((a, i) => a !== assessmentQuestions[i]?.correctIndex);
        setShowResultsReview(hasWrong);
        addAssessmentToHistory(result);
        updateProfile({
          totalAnswers: profile.totalAnswers + assessmentQuestions.length,
          correctAnswers: profile.correctAnswers + correctCount,
        });
        toast.success(`+${xpEarned} XP! Результат: ${data.score}%`);
      }
    } catch {
      toast.error('Ошибка анализа');
    } finally {
      setIsAnalyzing(false);
    }
  };
  // Keep ref in sync so the auto-submit effect always calls the latest closure
  useEffect(() => {
    handleAdaptiveSubmitRef.current = handleAdaptiveSubmit;
  });

  // ===== COMMON QUIZ HANDLERS =====

  const handleSelectAnswer = (optionIndex: number) => {
    // Prevent changing answer after it has been checked in adaptive quiz
    if (phase === 'adaptive_quiz' && checkedAnswer) return;
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    // For adaptive quiz: first click checks the answer, second click proceeds
    if (phase === 'adaptive_quiz' && !checkedAnswer) {
      setCheckedAnswer(true);
      return;
    }
    // Reset checked state when proceeding to next question
    if (phase === 'adaptive_quiz') {
      setCheckedAnswer(false);
    }
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Submit based on current phase
      if (phase === 'placement_quiz') {
        handlePlacementSubmit();
      } else {
        handleAdaptiveSubmit();
      }
    }
  };

  const handleExitQuiz = () => {
    setAssessmentQuestions([]);
    setAnswers([]);
    setQuizStartTime(null);
    setElapsedSeconds(0);
    setCheckedAnswer(false);
    setSprintMode(false);
    setSprintTimeLeft(120);
    if (phase === 'placement_quiz') {
      setPhase('placement_intro');
    } else {
      setPhase('adaptive_select');
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const isPlacementPhase = phase === 'placement_quiz' || phase === 'placement_results';

  // ===== RENDER: QUIZ IN PROGRESS =====
  if ((phase === 'placement_quiz' || phase === 'adaptive_quiz') && assessmentQuestions.length > 0) {
    const q = assessmentQuestions[currentQuestionIndex];
    return (
      <div className="space-y-4 pb-4">
        {/* Phase indicator */}
        <div className="flex items-center gap-2 mb-1">
          {isPlacementPhase ? (
            <Badge className="bg-[#EDF2F7] text-[#33608C] dark:bg-[#26333F] dark:text-[#82A9CC] border-0 text-[10px]">
              <GraduationCap className="w-3 h-3 mr-1" /> Входное тестирование
            </Badge>
          ) : (
            <Badge className="bg-[#EDF3EA] text-[#4C7A3F] dark:bg-[#203528] dark:text-[#34D399] border-0 text-[10px]">
              <Zap className="w-3 h-3 mr-1" /> AI генерация
            </Badge>
          )}
        </div>

        {/* Real-time Adaptive Difficulty Indicator */}
        {currentQuestionIndex >= 2 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={runningDifficulty}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`rounded-2xl px-4 py-2.5 ${difficultyIndicator.bgLight} border border-border/50`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: runningDifficulty === 'increasing'
                        ? 'linear-gradient(135deg, #B4531C, #B3261E)'
                        : runningDifficulty === 'decreasing'
                          ? 'linear-gradient(135deg, #4C7A3F, #3D6332)'
                          : 'linear-gradient(135deg, #33608C, #6D4FC4)',
                    }}
                  >
                    <motion.div
                      animate={{ rotate: runningDifficulty === 'increasing' ? 0 : runningDifficulty === 'decreasing' ? 180 : 0 }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                      <difficultyIndicator.icon className={`w-4 h-4 ${runningDifficulty === 'decreasing' ? 'rotate-180' : ''} text-white`} />
                    </motion.div>
                  </div>
                  {/* Pulsing dot */}
                  <motion.div
                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full`}
                    style={{ backgroundColor: difficultyIndicator.pulseColor }}
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${difficultyIndicator.textColor}`}>
                      {difficultyIndicator.message}
                    </span>
                    {/* Mini difficulty dots */}
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((dot) => {
                        const isActive = runningDifficulty === 'increasing'
                          ? dot >= 1
                          : runningDifficulty === 'decreasing'
                            ? dot <= 1
                            : dot === 1;
                        return (
                          <motion.div
                            key={dot}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-500`}
                            style={{
                              backgroundColor: isActive ? difficultyIndicator.pulseColor : 'hsl(var(--muted))',
                            }}
                            animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                            transition={{ duration: 2, repeat: Infinity, delay: dot * 0.15 }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {difficultyIndicator.subtext}
                  </p>
                </div>
                {/* Shimmer bar */}
                <div className="w-12 h-1.5 rounded-full overflow-hidden bg-muted/50">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: '60%',
                      background: runningDifficulty === 'increasing'
                        ? 'linear-gradient(90deg, #B4531C, #B3261E)'
                        : runningDifficulty === 'decreasing'
                          ? 'linear-gradient(90deg, #4C7A3F, #3D6332)'
                          : 'linear-gradient(90deg, #33608C, #6D4FC4)',
                    }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExitQuiz}>
            <X className="w-4 h-4 mr-1" /> Выход
          </Button>
          <div className="flex items-center gap-3">
            {sprintMode ? (
              <span className={`text-sm font-bold tabular-nums ${sprintTimeLeft <= 30 ? 'text-[#B3261E] animate-pulse' : 'text-[#B4531C]'}`}>
                {String(Math.floor(sprintTimeLeft / 60)).padStart(2, '0')}:{String(sprintTimeLeft % 60).padStart(2, '0')}
              </span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}
              </span>
            )}
            <span className="text-sm font-medium">
              {currentQuestionIndex + 1} / {assessmentQuestions.length}
            </span>
          </div>
        </div>

        <Progress
          value={((currentQuestionIndex + 1) / assessmentQuestions.length) * 100}
          className="h-1.5"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 30, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Card className="squircle border-0 shadow-sm">
              <CardContent className="p-5">
                <Badge variant="secondary" className="mb-3 text-xs">{q.topicName}</Badge>
                <h3 className="text-base font-semibold mb-5 leading-relaxed">{q.question}</h3>
                <div className="space-y-2.5">
                  {q.options.map((option, i) => {
                    const isSelected = answers[currentQuestionIndex] === i;
                    const isAdaptiveChecked = phase === 'adaptive_quiz' && checkedAnswer;
                    const isCorrectOption = i === q.correctIndex;
                    const isUserWrong = isAdaptiveChecked && isSelected && !isCorrectOption;

                    let optionBorderClass = '';
                    let letterBgClass = '';

                    if (isAdaptiveChecked) {
                      if (isCorrectOption) {
                        optionBorderClass = 'border-[#4C7A3F] bg-[#EDF3EA] dark:bg-[#203528] shadow-sm';
                        letterBgClass = 'bg-[#4C7A3F] text-white';
                      } else if (isUserWrong) {
                        optionBorderClass = 'border-[#B3261E] bg-[#F5E3E1] dark:bg-[#3A2622] shadow-sm';
                        letterBgClass = 'bg-[#B3261E] text-white';
                      } else {
                        optionBorderClass = 'border-border opacity-50';
                        letterBgClass = 'bg-muted text-muted-foreground';
                      }
                    } else {
                      optionBorderClass = isSelected
                        ? 'border-[#4C7A3F] bg-[#EDF3EA] dark:bg-[#203528] shadow-sm'
                        : 'border-border hover:border-[#4C7A3F]/50 hover:bg-muted/50';
                      letterBgClass = isSelected
                        ? 'bg-[#4C7A3F] text-white'
                        : 'bg-muted text-muted-foreground';
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectAnswer(i)}
                        className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 ${optionBorderClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${letterBgClass}`}>
                            {['А', 'Б', 'В', 'Г'][i]}
                          </div>
                          <span className="text-sm flex-1">{option}</span>
                          {isAdaptiveChecked && isCorrectOption && (
                            <CheckCircle2 className="w-4 h-4 text-[#4C7A3F] flex-shrink-0" />
                          )}
                          {isUserWrong && (
                            <X className="w-4 h-4 text-[#B3261E] flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation for adaptive quiz after checking */}
                {phase === 'adaptive_quiz' && checkedAnswer && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <div className="rounded-xl p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                        <div className="flex items-center gap-2 mb-2">
                          {answers[currentQuestionIndex] === q.correctIndex ? (
                            <CheckCircle2 className="w-4 h-4 text-[#4C7A3F]" />
                          ) : (
                            <X className="w-4 h-4 text-[#B3261E]" />
                          )}
                          <span className={`text-xs font-semibold ${
                            answers[currentQuestionIndex] === q.correctIndex
                              ? 'text-[#4C7A3F]'
                              : 'text-[#B3261E]'
                          }`}>
                            {answers[currentQuestionIndex] === q.correctIndex
                              ? 'Правильно!'
                              : 'Неправильно'
                            }
                          </span>
                        </div>
                        {q.explanation && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {q.explanation}
                          </p>
                        )}
                        {answers[currentQuestionIndex] !== q.correctIndex && (
                          <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/30">
                            <p className="text-xs text-[#4C7A3F] font-medium">
                              Правильный ответ: {['А', 'Б', 'В', 'Г'][q.correctIndex]}. {q.options[q.correctIndex]}
                            </p>
                          </div>
                        )}
                        {answers[currentQuestionIndex] !== q.correctIndex && (
                          <button
                            onClick={() => {
                              const card = {
                                id: `fc_${Date.now()}`,
                                term: q.question,
                                definition: q.options[q.correctIndex],
                                example: q.explanation || undefined,
                              };
                              const { flashcards, setFlashcards } = useStore.getState();
                              setFlashcards([...flashcards, card]);
                              toast.success('Карточка создана! Откройте вкладку "Карточки" для изучения.');
                            }}
                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#B4531C]/10 hover:bg-[#B4531C]/20 border border-[#B4531C]/30 text-[#B4531C] text-xs font-semibold transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Создать карточку для повторения
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <Button
          className={`w-full squircle-sm h-12 text-sm font-semibold ${
            phase === 'adaptive_quiz' && checkedAnswer
              ? 'bg-[#33608C] hover:bg-[#264E70] text-white'
              : 'bg-[#4C7A3F] hover:bg-[#3D6332] text-white'
          }`}
          onClick={handleNextQuestion}
          disabled={answers[currentQuestionIndex] === null}
        >
          {/* Adaptive quiz: two-step flow (check → continue) */}
          {phase === 'adaptive_quiz' ? (
            checkedAnswer ? (
              currentQuestionIndex < assessmentQuestions.length - 1 ? (
                <>Продолжить <ChevronRight className="w-4 h-4 ml-1" /></>
              ) : (
                isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Анализирую...</>
                ) : (
                  <>Завершить тест <Sparkles className="w-4 h-4 ml-1" /></>
                )
              )
            ) : (
              <>Проверить ответ <CheckCircle2 className="w-4 h-4 ml-1" /></>
            )
          ) : (
            /* Placement quiz: simple flow */
            currentQuestionIndex < assessmentQuestions.length - 1 ? (
              <>Следующий вопрос <ChevronRight className="w-4 h-4 ml-1" /></>
            ) : (
              isAnalyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Анализирую...</>
              ) : (
                <>Завершить тестирование <GraduationCap className="w-4 h-4 ml-1" /></>
              )
            )
          )}
        </Button>
      </div>
    );
  }

  // ===== RENDER: PLACEMENT RESULTS =====
  if (phase === 'placement_results' && assessmentResult) {
    const levelLabels: Record<string, string> = {
      beginner: 'Начинающий',
      intermediate: 'Средний',
      advanced: 'Продвинутый',
      expert: 'Экспертный',
    };
    const level = assessmentResult.level;
    const levelColors: Record<string, string> = {
      beginner: '#4C7A3F',
      intermediate: '#B4531C',
      advanced: '#B3261E',
      // Task 204 (fix 204-b#11): эксперт был фиолетовым #6D4FC4 — вне ДС
      expert: '#33608C',
    };
    // Task 204 (fix 204-b#12): пустые эмодзи-остатки levelIcons → lucide
    const LEVEL_LUCIDE: Record<string, typeof Brain> = {
      beginner: BookOpen,
      intermediate: TrendingUp,
      advanced: Target,
      expert: Brain,
    };
    const LevelIcon = LEVEL_LUCIDE[level] || Brain;
    return (
      <div className="space-y-4 pb-4 relative">
        {assessmentResult.score >= 80 && <ConfettiCanvas />}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#EDF2F7] to-[#EDF3EA] dark:from-[#26333F] dark:to-[#203528]">
            <CardContent className="p-5 text-center">
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${levelColors[level]}15` }}>
                  <LevelIcon className="w-7 h-7" style={{ color: levelColors[level] }} />
                </div>
              </div>
              <h2 className="text-sm text-muted-foreground mb-1">Ваш уровень подготовки</h2>
              <h1 className="text-2xl font-bold mb-3" style={{ color: levelColors[level] }}>
                {levelLabels[level]}
              </h1>
              <div className="text-3xl font-bold gradient-text mb-1">
                <AnimatedNumber value={assessmentResult.score} />%
              </div>
              <p className="text-sm text-muted-foreground">
                {assessmentResult.message}
              </p>
            </CardContent>
          </Card>

          {/* Score breakdown by difficulty */}
          <Card className="squircle-sm border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-[#33608C]" /> Результаты по уровням
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Начальный', score: assessmentResult.beginnerScore, color: '#4C7A3F' },
                { label: 'Средний', score: assessmentResult.intermediateScore, color: '#B4531C' },
                { label: 'Продвинутый', score: assessmentResult.advancedScore, color: '#B3261E' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.score}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weak and Strong topics */}
          <div className="grid grid-cols-2 gap-3">
            {assessmentResult.weakTopics.length > 0 && (
              <Card className="squircle-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-[#B3261E]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Требуют внимания
                  </h3>
                  <div className="space-y-1">
                    {assessmentResult.weakTopics.slice(0, 4).map((t: string, i: number) => (
                      <p key={i} className="text-[11px] text-muted-foreground">• {t}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {assessmentResult.strongTopics.length > 0 && (
              <Card className="squircle-sm border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-[#4C7A3F]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Сильные стороны
                  </h3>
                  <div className="space-y-1">
                    {assessmentResult.strongTopics.slice(0, 4).map((t: string, i: number) => (
                      <p key={i} className="text-[11px] text-muted-foreground">• {t}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Explanation of the two-phase system */}
          <Card className="squircle-sm border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-3.5 h-3.5" /> Как работает система обучения
              </h3>
              <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                <p>
                  <span className="font-medium text-foreground">Входное тестирование (пройдено)</span> —
                  статические вопросы для определения вашего уровня.
                </p>
                <p>
                  <span className="font-medium text-foreground">Адаптивный ИИ-тест</span> —
                  уникальные вопросы генерируются искусственным интеллектом каждый раз.
                  Ответы нельзя заучить — каждый тест уникален и подстраивается под ваш уровень.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA: Go to adaptive */}
          <Button
            className="w-full squircle-sm bg-gradient-to-r from-[#4C7A3F] to-[#3D6332] hover:from-[#3D6332] hover:to-[#2E4E26] dark:from-[#34D399] dark:to-[#4C7A3F] dark:hover:from-[#4C7A3F] dark:hover:to-[#34D399] text-white dark:text-[#06251B] h-14 text-sm font-bold shadow-lg"
            onClick={() => {
              setAssessmentQuestions([]);
              setAnswers([]);
              setAssessmentResult(null);
              setPhase('adaptive_select');
            }}
          >
            <Zap className="w-4 h-4 mr-2" /> Начать ИИ-обучение
          </Button>

          <Button
            variant="outline"
            className="w-full squircle-sm h-12 text-sm font-medium"
            onClick={handleStartPlacement}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Пройти тестирование заново
          </Button>
        </motion.div>
      </div>
    );
  }

  // ===== RENDER: ADAPTIVE AI RESULTS =====
  if (phase === 'adaptive_results' && assessmentResult) {
    const wrongQuestions = assessmentResult.questions.filter(
      (q: any, i: number) => assessmentResult.answers[i] !== q.correctIndex
    );
    return (
      <div className="space-y-4 pb-4 relative">
        {assessmentResult.score >= 90 && <ConfettiCanvas />}
        <Button variant="ghost" size="sm" onClick={() => {
          setPhase('adaptive_select');
          setAssessmentQuestions([]);
          setAssessmentResult(null);
          setQuizStartTime(null);
        }}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Назад к темам
        </Button>

        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0 text-[10px]">
            <Sparkles className="w-3 h-3 mr-1" /> ИИ-генерация
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            Уровень: {profile.determinedLevel === 'expert' ? 'Экспертный' : profile.determinedLevel === 'advanced' ? 'Продвинутый' : profile.determinedLevel === 'intermediate' ? 'Средний' : 'Начинающий'}
          </Badge>
        </div>

        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="text-5xl mb-2">
              {assessmentResult.score >= 80 ? '' : assessmentResult.score >= 60 ? '' : ''}
            </div>
            <h2 className="text-2xl font-bold gradient-text mb-1">
              <AnimatedNumber value={assessmentResult.score} />%
            </h2>
            <p className="text-sm text-muted-foreground">
              {assessmentResult.score >= 80 ? 'Отличный результат!' :
               assessmentResult.score >= 60 ? 'Хороший результат, есть что улучшить' :
               'Продолжайте учиться, вы на верном пути!'}
            </p>
          </CardContent>
        </Card>

        {assessmentResult.summary && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#33608C]" /> Анализ
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{assessmentResult.summary}</p>
            </CardContent>
          </Card>
        )}

        {assessmentResult.skillMap && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4C7A3F]" /> Уровень знаний
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillRadarChart skillMap={assessmentResult.skillMap} />
            </CardContent>
          </Card>
        )}

        {assessmentResult.learningPath && assessmentResult.learningPath.length > 0 && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#B4531C]" /> План обучения
              </h3>
              <div className="space-y-2">
                {assessmentResult.learningPath.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                    <Badge
                      className={`text-[10px] mt-0.5 ${
                        item.priority === 'high' ? 'bg-[#B3261E]/10 text-[#B3261E] border-0' :
                        item.priority === 'medium' ? 'bg-[#B4531C]/10 text-[#B4531C] border-0' :
                        'bg-[#4C7A3F]/10 text-[#4C7A3F] border-0'
                      }`}
                    >
                      {item.priority === 'high' ? 'Важно' : item.priority === 'medium' ? 'Среднее' : 'Низкое'}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-relaxed">{item.topicName}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
                      {item.mastery !== undefined && (
                        <div className="mt-1.5">
                          <Progress value={item.mastery} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.mastery}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {wrongQuestions.length > 0 && (
          <Button
            variant="outline"
            className="w-full squircle-sm h-12 text-sm font-medium"
            onClick={() => {
              setAssessmentQuestions(wrongQuestions);
              setAnswers(new Array(wrongQuestions.length).fill(null));
              setCurrentQuestionIndex(0);
              setPhase('adaptive_quiz');
              setQuizStartTime(Date.now());
              setElapsedSeconds(0);
              setAssessmentResult(null);
              setCheckedAnswer(false);
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Повторить ошибки ({wrongQuestions.length})
          </Button>
        )}

        {/* Detailed Question Review Section */}
        <Card className="squircle-sm border-0 shadow-sm">
          <CardContent className="p-4">
            <button
              onClick={() => setShowResultsReview(prev => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#33608C]" /> Разбор вопросов
              </h3>
              <motion.div
                animate={{ rotate: showResultsReview ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showResultsReview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {assessmentResult.questions.map((q: any, i: number) => {
                      const userAnswer = assessmentResult.answers[i];
                      const isCorrect = userAnswer != null && userAnswer === q.correctIndex;

                      return (
                        <div
                          key={i}
                          className={`rounded-xl p-3 border ${
                            isCorrect
                              ? 'bg-[#EDF3EA]/50 dark:bg-[#203528]/30 border-[#4C7A3F]/20'
                              : 'bg-[#F5E3E1]/50 dark:bg-[#3A2622]/30 border-[#B3261E]/20'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-1.5">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-[#4C7A3F] mt-0.5 flex-shrink-0" />
                            ) : (
                              <X className="w-4 h-4 text-[#B3261E] mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground mb-0.5">
                                Вопрос {i + 1} из {assessmentResult.questions.length}
                              </p>
                              <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                            </div>
                          </div>

                          {isCorrect ? (
                            <div className="ml-6 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4C7A3F]">
                                <CheckCircle2 className="w-3 h-3" /> Правильно!
                              </span>
                            </div>
                          ) : (
                            <div className="ml-6 mt-1.5 space-y-1.5">
                              <div className="text-xs">
                                <span className="text-[#B3261E]">
                                  {userAnswer != null
                                    ? <>Ваш ответ: {['А', 'Б', 'В', 'Г'][userAnswer]}. {q.options[userAnswer]}</>
                                    : 'Пропущен'
                                  }
                                </span>
                              </div>
                              <div className="text-xs">
                                <span className="text-[#4C7A3F] font-medium">
                                  Правильный ответ: {['А', 'Б', 'В', 'Г'][q.correctIndex]}. {q.options[q.correctIndex]}
                                </span>
                              </div>
                              {q.explanation && (
                                <div className="mt-1.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {q.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Button
          className="w-full squircle-sm bg-[#4C7A3F] hover:bg-[#3D6332] text-white h-12"
          onClick={() => {
            setPhase('adaptive_select');
            setAssessmentQuestions([]);
            setAssessmentResult(null);
            setQuizStartTime(null);
          }}
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Новый ИИ-тест
        </Button>
      </div>
    );
  }

  // ===== RENDER: PLACEMENT INTRO =====
  if (phase === 'placement_intro') {
    return (
      <div className="space-y-4 pb-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Task 204 (fix 204-b#11): фиолетово-индиго градиент — мимо ДС */}
          <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#EDF2F7] to-[#EDF3EA] dark:from-[#26333F] dark:to-[#203528]">
            <CardContent className="p-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4C7A3F] to-[#3D6332] dark:from-[#34D399] dark:to-[#4C7A3F] flex items-center justify-center mx-auto mb-4 shadow-lg">
                <GraduationCap className="w-8 h-8 text-white dark:text-[#06251B]" />
              </div>
              <h2 className="text-xl font-bold mb-2 gradient-text">Входное тестирование</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Прежде чем начать обучение, пройдите быстрый тест из {placementCount} вопросов.
                Он поможет определить ваш текущий уровень подготовки.
              </p>

              <div className="space-y-3 text-left mb-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF2F7] dark:bg-[#26333F] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-[#33608C] dark:text-[#82A9CC]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Фаза 1: Входной тест</p>
                    <p className="text-[11px] text-muted-foreground">
                      {placementCount} вопросов из базы знаний — определяем базовый уровень
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF2F7] dark:bg-[#26333F] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-[#33608C] dark:text-[#82A9CC]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Фаза 2: ИИ-обучение</p>
                    <p className="text-[11px] text-muted-foreground">
                      Уникальные вопросы от ИИ — каждый раз новые, нельзя заучить
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5">
                  <div className="w-8 h-8 rounded-lg bg-[#EDF3EA] dark:bg-[#203528] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Target className="w-4 h-4 text-[#4C7A3F] dark:text-[#34D399]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Адаптивная сложность</p>
                    <p className="text-[11px] text-muted-foreground">
                      Вопросы подбираются под ваш уровень для максимальной эффективности
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full squircle-sm bg-gradient-to-r from-[#4C7A3F] to-[#3D6332] hover:from-[#3D6332] hover:to-[#2E4E26] dark:from-[#34D399] dark:to-[#4C7A3F] dark:hover:from-[#4C7A3F] dark:hover:to-[#34D399] text-white dark:text-[#06251B] h-14 text-sm font-bold shadow-lg"
            onClick={handleStartPlacement}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Загрузка вопросов...</>
            ) : (
              <><GraduationCap className="w-4 h-4 mr-2" /> Начать тестирование</>
            )}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Займёт примерно 5-10 минут
          </p>
        </motion.div>
      </div>
    );
  }

  // ===== RENDER: ADAPTIVE TOPIC SELECTION =====
  if (phase === 'adaptive_select') {
    const userLevel = profile.determinedLevel || 'intermediate';
    const levelLabel = userLevel === 'expert' ? 'Экспертный' : userLevel === 'advanced' ? 'Продвинутый' : userLevel === 'intermediate' ? 'Средний' : 'Начинающий';

    return (
      <div className="space-y-4 pb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-bold">Адаптивное обучение</h2>
              <p className="text-sm text-muted-foreground">ИИ генерирует уникальные вопросы</p>
            </div>
            {profile.placementCompleted && (
              <Badge className="bg-[#EDF2F7] text-[#33608C] dark:bg-[#26333F] dark:text-[#82A9CC] border-0 text-[10px]">
                <Shield className="w-3 h-3 mr-1" /> {levelLabel}
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Level info card */}
        {profile.placementCompleted && (
          <Card className="squircle-sm border-0 shadow-sm bg-gradient-to-r from-[#EDF2F7] to-[#EDF3EA] dark:from-[#26333F] dark:to-[#203528]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4C7A3F] to-[#3D6332] dark:from-[#34D399] dark:to-[#4C7A3F] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white dark:text-[#06251B]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">ИИ адаптирован под вас</p>
                    <p className="text-[11px] text-muted-foreground">
                      Вопросы генерируются на уровне &laquo;{levelLabel}&raquo; — нельзя заучить
                    </p>
                  </div>
                </div>
                {profile.placementScore !== undefined && (
                  <div className="text-right">
                    <p className="text-lg font-bold">{profile.placementScore}%</p>
                    <p className="text-[10px] text-muted-foreground">тестирование</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Difficulty info (auto-determined) */}
        <Card className="squircle-sm border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Уровень сложности</h3>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium text-center transition-all ${
                    userLevel === opt.value
                      ? 'bg-[#4C7A3F] text-white shadow-md scale-105'
                      : profile.placementCompleted
                        ? 'bg-muted/50 text-muted-foreground cursor-default'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!profile.placementCompleted) {
                      setDifficulty(opt.value);
                    }
                  }}
                >
                  {opt.label}
                  {userLevel === opt.value && profile.placementCompleted && (
                    <div className="text-[11px] mt-0.5 opacity-80">авто</div>
                  )}
                </div>
              ))}
            </div>
            {profile.placementCompleted && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Уровень определён автоматически по результатам входного тестирования
              </p>
            )}
          </CardContent>
        </Card>

        {/* Question count */}
        <Card className="squircle-sm border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Количество вопросов</h3>
            <div className="flex gap-2">
              {[5, 10, 15].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    questionCount === n
                      ? 'bg-[#4C7A3F] text-white shadow-md'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sprint Mode Card */}
        <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#B4531C]/5 to-[#B3261E]/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B4531C] to-[#B3261E] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold">Спринт-режим</h3>
                <p className="text-xs text-muted-foreground">5 вопросов, 2 минуты, случайные темы</p>
              </div>
              <Button
                size="sm"
                className="bg-[#B4531C] hover:bg-[#8A5A14] text-white squircle-sm font-semibold"
                onClick={async () => {
                  setSprintMode(true);
                  setSprintTimeLeft(120);
                  // Pick 3 random topics
                  const shuffled = [...VET_TOPICS].sort(() => Math.random() - 0.5);
                  const randomTopics = shuffled.slice(0, 3).map(t => ({ id: t.id, name: t.name }));
                  setSelectedTopics(randomTopics.map(t => t.id));
                  setIsGenerating(true);
                  try {
                    const effectiveDifficulty = profile.determinedLevel || difficulty;
                    const res = await fetch('/api/assessment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ topics: randomTopics, difficulty: effectiveDifficulty, count: 5 }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setAssessmentQuestions(data.questions);
                      setAnswers(new Array(data.questions.length).fill(null));
                      setCurrentQuestionIndex(0);
                      setPhase('adaptive_quiz');
                      setQuizStartTime(Date.now());
                      setElapsedSeconds(0);
                      setCheckedAnswer(false);
                      addXP(5);
                      toast.success('Спринт начат! 2 минуты на 5 вопросов');
                    } else {
                      toast.error(data.error || 'Ошибка генерации');
                    }
                  } catch {
                    toast.error('Ошибка соединения');
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Topic selection */}
        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Темы ({selectedTopics.length} выбрано)</h3>
              <Button variant="ghost" size="sm" className="text-xs h-7"
                onClick={() => setSelectedTopics(selectedTopics.length === VET_TOPICS.length ? [] : VET_TOPICS.map(t => t.id))}>
                {selectedTopics.length === VET_TOPICS.length ? 'Снять все' : 'Выбрать все'}
              </Button>
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              {VET_TOPICS.map(topic => {
                const isSelected = selectedTopics.includes(topic.id);
                const mastery = profile.skillMap[topic.id] || 0;

                return (
                  <div key={topic.id}>
                    <button
                      onClick={() => toggleTopic(topic.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#EDF3EA] dark:bg-[#203528] border-2 border-[#4C7A3F]/30'
                          : 'hover:bg-muted/50 border-2 border-transparent'
                      }`}
                    >
                      <DsIcon name={topic.icon} className="w-5 h-5 shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{topic.name}</p>
                        <p className="text-[10px] text-muted-foreground">{topic.subtopics.length} подтем</p>
                      </div>
                      {mastery > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#4C7A3F]" style={{ width: `${mastery}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{mastery}%</span>
                        </div>
                      )}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        isSelected ? 'bg-[#4C7A3F] text-white scale-110' : 'bg-muted'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Generate button */}
        <Button
          className="w-full squircle-sm bg-[#4C7A3F] hover:bg-[#3D6332] text-white h-14 text-sm font-bold shadow-lg"
          onClick={handleStartAdaptive}
          disabled={selectedTopics.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> ИИ генерирует вопросы...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Начать ИИ-тест ({questionCount} вопросов)</>
          )}
        </Button>

        {/* Retake placement */}
        {profile.placementCompleted && (
          <Button
            variant="outline"
            className="w-full squircle-sm h-12 text-sm font-medium"
            onClick={() => setPhase('placement_intro')}
          >
            <GraduationCap className="w-4 h-4 mr-2" /> Пересдать входной тест
          </Button>
        )}

        {/* Learning Path */}
        {profile.learningPath.length > 0 && (
          <Card className="squircle border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#B4531C]" /> План обучения
              </h3>
              <div className="space-y-2">
                {profile.learningPath.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      item.priority === 'high' ? 'bg-[#B3261E]' :
                      item.priority === 'medium' ? 'bg-[#B4531C]' : 'bg-[#4C7A3F]'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-relaxed">{item.topicName}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.mastery}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

