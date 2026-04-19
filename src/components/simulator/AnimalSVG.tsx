'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { BodyRegion } from '@/lib/simulator-types';
import { BODY_REGION_LABELS, BODY_REGION_ICONS } from '@/lib/simulator-types';

interface AnimalSVGProps {
  species: string;
  onRegionClick: (region: BodyRegion) => void;
  selectedRegion: BodyRegion | null;
  examinedRegions: Set<string>;
  abnormalRegions: Set<string>;
  disabled?: boolean;
  className?: string;
}

// Map species to image filenames
const SPECIES_IMAGES: Record<string, string> = {
  'собаки': '/simulator-animals/dog.png',
  'кошки': '/simulator-animals/cat.png',
  'КРС': '/simulator-animals/cow.png',
  'свиньи': '/simulator-animals/pig.png',
  'МРС': '/simulator-animals/sheep.png',
  'лошади': '/simulator-animals/horse.png',
  'птица': '/simulator-animals/bird.png',
};

// Zone definitions: percentage-based for responsive overlay
interface ZoneDef {
  region: BodyRegion;
  x: number;
  y: number;
  w: number;
  h: number;
  labelX: number;
  labelY: number;
  zIndex: number;  // Higher = on top (clicks go to topmost zone)
}

// Zones for typical side-view quadruped (dog, cat, cow, pig, sheep, horse)
// IMPORTANT: skin has LOWEST z-index so specific zones can receive clicks on top
const QUADRUPOD_ZONES: ZoneDef[] = [
  { region: 'skin', x: 3, y: 3, w: 94, h: 66, labelX: 50, labelY: 5, zIndex: 1 },
  { region: 'head', x: 70, y: 2, w: 27, h: 30, labelX: 84, labelY: 18, zIndex: 10 },
  { region: 'neck', x: 52, y: 10, w: 22, h: 25, labelX: 63, labelY: 22, zIndex: 10 },
  { region: 'thorax', x: 30, y: 15, w: 28, h: 35, labelX: 44, labelY: 33, zIndex: 10 },
  { region: 'abdomen', x: 8, y: 22, w: 30, h: 33, labelX: 23, labelY: 38, zIndex: 10 },
  { region: 'tail', x: 0, y: 14, w: 10, h: 28, labelX: 5, labelY: 28, zIndex: 10 },
  { region: 'front_legs', x: 38, y: 50, w: 20, h: 44, labelX: 48, labelY: 72, zIndex: 10 },
  { region: 'hind_legs', x: 6, y: 52, w: 20, h: 42, labelX: 16, labelY: 73, zIndex: 10 },
];

// Zones for bird (bipedal)
const BIRD_ZONES: ZoneDef[] = [
  { region: 'skin', x: 5, y: 3, w: 90, h: 58, labelX: 50, labelY: 5, zIndex: 1 },
  { region: 'head', x: 62, y: 2, w: 28, h: 20, labelX: 76, labelY: 12, zIndex: 10 },
  { region: 'neck', x: 48, y: 10, w: 22, h: 22, labelX: 59, labelY: 22, zIndex: 10 },
  { region: 'thorax', x: 25, y: 15, w: 32, h: 32, labelX: 41, labelY: 32, zIndex: 10 },
  { region: 'abdomen', x: 12, y: 28, w: 28, h: 28, labelX: 26, labelY: 42, zIndex: 10 },
  { region: 'tail', x: 0, y: 20, w: 15, h: 22, labelX: 8, labelY: 31, zIndex: 10 },
  { region: 'front_legs', x: 32, y: 47, w: 22, h: 48, labelX: 43, labelY: 70, zIndex: 10 },
  { region: 'hind_legs', x: 22, y: 50, w: 15, h: 45, labelX: 30, labelY: 72, zIndex: 10 },
];

function getZones(species: string): ZoneDef[] {
  return species === 'птица' ? BIRD_ZONES : QUADRUPOD_ZONES;
}

function getRegionStyle(
  zone: ZoneDef,
  isHovered: boolean,
  isSelected: boolean,
  isExamined: boolean,
  isAbnormal: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.w}%`,
    height: `${zone.h}%`,
    borderWidth: zone.region === 'skin' ? '1px' : '2px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    boxSizing: 'border-box',
    zIndex: zone.zIndex,
  };

  if (isSelected) {
    return { ...base, backgroundColor: 'rgba(0,122,255,0.22)', borderColor: 'rgba(0,122,255,0.7)', borderStyle: 'solid' };
  }
  if (isHovered) {
    return { ...base, backgroundColor: 'rgba(0,122,255,0.14)', borderColor: 'rgba(0,122,255,0.55)', borderStyle: 'solid' };
  }
  if (isExamined && isAbnormal) {
    return { ...base, backgroundColor: 'rgba(255,59,48,0.10)', borderColor: 'rgba(255,59,48,0.4)', borderStyle: 'solid' };
  }
  if (isExamined) {
    return { ...base, backgroundColor: 'rgba(40,205,65,0.06)', borderColor: 'rgba(40,205,65,0.35)', borderStyle: 'solid' };
  }
  // Default
  if (zone.region === 'skin') {
    return { ...base, backgroundColor: 'transparent', borderColor: 'rgba(0,122,255,0.08)', borderStyle: 'dashed' };
  }
  return { ...base, backgroundColor: 'transparent', borderColor: 'rgba(0,122,255,0.18)', borderStyle: 'dashed' };
}

function IndicatorBadge({
  zone,
  isExamined,
  isAbnormal,
}: {
  zone: ZoneDef;
  isExamined: boolean;
  isAbnormal: boolean;
}) {
  if (!isExamined) return null;
  return (
    <div
      className="absolute pointer-events-none flex items-center justify-center"
      style={{
        left: `${zone.labelX}%`,
        top: `${zone.labelY}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: zone.zIndex + 5,
      }}
    >
      {isAbnormal ? (
        <div className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center shadow-lg sim-pulse">
          <span className="text-white text-[10px] font-bold leading-none">!</span>
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-green-500/80 flex items-center justify-center shadow-sm">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}

function HoverLabel({
  zone,
}: {
  zone: ZoneDef;
}) {
  return (
    <div
      className="absolute pointer-events-none z-30 whitespace-nowrap"
      style={{
        left: `${zone.labelX}%`,
        top: `${zone.labelY - 8}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 shadow-lg backdrop-blur-sm">
        <span className="text-sm">{BODY_REGION_ICONS[zone.region]}</span>
        <span className="text-[11px] font-semibold text-white">{BODY_REGION_LABELS[zone.region]}</span>
      </div>
    </div>
  );
}

export function AnimalSVG({
  species,
  onRegionClick,
  selectedRegion,
  examinedRegions,
  abnormalRegions,
  disabled = false,
  className = '',
}: AnimalSVGProps) {
  const [hovered, setHovered] = useState<BodyRegion | null>(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const zones = useMemo(() => getZones(species), [species]);
  const imagePath = SPECIES_IMAGES[species] || SPECIES_IMAGES['собаки'];

  const handleClick = useCallback((region: BodyRegion) => {
    if (!disabled) onRegionClick(region);
  }, [disabled, onRegionClick]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Animal image container */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-muted/30 select-none ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        style={{ aspectRatio: '4 / 3' }}
      >
        {/* AI-generated image */}
        {!imgError ? (
          <img
            src={imagePath}
            alt={`${species} - ветеринарный пациент`}
            className="w-full h-full object-contain transition-opacity duration-500"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : null}

        {/* Fallback: emoji silhouette if image fails */}
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-7xl mb-2 opacity-50">
                {species === 'собаки' ? '🐕' : species === 'кошки' ? '🐈' : species === 'КРС' ? '🐄' : species === 'свиньи' ? '🐷' : species === 'МРС' ? '🐑' : species === 'лошади' ? '🐴' : '🐔'}
              </div>
              <p className="text-xs text-muted-foreground">{species}</p>
            </div>
          </div>
        )}

        {/* Loading shimmer */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-shimmer bg-muted/20" />
        )}

        {/* Interactive zone overlay */}
        {imgLoaded && !imgError && (
          <div className="absolute inset-0">
            {zones.map((zone) => {
              const isHov = hovered === zone.region;
              const isExam = examinedRegions.has(zone.region);
              const isAbn = abnormalRegions.has(zone.region);

              return (
                <div
                  key={zone.region}
                  style={getRegionStyle(zone, isHov, false, isExam, isAbn)}
                  onMouseEnter={() => !disabled && setHovered(zone.region)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleClick(zone.region)}
                  className="group"
                >
                  {/* Hover label */}
                  {isHov && <HoverLabel zone={zone} />}

                  {/* Examined indicator */}
                  <IndicatorBadge zone={zone} isExamined={isExam} isAbnormal={isAbn} />
                </div>
              );
            })}
          </div>
        )}

        {/* Instruction tooltip when no tool selected */}
        {imgLoaded && !disabled && selectedRegion === null && examinedRegions.size === 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/70 text-white text-[10px] whitespace-nowrap pointer-events-none backdrop-blur-sm z-20">
            Выберите инструмент и нажмите на область
          </div>
        )}
      </div>

      {/* Legend bar below the image */}
      {imgLoaded && examinedRegions.size > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2 px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="text-[10px] text-muted-foreground">Норма</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="text-[10px] text-muted-foreground">Патология</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-dashed border-blue-400/40" />
            <span className="text-[10px] text-muted-foreground">Не исследовано</span>
          </div>
        </div>
      )}
    </div>
  );
}
