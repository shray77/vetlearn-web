'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { ATLAS_BANK, ATLAS_MODALITY_LABELS, getAtlasEntries } from '@/lib/atlas-bank';
import { DIFFICULTY_LABELS } from '@/components/ui/utility';
import type { AtlasEntry } from '@/lib/atlas-bank';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen, ArrowLeft, Lightbulb, Microscope,
  ClipboardList, Heart, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { DsIcon } from '@/lib/ds-icons';

const VIEWED_KEY = 'vetlearn_atlas_viewed_v1';

function loadViewed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function AtlasTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const addXP = useStore((s) => s.addXP);
  const [filterModality, setFilterModality] = useState<string>('all');
  const [activeEntry, setActiveEntry] = useState<AtlasEntry | null>(null);
  // XP за статью — один раз навсегда: раньше set жил в useState и умирал при выходе
  // с таба → перезаход + просмотр той же статьи = повторный +5 XP (фарм)
  const [viewed, setViewed] = useState<Set<string>>(() => loadViewed());

  const filtered = useMemo(
    () => getAtlasEntries(filterModality === 'all' ? undefined : { modality: filterModality }),
    [filterModality]
  );

  const handleOpen = (entry: AtlasEntry) => {
    setActiveEntry(entry);
    if (!viewed.has(entry.id)) {
      const newSet = new Set(viewed);
      newSet.add(entry.id);
      setViewed(newSet);
      try {
        localStorage.setItem(VIEWED_KEY, JSON.stringify([...newSet]));
      } catch {
        // quota — XP за просмотр всё равно начислен один раз за сессию
      }
      addXP(5);
      toast.success(`+5 XP за изучение: ${entry.title}`);
    }
  };

  if (activeEntry) {
    return <AtlasReader entry={activeEntry} onExit={() => setActiveEntry(null)} />;
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        {/* 206-b#20: единственный h1 на странице — в Header; заголовки табов — h2 */}
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#33608C]" />
          Атлас
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Библиотека рентген/УЗИ/цитология с подробными разборами — режим обучения
        </p>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-[#33608C]/5 to-[#B4531C]/5">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Изучено</p>
            <p className="text-lg font-bold">
              {viewed.size} / {ATLAS_BANK.length}
            </p>
          </div>
          <Microscope className="w-8 h-8 text-[#33608C] opacity-30" />
        </CardContent>
      </Card>

      {/* Modality filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          onClick={() => setFilterModality('all')}
          aria-pressed={filterModality === 'all'}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            filterModality === 'all' ? 'bg-[#33608C] text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          Все ({ATLAS_BANK.length})
        </button>
        {(Object.entries(ATLAS_MODALITY_LABELS) as Array<[string, { label: string; icon: string; color: string }]>).map(([mod, info]) => {
          const count = ATLAS_BANK.filter((e) => e.modality === mod).length;
          return (
            <button
              key={mod}
              onClick={() => setFilterModality(mod)}
              aria-pressed={filterModality === mod}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterModality === mod ? 'text-white' : 'bg-muted text-muted-foreground'
              }`}
              style={filterModality === mod ? { backgroundColor: info.color } : {}}
            >
              <DsIcon name={info.icon} className="w-3.5 h-3.5 inline-block align-[-3px] mr-1" /> {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Atlas entries */}
      <div className="space-y-2">
        {filtered.map((entry) => {
          const info = ATLAS_MODALITY_LABELS[entry.modality];
          const isViewed = viewed.has(entry.id);
          return (
            <motion.button
              key={entry.id}
              onClick={() => handleOpen(entry)}
              whileTap={{ scale: 0.98 }}
              className="w-full text-left"
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${info.color}15` }}
                    >
                      <DsIcon name={info.icon} className="w-8 h-8" style={{ color: info.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight">{entry.title}</h3>
                        {isViewed && (
                          <Badge variant="secondary" className="text-[10px] shrink-0 bg-[#4C7A3F]/15 text-[#4C7A3F]">
                            ✓ Изучено
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {entry.presenterText.slice(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1"
                          style={{ backgroundColor: `${info.color}15`, color: info.color }}
                        >
                          {/* Task 204 (fix 204-b#2): сырой ключ иконки текстом
                              («radiology Рентген») → DsIcon, как в остальных чипах */}
                          <DsIcon name={info.icon} className="w-3 h-3" /> {info.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                          {entry.species}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                          {entry.bodyRegion}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                          {entry.difficulty === 'beginner' ? 'базовый' : entry.difficulty === 'intermediate' ? 'средний' : 'продвинутый'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Detailed atlas entry reader — structured findings + interpretation + actions.
 */
function AtlasReader({ entry, onExit }: { entry: AtlasEntry; onExit: () => void }) {
  const info = ATLAS_MODALITY_LABELS[entry.modality];
  // Task 204 (fix 204-b#2): React-state фолбэк вместо innerHTML-мутаций
  const [imgError, setImgError] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 pb-4"
    >
      <button
        onClick={onExit}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад к атласу
      </button>

      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1"
              style={{ backgroundColor: `${info.color}15`, color: info.color }}
            >
              {/* Task 204 (fix 204-b#2): ключ иконки текстом → DsIcon */}
              <DsIcon name={info.icon} className="w-3 h-3" /> {info.label}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{entry.species}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{entry.bodyRegion}</span>
            {/* 206-b#9: сырой англ. difficulty → русская метка (в 164 уже переводится — двойной стандарт) */}
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{DIFFICULTY_LABELS[entry.difficulty] || entry.difficulty}</span>
          </div>
          <h2 className="text-base font-bold mb-1">{entry.title}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.presenterText}</p>
        </CardContent>
      </Card>

      {/* Image */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Task 204 (fix 204-b#2/#11): фолбэк битой картинки — раньше
              innerHTML с гигантским ТЕКСТОМ-ключом («histopathology» на весь
              экран); теперь React-state + DsIcon. Тёмная тема: лёгкое
              затемнение медицинских тайлов, чтобы не «фонарили». */}
          {imgError ? (
            <div
              className="w-full aspect-video flex items-center justify-center"
              style={{ backgroundColor: `${info.color}10` }}
            >
              <DsIcon name={info.icon} className="w-16 h-16" style={{ color: info.color }} />
            </div>
          ) : (
            <img
              src={entry.imageUrl}
              alt={entry.caption}
              className="w-full aspect-video object-cover bg-muted dark:brightness-90 dark:contrast-[0.97]"
              onError={() => setImgError(true)}
            />
          )}
          <p className="text-[10px] text-muted-foreground text-center py-1.5 border-t">
            {entry.caption}
          </p>
        </CardContent>
      </Card>

      {/* Findings */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Microscope className="w-4 h-4 text-[#33608C]" />
            <h3 className="text-sm font-semibold">Находки</h3>
          </div>
          <ul className="space-y-1.5">
            {entry.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[#33608C] shrink-0 mt-0.5">▸</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Interpretation */}
      <Card className="border-0 shadow-sm bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Интерпретация</h3>
          </div>
          <p className="text-xs leading-relaxed">{entry.interpretation}</p>
        </CardContent>
      </Card>

      {/* Differential diagnosis */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-[#B4531C]" />
            <h3 className="text-sm font-semibold">Дифференциальный диагноз</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entry.differentialDiagnosis.map((d, i) => (
              <Badge
                key={i}
                variant="secondary"
                className={`text-[11px] ${i === 0 ? 'bg-[#B4531C]/15 text-[#B4531C]' : ''}`}
              >
                {d}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended actions */}
      <Card className="border-0 shadow-sm bg-[#4C7A3F]/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-[#4C7A3F]" />
            <h3 className="text-sm font-semibold">Рекомендуемые действия</h3>
          </div>
          <ul className="space-y-1.5">
            {entry.recommendedActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[#4C7A3F] shrink-0 mt-0.5">{i + 1}.</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Key learning points */}
      <Card className="border-0 shadow-sm bg-[#B4531C]/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#B4531C]" />
            <h3 className="text-sm font-semibold">Ключевые выводы</h3>
          </div>
          <ul className="space-y-1.5">
            {entry.keyLearningPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs italic">
                <span className="text-[#B4531C] shrink-0 mt-0.5">→</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {entry.attribution && (
        <p className="text-[10px] text-muted-foreground text-center px-4">
          {entry.attribution}
        </p>
      )}

      <Button onClick={onExit} className="w-full" variant="outline">
        <ArrowLeft className="w-4 h-4 mr-2" />
        К атласу
      </Button>
    </motion.div>
  );
}
