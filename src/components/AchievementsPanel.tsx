'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import {
  computeAchievements,
  computeWeekXp,
  getLeagueForXp,
  getNextLeague,
  LEAGUES,
} from '@/lib/achievements';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy, Lock, Star, TrendingUp,
} from 'lucide-react';
import { DsIcon } from '@/lib/ds-icons';

/**
 * Achievements + Weekly League panel shown on Dashboard.
 */
export function AchievementsPanel() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const assessmentHistory = useStore((s) => s.assessmentHistory);
  const caseHistory = useStore((s) => s.caseHistory);
  const simulatorHistory = useStore((s) => s.simulatorHistory);
  const completedChallenges = useStore((s) => s.completedChallenges);
  const [showAll, setShowAll] = useState(false);

  const achievements = useMemo(
    () => computeAchievements(profile, assessmentHistory, caseHistory, simulatorHistory, completedChallenges || {}),
    [profile, assessmentHistory, caseHistory, simulatorHistory, completedChallenges]
  );

  const weekXp = useMemo(
    () => computeWeekXp(assessmentHistory, caseHistory, simulatorHistory, completedChallenges || {}),
    [assessmentHistory, caseHistory, simulatorHistory, completedChallenges]
  );

  const currentLeague = getLeagueForXp(weekXp);
  const nextLeague = getNextLeague(weekXp);
  const xpToNext = nextLeague ? nextLeague.minXpThisWeek - weekXp : 0;
  const leagueSpan = nextLeague ? nextLeague.minXpThisWeek - currentLeague.minXpThisWeek : 1;
  const progressInLeague = nextLeague
    ? Math.min(100, Math.round(((weekXp - currentLeague.minXpThisWeek) / leagueSpan) * 100))
    : 100;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const visible = showAll ? achievements : achievements.slice(0, 6);

  return (
    <div className="space-y-3">
      {/* Weekly League Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#B4531C]/10 to-[#33608C]/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#B4531C]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Недельная лига
              </span>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                +{weekXp} XP на неделе
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${currentLeague.color}20` }}
              >
                <DsIcon name={currentLeague.icon} className="w-8 h-8" style={{ color: currentLeague.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-bold">{currentLeague.name}</span>
                  {nextLeague && (
                    <span className="text-[11px] text-muted-foreground">
                      до {nextLeague.name} <DsIcon name={nextLeague.icon} className="w-3 h-3 inline-block align-[-2px]" style={{ color: nextLeague.color }} />: {xpToNext} XP
                    </span>
                  )}
                </div>
                <Progress value={progressInLeague} className="h-1.5" />
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{currentLeague.minXpThisWeek} XP</span>
                  {nextLeague && <span>{nextLeague.minXpThisWeek} XP</span>}
                  {!nextLeague && <span>Максимум достигнут </span>}
                </div>
              </div>
            </div>

            {/* Mini league ladder */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              {LEAGUES.map((l) => {
                const isCurrent = l.id === currentLeague.id;
                const isPassed = weekXp >= l.maxXpThisWeek;
                return (
                  <div
                    key={l.id}
                    className={`flex-1 text-center p-1.5 rounded-lg text-[18px] ${
                      isCurrent ? 'bg-foreground/5 ring-1 ring-foreground/20' : 'opacity-50'
                    }`}
                    title={`${l.name}: ${l.minXpThisWeek}+ XP`}
                  >
                    <div className={isPassed ? '' : 'grayscale'}>
                      <DsIcon name={l.icon} className="w-[18px] h-[18px] mx-auto" style={{ color: l.color }} />
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: isCurrent ? l.color : undefined }}>
                      {l.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievements Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-[#B4531C]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Достижения
              </span>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {unlockedCount}/{achievements.length}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {visible.map((a) => (
                <div
                  key={a.id}
                  className={`p-2 rounded-xl text-center transition-all ${
                    a.unlocked
                      ? 'bg-foreground/5'
                      : 'bg-muted/30 opacity-60'
                  }`}
                  title={`${a.title} — ${a.description}`}
                >
                  <div className="text-2xl mb-1" style={{ filter: a.unlocked ? 'none' : 'grayscale(1)' }}>
                    {a.unlocked ? <DsIcon name={a.icon} className="w-6 h-6 mx-auto" /> : <Lock className="w-5 h-5 mx-auto text-muted-foreground" />}
                  </div>
                  <div className="text-[11px] font-semibold leading-tight line-clamp-2">
                    {a.title}
                  </div>
                  {!a.unlocked && a.progressText && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {a.progressText}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {achievements.length > 6 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="mt-3 text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center w-full"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {showAll ? 'Свернуть' : `Показать все (${achievements.length})`}
              </button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
