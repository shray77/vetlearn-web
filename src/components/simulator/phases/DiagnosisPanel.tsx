'use client';

// ===== Панель фазы диагноза (вынесена из SimulatorTab) =====

import { motion } from 'framer-motion';
import type { ExaminationFinding, SimulatorScenario } from '@/lib/simulator-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ChevronRight, ClipboardList, Eye } from 'lucide-react';

interface DiagnosisPanelProps {
  scenario: SimulatorScenario;
  discoveredFindings: ExaminationFinding[];
  selectedDiagnosis: string | null;
  onSelectDiagnosis: (option: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function DiagnosisPanel({
  scenario,
  discoveredFindings,
  selectedDiagnosis,
  onSelectDiagnosis,
  onBack,
  onConfirm,
}: DiagnosisPanelProps) {
  return (
    <motion.div key="diagnosis" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      {/* Summary */}
      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#007AFF]" /> Ваши находки
          </h3>
          <div className="text-xs text-muted-foreground space-y-1">
            {discoveredFindings.filter(f => !f.isNormal).slice(0, 5).map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[#FF3B30]">•</span>
                <span>{f.finding}</span>
              </div>
            ))}
            {discoveredFindings.filter(f => !f.isNormal).length > 5 && (
              <p className="text-muted-foreground">...и ещё {discoveredFindings.filter(f => !f.isNormal).length - 5}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#FF9500]" /> Ваш диагноз
          </h3>
          <div className="space-y-2">
            {scenario.diagnosisOptions.map((option, i) => (
              <button
                key={i}
                onClick={() => onSelectDiagnosis(option)}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                  selectedDiagnosis === option
                    ? 'border-[#007AFF] bg-[#007AFF]/5 shadow-sm'
                    : 'border-border hover:border-[#007AFF]/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    selectedDiagnosis === option ? 'bg-[#007AFF] text-white' : 'bg-muted text-muted-foreground'
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
          className="flex-1 squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-11 text-xs"
          disabled={!selectedDiagnosis}
          onClick={onConfirm}
        >
          Подтвердить диагноз <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
