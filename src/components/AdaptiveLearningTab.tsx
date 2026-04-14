'use client';

import React, { useState, useEffect } from 'react';
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
  Brain, TrendingUp, BarChart3, ChevronRight, CheckCircle2,
  Loader2, X, ArrowRight, RotateCcw, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function AdaptiveLearningTab() {
  const { profile, updateSkillMap, updateLearningPath, addXP, addAssessmentToHistory, updateProfile } = useStore();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyType>('intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!quizStartTime) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - quizStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [quizStartTime]);

  const handleStartAssessment = async () => {
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
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics, difficulty, count: questionCount }),
      });
      const data = await res.json();
      if (data.success) {
        setAssessmentQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
        setCurrentQuestionIndex(0);
        setShowResults(false);
        setQuizStartTime(Date.now());
        setElapsedSeconds(0);
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

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmitAssessment();
    }
  };

  const handleSubmitAssessment = async () => {
    if (answers.some(a => a === null)) {
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
          completedAt: new Date().toLocaleDateString('ru-RU'),
        };
        setAssessmentResult(result);
        setShowResults(true);
        setQuizStartTime(null);
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

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Assessment in progress
  if (assessmentQuestions.length > 0 && !showResults) {
    const q = assessmentQuestions[currentQuestionIndex];
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setAssessmentQuestions([]); setQuizStartTime(null); }}>
            <X className="w-4 h-4 mr-1" /> Выход
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              ⏱ {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}
            </span>
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
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="squircle border-0 shadow-sm">
              <CardContent className="p-5">
                <Badge variant="secondary" className="mb-3 text-xs">{q.topicName}</Badge>
                <h3 className="text-base font-semibold mb-5 leading-relaxed">{q.question}</h3>
                <div className="space-y-2.5">
                  {q.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectAnswer(i)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 ${
                        answers[currentQuestionIndex] === i
                          ? 'border-[#28CD41] bg-[#E8F9EC] dark:bg-[#1A3D22] shadow-sm'
                          : 'border-border hover:border-[#28CD41]/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          answers[currentQuestionIndex] === i
                            ? 'bg-[#28CD41] text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {['А', 'Б', 'В', 'Г'][i]}
                        </div>
                        <span className="text-sm">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <Button
          className="w-full squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-12 text-sm font-semibold"
          onClick={handleNextQuestion}
          disabled={answers[currentQuestionIndex] === null}
        >
          {currentQuestionIndex < assessmentQuestions.length - 1 ? (
            <>Следующий вопрос <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Анализирую...</>
            ) : (
              <>Завершить тест <Sparkles className="w-4 h-4 ml-1" /></>
            )
          )}
        </Button>
      </div>
    );
  }

  // Assessment results
  if (showResults && assessmentResult) {
    const wrongQuestions = assessmentResult.questions.filter((q: any, i: number) => assessmentResult.answers[i] !== q.correctIndex);
    return (
      <div className="space-y-4 pb-4 relative">
        {assessmentResult.score >= 90 && <ConfettiCanvas />}
        <Button variant="ghost" size="sm" onClick={() => { setShowResults(false); setAssessmentQuestions([]); setQuizStartTime(null); }}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Назад к темам
        </Button>

        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="text-5xl mb-2">
              {assessmentResult.score >= 80 ? '🎉' : assessmentResult.score >= 60 ? '👍' : '💪'}
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
                <Brain className="w-4 h-4 text-[#007AFF]" /> Анализ
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{assessmentResult.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Skill Map */}
        {assessmentResult.skillMap && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#28CD41]" /> Уровень знаний
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SkillRadarChart skillMap={assessmentResult.skillMap} />
            </CardContent>
          </Card>
        )}

        {/* Learning Path */}
        {assessmentResult.learningPath && assessmentResult.learningPath.length > 0 && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF9500]" /> План обучения
              </h3>
              <div className="space-y-2">
                {assessmentResult.learningPath.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                    <Badge
                      className={`text-[10px] mt-0.5 ${
                        item.priority === 'high' ? 'bg-[#FF3B30]/10 text-[#FF3B30] border-0' :
                        item.priority === 'medium' ? 'bg-[#FF9500]/10 text-[#FF9500] border-0' :
                        'bg-[#28CD41]/10 text-[#28CD41] border-0'
                      }`}
                    >
                      {item.priority === 'high' ? 'Важно' : item.priority === 'medium' ? 'Среднее' : 'Низкое'}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.topicName}</p>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
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
              setShowResults(false);
              setQuizStartTime(Date.now());
              setElapsedSeconds(0);
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Повторить ошибки ({wrongQuestions.length})
          </Button>
        )}

        <Button
          className="w-full squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-12"
          onClick={() => { setShowResults(false); setAssessmentQuestions([]); setQuizStartTime(null); }}
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Новый тест
        </Button>
      </div>
    );
  }

  // Topic selection view
  return (
    <div className="space-y-4 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-lg font-bold mb-1">Адаптивное обучение</h2>
        <p className="text-sm text-muted-foreground">Выберите темы и уровень для тестирования</p>
      </motion.div>

      {/* Difficulty selector */}
      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Уровень сложности</h3>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  difficulty === opt.value
                    ? 'bg-[#28CD41] text-white shadow-md scale-105'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
                    ? 'bg-[#28CD41] text-white shadow-md'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {n}
              </button>
            ))}
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
              const isExpanded = expandedTopics.includes(topic.id);
              const mastery = profile.skillMap[topic.id] || 0;

              return (
                <div key={topic.id}>
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-[#E8F9EC] dark:bg-[#1A3D22] border-2 border-[#28CD41]/30'
                        : 'hover:bg-muted/50 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-xl">{topic.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{topic.name}</p>
                      <p className="text-[10px] text-muted-foreground">{topic.subtopics.length} подтем</p>
                    </div>
                    {mastery > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#28CD41]" style={{ width: `${mastery}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{mastery}%</span>
                      </div>
                    )}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#28CD41] text-white scale-110' : 'bg-muted'
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
        className="w-full squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-14 text-sm font-bold shadow-lg"
        onClick={handleStartAssessment}
        disabled={selectedTopics.length === 0 || isGenerating}
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерация вопросов...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Начать тест ({questionCount} вопросов)</>
        )}
      </Button>

      {/* Learning Path (if exists) */}
      {profile.learningPath.length > 0 && (
        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF9500]" /> Текущий план обучения
            </h3>
            <div className="space-y-2">
              {profile.learningPath.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    item.priority === 'high' ? 'bg-[#FF3B30]' :
                    item.priority === 'medium' ? 'bg-[#FF9500]' : 'bg-[#28CD41]'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.topicName}</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
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
