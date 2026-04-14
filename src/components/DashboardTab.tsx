'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import { SkillRadarChart } from '@/components/SkillRadarChart';
import { DIFFICULTY_LABELS } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Flame, Star, Target, Award, TrendingUp, Stethoscope, Mic,
  ArrowRight, Clock, Sparkles, BarChart3, Copy, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { profile, assessmentHistory, caseHistory, addXP, updateStreak } = useStore();
  const accuracy = profile.totalAnswers > 0
    ? Math.round((profile.correctAnswers / profile.totalAnswers) * 100)
    : 0;
  const xpInLevel = 100 - profile.xpToNext;

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  const hasData = Object.keys(profile.skillMap).length > 0;

  const handleExportProgress = () => {
    const skillMapText = Object.entries(profile.skillMap)
      .map(([id, level]) => {
        const topic = VET_TOPICS.find(t => t.id === id);
        return `${topic?.name || id}: ${level}%`;
      })
      .join('\n  ');
    const learningPathText = profile.learningPath
      .map(item => `- ${item.topicName} (${item.priority})`)
      .join('\n  ');
    const text = `🐾 VetLearn AI — Мой прогресс\n━━━━━━━━━━━━━━━━━━━━━━\n📊 Уровень: ${profile.level}\n⚡ Опыт: ${profile.xp} / ${profile.xpToNext} XP\n🔥 Серия: ${profile.streak} дней\n📝 Тестов пройдено: ${profile.assessmentsCompleted}\n🎯 Точность: ${accuracy}%\n\n🗺️ Карта знаний:\n  ${skillMapText || 'Нет данных'}\n\n📚 План обучения:\n  ${learningPathText || 'Нет данных'}\n\nСгенерировано в VetLearn AI`;
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
        <Card className="squircle overflow-hidden border-0 shadow-lg bg-gradient-to-br from-[#28CD41] to-[#1FA833]">
          <CardContent className="p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
                🐾
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
                  <div className="flex justify-between text-xs text-white/70 mb-1">
                    <span>Опыт</span>
                    <span>{xpInLevel} / 100 XP</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white/80 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${xpInLevel}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
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
          { icon: Flame, label: 'Серия', value: profile.streak, color: 'text-[#FF9500]', bg: 'bg-[#FFF3CD] dark:bg-[#3D3000]' },
          { icon: Star, label: 'Кейсы', value: profile.completedCases, color: 'text-[#FF9500]', bg: 'bg-[#FFF3CD] dark:bg-[#3D3000]' },
          { icon: Target, label: 'Точность', value: `${accuracy}%`, color: 'text-[#28CD41]', bg: 'bg-[#E8F9EC] dark:bg-[#1A3D22]' },
          { icon: Award, label: 'Уровень', value: profile.level, color: 'text-[#AF52DE]', bg: 'bg-[#F3E8FF] dark:bg-[#2D1A3D]' },
        ].map((stat, i) => (
          <Card key={i} className="squircle-sm border-0 shadow-sm p-3 text-center">
            <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground">{stat.label}</div>
          </Card>
        ))}
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
            onClick={() => onNavigate('learning')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F9EC] dark:bg-[#1A3D22] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#28CD41]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Продолжить обучение</h3>
                    <p className="text-xs text-muted-foreground">
                      {profile.learningPath.length > 0
                        ? `${profile.learningPath.filter(p => p.priority === 'high').length} тем в приоритете`
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
            className="squircle border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-[#28CD41]/10 to-[#007AFF]/10"
            onClick={() => onNavigate('learning')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#28CD41] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Начать обучение</h3>
                    <p className="text-xs text-muted-foreground">Пройдите первичное тестирование</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#28CD41]" />
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-2 gap-3"
      >
        <Card
          className="squircle-sm border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => onNavigate('cases')}
        >
          <CardContent className="p-4">
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-5 h-5 text-[#007AFF]" />
            </div>
            <h3 className="font-semibold text-sm">AI Кейсы</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Уникальные клинические задачи</p>
          </CardContent>
        </Card>

        <Card
          className="squircle-sm border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => onNavigate('tutor')}
        >
          <CardContent className="p-4">
            <div className="w-10 h-10 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5 text-[#AF52DE]" />
            </div>
            <h3 className="font-semibold text-sm">Репетитор</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Голосовой AI-помощник</p>
          </CardContent>
        </Card>
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
              <BarChart3 className="w-4 h-4 text-[#28CD41]" />
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
                  className="mt-3 bg-[#28CD41] hover:bg-[#1FA833] text-white"
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
          <Copy className="w-4 h-4 mr-2 text-[#28CD41]" />
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
                <Clock className="w-4 h-4 text-[#FF9500]" />
                Последняя активность
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {assessmentHistory.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F9EC] dark:bg-[#1A3D22] flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#28CD41]" />
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
                    <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                      <Stethoscope className="w-4 h-4 text-[#007AFF]" />
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
