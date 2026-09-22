'use client';

// ===== Панель фазы анамнеза (вынесена из SimulatorTab) =====

import { motion, AnimatePresence } from 'framer-motion';
import type { AnamnesisQA } from '@/lib/simulator-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, MessageCircle } from 'lucide-react';

export const MAX_ANAMNESIS_QUESTIONS = 6;

interface AnamnesisPanelProps {
  ownerComplaint: string;
  questions: AnamnesisQA[];
  asked: number;
  revealed: Set<number>;
  onAsk: (index: number) => void;
  onNext: () => void;
}

export function AnamnesisPanel({ ownerComplaint, questions, asked, revealed, onAsk, onNext }: AnamnesisPanelProps) {
  return (
    <motion.div key="anamnesis" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      {/* Owner complaint speech bubble */}
      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0 text-lg">
              👤
            </div>
            <div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 relative">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Владелец:</p>
                <p className="text-sm leading-relaxed">{ownerComplaint}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#007AFF]" /> Вопросы владельцу
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {asked}/{MAX_ANAMNESIS_QUESTIONS} вопросов
            </span>
          </div>
          <Progress value={asked / MAX_ANAMNESIS_QUESTIONS * 100} className="h-1" />

          <div className="space-y-2">
            {questions.map((qa, i) => {
              const isRevealed = revealed.has(i);
              const canAsk = !isRevealed && asked < MAX_ANAMNESIS_QUESTIONS;
              return (
                <div key={i} className="finding-slide">
                  <button
                    onClick={() => canAsk && onAsk(i)}
                    disabled={!canAsk}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      isRevealed
                        ? 'bg-muted/50 border-border/50'
                        : canAsk
                          ? 'border-[#007AFF]/30 hover:border-[#007AFF]/50 hover:bg-[#007AFF]/5 cursor-pointer'
                          : 'border-transparent bg-muted/30 opacity-50'
                    }`}
                  >
                    <p className="text-sm font-medium">{qa.question}</p>
                    <AnimatePresence>
                      {isRevealed && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-muted-foreground mt-2 pl-3 border-l-2 border-[#007AFF]/30"
                        >
                          {qa.answer}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {!isRevealed && canAsk && (
                      <p className="text-[10px] text-[#007AFF] mt-1">Нажмите, чтобы спросить →</p>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-12 text-sm font-semibold"
        onClick={onNext}
      >
        Перейти к осмотру <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}
