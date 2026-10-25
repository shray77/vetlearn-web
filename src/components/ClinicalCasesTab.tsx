'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS, SPECIES_OPTIONS, DIFFICULTY_OPTIONS } from '@/lib/vet-topics';
import type { SpeciesType, DifficultyType } from '@/lib/types';
import { DIFFICULTY_LABELS, LoadingSpinner } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Stethoscope, Lightbulb, ChevronRight, CheckCircle2, XCircle,
  Loader2, X, ArrowRight, Sparkles, AlertTriangle, BarChart3, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { DsIcon } from '@/lib/ds-icons';

export function ClinicalCasesTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const currentCase = useStore((s) => s.currentCase);
  const setCurrentCase = useStore((s) => s.setCurrentCase);
  const addCaseToHistory = useStore((s) => s.addCaseToHistory);
  const addXP = useStore((s) => s.addXP);
  const updateProfile = useStore((s) => s.updateProfile);
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesType>('собаки');
  const [selectedDifficulty, setDifficulty] = useState<DifficultyType>('intermediate');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [caseAnswers, setCaseAnswers] = useState<(number | null)[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [caseResult, setCaseResult] = useState<any>(null);
  const [showCaseResult, setShowCaseResult] = useState(false);
  // Per-question immediate feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);

  // Normalize options to strings — API sometimes returns objects
  const normalizeOptions = (opts: unknown[]): string[] => {
    return opts.map(opt => {
      if (typeof opt === 'string') return opt;
      if (typeof opt === 'object' && opt !== null) {
        // Try common property names
        const obj = opt as Record<string, unknown>;
        return String(obj.text || obj.value || obj.label || obj.answer || JSON.stringify(obj));
      }
      return String(opt);
    });
  };

  const handleGenerateCase = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/case/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species: selectedSpecies,
          difficulty: selectedDifficulty,
          topic: selectedTopic || undefined,
        }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.isFallback) {
        toast.warning('ИИ недоступен — показан резервный кейс');
      }
      if (data.success) {
        // Validate the case structure before setting it
        if (!data.case || !Array.isArray(data.case.questions) || data.case.questions.length === 0) {
          console.error('[ClinicalCasesTab] Invalid case structure received:', data.case);
          toast.error('Получен некорректный формат кейса. Попробуйте ещё раз.');
          return;
        }
        // Fix [object Object] bug — normalize options to strings
        const normalizedCase = {
          ...data.case,
          questions: data.case.questions.map((q: any) => ({
            ...q,
            options: normalizeOptions(q.options || []),
          })),
        };
        setCurrentCase(normalizedCase);
        setCaseAnswers(new Array(data.case.questions.length).fill(null));
        setCurrentQuestionIndex(0);
        setShowCaseResult(false);
        setCaseResult(null);
        setShowFeedback(false);
        setFeedbackCorrect(false);
        addXP(5);
        if (data.isFallback) {
          toast.success('Клинический случай загружен (резервный вариант).');
        } else {
          toast.success('Клинический случай сгенерирован!');
        }
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitCase = async () => {
    if (!currentCase) return;
    if (caseAnswers.some(a => a === null)) {
      toast.error('Ответьте на все вопросы');
      return;
    }
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/case/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case: currentCase,
          answers: caseAnswers,
        }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.isFallback) {
        toast.warning('ИИ-оценка недоступна — выставлены базовые баллы');
      }
      if (data.success) {
        addXP(data.xpEarned || 25);
        const result = { ...data, completedAt: new Date().toLocaleDateString('ru-RU') };
        setCaseResult(result);
        setShowCaseResult(true);
        addCaseToHistory(currentCase);
        const currentState = useStore.getState().profile;
        updateProfile({
          completedCases: currentState.completedCases + 1,
          totalAnswers: currentState.totalAnswers + currentCase.questions.length,
          correctAnswers: currentState.correctAnswers + (data.correctAnswers || 0),
        });
        toast.success(`+${data.xpEarned || 25} XP!`);
      }
    } catch {
      toast.error('Ошибка проверки');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Case generation form
  if (!currentCase) {
    return (
      <div className="space-y-4 pb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-lg font-bold mb-1">AI Клинические кейсы</h2>
          <p className="text-sm text-muted-foreground">Сгенерируйте уникальный клинический случай для тренировки</p>
        </motion.div>

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
                      ? 'bg-[#EDF3EA] dark:bg-[#203528] border-2 border-[#4C7A3F]/30 scale-105 shadow-sm'
                      : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                  }`}
                >
                  <DsIcon name={sp.icon} className="w-6 h-6" />
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
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
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
                  !selectedTopic ? 'bg-[#4C7A3F] text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Любая
              </button>
              {VET_TOPICS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t.id === selectedTopic ? '' : t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTopic === t.id ? 'bg-[#4C7A3F] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <DsIcon name={t.icon} className="w-3.5 h-3.5 inline-block align-[-3px] mr-1" /> {t.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full squircle-sm bg-[#4C7A3F] hover:bg-[#3D6332] text-white h-14 text-sm font-bold shadow-lg"
          onClick={handleGenerateCase}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерация кейса...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Сгенерировать клинический случай</>
          )}
        </Button>

        {isGenerating && <LoadingSpinner text="AI создаёт уникальный клинический случай..." />}
      </div>
    );
  }

  // Case results view
  if (showCaseResult && caseResult) {
    return (
      <div className="space-y-4 pb-4">
        <Button variant="ghost" size="sm" onClick={() => { setCurrentCase(null); setShowCaseResult(false); }}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Новый кейс
        </Button>

        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="text-5xl mb-2">
              {caseResult.score >= 80 ? '' : caseResult.score >= 50 ? '' : ''}
            </div>
            <h2 className="text-2xl font-bold gradient-text mb-1">
              {caseResult.score}%
            </h2>
            <p className="text-sm text-muted-foreground">
              {caseResult.correctAnswers} из {caseResult.totalQuestions} правильных ответов
            </p>
          </CardContent>
        </Card>

        {caseResult.overallFeedback && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#33608C]" /> Обратная связь
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{caseResult.overallFeedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Question feedback */}
        {caseResult.feedback && caseResult.feedback.map((fb: any, i: number) => (
          <Card key={i} className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-2">
                {fb.correct ? (
                  <CheckCircle2 className="w-5 h-5 text-[#4C7A3F] mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#B3261E] mt-0.5 shrink-0" />
                )}
                <p className="text-sm font-medium">Вопрос {i + 1}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Ваш ответ: {fb.studentAnswer}
                {!fb.correct && <> • Правильно: <span className="text-[#4C7A3F] font-medium">{fb.correctAnswer}</span></>}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{fb.explanation}</p>
            </CardContent>
          </Card>
        ))}

        {caseResult.keyTakeaways && caseResult.keyTakeaways.length > 0 && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#B4531C]" /> Главные выводы
              </h3>
              <ul className="space-y-1">
                {caseResult.keyTakeaways.map((t: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-[#4C7A3F] mt-0.5">•</span> {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full squircle-sm bg-[#4C7A3F] hover:bg-[#3D6332] text-white h-12"
          onClick={() => { setCurrentCase(null); setShowCaseResult(false); }}
        >
          <Sparkles className="w-4 h-4 mr-2" /> Новый клинический случай
        </Button>
      </div>
    );
  }

  // Case in progress
  const q = currentCase.questions?.[currentQuestionIndex];
  // Guard: if question or options are missing, skip rendering
  if (!q || !q.options || !Array.isArray(q.options)) {
    return (
      <div className="space-y-4 pb-4">
        <p className="text-center text-sm text-muted-foreground py-8">Ошибка: вопрос не найден.</p>
        <Button variant="ghost" size="sm" onClick={() => setCurrentCase(null)}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Новый кейс
        </Button>
      </div>
    );
  }
  if (q.correctIndex == null) {
    return (
      <div className="space-y-4 pb-4">
        <p className="text-center text-sm text-muted-foreground py-8">Ошибка: вопрос повреждён.</p>
        <Button variant="ghost" size="sm" onClick={() => setCurrentCase(null)}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Новый кейс
        </Button>
      </div>
    );
  }
  const isCorrect = caseAnswers[currentQuestionIndex] !== null && caseAnswers[currentQuestionIndex] === q.correctIndex;

  const handleRevealFeedback = () => {
    if (caseAnswers[currentQuestionIndex] === null) return;
    setFeedbackCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleFeedbackContinue = () => {
    setShowFeedback(false);
    if (currentQuestionIndex < currentCase.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmitCase();
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentCase(null)}>
          <X className="w-4 h-4 mr-1" /> Выход
        </Button>
        <span className="text-sm font-medium">
          {currentQuestionIndex + 1} / {currentCase.questions.length}
        </span>
      </div>

      {/* Case description (shown only for first question) */}
      {currentQuestionIndex === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#33608C]/5 to-[#6D4FC4]/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="text-xs">{currentCase.species}</Badge>
                <Badge variant="secondary" className="text-xs">{DIFFICULTY_LABELS[currentCase.difficulty] || currentCase.difficulty}</Badge>
                {currentCase.topic && <Badge variant="outline" className="text-xs">{currentCase.topic}</Badge>}
              </div>
              <h3 className="text-base font-bold">{currentCase.title}</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#B3261E]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#B3261E]" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Жалобы</span>
                    <p className="text-sm leading-relaxed mt-0.5">{currentCase.presentation}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#33608C]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-[#33608C]" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Анамнез</span>
                    <p className="text-sm leading-relaxed mt-0.5">{currentCase.history}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#4C7A3F]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#4C7A3F]" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Осмотр</span>
                    <p className="text-sm leading-relaxed mt-0.5">{currentCase.examination}</p>
                  </div>
                </div>
                {currentCase.labResults && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#6D4FC4]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart3 className="w-3.5 h-3.5 text-[#6D4FC4]" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Лаборатория</span>
                      <p className="text-sm leading-relaxed mt-0.5">{currentCase.labResults}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Progress value={((currentQuestionIndex + 1) / currentCase.questions.length) * 100} className="h-1.5" />

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
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  {q.type === 'diagnosis' ? 'Диагноз' :
                   q.type === 'treatment' ? 'Лечение' :
                   q.type === 'differential' ? 'Дифференциальный' :
                   q.type === 'lab' ? 'Лаборатория' : 'Прогноз'}
                </Badge>
                {q.difficulty && <Badge variant="outline" className="text-xs">{DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</Badge>}
              </div>
              <h3 className="text-base font-semibold mb-5 leading-relaxed">{q.question}</h3>
              <div className="space-y-2.5">
                {q.options.map((option, i) => {
                  // When feedback is showing, highlight correct/incorrect options
                  let optionClass = 'border-border hover:border-[#33608C]/50 hover:bg-muted/50';
                  let letterClass = 'bg-muted text-muted-foreground';

                  if (showFeedback) {
                    if (i === q.correctIndex) {
                      optionClass = 'border-[#4C7A3F] bg-[#EDF3EA] dark:bg-[#203528]';
                      letterClass = 'bg-[#4C7A3F] text-white';
                    } else if (caseAnswers[currentQuestionIndex] === i && i !== q.correctIndex) {
                      optionClass = 'border-[#B3261E] bg-[#F5E3E1] dark:bg-[#3A2622]';
                      letterClass = 'bg-[#B3261E] text-white';
                    } else {
                      optionClass = 'border-border/50 opacity-50';
                      letterClass = 'bg-muted/50 text-muted-foreground';
                    }
                  } else if (caseAnswers[currentQuestionIndex] === i) {
                    optionClass = 'border-[#33608C] bg-[#33608C]/5 shadow-sm';
                    letterClass = 'bg-[#33608C] text-white';
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (showFeedback) return; // Don't allow changing after reveal
                        const newAnswers = [...caseAnswers];
                        newAnswers[currentQuestionIndex] = i;
                        setCaseAnswers(newAnswers);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 ${optionClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${letterClass}`}>
                          {showFeedback && i === q.correctIndex ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : showFeedback && caseAnswers[currentQuestionIndex] === i && i !== q.correctIndex ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            ['А', 'Б', 'В', 'Г'][i]
                          )}
                        </div>
                        <span className="text-sm">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Inline feedback after reveal */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <div className={`p-4 rounded-xl border-2 ${
                      feedbackCorrect
                        ? 'bg-[#EDF3EA] dark:bg-[#203528] border-[#4C7A3F]/30'
                        : 'bg-[#F3EAD3] dark:bg-[#33290F] border-[#B4531C]/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {feedbackCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-[#4C7A3F] shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[#B4531C] shrink-0" />
                        )}
                        <span className={`text-sm font-semibold ${feedbackCorrect ? 'text-[#4C7A3F]' : 'text-[#B4531C]'}`}>
                          {feedbackCorrect ? 'Правильно!' : 'Неправильно'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                      {!feedbackCorrect && (
                        <p className="text-xs mt-2">
                          <span className="text-muted-foreground">Правильный ответ: </span>
                          <span className="font-semibold text-[#4C7A3F]">{q.options[q.correctIndex]}</span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <Button
        className="w-full squircle-sm bg-[#33608C] hover:bg-[#264E70] text-white h-12 text-sm font-semibold"
        onClick={showFeedback ? handleFeedbackContinue : handleRevealFeedback}
        disabled={caseAnswers[currentQuestionIndex] === null}
      >
        {showFeedback ? (
          currentQuestionIndex < currentCase.questions.length - 1 ? (
            <>Продолжить <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            isEvaluating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Проверяю...</>
            ) : (
              <>Проверить все ответы <Sparkles className="w-4 h-4 ml-1" /></>
            )
          )
        ) : (
          currentQuestionIndex < currentCase.questions.length - 1 ? (
            <>Проверить ответ <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            isEvaluating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Проверяю...</>
            ) : (
              <>Проверить ответы <Sparkles className="w-4 h-4 ml-1" /></>
            )
          )
        )}
      </Button>
    </div>
  );
}
