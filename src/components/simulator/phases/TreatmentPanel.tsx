'use client';

// ===== Панель фазы лечения (вынесена из SimulatorTab) =====

import { motion } from 'framer-motion';
import type { SimulatorScenario } from '@/lib/simulator-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, ChevronRight, Pill } from 'lucide-react';

interface TreatmentPanelProps {
  scenario: SimulatorScenario;
  selectedDiagnosis: string | null;
  selectedTreatment: string | null;
  onSelectTreatment: (option: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function TreatmentPanel({
  scenario,
  selectedDiagnosis,
  selectedTreatment,
  onSelectTreatment,
  onBack,
  onConfirm,
}: TreatmentPanelProps) {
  return (
    <motion.div key="treatment" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      <Card className="squircle-sm border-0 shadow-sm bg-gradient-to-br from-[#4C7A3F]/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#33608C]" />
            <p className="text-xs font-semibold">Ваш диагноз:</p>
          </div>
          <p className="text-sm font-medium mt-1">{selectedDiagnosis}</p>
        </CardContent>
      </Card>

      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Pill className="w-4 h-4 text-[#4C7A3F]" /> Назначьте лечение
          </h3>
          <div className="space-y-2">
            {scenario.treatmentOptions.map((option, i) => (
              <button
                key={i}
                onClick={() => onSelectTreatment(option)}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                  selectedTreatment === option
                    ? 'border-[#4C7A3F] bg-[#4C7A3F]/5 shadow-sm'
                    : 'border-border hover:border-[#4C7A3F]/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    selectedTreatment === option ? 'bg-[#4C7A3F] text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {['А', 'Б', 'В', 'Г'][i] || '•'}
                  </div>
                  <span className="text-sm">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 squircle-sm h-11 text-xs" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Назад
        </Button>
        <Button
          className="flex-1 squircle-sm bg-[#4C7A3F] hover:bg-[#3D6332] text-white h-11 text-xs"
          disabled={!selectedTreatment}
          onClick={onConfirm}
        >
          Подтвердить лечение <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
