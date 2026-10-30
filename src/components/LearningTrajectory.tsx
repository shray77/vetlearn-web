'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StudentProfile } from '@/lib/types';
import { VET_TOPICS } from '@/lib/vet-topics';

interface LearningTrajectoryProps {
  profile: StudentProfile;
}

interface Milestone {
  id: string;
  emoji: string;
  title: string;
  description: string;
  color: string;
}

const MILESTONES: Milestone[] = [
  { id: 'start', emoji: '', title: 'Начало', description: 'Первый тест пройден', color: '#4C7A3F' },
  { id: 'diagnostic', emoji: '', title: 'Диагностика', description: 'Входное тестирование', color: '#33608C' },
  { id: 'foundation', emoji: '', title: 'Фундамент', description: '3+ темы >50% владения', color: '#6D4FC4' },
  { id: 'clinical', emoji: '', title: 'Клиническое мышление', description: '5+ тестов пройдено', color: '#B4531C' },
  { id: 'cases', emoji: '', title: 'Клинические кейсы', description: '3+ кейса выполнено', color: '#33608C' },
  { id: 'expert', emoji: '', title: 'Эксперт', description: 'Все темы >70%', color: '#B4531C' },
  { id: 'master', emoji: '', title: 'Мастер', description: 'Все темы >90%', color: '#B3261E' },
];

const TOTAL_TOPICS = VET_TOPICS.length;

function getMilestoneStatus(
  profile: StudentProfile
): ('completed' | 'current' | 'locked')[] {
  const skillValues = Object.values(profile.skillMap).filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const topicsAbove50 = skillValues.filter((v) => v > 50).length;
  const topicsAbove70 = skillValues.filter((v) => v > 70).length;
  const topicsAbove90 = skillValues.filter((v) => v > 90).length;

  const checks: boolean[] = [
    profile.assessmentsCompleted >= 1,
    profile.placementCompleted === true,
    topicsAbove50 >= 3,
    profile.assessmentsCompleted >= 5,
    profile.completedCases >= 3,
    topicsAbove70 >= TOTAL_TOPICS,
    topicsAbove90 >= TOTAL_TOPICS,
  ];

  const statuses: ('completed' | 'current' | 'locked')[] = [];

  let foundCurrent = false;
  for (let i = 0; i < checks.length; i++) {
    if (checks[i]) {
      statuses.push('completed');
    } else if (!foundCurrent) {
      statuses.push('current');
      foundCurrent = true;
    } else {
      statuses.push('locked');
    }
  }

  return statuses;
}

/* ─── SVG winding road between milestones ─── */
function RoadPath({ completedCount, total }: { completedCount: number; total: number }) {
  // Build a gentle winding path through all milestones
  const width = (total - 1) * 120;
  const height = 40;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < total; i++) {
    const x = i * 120;
    const y = i % 2 === 0 ? height / 2 : height / 2 + (i % 3 === 0 ? 6 : -6);
    points.push({ x, y });
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const progressFraction = completedCount / total;

  return (
    <svg
      className="absolute top-1/2 left-0 -translate-y-1/2 pointer-events-none"
      width={width + 20}
      height={height + 20}
      viewBox={`0 0 ${width + 20} ${height + 20}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      {/* Background path (full, dimmed) */}
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        className="text-border opacity-40"
      />
      {/* Completed path (animated) */}
      {completedCount > 0 && (
        <path
          d={d}
          fill="none"
          stroke="url(#roadGradient)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="1000"
          className="animate-draw-path"
          style={{
            strokeDashoffset: 1000 * (1 - progressFraction),
          }}
        />
      )}
      <defs>
        <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4C7A3F" />
          <stop offset="100%" stopColor="#33608C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Single milestone node ─── */
function MilestoneNode({
  milestone,
  status,
  index,
}: {
  milestone: Milestone;
  status: 'completed' | 'current' | 'locked';
  index: number;
}) {
  const isCompleted = status === 'completed';
  const isCurrent = status === 'current';
  const isLocked = status === 'locked';

  return (
    <motion.div
      className="flex flex-col items-center gap-2 relative z-10"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.15 + 0.3,
        type: 'spring',
        stiffness: 200,
        damping: 20,
      }}
    >
      {/* Node circle */}
      <motion.div
        className="relative"
        animate={isCurrent ? { y: [0, -6, 0] } : {}}
        transition={
          isCurrent
            ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      >
        {/* Pulsing ring for current */}
        {isCurrent && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${milestone.color}33 0%, transparent 70%)`,
            }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Completed glow */}
        {isCompleted && (
          <div
            className="absolute -inset-1.5 rounded-full opacity-30 blur-md"
            style={{ backgroundColor: '#4C7A3F' }}
          />
        )}

        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-lg
            border-2 transition-colors
            ${isCompleted ? 'bg-[#4C7A3F] border-[#4C7A3F] text-white shadow-lg' : ''}
            ${isCurrent ? 'bg-background border-[#33608C] shadow-md' : ''}
            ${isLocked ? 'bg-muted border-border opacity-50' : ''}
          `}
        >
          {isCompleted ? (
            <Check className="w-5 h-5" />
          ) : isLocked ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : (
            <span>{milestone.emoji}</span>
          )}
        </div>
      </motion.div>

      {/* Label */}
      <div className="text-center w-24">
        <p
          className={`text-xs font-semibold leading-tight ${
            isCompleted
              ? 'text-[#4C7A3F]'
              : isCurrent
                ? 'text-foreground'
                : 'text-muted-foreground'
          }`}
        >
          {milestone.title}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {milestone.description}
        </p>
      </div>

      {/* Step number */}
      <div
        className={`
          w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold
          ${isCompleted ? 'bg-[#4C7A3F] text-white' : 'bg-muted text-muted-foreground'}
        `}
      >
        {index + 1}
      </div>
    </motion.div>
  );
}

export function LearningTrajectory({ profile }: LearningTrajectoryProps) {
  const statuses = useMemo(() => getMilestoneStatus(profile), [profile]);
  const completedCount = statuses.filter((s) => s === 'completed').length;
  const currentMilestone = statuses.findIndex((s) => s === 'current');
  const allCompleted = completedCount === MILESTONES.length;

  return (
    <Card className="squircle border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#33608C]" />
          Путь обучения
          {!allCompleted && currentMilestone >= 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">
              Шаг {currentMilestone + 1} из {MILESTONES.length}
            </span>
          )}
          {allCompleted && (
            <span className="ml-auto text-[10px] text-[#4C7A3F] font-semibold animate-shimmer">
              Все пройдено! 
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Horizontal view for md+, vertical for small screens */}
        <div className="md:block hidden">
          <div className="relative overflow-x-auto pb-4">
            <div className="relative flex items-start gap-0 min-w-fit px-2 pt-4 pb-8">
              {/* SVG road path */}
              <div className="absolute left-0 top-[52px] pointer-events-none">
                <RoadPath
                  completedCount={completedCount}
                  total={MILESTONES.length}
                />
              </div>

              {/* Milestone nodes */}
              {MILESTONES.map((milestone, index) => (
                <div key={milestone.id} className="w-[120px] flex-shrink-0">
                  <MilestoneNode
                    milestone={milestone}
                    status={statuses[index]}
                    index={index}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vertical view for mobile */}
        <div className="md:hidden block">
          <div className="relative pl-10">
            {/* Vertical line */}
            <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-border" />
            {/* Completed line */}
            {completedCount > 0 && (
              <motion.div
                className="absolute left-[23px] top-0 w-0.5 bg-gradient-to-b from-[#4C7A3F] to-[#33608C]"
                initial={{ height: 0 }}
                animate={{
                  height: `${(completedCount / MILESTONES.length) * 100}%`,
                }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
              />
            )}

            <div className="space-y-6">
              {MILESTONES.map((milestone, index) => {
                const status = statuses[index];
                const isCompleted = status === 'completed';
                const isCurrent = status === 'current';
                const isLocked = status === 'locked';

                return (
                  <motion.div
                    key={milestone.id}
                    className="flex items-start gap-3 relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.12 + 0.3,
                      type: 'spring',
                      stiffness: 180,
                      damping: 20,
                    }}
                  >
                    {/* Node on the line */}
                    <div className="absolute -left-10 top-0">
                      <motion.div
                        animate={isCurrent ? { y: [0, -4, 0] } : {}}
                        transition={
                          isCurrent
                            ? {
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }
                            : {}
                        }
                        className="relative"
                      >
                        {isCurrent && (
                          <motion.div
                            className="absolute -inset-2 rounded-full"
                            style={{
                              background: `radial-gradient(circle, ${milestone.color}33 0%, transparent 70%)`,
                            }}
                            animate={{
                              scale: [1, 1.8, 1],
                              opacity: [0.6, 0, 0.6],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                        )}
                        {isCompleted && (
                          <div className="absolute -inset-1 rounded-full opacity-30 blur-sm bg-[#4C7A3F]" />
                        )}
                        <div
                          className={`
                            w-7 h-7 rounded-full flex items-center justify-center border-2
                            ${isCompleted ? 'bg-[#4C7A3F] border-[#4C7A3F] text-white' : ''}
                            ${isCurrent ? 'bg-background border-[#33608C]' : ''}
                            ${isLocked ? 'bg-muted border-border opacity-40' : ''}
                          `}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : isLocked ? (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <span className="text-sm">{milestone.emoji}</span>
                          )}
                        </div>
                      </motion.div>
                    </div>

                    {/* Text content */}
                    <div className="flex-1 pt-0.5">
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted
                            ? 'text-[#4C7A3F]'
                            : isCurrent
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {milestone.emoji} {milestone.title}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          isCurrent
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/60'
                        }`}
                      >
                        {milestone.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-muted-foreground">
              Общий прогресс
            </span>
            <span className="text-[10px] font-semibold text-[#33608C]">
              {completedCount} / {MILESTONES.length}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#4C7A3F] to-[#33608C]"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / MILESTONES.length) * 100}%` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.8 }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
