'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

export function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const step = (end - start) / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if ((step > 0 && start >= end) || (step < 0 && start <= end)) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display}</span>;
}

export function XPBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">XP</span>
        <span className="font-medium">{current}/{max}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #4C7A3F, #3D6332)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  diagnosis: 'Диагноз',
  treatment: 'Лечение',
  differential: 'Дифференциальный',
  lab: 'Лаборатория',
  prognosis: 'Прогноз',
};

export function LoadingSpinner({ text = 'Генерация...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-[#4C7A3F] animate-spin" />
        <Sparkles className="w-5 h-5 text-[#B4531C] absolute -top-1 -right-1 animate-pulse" />
      </div>
      <p className="text-muted-foreground text-sm animate-pulse">{text}</p>
    </div>
  );
}
