'use client';

// ===== Панель фазы лаборатории (вынесена из SimulatorTab) =====

import { motion, AnimatePresence } from 'framer-motion';
import type { SimulatorScenario } from '@/lib/simulator-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Beaker, ArrowLeft, ChevronRight, Coins } from 'lucide-react';
import { DsIcon } from '@/lib/ds-icons';

interface LaboratoryPanelProps {
  scenario: SimulatorScenario;
  remainingBudget: number;
  onOrderTest: (testIndex: number) => void;
  onBack: () => void;
  onDiagnosis: () => void;
}

export function LaboratoryPanel({ scenario, remainingBudget, onOrderTest, onBack, onDiagnosis }: LaboratoryPanelProps) {
  return (
    <motion.div key="laboratory" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Beaker className="w-4 h-4 text-[#33608C]" /> Лабораторные тесты
            </h3>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#B4531C]/10">
              <Coins className="w-3.5 h-3.5 text-[#B4531C]" />
              <span className="text-xs font-semibold text-[#B4531C]">{remainingBudget}₽</span>
            </div>
          </div>

          <div className="space-y-2">
            {scenario.availableTests.map((test, i) => {
              const canAfford = test.cost <= remainingBudget;
              return (
                <button
                  key={test.id}
                  onClick={() => !test.isRevealed && canAfford && onOrderTest(i)}
                  disabled={test.isRevealed || !canAfford}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    test.isRevealed
                      ? 'bg-muted/30 border-border/50'
                      : canAfford
                        ? 'border-[#33608C]/30 hover:border-[#33608C]/50 hover:bg-[#33608C]/5'
                        : 'border-transparent bg-muted/20 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DsIcon name={test.icon} className="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{test.name}</p>
                        <span className="text-xs font-semibold text-muted-foreground ml-2 shrink-0">
                          {test.cost}₽
                        </span>
                      </div>
                      <AnimatePresence>
                        {test.isRevealed && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[11px] text-muted-foreground mt-1 leading-relaxed"
                          >
                            {test.result}
                          </motion.p>
                        )}
                      </AnimatePresence>
                      {!test.isRevealed && canAfford && (
                        <p className="text-[11px] text-[#33608C] mt-0.5">Нажмите, чтобы назначить →</p>
                      )}
                      {!canAfford && !test.isRevealed && (
                        <p className="text-[11px] text-[#B3261E] mt-0.5">Недостаточно средств</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 squircle-sm h-11 text-xs"
          onClick={onBack}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Осмотр
        </Button>
        <Button
          className="flex-1 squircle-sm bg-[#4C7A3F] hover:bg-[#3D6332] text-white h-11 text-xs"
          onClick={onDiagnosis}
        >
          Поставить диагноз <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
