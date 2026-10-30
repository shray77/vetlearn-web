'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import { SkillRadarChart } from '@/components/SkillRadarChart';
import { LearningTrajectory } from '@/components/LearningTrajectory';
import { DIFFICULTY_LABELS } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Flame, Star, Target, Award, TrendingUp, TrendingDown, Minus, Stethoscope, Mic,
  ArrowRight, Clock, Sparkles, BarChart3, Copy, FileText, Brain, Lightbulb,
  Timer, ChevronRight, Calendar, CheckCircle2, PawPrint,
} from 'lucide-react';
import { toast } from 'sonner';
import { getTodayChallenge, getPastChallenges } from '@/lib/daily-challenges';
import type { SpecializationTrack } from '@/lib/types';
import { AnalyticsCard } from '@/components/AnalyticsCard';
import { AchievementsPanel } from '@/components/AchievementsPanel';
import { AiDiagnosticsCard } from '@/components/AiDiagnosticsCard';
import { DsIcon } from '@/lib/ds-icons';

export function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const assessmentHistory = useStore((s) => s.assessmentHistory);
  const caseHistory = useStore((s) => s.caseHistory);
  const addXP = useStore((s) => s.addXP);
  const updateStreak = useStore((s) => s.updateStreak);
  const srCards = useStore((s) => s.srCards);
  const flashcards = useStore((s) => s.flashcards);
  const completedChallenges = useStore((s) => s.completedChallenges);
  const markChallengeCompleted = useStore((s) => s.markChallengeCompleted);

  // Daily challenge
  // Task 204 (fix 204-a#4): дата — часть состояния: раньше useMemo с новым
  // Date() пересчитывался только при смене трека, и живой через локальную
  // полночь таб показывал вчерашний челлендж, а «Отметить» писал completion
  // в прошлую дату. Теперь ключ дня тикает и входит в deps.
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const id = setInterval(() => {
      const k = new Date().toDateString();
      setTodayKey((prev) => (prev === k ? prev : k));
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  const todayChallenge = useMemo(
    () => getTodayChallenge(new Date(), profile.specializationTrack as SpecializationTrack | undefined),
    [profile.specializationTrack, todayKey]
  );
  const isTodayDone = !!(completedChallenges && completedChallenges[todayChallenge.date]);

  const handleStartChallenge = () => {
    onNavigate(todayChallenge.tabToOpen);
  };

  const handleMarkDone = () => {
    if (isTodayDone) return;
    markChallengeCompleted(todayChallenge.date, todayChallenge.type);
    addXP(todayChallenge.xpReward);
    toast.success(`Челлендж выполнен! +${todayChallenge.xpReward} XP`);
  };

  const pastChallenges = useMemo(
    () => getPastChallenges(7, profile.specializationTrack as SpecializationTrack | undefined),
    [profile.specializationTrack, todayKey]
  );

  // SR due cards count
  const srDueCount = useMemo(() => {
    const d = new Date();
    const allIds = flashcards.map(c => c.id);
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return allIds.filter(id => {
      const card = srCards[id];
      return card && card.nextReview <= today;
    }).length;
  }, [srCards, flashcards]);

  const accuracy = profile.totalAnswers > 0
    ? Math.min(100, Math.max(0, Math.round(((profile.correctAnswers || 0) / profile.totalAnswers) * 100)))
    : 0;
  const xpInLevel = Math.max(0, Math.min(100, 100 - (profile.xpToNext || 100)));

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  const hasData = Object.keys(profile.skillMap).length > 0;

  // ===== AI INSIGHTS COMPUTATION =====
  const aiInsight = useMemo(() => {
    // Determine insight message and state
    if (!profile.placementCompleted) {
      return {
        type: 'no_placement' as const,
        message: 'Пройдите входное тестирование — ИИ определит ваш уровень и создаст персональную траекторию обучения',
        actionLabel: 'Начать тестирование',
        actionTab: 'learning',
      };
    }

    const recentAssessments = assessmentHistory.slice(0, 3);
    if (recentAssessments.length === 0) {
      return {
        type: 'ready' as const,
        message: 'ИИ готов генерировать уникальные вопросы по вашему уровню. Начните тренировку!',
        actionLabel: 'Начать тренировку',
        actionTab: 'learning',
      };
    }

    const avgScore = Math.round(
      recentAssessments.reduce((sum, a) => sum + (a.score || 0), 0) / recentAssessments.length
    );

    if (avgScore >= 75) {
      return {
        type: 'good_progress' as const,
        message: 'Отличный прогресс! ИИ рекомендует перейти к более сложным темам',
        actionLabel: 'Продолжить обучение',
        actionTab: 'learning',
      };
    }

    const weakTopics = (profile.learningPath || [])
      .filter(p => p.priority === 'high')
      .map(p => p.topicName);

    if (weakTopics.length > 0) {
      return {
        type: 'weak_areas' as const,
        message: `ИИ заметил пробелы в знаниях. Рекомендуется повторение тем: ${weakTopics.slice(0, 3).join(', ')}`,
        actionLabel: 'Повторить темы',
        actionTab: 'learning',
      };
    }

    return {
      type: 'stable' as const,
      message: 'ИИ анализирует ваш прогресс. Продолжайте в текущем темпе для стабильного роста',
      actionLabel: 'Продолжить обучение',
      actionTab: 'learning',
    };
  }, [profile, assessmentHistory]);

  // Accuracy trend from last 3 assessments
  const accuracyTrend = useMemo(() => {
    const recent = assessmentHistory.slice(0, 3).map(a => a.score);
    if (recent.length < 2) return null;

    if (recent.length === 2) {
      const diff = recent[0] - recent[1];
      if (diff > 5) return 'up' as const;
      if (diff < -5) return 'down' as const;
      return 'stable' as const;
    }

    // 3 scores: compare average of latest 2 vs oldest 1
    const latest = (recent[0] + recent[1]) / 2;
    const oldest = recent[2];
    if (latest - oldest > 5) return 'up' as const;
    if (latest - oldest < -5) return 'down' as const;
    return 'stable' as const;
  }, [assessmentHistory]);

  // Level display helpers
  const levelConfig = useMemo(() => {
    if (!profile.determinedLevel) return null;
    const configs: Record<string, { label: string; color: string; bg: string; borderColor: string }> = {
      beginner: { label: 'Начинающий', color: 'text-[#4C7A3F]', bg: 'bg-[#EDF3EA] dark:bg-[#203528]', borderColor: 'border-[#4C7A3F]/30' },
      intermediate: { label: 'Средний', color: 'text-[#B4531C]', bg: 'bg-[#F3EAD3] dark:bg-[#33290F]', borderColor: 'border-[#B4531C]/30' },
      advanced: { label: 'Продвинутый', color: 'text-[#B3261E]', bg: 'bg-[#F5E3E1] dark:bg-[#3A2622]', borderColor: 'border-[#B3261E]/30' },
      expert: { label: 'Экспертный', color: 'text-[#33608C]', bg: 'bg-[#E3EAF2] dark:bg-[#1F2A36]', borderColor: 'border-[#33608C]/30' },
    };
    return configs[profile.determinedLevel] || null;
  }, [profile.determinedLevel]);

  const handleExportProgress = () => {
    const skillMapText = Object.entries(profile.skillMap)
      .map(([id, level]) => {
        const topic = VET_TOPICS.find(t => t.id === id);
        return `${topic?.name || id}: ${level}%`;
      })
      .join('\n  ');
    const learningPathText = (profile.learningPath || [])
      .map(item => `- ${item.topicName} (${item.priority})`)
      .join('\n  ');
    const text = ` VetLearn AI — Мой прогресс\n━━━━━━━━━━━━━━━━━━━━━━\n Уровень: ${profile.level}\n Опыт: ${profile.xp} / ${profile.xpToNext} XP\n Серия: ${profile.streak} дней\n Тестов пройдено: ${profile.assessmentsCompleted}\n Точность: ${accuracy}%\n\n Карта знаний:\n  ${skillMapText || 'Нет данных'}\n\n План обучения:\n  ${learningPathText || 'Нет данных'}\n\nСгенерировано в VetLearn AI`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Прогресс скопирован!');
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="squircle overflow-hidden border-0 shadow-lg bg-gradient-to-br from-[#4C7A3F] to-[#3D6332]">
          <CardContent className="p-5 text-white">
            <div className="flex items-center gap-4">
              {/* Аватар профиля: пустой бокс после эмодзи-зачистки Task 158 —
                  лапка как в логотипе хедера (Task 160) */}
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <PawPrint className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="bg-white/20 text-white border-0 text-xs">
                    Уровень {profile.level}
                  </Badge>
                  <span className="text-white/80 text-xs">
                    {profile.assessmentsCompleted} тестов пройдено
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-white/90 mb-1">
                    <span>Опыт</span>
                    <span>{xpInLevel} / 100 XP</span>
                  </div>
                  <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #D9A24A, #B4531C)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, xpInLevel))}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Version Badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-muted/80 text-muted-foreground border border-border/50">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          VetLearn AI v0.4.2
        </span>
      </div>

      {/* Daily Challenge */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={`border-0 shadow-md ${isTodayDone ? 'bg-gradient-to-br from-[#4C7A3F]/15 to-[#4C7A3F]/5' : 'bg-gradient-to-br from-[#B4531C]/15 to-transparent'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[#B4531C]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Челлендж дня
              </span>
              {isTodayDone && (
                <Badge className="ml-auto bg-[#4C7A3F] text-white border-0 text-[10px]">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Выполнено
                </Badge>
              )}
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0"><DsIcon name={todayChallenge.icon} className="w-7 h-7 text-[#B4531C]" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold leading-tight">{todayChallenge.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{todayChallenge.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">
                    +{todayChallenge.xpReward} XP
                  </Badge>
                  {!isTodayDone ? (
                    <Button
                      size="sm"
                      className="h-8 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleStartChallenge}
                    >
                      Начать <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  ) : null}
                  {!isTodayDone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-[11px] text-muted-foreground"
                      onClick={handleMarkDone}
                    >
                      Отметить вручную
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Past 7 days strip */}
            <div className="flex gap-1 mt-3 pt-3 border-t border-border/30">
              {pastChallenges.map((c) => {
                const done = !!(completedChallenges && completedChallenges[c.date]);
                const isToday = c.date === todayChallenge.date;
                return (
                  <div
                    key={c.date}
                    className={`flex-1 text-center p-1.5 rounded-lg ${
                      done
                        ? 'bg-[#4C7A3F]/10 text-[#4C7A3F]'
                        : 'bg-muted/50 text-muted-foreground'
                    } ${isToday ? 'ring-2 ring-[#B4531C]' : ''}`}
                    title={`${c.date}: ${c.title}`}
                  >
                    <div className="text-base">{done ? '✓' : <DsIcon name={c.icon} className="w-4 h-4 mx-auto" />}</div>
                    <div className="text-[11px] mt-0.5">
                      {/* Task 204 (fix 204-a#10): 'YYYY-MM-DD' парсится как
                          UTC-полночь — weekday съезжал на день в отрицательных
                          таймзонах; локальный парсинг через T00:00:00 */}
                      {new Date(c.date + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-4 gap-2"
      >
        {[
          { icon: Flame, label: 'Серия', value: profile.streak, color: 'text-[#B4531C]', bg: 'bg-[#F3EAD3] dark:bg-[#33290F]' },
          { icon: Star, label: 'Кейсы', value: profile.completedCases, color: 'text-[#B4531C]', bg: 'bg-[#F3EAD3] dark:bg-[#33290F]' },
          { icon: Target, label: 'Точность', value: `${accuracy}%`, color: 'text-[#4C7A3F]', bg: 'bg-[#EDF3EA] dark:bg-[#203528]' },
          { icon: Award, label: 'Уровень', value: profile.level, color: 'text-[#33608C]', bg: 'bg-[#EDF2F7] dark:bg-[#26333F]' },
        ].map((stat, i) => (
          <Card key={i} className="squircle-sm border-0 shadow-sm p-3 text-center">
            <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
            {/* 206-b: 10px → 11px: подписи Quick Stats — читаемый текст */}
            <div className="text-[11px] text-muted-foreground">{stat.label}</div>
          </Card>
        ))}
      </motion.div>

      {/* Deep analytics card */}
      <AnalyticsCard />

      {/* Achievements + Leagues */}
      <AchievementsPanel />

      {/* AI Insights Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card className="squircle border-0 shadow-sm overflow-hidden">
          <div
            className="h-1"
            style={{
              background: aiInsight.type === 'good_progress'
                ? 'linear-gradient(90deg, #4C7A3F, #33608C)'
                : aiInsight.type === 'weak_areas'
                  ? 'linear-gradient(90deg, #B4531C, #B3261E)'
                  : aiInsight.type === 'no_placement'
                    ? 'linear-gradient(90deg, #33608C, #B4531C)'
                    : 'linear-gradient(90deg, #33608C, #4C7A3F)',
            }}
          />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Pulsing AI Brain Icon */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: aiInsight.type === 'good_progress'
                      ? 'linear-gradient(135deg, #4C7A3F, #33608C)'
                      : aiInsight.type === 'weak_areas'
                        ? 'linear-gradient(135deg, #B4531C, #B3261E)'
                        : 'linear-gradient(135deg, #33608C, #4C7A3F)',
                  }}
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(51, 96, 140, 0.4)',
                      '0 0 0 8px rgba(51, 96, 140, 0)',
                      '0 0 0 0 rgba(51, 96, 140, 0)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Brain className="w-5 h-5 text-white" />
                </motion.div>
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B4531C] flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Lightbulb className="w-2.5 h-2.5 text-white" />
                </motion.div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-bold">AI Инсайты</h3>
                  {/* Level badge */}
                  {levelConfig && (
                    <Badge className={`${levelConfig.bg} ${levelConfig.color} border ${levelConfig.borderColor} text-[10px] font-semibold border-0`}>
                      {levelConfig.label}
                    </Badge>
                  )}
                </div>

                {/* Dynamic insight message with AnimatePresence */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={aiInsight.type}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs text-muted-foreground leading-relaxed mb-2.5"
                  >
                    {aiInsight.message}
                  </motion.p>
                </AnimatePresence>

                {/* Accuracy trend + stats row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onNavigate(aiInsight.actionTab)}
                    className="text-xs font-semibold text-[#33608C] hover:text-[#264E70] transition-colors"
                  >
                    {aiInsight.actionLabel} →
                  </button>

                  {accuracyTrend && assessmentHistory.length >= 2 && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] text-muted-foreground">Тренд</span>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={accuracyTrend}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.25 }}
                          className="flex items-center gap-1"
                        >
                          {accuracyTrend === 'up' ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5 text-[#4C7A3F]" />
                              <span className="text-[10px] font-semibold text-[#4C7A3F]">Рост</span>
                            </>
                          ) : accuracyTrend === 'down' ? (
                            <>
                              <TrendingDown className="w-3.5 h-3.5 text-[#B3261E]" />
                              <span className="text-[10px] font-semibold text-[#B3261E]">Падение</span>
                            </>
                          ) : (
                            <>
                              <Minus className="w-3.5 h-3.5 text-[#B4531C]" />
                              <span className="text-[10px] font-semibold text-[#B4531C]">Стабильно</span>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>

                      {/* Mini score dots */}
                      <div className="flex items-center gap-1">
                        {assessmentHistory.slice(0, 3).map((a, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1, duration: 0.3 }}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold"
                            style={{
                              backgroundColor: a.score >= 75 ? '#EDF3EA' : a.score >= 50 ? '#F3EAD3' : '#F5E3E1',
                              color: a.score >= 75 ? '#4C7A3F' : a.score >= 50 ? '#B4531C' : '#B3261E',
                            }}
                          >
                            {a.score}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Continue Learning / Start Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {hasData ? (
          <Card
            className="squircle border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            role="button"
            tabIndex={0}
            aria-label="Продолжить обучение"
            onClick={() => onNavigate('learning')}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('learning'); }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDF3EA] dark:bg-[#203528] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#4C7A3F]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Продолжить обучение</h3>
                    <p className="text-xs text-muted-foreground">
                      {(profile.learningPath || []).length > 0
                        ? `${(profile.learningPath || []).filter(p => p.priority === 'high').length} тем в приоритете`
                        : 'Перейти к обучению'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="squircle border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-[#4C7A3F]/10 to-[#33608C]/10"
            role="button"
            tabIndex={0}
            aria-label="Начать обучение"
            onClick={() => onNavigate('learning')}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('learning'); }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#4C7A3F] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Начать обучение</h3>
                    <p className="text-xs text-muted-foreground">Пройдите первичное тестирование</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#4C7A3F]" />
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* AI Diagnostics — живая проверка соединения с языковой моделью */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22 }}
      >
        <AiDiagnosticsCard />
      </motion.div>

      {/* SR Due Cards Alert */}
      {srDueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Card
            className="squircle border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            role="button"
            tabIndex={0}
            aria-label="Открыть повторение"
            onClick={() => onNavigate('flashcards')}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('flashcards'); }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#B4531C]/10 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-[#B4531C]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Повторение</h3>
                    <p className="text-xs text-muted-foreground">
                      {srDueCount} карточек ждут повторения
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#B4531C]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-2 gap-3"
      >
        {/* Task 204 (fix 204-b#4): карточки-навигации — button-семантика
            вместо div onClick (Tab-порядок, Enter/Space, VoiceControl) */}
        <Card
          className="squircle-sm border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group text-left"
          role="button"
          tabIndex={0}
          aria-label="Открыть AI-кейсы"
          onClick={() => onNavigate('cases')}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('cases'); }
          }}
        >
          <CardContent className="p-4">
            <div className="w-10 h-10 rounded-xl bg-[#33608C]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-5 h-5 text-[#33608C]" />
            </div>
            <h3 className="font-semibold text-sm">AI Кейсы</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Уникальные клинические задачи</p>
          </CardContent>
        </Card>

        <Card
          className="squircle-sm border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group text-left"
          role="button"
          tabIndex={0}
          aria-label="Открыть голосового репетитора"
          onClick={() => onNavigate('tutor')}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('tutor'); }
          }}
        >
          <CardContent className="p-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Репетитор</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Голосовой AI-помощник</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Learning Trajectory */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <LearningTrajectory profile={profile} />
      </motion.div>

      {/* Skill Map / Knowledge Radar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="squircle border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4C7A3F]" />
              Карта знаний
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <SkillRadarChart skillMap={profile.skillMap} />
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Пройдите первичное тестирование,<br />чтобы увидеть карту знаний
                </p>
                <Button
                  className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="sm"
                  onClick={() => onNavigate('learning')}
                >
                  Начать тест
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Export Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
      >
        <Button
          variant="outline"
          className="w-full squircle-sm h-11 text-sm font-medium"
          onClick={handleExportProgress}
        >
          <Copy className="w-4 h-4 mr-2 text-[#4C7A3F]" />
          Скопировать прогресс
        </Button>
      </motion.div>

      {/* Recent Activity */}
      {(assessmentHistory.length > 0 || caseHistory.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="squircle border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B4531C]" />
                Последняя активность
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {assessmentHistory.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-[#EDF3EA] dark:bg-[#203528] flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#4C7A3F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">Тестирование</p>
                      <p className="text-[10px] text-muted-foreground">{a.completedAt}</p>
                    </div>
                    <Badge variant={a.score >= 70 ? 'default' : 'destructive'} className="text-[10px]">
                      {a.score}%
                    </Badge>
                  </div>
                ))}
                {caseHistory.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-[#33608C]/10 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4 text-[#33608C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">{c.species} • {DIFFICULTY_LABELS[c.difficulty] || c.difficulty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
