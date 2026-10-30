'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { OSCE_BANK, OSCE_TYPE_LABELS, getOSCEStationsByType } from '@/lib/osce-bank';
import { getTrackDefinition, getTrackSpecies } from '@/lib/tracks';
import { DIFFICULTY_LABELS } from '@/components/ui/utility';
import type { OSCEStation, OSCEStationType } from '@/lib/types';
import { OSCEStationRunner } from './OSCEStationRunner';
import { DsIcon } from '@/lib/ds-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ScanLine, Filter, Clock, Trophy, CheckCircle2,
  ChevronRight, ArrowLeft, Brain,
} from 'lucide-react';
import { toast } from 'sonner';

export function OSCEListTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const osceHistory = useStore((s) => s.osceHistory);
  const osceSkillMap = useStore((s) => s.osceSkillMap);
  const [filterType, setFilterType] = useState<OSCEStationType | 'all'>('all');
  const [trackFilter, setTrackFilter] = useState(true);
  const [activeStation, setActiveStation] = useState<OSCEStation | null>(null);
  // Референс-плейсхолдеры вместо innerHTML-инъекции при битых картинках
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());

  const trackSpecies = getTrackSpecies(profile.specializationTrack);

  // Filter stations by type + track (species)
  const filteredStations = useMemo(() => {
    let stations = getOSCEStationsByType(filterType);
    if (trackFilter) {
      stations = stations.filter((s) => trackSpecies.includes(s.species));
    }
    return stations;
  }, [filterType, trackFilter, trackSpecies]);

  // Compute per-station status (passed/attempted/new)
  const stationStatus = useMemo(() => {
    const map: Record<string, { attempted: boolean; bestScore: number; attempts: number }> = {};
    for (const h of osceHistory) {
      const existing = map[h.stationId];
      if (existing) {
        existing.attempts += 1;
        if (h.totalScore > existing.bestScore) existing.bestScore = h.totalScore;
      } else {
        map[h.stationId] = { attempted: true, bestScore: h.totalScore, attempts: 1 };
      }
    }
    return map;
  }, [osceHistory]);

  const avgSkill = useMemo(() => {
    const values = Object.values(osceSkillMap || {});
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [osceSkillMap]);

  if (activeStation) {
    return (
      <OSCEStationRunner
        station={activeStation}
        onExit={() => setActiveStation(null)}
      />
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        {/* 206-b#20: единственный h1 на странице — в Header; заголовки табов — h2 */}
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-[#33608C]" />
          OSCE-станции
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Визуальная диагностика в формате реального экзамена
        </p>
      </div>

      {/* Progress summary */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-[#33608C]/5 to-[#B4531C]/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#B4531C]" />
              <span className="text-sm font-semibold">Общий прогресс</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {osceHistory.length} пройдено · {Object.keys(stationStatus).length} из {OSCE_BANK.length} станций
            </span>
          </div>
          <Progress value={avgSkill} className="h-2" />
          <p className="text-[11px] text-muted-foreground mt-1">
            Средний балл: {avgSkill}/10
          </p>

          {/* Per-type breakdown */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            {(Object.entries(OSCE_TYPE_LABELS) as Array<[string, { label: string; icon: string; color: string }]>).map(([type, info]) => {
              const skill = (osceSkillMap as Record<string, number>)?.[type] ?? 0;
              return (
                <div
                  key={type}
                  className="text-center p-2 rounded-lg"
                  style={{ backgroundColor: `${info.color}10` }}
                  title={`${info.label}: ${skill}/10`}
                >
                  <div>
                    <DsIcon name={info.icon} className="w-5 h-5 mx-auto" style={{ color: info.color }} />
                  </div>
                  <div className="text-[10px] font-semibold mt-0.5" style={{ color: info.color }}>
                    {skill || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Track filter toggle */}
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={() => setTrackFilter(!trackFilter)}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            trackFilter
              ? 'bg-[#4C7A3F] text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {trackFilter ? '✓' : ''} Только мой трек ({getTrackDefinition(profile.specializationTrack).label})
        </button>
        <span className="text-muted-foreground">
          Показано: {filteredStations.length} из {OSCE_BANK.length}
        </span>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          onClick={() => setFilterType('all')}
          aria-pressed={filterType === 'all'}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            filterType === 'all' ? 'bg-[#33608C] text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          Все типы
        </button>
        {(Object.entries(OSCE_TYPE_LABELS) as Array<[OSCEStationType, { label: string; icon: string; color: string }]>).map(([type, info]) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            aria-pressed={filterType === type}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === type ? 'text-white' : 'bg-muted text-muted-foreground'
            }`}
            style={filterType === type ? { backgroundColor: info.color } : {}}
          >
            <DsIcon name={info.icon} className="w-3.5 h-3.5 inline-block align-[-3px] mr-1" /> {info.label}
          </button>
        ))}
      </div>

      {/* Stations list */}
      <div className="space-y-2">
        {filteredStations.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет станций по выбранным фильтрам</p>
              <p className="text-[11px] mt-1">Попробуйте отключить фильтр трека</p>
            </CardContent>
          </Card>
        )}

        {filteredStations.map((station) => {
          const status = stationStatus[station.id];
          const info = OSCE_TYPE_LABELS[station.type];
          return (
            <motion.button
              key={station.id}
              onClick={() => setActiveStation(station)}
              whileTap={{ scale: 0.98 }}
              className="w-full text-left"
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted relative flex items-center justify-center"
                      style={failedThumbs.has(station.id) ? { backgroundColor: `${info.color}15` } : undefined}
                    >
                      {failedThumbs.has(station.id) ? (
                        <DsIcon name={info.icon} className="w-7 h-7" style={{ color: info.color }} />
                      ) : (
                        <img
                          src={station.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => {
                            setFailedThumbs((prev) => {
                              const next = new Set(prev);
                              next.add(station.id);
                              return next;
                            });
                          }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight">
                          {station.imageCaption}
                        </h3>
                        {status?.attempted && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {status.bestScore}/10
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {station.presenterText.slice(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-[11px] font-medium"
                          style={{ backgroundColor: `${info.color}15`, color: info.color }}
                        >
                          <DsIcon name={info.icon} className="w-3 h-3 inline-block align-[-2px] mr-0.5" /> {info.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                          {station.species}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                          {DIFFICULTY_LABELS[station.difficulty] || station.difficulty}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          {Math.floor(station.timeLimitSec / 60)} мин
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground self-center shrink-0" />
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
