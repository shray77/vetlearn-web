'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS, DIFFICULTY_OPTIONS } from '@/lib/vet-topics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/utility';
import {
  GraduationCap, Play, Square, Send, RotateCcw,
  Clock, CheckCircle2, XCircle, AlertCircle,
  Trophy, Target, TrendingUp, Star, ArrowRight,
  MessageSquare, Lightbulb, ChevronDown, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== Types ====================

interface ExamQuestion {
  id: string;
  text: string;
  hints: string[];
}

interface ExamFeedback {
  correct: boolean;
  score: number;
  explanation: string;
  followUp: string | null;
}

interface ExamResults {
  overallScore: number;
  grade: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface QuestionRecord {
  question: string;
  answer: string;
  feedback: ExamFeedback;
  followUp?: string;
  followUpAnswer?: string;
  followUpFeedback?: ExamFeedback;
}

// ==================== Helpers ====================

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'Отлично': return '#4C7A3F';
    case 'Хорошо': return '#33608C';
    case 'Удовлетворительно': return '#B4531C';
    default: return '#B3261E';
  }
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-[#4C7A3F]';
  if (score >= 5) return 'text-[#B4531C]';
  return 'text-[#B3261E]';
}

function getScoreBg(score: number): string {
  if (score >= 8) return 'bg-[#4C7A3F]/10 border-[#4C7A3F]/30';
  if (score >= 5) return 'bg-[#B4531C]/10 border-[#B4531C]/30';
  return 'bg-[#B3261E]/10 border-[#B3261E]/30';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ==================== Component ====================

export function MockExamTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const addXP = useStore((s) => s.addXP);
  const updateSkillMap = useStore((s) => s.updateSkillMap);

  // View state
  const [view, setView] = useState<'setup' | 'exam' | 'results'>('setup');

  // Setup state
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Exam state
  const [examId, setExamId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<ExamQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentFollowUp, setCurrentFollowUp] = useState<string | null>(null);
  const [currentFollowUpAnswer, setCurrentFollowUpAnswer] = useState('');
  const [questionHistory, setQuestionHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [questionRecords, setQuestionRecords] = useState<QuestionRecord[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showHints, setShowHints] = useState(false);

  // Results state
  const [results, setResults] = useState<ExamResults | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  // Scroll ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (view === 'exam' && !isLoading) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, isLoading]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [questionRecords, currentFollowUp, isLoading]);

  // Start exam
  const handleStartExam = useCallback(async () => {
    if (selectedTopics.length === 0) {
      toast.error('Выберите хотя бы одну тему');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          topics: selectedTopics,
          difficulty,
          questionCount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExamId(data.examId);
        setCurrentQuestion(data.firstQuestion);
        setQuestionHistory([]);
        setQuestionRecords([]);
        setAnsweredCount(0);
        setTimer(0);
        setCurrentAnswer('');
        setCurrentFollowUp(null);
        setCurrentFollowUpAnswer('');
        setShowHints(false);
        setView('exam');
        toast.success('Экзамен начат!');
      } else {
        toast.error(data.error || 'Ошибка начала экзамена');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTopics, difficulty, questionCount]);

  // Finish exam (declared before handleSubmitAnswer to avoid access-before-declaration)
  const finishExam = useCallback((
    examResults: ExamResults,
    records: QuestionRecord[]
  ) => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate XP
    const baseXP = records.length * 5;
    let bonusXP = 0;
    if (examResults.overallScore >= 90) bonusXP = 50;
    else if (examResults.overallScore >= 75) bonusXP = 30;
    else if (examResults.overallScore >= 60) bonusXP = 15;
    const totalXP = baseXP + bonusXP;

    setXpEarned(totalXP);
    setResults(examResults);
    setView('results');

    // Award XP
    addXP(totalXP);

    // Update skill map based on topics
    const skillUpdates: Record<string, number> = {};
    selectedTopics.forEach(topicId => {
      skillUpdates[topicId] = examResults.overallScore;
    });
    if (Object.keys(skillUpdates).length > 0) {
      updateSkillMap(skillUpdates);
    }

    toast.success(`Экзамен завершён! +${totalXP} XP`);
  }, [addXP, updateSkillMap, selectedTopics]);

  // Submit answer
  const handleSubmitAnswer = useCallback(async () => {
    if (!currentAnswer.trim() || !currentQuestion || isLoading) return;

    setIsLoading(true);
    const isFollowUp = !!currentFollowUp;
    const answerText = isFollowUp ? currentFollowUpAnswer : currentAnswer;

    try {
      const history = [
        ...questionHistory,
        { question: currentQuestion.text, answer: answerText },
      ];

      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          examId,
          questionId: currentQuestion.id,
          answer: answerText,
          questionHistory: history,
          questionCount,
          currentQuestionIndex: answeredCount,
          topics: selectedTopics,
          difficulty,
          isLastQuestion: answeredCount >= questionCount - 1,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const feedback: ExamFeedback = data.feedback;

        if (isFollowUp) {
          // After follow-up answer, move to next question or complete
          const updatedRecords = [...questionRecords];
          const lastRecord = updatedRecords[updatedRecords.length - 1];
          if (lastRecord) {
            updatedRecords[updatedRecords.length - 1] = {
              ...lastRecord,
              followUpAnswer: answerText,
              followUpFeedback: feedback,
            };
          }
          setQuestionRecords(updatedRecords);

          // Follow-up завершает текущий вопрос — счётчик должен расти и на этом пути
          // (раньше прогресс висел, а экзамен мог идти дольше questionCount)
          const newAnswered = answeredCount + 1;
          setAnsweredCount(newAnswered);

          if (data.nextQuestion) {
            setQuestionHistory(history);
            setCurrentQuestion(data.nextQuestion);
            setCurrentAnswer('');
            setCurrentFollowUp(null);
            setCurrentFollowUpAnswer('');
            setShowHints(false);
          } else if (data.examComplete && data.results) {
            finishExam(data.results, updatedRecords);
          } else if (newAnswered >= questionCount) {
            // Страховка: сервер не прислал ни вопрос, ни результаты — завершаем принудительно
            const forcedResults: ExamResults = {
              overallScore: Math.min(100, Math.round(
                updatedRecords.reduce((sum, r) => sum + r.feedback.score, 0) / Math.max(1, updatedRecords.length) * 10
              )),
              grade: '',
              summary: 'Экзамен завершён.',
              strengths: [],
              weaknesses: [],
              recommendations: [],
            };
            if (forcedResults.overallScore >= 90) forcedResults.grade = 'Отлично';
            else if (forcedResults.overallScore >= 75) forcedResults.grade = 'Хорошо';
            else if (forcedResults.overallScore >= 60) forcedResults.grade = 'Удовлетворительно';
            else forcedResults.grade = 'Неудовлетворительно';
            finishExam(forcedResults, updatedRecords);
          } else {
            // Сервер не прислал следующий вопрос, но лимит не достигнут — просто ждём
            setQuestionHistory(history);
            setCurrentAnswer('');
            setCurrentFollowUp(null);
            setCurrentFollowUpAnswer('');
            setShowHints(false);
          }
        } else {
          // Main answer — check for follow-up
          const record: QuestionRecord = {
            question: currentQuestion.text,
            answer: answerText,
            feedback,
          };

          if (feedback.followUp) {
            // Show follow-up question
            setCurrentFollowUp(feedback.followUp);
            setCurrentFollowUpAnswer('');
            setQuestionRecords(prev => [...prev, { ...record, followUp: feedback.followUp || undefined }]);
            setQuestionHistory(prev => [...prev, { question: currentQuestion.text, answer: answerText }]);
          } else {
            // No follow-up — move on
            const newRecords = [...questionRecords, record];
            setQuestionRecords(newRecords);
            const newAnswered = answeredCount + 1;
            setAnsweredCount(newAnswered);

            if (data.nextQuestion) {
              setQuestionHistory(history);
              setCurrentQuestion(data.nextQuestion);
              setCurrentAnswer('');
              setCurrentFollowUp(null);
              setCurrentFollowUpAnswer('');
              setShowHints(false);
            } else if (data.examComplete && data.results) {
              finishExam(data.results, newRecords);
            } else if (newAnswered >= questionCount) {
              // Force complete if no next question
              const forcedResults: ExamResults = {
                overallScore: Math.min(100, Math.round(
                  newRecords.reduce((sum, r) => sum + r.feedback.score, 0) / newRecords.length * 10
                )),
                grade: '',
                summary: 'Экзамен завершён.',
                strengths: [],
                weaknesses: [],
                recommendations: [],
              };
              if (forcedResults.overallScore >= 90) forcedResults.grade = 'Отлично';
              else if (forcedResults.overallScore >= 75) forcedResults.grade = 'Хорошо';
              else if (forcedResults.overallScore >= 60) forcedResults.grade = 'Удовлетворительно';
              else forcedResults.grade = 'Неудовлетворительно';

              finishExam(forcedResults, newRecords);
            } else {
              setQuestionHistory(history);
              setCurrentAnswer('');
              setCurrentFollowUp(null);
              setCurrentFollowUpAnswer('');
              setShowHints(false);
            }
          }
        }
      } else {
        toast.error(data.error || 'Ошибка проверки ответа');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  }, [currentAnswer, currentFollowUpAnswer, currentQuestion, isLoading, questionHistory, questionRecords, answeredCount, examId, questionCount, selectedTopics, difficulty, finishExam]);

  // End exam early
  const handleEndExam = useCallback(() => {
    if (questionRecords.length === 0) {
      setView('setup');
      return;
    }

    const avgScore = Math.round(
      questionRecords.reduce((sum, r) => sum + r.feedback.score, 0) / questionRecords.length * 10
    );

    const forcedResults: ExamResults = {
      overallScore: avgScore,
      grade: '',
      summary: `Экзамен завершён досрочно после ${questionRecords.length} вопросов.`,
      strengths: [],
      weaknesses: [],
      recommendations: ['Рекомендуется пройти полный экзамен для объективной оценки'],
    };
    if (avgScore >= 90) forcedResults.grade = 'Отлично';
    else if (avgScore >= 75) forcedResults.grade = 'Хорошо';
    else if (avgScore >= 60) forcedResults.grade = 'Удовлетворительно';
    else forcedResults.grade = 'Неудовлетворительно';

    finishExam(forcedResults, questionRecords);
  }, [questionRecords, finishExam]);

  // Reset
  const handleReset = useCallback(() => {
    setView('setup');
    setExamId('');
    setCurrentQuestion(null);
    setCurrentAnswer('');
    setCurrentFollowUp(null);
    setCurrentFollowUpAnswer('');
    setQuestionHistory([]);
    setQuestionRecords([]);
    setAnsweredCount(0);
    setTimer(0);
    setResults(null);
    setXpEarned(0);
    setShowHints(false);
  }, []);

  // Toggle topic selection
  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId]
    );
  };

  // ==================== Render: Setup ====================

  if (view === 'setup') {
    return (
      <div className="space-y-4 pb-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4C7A3F] to-[#3D6332] flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Экзаменационная комиссия</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-экзаменатор проверит ваши знания в формате устного экзамена
          </p>
        </motion.div>

        {/* Info card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-4 bg-[#4C7A3F]/5 border-[#4C7A3F]/20">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-[#4C7A3F] mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-[#4C7A3F]">Формат экзамена</p>
                <p className="text-muted-foreground leading-relaxed">
                  AI-экзаменатор задаёт вопросы, на которые вы отвечаете <span className="font-medium">свободным текстом</span>.
                  Ответы оцениваются по содержанию и полноте. После частично правильных ответов возможен дополнительный вопрос.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Topic selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Выберите темы</h3>
            <div className="flex flex-wrap gap-2">
              {VET_TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    selectedTopics.includes(topic.id)
                      ? 'bg-[#4C7A3F]/10 border-[#4C7A3F]/40 text-[#4C7A3F]'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {topic.icon} {topic.name}
                </button>
              ))}
            </div>
            {selectedTopics.length === 0 && (
              <p className="text-xs text-[#B3261E] mt-2">Выберите хотя бы одну тему</p>
            )}
          </Card>
        </motion.div>

        {/* Difficulty */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Сложность</h3>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    difficulty === opt.value
                      ? 'border-transparent text-white shadow-md'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  }`}
                  style={difficulty === opt.value ? { backgroundColor: opt.color } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Question count */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Количество вопросов</h3>
              <Badge variant="secondary" className="text-xs">{questionCount}</Badge>
            </div>
            <div className="flex gap-2">
              {[5, 10, 15].map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    questionCount === count
                      ? 'bg-[#4C7A3F] text-white border-transparent shadow-md'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {count} вопросов
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Start button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Button
            onClick={handleStartExam}
            disabled={selectedTopics.length === 0 || isLoading}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#4C7A3F] to-[#3D6332] text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                </motion.div>
                Подготовка экзамена...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Начать экзамен
              </>
            )}
          </Button>
        </motion.div>
      </div>
    );
  }

  // ==================== Render: Exam in progress ====================

  if (view === 'exam') {
    const progressPct = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0;

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 space-y-2 mb-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4C7A3F] to-[#3D6332] flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold">Экзамен</p>
                <p className="text-[10px] text-muted-foreground">
                  Вопрос {answeredCount + (currentFollowUp ? 0 : 1)} / {questionCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono">{formatTime(timer)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndExam}
                className="h-8 px-2 text-xs text-[#B3261E] hover:text-[#B3261E] hover:bg-[#B3261E]/10"
              >
                <Square className="w-3.5 h-3.5 mr-1" />
                Закончить
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Progress value={progressPct} className="h-2" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Прогресс</span>
              <span>{progressPct}%</span>
            </div>
          </div>
        </motion.div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1">
          {/* Previous Q&A records */}
          {questionRecords.map((record, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {/* Examiner question */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <Badge variant="outline" className="text-[10px] mb-1 border-[#4C7A3F]/30 text-[#4C7A3F]">
                    <GraduationCap className="w-3 h-3 mr-1" /> Экзаменатор
                  </Badge>
                  <div className="p-3 rounded-2xl rounded-bl-md bg-card border shadow-sm text-sm leading-relaxed">
                    {record.question}
                  </div>
                </div>
              </div>

              {/* Student answer */}
              <div className="flex justify-end">
                <div className="max-w-[85%]">
                  <Badge variant="secondary" className="text-[10px] mb-1">Вы</Badge>
                  <div className="p-3 rounded-2xl rounded-br-md bg-muted text-sm leading-relaxed">
                    {record.answer}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="flex justify-start">
                <div className="max-w-[90%]">
                  <div className={`p-3 rounded-2xl rounded-bl-md border text-sm leading-relaxed ${getScoreBg(record.feedback.score)}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {record.feedback.correct ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4C7A3F]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#B4531C]" />
                      )}
                      <span className={`font-semibold text-xs ${getScoreColor(record.feedback.score)}`}>
                        {record.feedback.score}/10 баллов
                      </span>
                    </div>
                    <p className="text-muted-foreground">{record.feedback.explanation}</p>
                  </div>
                </div>
              </div>

              {/* Follow-up Q&A if present */}
              {record.followUpAnswer && (
                <>
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="p-3 rounded-2xl rounded-bl-md bg-card border shadow-sm text-sm leading-relaxed">
                        <span className="text-xs text-muted-foreground block mb-1">Дополнительный вопрос:</span>
                        {record.followUp || ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="p-3 rounded-2xl rounded-br-md bg-muted text-sm leading-relaxed">
                        {record.followUpAnswer}
                      </div>
                    </div>
                  </div>
                  {record.followUpFeedback && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%]">
                        <div className={`p-3 rounded-2xl rounded-bl-md border text-sm leading-relaxed ${getScoreBg(record.followUpFeedback.score)}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`font-semibold text-xs ${getScoreColor(record.followUpFeedback.score)}`}>
                              {record.followUpFeedback.score}/10 баллов
                            </span>
                          </div>
                          <p className="text-muted-foreground">{record.followUpFeedback.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}

          {/* Current question */}
          {currentQuestion && !currentFollowUp && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <Badge variant="outline" className="text-[10px] mb-1 border-[#4C7A3F]/30 text-[#4C7A3F]">
                    <GraduationCap className="w-3 h-3 mr-1" /> Экзаменатор
                  </Badge>
                  <div className="p-3 rounded-2xl rounded-bl-md bg-card border shadow-sm text-sm leading-relaxed">
                    {currentQuestion.text}
                  </div>
                </div>
              </div>

              {/* Hints toggle */}
              {currentQuestion.hints.length > 0 && (
                <div className="mt-2 ml-1">
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#B4531C]" />
                    <span>{showHints ? 'Скрыть подсказки' : 'Показать подсказки'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showHints ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showHints && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 space-y-1">
                          {currentQuestion.hints.map((hint, i) => (
                            <p key={i} className="text-xs text-[#B4531C] bg-[#B4531C]/5 px-2 py-1 rounded-lg">
                               {hint}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* Follow-up question */}
          {currentFollowUp && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="p-3 rounded-2xl rounded-bl-md bg-card border shadow-sm text-sm leading-relaxed">
                    <span className="text-xs text-muted-foreground block mb-1">Дополнительный вопрос:</span>
                    {currentFollowUp}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border shadow-sm p-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="pt-3 border-t border-border/50 bg-background shrink-0">
          {currentFollowUp ? (
            // Follow-up answer input
            <div className="space-y-2">
              <Textarea
                value={currentFollowUpAnswer}
                onChange={(e) => setCurrentFollowUpAnswer(e.target.value)}
                placeholder="Ваш дополнительный ответ..."
                className="squircle-sm min-h-[60px] max-h-32 resize-none text-sm border-border/50"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentFollowUpAnswer.trim() || isLoading}
                className="w-full h-10 rounded-xl bg-[#4C7A3F] hover:bg-[#3D6332] text-white text-sm font-medium"
              >
                <Send className="w-4 h-4 mr-2" />
                Отправить ответ
              </Button>
            </div>
          ) : currentQuestion ? (
            // Main answer input
            <div className="space-y-2">
              <Textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Напишите ваш ответ..."
                className="squircle-sm min-h-[80px] max-h-40 resize-none text-sm border-border/50"
                rows={3}
                disabled={isLoading}
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isLoading}
                className="w-full h-10 rounded-xl bg-[#4C7A3F] hover:bg-[#3D6332] text-white text-sm font-medium"
              >
                <Send className="w-4 h-4 mr-2" />
                Ответить
              </Button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">Экзамен завершён...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== Render: Results ====================

  if (view === 'results' && results) {
    const gradeColor = getGradeColor(results.grade);
    const avgScore = questionRecords.length > 0
      ? Math.round(questionRecords.reduce((sum, r) => sum + r.feedback.score, 0) / questionRecords.length * 10) / 10
      : 0;

    return (
      <div className="space-y-4 pb-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${gradeColor}, ${gradeColor}CC)` }}
          >
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold">Экзамен завершён</h2>
          <p className="text-sm text-muted-foreground mt-1">{results.summary}</p>
        </motion.div>

        {/* Score card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-4">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <motion.p
                  className="text-3xl font-bold"
                  style={{ color: gradeColor }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {results.overallScore}%
                </motion.p>
                <p className="text-xs text-muted-foreground mt-0.5">Результат</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <motion.p
                  className="text-2xl font-bold"
                  style={{ color: gradeColor }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {results.grade}
                </motion.p>
                <p className="text-xs text-muted-foreground mt-0.5">Оценка</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <motion.p
                  className="text-2xl font-bold text-[#4C7A3F]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  +{xpEarned}
                </motion.p>
                <p className="text-xs text-muted-foreground mt-0.5">XP</p>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Время</span>
                <span className="font-mono">{formatTime(timer)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Вопросов</span>
                <span>{questionRecords.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ср. балл</span>
                <span>{avgScore}/10</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Strengths & Weaknesses */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="grid grid-cols-1 gap-3">
            {results.strengths.length > 0 && (
              <Card className="p-4 bg-[#4C7A3F]/5 border-[#4C7A3F]/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#4C7A3F]" />
                  <h3 className="text-sm font-semibold text-[#4C7A3F]">Сильные стороны</h3>
                </div>
                <div className="space-y-1">
                  {results.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                      <CheckCircle2 className="w-3 h-3 text-[#4C7A3F] mt-0.5 shrink-0" />
                      {s}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {results.weaknesses.length > 0 && (
              <Card className="p-4 bg-[#B3261E]/5 border-[#B3261E]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#B3261E]" />
                  <h3 className="text-sm font-semibold text-[#B3261E]">Слабые стороны</h3>
                </div>
                <div className="space-y-1">
                  {results.weaknesses.map((w, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                      <XCircle className="w-3 h-3 text-[#B3261E] mt-0.5 shrink-0" />
                      {w}
                    </p>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Per-question review */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#B4531C]" />
              Обзор ответов
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {questionRecords.map((record, idx) => (
                <div key={idx} className="space-y-2 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-relaxed flex-1">
                      <span className="text-muted-foreground">В.{idx + 1}:</span> {record.question}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${getScoreBg(record.feedback.score)}`}
                    >
                      {record.feedback.score}/10
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-4 border-l-2 border-border/50">
                    {record.feedback.explanation}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Recommendations */}
        {results.recommendations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#B4531C]" />
                Рекомендации
              </h3>
              <div className="space-y-1">
                {results.recommendations.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                    <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                    {r}
                  </p>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
          <Button
            onClick={handleReset}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#4C7A3F] to-[#3D6332] text-white font-semibold text-sm shadow-lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Пройти ещё раз
          </Button>
        </motion.div>
      </div>
    );
  }

  // Fallback
  return <LoadingSpinner text="Загрузка..." />;
}
