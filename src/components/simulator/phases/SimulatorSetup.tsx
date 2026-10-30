'use client';

// ===== Фаза настройки симулятора (вынесена из SimulatorTab) =====

import { motion } from 'framer-motion';
import { SPECIES_OPTIONS, DIFFICULTY_OPTIONS, VET_TOPICS } from '@/lib/vet-topics';
import type { SpeciesType, DifficultyType } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Loader2, Stethoscope, Star } from 'lucide-react';
import { DsIcon } from '@/lib/ds-icons';

interface SimulatorSetupProps {
  selectedSpecies: SpeciesType;
  onSelectSpecies: (s: SpeciesType) => void;
  selectedDifficulty: DifficultyType;
  onSelectDifficulty: (d: DifficultyType) => void;
  selectedTopic: string;
  onSelectTopic: (t: string) => void;
  onStart: () => void;
  isGenerating: boolean;
  completedSimulations: number;
}

export function SimulatorSetup({
  selectedSpecies,
  onSelectSpecies,
  selectedDifficulty,
  onSelectDifficulty,
  selectedTopic,
  onSelectTopic,
  onStart,
  isGenerating,
  completedSimulations,
}: SimulatorSetupProps) {
  return (
    <div className="space-y-4 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-[#33608C]" />
          <h2 className="text-lg font-bold">Ветеринарный симулятор</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Практикуйтесь в диагностике: осматривайте пациента, назначайте анализы, ставьте диагноз и выбирайте лечение.
        </p>
        {/* Task 204 (fix 204-b#7): учебный дисклеймер прямо в модуле — раньше
            «не консультация» была только на terms.html, до которой из
            симулятора никто не доходил */}
        <p className="text-[11px] text-muted-foreground mt-1">
          Учебный сценарий — не ветеринарная консультация; оценки не подтверждают квалификацию.
        </p>
      </motion.div>

      <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#33608C]/5 to-[#33608C]/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#33608C]/10 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-[#33608C]" />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
              <p className="font-semibold text-foreground text-sm">Как это работает?</p>
              <p>1. Выберите вид животного и сложность</p>
              <p>2. Опросите владельца (анамнез)</p>
              <p>3. Осмотрите животное инструментами</p>
              <p>4. Назначьте необходимые анализы (в рамках бюджета)</p>
              <p>5. Поставьте диагноз и назначьте лечение</p>
              <p>6. Получите оценку и обратную связь от AI</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {completedSimulations > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Star className="w-4 h-4 text-[#B4531C]" />
          <span className="text-xs text-muted-foreground">Симуляций пройдено: {completedSimulations}</span>
        </div>
      )}

      <Card className="squircle border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Вид животного</h3>
          <div className="grid grid-cols-4 gap-2">
            {SPECIES_OPTIONS.map(sp => (
              <button
                key={sp.value}
                onClick={() => onSelectSpecies(sp.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  selectedSpecies === sp.value
                    ? 'bg-[#EDF3EA] dark:bg-[#203528] border-2 border-[#4C7A3F]/30 scale-105 shadow-sm'
                    : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                }`}
              >
                <DsIcon name={sp.icon} className="w-6 h-6" />
                <span className="text-[10px] font-medium">{sp.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Сложность</h3>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.filter(d => d.value !== 'expert').map(opt => (
              <button
                key={opt.value}
                onClick={() => onSelectDifficulty(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  selectedDifficulty === opt.value
                    ? 'text-white shadow-md scale-105'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                style={selectedDifficulty === opt.value ? { backgroundColor: opt.color } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Тема (необязательно)</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectTopic('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !selectedTopic ? 'bg-[#33608C] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              Любая
            </button>
            {VET_TOPICS.slice(0, 8).map(t => (
              <button
                key={t.id}
                onClick={() => onSelectTopic(t.id === selectedTopic ? '' : t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTopic === t.id ? 'bg-[#33608C] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <DsIcon name={t.icon} className="w-3.5 h-3.5 inline-block align-[-3px] mr-1" /> {t.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full squircle-sm bg-[#33608C] hover:bg-[#264E70] text-white h-14 text-sm font-bold shadow-lg"
        onClick={onStart}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерация сценария...</>
        ) : (
          <><Activity className="w-4 h-4 mr-2" /> Начать приём</>
        )}
      </Button>

      {isGenerating && <LoadingSpinner text="AI создаёт клинический сценарий..." />}
    </div>
  );
}
