'use client';

// ===== Фаза результатов симуляции (вынесена из SimulatorTab) =====

import { motion, AnimatePresence } from 'framer-motion';
import type { SimulatorEvaluation } from '@/lib/simulator-types';
import { AnimatedNumber } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Activity, CheckCircle2, ClipboardList, Coins, Eye, Lightbulb,
  Loader2, RotateCcw, Star, XCircle,
} from 'lucide-react';

const GRADE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  excellent: { label: 'Отлично', emoji: '', color: '#4C7A3F' },
  good: { label: 'Хорошо', emoji: '', color: '#33608C' },
  satisfactory: { label: 'Удовлетворительно', emoji: '', color: '#B4531C' },
  unsatisfactory: { label: 'Неудовлетворительно', emoji: '', color: '#B3261E' },
};

interface SimulatorResultsProps {
  evaluation: SimulatorEvaluation;
  onReset: () => void;
  onNewPatient: () => void;
  isGenerating: boolean;
}

export function SimulatorResults({ evaluation, onReset, onNewPatient, isGenerating }: SimulatorResultsProps) {
  const gc = GRADE_CONFIG[evaluation.grade] || GRADE_CONFIG.unsatisfactory;
  return (
    <div className="space-y-4 pb-4">
      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          {/* Score card */}
          <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#33608C]/5 to-[#6D4FC4]/5">
            <CardContent className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-5xl mb-2"
              >
                {gc.emoji}
              </motion.div>
              <div className="text-4xl font-bold mb-1" style={{ color: gc.color }}>
                <AnimatedNumber value={evaluation.score} />
                <span className="text-xl">/100</span>
              </div>
              <Badge className="text-sm px-4 py-1" style={{ backgroundColor: gc.color + '20', color: gc.color, border: `1px solid ${gc.color}40` }}>
                {gc.label}
              </Badge>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Star className="w-4 h-4 text-[#B4531C]" />
                <span className="text-sm font-semibold text-[#B4531C]">+{evaluation.xpEarned} XP</span>
              </div>
            </CardContent>
          </Card>

          {/* Score breakdown */}
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Разбор баллов</h3>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  {evaluation.diagnosisCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-[#4C7A3F]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#B3261E]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Диагноз</span>
                    <span className="text-xs text-muted-foreground">0-40</span>
                  </div>
                  <Progress value={(evaluation.diagnosisCorrect ? 40 : 0) / 40 * 100} className="h-1.5 mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  {evaluation.treatmentCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-[#4C7A3F]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#B3261E]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Лечение</span>
                    <span className="text-xs text-muted-foreground">0-25</span>
                  </div>
                  <Progress value={(evaluation.treatmentCorrect ? 25 : 0) / 25 * 100} className="h-1.5 mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#33608C]/10 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5 text-[#33608C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Полнота обследования</span>
                    <span className="text-xs text-muted-foreground">{evaluation.examinationScore}/20</span>
                  </div>
                  <Progress value={evaluation.examinationScore / 20 * 100} className="h-1.5 mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#B4531C]/10 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5 text-[#B4531C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Экономность</span>
                    <span className="text-xs text-muted-foreground">{evaluation.economyScore}/15</span>
                  </div>
                  <Progress value={evaluation.economyScore / 15 * 100} className="h-1.5 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback cards */}
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#33608C]" /> Обратная связь
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{evaluation.feedback}</p>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Диагноз</p>
                <p className="text-sm leading-relaxed">{evaluation.diagnosisFeedback}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Лечение</p>
                <p className="text-sm leading-relaxed">{evaluation.treatmentFeedback}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Обследование</p>
                <p className="text-sm leading-relaxed">{evaluation.examinationFeedback}</p>
              </div>
            </CardContent>
          </Card>

          {/* Key takeaways */}
          {evaluation.keyTakeaways.length > 0 && (
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#B4531C]" /> Главные выводы
                </h3>
                <ul className="space-y-1.5">
                  {evaluation.keyTakeaways.map((t, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-[#4C7A3F] mt-0.5">•</span> {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 squircle-sm h-12"
              onClick={onReset}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Вернуться
            </Button>
            <Button
              className="flex-1 squircle-sm bg-[#33608C] hover:bg-[#264E70] text-white h-12"
              onClick={onNewPatient}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Activity className="w-4 h-4 mr-2" /> Новый пациент</>
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
