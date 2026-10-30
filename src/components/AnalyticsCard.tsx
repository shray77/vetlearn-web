'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { computeAnalytics } from '@/lib/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Info, Clock, Award, Target,
} from 'lucide-react';

/**
 * D.5 — Deep analytics card shown on the Dashboard.
 * Pure client-side computation via computeAnalytics().
 */
export function AnalyticsCard() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const assessmentHistory = useStore((s) => s.assessmentHistory);
  const caseHistory = useStore((s) => s.caseHistory);
  const osceHistory = useStore((s) => s.osceHistory);
  const simulatorHistory = useStore((s) => s.simulatorHistory);

  const insights = useMemo(
    () => computeAnalytics(profile, assessmentHistory, caseHistory, osceHistory, simulatorHistory),
    [profile, assessmentHistory, caseHistory, osceHistory, simulatorHistory]
  );

  if (insights.totalQuestionsAnswered < 10) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-[#6D4FC4]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Глубокая аналитика
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {insights.summary}
          </p>
        </CardContent>
      </Card>
    );
  }

  const trendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-[#4C7A3F]" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-[#B3261E]" />;
    if (trend === 'stable') return <Minus className="w-3 h-3 text-muted-foreground" />;
    return <Clock className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm bg-gradient-to-br from-[#6D4FC4]/5 to-[#33608C]/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#6D4FC4]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Глубокая аналитика
            </span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {insights.totalQuestionsAnswered} вопросов · {insights.overallAccuracy}%
            </Badge>
          </div>

          <p className="text-sm font-medium">{insights.summary}</p>

          {/* Patterns */}
          {insights.patterns.length > 0 && (
            <div className="space-y-1.5">
              {insights.patterns.map((p, i) => {
                const Icon = p.type === 'warning'
                  ? AlertTriangle
                  : p.type === 'success'
                    ? CheckCircle2
                    : Info;
                const color = p.type === 'warning'
                  ? 'text-[#B4531C]'
                  : p.type === 'success'
                    ? 'text-[#4C7A3F]'
                    : 'text-[#33608C]';
                return (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${color}`} />
                    <span className="text-muted-foreground">{p.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Topic trends */}
          {insights.topicTrends.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Тренды по темам (14 дней)
              </p>
              <div className="space-y-1.5">
                {insights.topicTrends.slice(0, 5).map((t) => (
                  <div key={t.topicId} className="flex items-center gap-2 text-[11px]">
                    {trendIcon(t.trend)}
                    <span className="flex-1 truncate">{t.topicName}</span>
                    <Badge variant="secondary" className="text-[11px]">
                      {t.currentLevel}%
                    </Badge>
                    {t.trend !== 'insufficient_data' && (
                      <span className={`text-[11px] tabular-nums w-8 text-right ${
                        t.delta > 0 ? 'text-[#4C7A3F]' : t.delta < 0 ? 'text-[#B3261E]' : 'text-muted-foreground'
                      }`}>
                        {t.delta > 0 ? '+' : ''}{t.delta}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question types weakness */}
          {insights.questionTypeStats.filter((s) => s.weakness !== 'none').length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                По типам вопросов
              </p>
              <div className="flex flex-wrap gap-1.5">
                {insights.questionTypeStats
                  .filter((s) => s.total >= 3)
                  .map((s) => (
                    <Badge
                      key={s.type}
                      variant="secondary"
                      className={`text-[10px] ${
                        s.weakness === 'high'
                          ? 'bg-[#B3261E]/10 text-[#B3261E] border-[#B3261E]/20'
                          : s.weakness === 'medium'
                            ? 'bg-[#B4531C]/10 text-[#B4531C] border-[#B4531C]/20'
                            : ''
                      }`}
                    >
                      {s.type}: {s.accuracy}% ({s.total})
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Streak + best time */}
          <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <Award className="w-3 h-3 text-[#B4531C]" />
              <span className="text-muted-foreground">Лучшая серия:</span>
              <span className="font-semibold">{insights.longestCorrectStreak}</span>
            </div>
            {(() => {
              const best = [...insights.timeOfDayStats]
                .filter((t) => t.total >= 3)
                .sort((a, b) => b.accuracy - a.accuracy)[0];
              if (!best) return null;
              return (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#33608C]" />
                  <span className="text-muted-foreground">Лучшее время:</span>
                  <span className="font-semibold">{best.label.split(' ')[0]}</span>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
