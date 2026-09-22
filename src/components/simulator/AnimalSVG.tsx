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
  'собаки': '/simulator-animals/dog.jpg',
  'кошки': '/simulator-animals/cat.jpg',
  'КРС': '/simulator-animals/cow.jpg',
  'свиньи': '/simulator-animals/pig.jpg',
  'МРС': '/simulator-animals/sheep.jpg',
  'лошади': '/simulator-animals/horse.jpg',
  'птица': '/simulator-animals/bird.jpg',
};

// Синонимы видов (AI/клиент могут прислать варианты) → канонические ключи SPECIES_IMAGES
const SPECIES_ALIASES: Record<string, string> = {
  'собака': 'собаки', 'собак': 'собаки', 'пес': 'собаки', 'пёс': 'собаки', 'псовые': 'собаки', 'dog': 'собаки',
  'кошка': 'кошки', 'кошек': 'кошки', 'кот': 'кошки', 'котики': 'кошки', 'кошачьи': 'кошки', 'cat': 'кошки',
  'крс': 'КРС', 'корова': 'КРС', 'коровы': 'КРС', 'бык': 'КРС', 'крупный рогатый скот': 'КРС', 'крупные': 'КРС', 'cow': 'КРС', 'cattle': 'КРС',
  'мрс': 'МРС', 'овца': 'МРС', 'овцы': 'МРС', 'овцы и козы': 'МРС', 'баран': 'МРС', 'коза': 'МРС', 'мелкий рогатый скот': 'МРС', 'sheep': 'МРС',
  'свинья': 'свиньи', 'свиней': 'свиньи', 'свиноматка': 'свиньи', 'хряк': 'свиньи', 'поросята': 'свиньи', 'pig': 'свиньи',
  'лошадь': 'лошади', 'конь': 'лошади', 'коньи': 'лошади', 'кобыла': 'лошади', 'жеребец': 'лошади', 'horse': 'лошади',
  'птицы': 'птица', 'курица': 'птица', 'куры': 'птица', 'несушки': 'птица', 'куриные': 'птица', 'пернатые': 'птица', 'bird': 'птица', 'poultry': 'птица',
};

// Нормализация строки вида к каноническому ключу (или null если не распознано)
function normalizeSpecies(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (SPECIES_IMAGES[raw.trim()]) return raw.trim();
  return SPECIES_ALIASES[key] ?? null;
}

// Zone definitions: percentage-based for responsive overlay
// Each zone defined as % of the animal image container
interface ZoneDef {
  region: BodyRegion;
  // Bounding box in percentages (left, top, width, height)
  x: number;
  y: number;
  w: number;
  h: number;
  // Label anchor position
  labelX: number;
  labelY: number;
}

// Zones for typical side-view quadruped (dog, cat, cow, pig, sheep, horse)
const QUADRUPOD_ZONES: ZoneDef[] = [
  { region: 'head', x: 68, y: 5, w: 28, h: 30, labelX: 82, labelY: 20 },
  { region: 'neck', x: 55, y: 18, w: 20, h: 22, labelX: 65, labelY: 30 },
  { region: 'thorax', x: 35, y: 22, w: 28, h: 32, labelX: 49, labelY: 38 },
  { region: 'abdomen', x: 12, y: 28, w: 30, h: 30, labelX: 27, labelY: 43 },
  { region: 'skin', x: 5, y: 8, w: 88, h: 60, labelX: 50, labelY: 14 },
  { region: 'front_legs', x: 42, y: 56, w: 18, h: 38, labelX: 51, labelY: 75 },
  { region: 'hind_legs', x: 10, y: 56, w: 18, h: 38, labelX: 19, labelY: 75 },
  { region: 'tail', x: 1, y: 20, w: 12, h: 22, labelX: 7, labelY: 30 },
];

// Zones for bird (bipedal)
const BIRD_ZONES: ZoneDef[] = [
  { region: 'head', x: 65, y: 5, w: 25, h: 22, labelX: 78, labelY: 16 },
  { region: 'neck', x: 52, y: 15, w: 20, h: 20, labelX: 62, labelY: 25 },
  { region: 'thorax', x: 30, y: 20, w: 30, h: 30, labelX: 45, labelY: 35 },
  { region: 'abdomen', x: 15, y: 30, w: 25, h: 25, labelX: 28, labelY: 42 },
  { region: 'skin', x: 10, y: 5, w: 82, h: 55, labelX: 50, labelY: 10 },
  { region: 'front_legs', x: 35, y: 55, w: 20, h: 40, labelX: 45, labelY: 75 },
  { region: 'hind_legs', x: 25, y: 55, w: 15, h: 40, labelX: 32, labelY: 75 },
  { region: 'tail', x: 0, y: 25, w: 18, h: 22, labelX: 9, labelY: 36 },
];

function getZones(species: string): ZoneDef[] {
  return normalizeSpecies(species) === 'птица' ? BIRD_ZONES : QUADRUPOD_ZONES;
}

function getRegionStyle(
  zone: ZoneDef,
  isHovered: boolean,
  isSelected: boolean,
  isExamined: boolean,
  isAbnormal: boolean,
): React.CSSProperties {
  // skin zone всегда самый низкий z-index чтобы не перекрывать клики по другим зонам
  const zoneZ = zone.region === 'skin' ? 1 : 10;
  if (isSelected) {
    return { ...baseRect(zone), backgroundColor: 'rgba(0,122,255,0.22)', borderColor: 'rgba(0,122,255,0.7)', borderStyle: 'solid', zIndex: zoneZ };
  }
  if (isHovered) {
    return { ...baseRect(zone), backgroundColor: 'rgba(0,122,255,0.14)', borderColor: 'rgba(0,122,255,0.55)', borderStyle: 'solid', zIndex: zoneZ };
  }
  if (isExamined && isAbnormal) {
    return { ...baseRect(zone), backgroundColor: 'rgba(255,59,48,0.10)', borderColor: 'rgba(255,59,48,0.4)', borderStyle: 'solid', zIndex: zoneZ };
  }
  if (isExamined) {
    return { ...baseRect(zone), backgroundColor: 'rgba(40,205,65,0.06)', borderColor: 'rgba(40,205,65,0.35)', borderStyle: 'solid', zIndex: zoneZ };
  }
  // Default: subtle dashed border
  return { ...baseRect(zone), backgroundColor: 'transparent', borderColor: 'rgba(0,122,255,0.18)', borderStyle: 'dashed', zIndex: zoneZ };
}

function baseRect(zone: ZoneDef) {
  return {
    position: 'absolute' as const,
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.w}%`,
    height: `${zone.h}%`,
    borderWidth: '2px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  };
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

// React.memo: избегаем лишних ре-рендеров картинки и 8 зон при ре-рендере родителя
export const AnimalSVG = React.memo(function AnimalSVG({
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
  // Нормализуем вид: без этого «Корова»/«коровы» молча показывали dog.png
  const normalizedSpecies = normalizeSpecies(species) || 'собаки';
  const imagePath = SPECIES_IMAGES[normalizedSpecies] || SPECIES_IMAGES['собаки'];

  const handleClick = useCallback((region: BodyRegion) => {
    if (!disabled) onRegionClick(region);
  }, [disabled, onRegionClick]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Animal image container — квадрат (изображения 1024×1024): иначе object-contain
          создаёт поля, а процентные hit-зоны смещаются относительно тела животного */}
      <div
        className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/30 select-none ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {/* AI-generated image */}
        {!imgError ? (
          <img
            src={imagePath}
            alt={`${normalizedSpecies} — ветеринарный пациент`}
            className="w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : null}

        {/* Fallback: simple silhouette if image fails */}
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-2 opacity-40">
                {normalizedSpecies === 'собаки' ? '🐕' : normalizedSpecies === 'кошки' ? '🐈' : normalizedSpecies === 'КРС' ? '🐄' : normalizedSpecies === 'свиньи' ? '🐷' : normalizedSpecies === 'МРС' ? '🐑' : normalizedSpecies === 'лошади' ? '🐴' : '🐔'}
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
        {(
          <div className="absolute inset-0">
            {zones.map((zone) => {
              const isHov = hovered === zone.region;
              const isExam = examinedRegions.has(zone.region);
              const isAbn = abnormalRegions.has(zone.region);

              return (
                <div
                  key={zone.region}
                  style={getRegionStyle(zone, isHov, selectedRegion === zone.region, isExam, isAbn)}
                  onMouseEnter={() => !disabled && setHovered(zone.region)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleClick(zone.region)}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`${BODY_REGION_LABELS[zone.region]} — исследовать`}
                  onKeyDown={(e) => {
                    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleClick(zone.region);
                    }
                  }}
                  className="group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007AFF]"
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
});
