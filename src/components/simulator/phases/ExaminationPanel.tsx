'use client';

// ===== Панель фазы осмотра (вынесена из SimulatorTab) =====

import { motion, AnimatePresence } from 'framer-motion';
import { AnimalSVG } from '@/components/simulator/AnimalSVG';
import { BODY_REGION_LABELS, VET_TOOLS } from '@/lib/simulator-types';
import type { BodyRegion, ExaminationFinding, SimulatorScenario } from '@/lib/simulator-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ChevronRight, FlaskConical } from 'lucide-react';

interface ExaminationPanelProps {
  scenario: SimulatorScenario;
  selectedTool: string | null;
  onSelectTool: (toolId: string | null) => void;
  onRegionClick: (region: BodyRegion) => void;
  examinedRegions: Set<string>;
  abnormalRegions: Set<string>;
  discoveredFindings: ExaminationFinding[];
  lastFinding: ExaminationFinding | null;
  onBack: () => void;
  onLaboratory: () => void;
  onDiagnosis: () => void;
}

export function ExaminationPanel({
  scenario,
  selectedTool,
  onSelectTool,
  onRegionClick,
  examinedRegions,
  abnormalRegions,
  discoveredFindings,
  lastFinding,
  onBack,
  onLaboratory,
  onDiagnosis,
}: ExaminationPanelProps) {
  return (
    <motion.div key="examination" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      {/* Animal SVG */}
      <Card className="squircle border-0 shadow-sm">
        <CardContent className="p-2">
          <AnimalSVG
            species={scenario.species}
            onRegionClick={onRegionClick}
            selectedRegion={null}
            examinedRegions={examinedRegions}
            abnormalRegions={abnormalRegions}
          />
        </CardContent>
      </Card>

      {/* Tool panel */}
      <Card className="squircle-sm border-0 shadow-sm">
        <CardContent className="p-3">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">🛠 Инструменты</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {VET_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => onSelectTool(selectedTool === tool.id ? null : tool.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] shrink-0 transition-all border-2 ${
                  selectedTool === tool.id
                    ? 'border-[#007AFF] bg-[#007AFF]/10 shadow-sm'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
              >
                <span className="text-xl">{tool.icon}</span>
                <span className="text-[10px] font-medium text-center leading-tight">{tool.name}</span>
              </button>
            ))}
          </div>
          {selectedTool && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              {VET_TOOLS.find(t => t.id === selectedTool)?.description} — нажмите на область животного
            </p>
          )}
        </CardContent>
      </Card>

      {/* Findings panel */}
      {discoveredFindings.length > 0 && (
        <Card className="squircle-sm border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                📋 Находки ({discoveredFindings.length})
              </h3>
            </div>
            <ScrollArea className="max-h-40">
              <div className="space-y-1.5">
                {discoveredFindings.map((f, i) => {
                  const borderColor = f.relevance === 'critical'
                    ? 'border-l-[#FF3B30]'
                    : f.relevance === 'important'
                      ? 'border-l-[#FF9500]'
                      : 'border-l-[#28CD41]';
                  return (
                    <div key={`${f.region}-${f.toolId}-${i}`} className={`finding-slide pl-3 border-l-2 ${borderColor}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {BODY_REGION_LABELS[f.region as BodyRegion]} • {VET_TOOLS.find(t => t.id === f.toolId)?.icon} {VET_TOOLS.find(t => t.id === f.toolId)?.name}
                        </span>
                        {f.isNormal ? (
                          <Badge className="text-[9px] px-1.5 py-0 bg-[#28CD41]/10 text-[#28CD41]">норма</Badge>
                        ) : (
                          <Badge className="text-[9px] px-1.5 py-0 bg-[#FF3B30]/10 text-[#FF3B30]">
                            {f.relevance === 'critical' ? 'критично' : 'патология'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed">{f.finding}</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Last finding toast */}
      <AnimatePresence>
        {lastFinding && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`p-3 rounded-xl border-2 text-sm ${
              lastFinding.isNormal
                ? 'bg-[#28CD41]/10 border-[#28CD41]/30 text-[#28CD41]'
                : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
            }`}
          >
            {lastFinding.finding}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 squircle-sm h-11 text-xs"
          onClick={onBack}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Анамнез
        </Button>
        <Button
          className="flex-1 squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-11 text-xs"
          onClick={onLaboratory}
        >
          <FlaskConical className="w-3.5 h-3.5 mr-1" /> Лаб. тесты
        </Button>
        <Button
          className="flex-1 squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-11 text-xs"
          onClick={onDiagnosis}
        >
          Диагноз <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
