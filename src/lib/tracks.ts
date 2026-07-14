import { SpecializationTrack, SpeciesType } from './types';

/**
 * Specialization tracks for veterinary students.
 * Each track defines:
 * - which species are relevant (filter for cases/simulator)
 * - which topics are emphasized (for dashboard progress + AI context)
 * - a free-form description injected into AI system prompts
 */

export interface TrackDefinition {
  id: SpecializationTrack;
  label: string;
  icon: string;
  description: string;
  species: SpeciesType[];
  emphasizedTopics: string[]; // topicIds from VET_TOPICS
  promptContext: string; // appended to AI system prompts
  color: string;
}

export const TRACKS: TrackDefinition[] = [
  {
    id: 'small_animal',
    label: 'Мелкие животные',
    icon: '🐕',
    description: 'Собаки и кошки — частная практика, хирургия, терапия МР',
    species: ['собаки', 'кошки'],
    emphasizedTopics: ['surgery', 'therapy', 'pharmacology', 'diagnostics', 'parasitology', 'anatomy'],
    promptContext: 'Студент специализируется на мелких животных (собаки, кошки). Все примеры, кейсы и клинические ситуации давай из canine/feline практики. Избегай продуктивных животных (КРС, МРС, свиньи, птица) кроме случаев, когда это необходимо для сравнения.',
    color: '#FF6B6B',
  },
  {
    id: 'large_animal',
    label: 'Крупные животные',
    icon: '🐄',
    description: 'КРС, МРС, свиньи — животноводство, внутренние болезни, акушерство',
    species: ['КРС', 'МРС', 'свиньи'],
    emphasizedTopics: ['obstetrics', 'therapy', 'epizootology', 'zoohygiene', 'pharmacology', 'diagnostics'],
    promptContext: 'Студент специализируется на крупных животных (КРС, МРС, свиньи). Все примеры, кейсы и клинические ситуации давай из практики продуктивного животноводства. Уделяй особое внимание стадным болезням, эпизоотологии и акушерству.',
    color: '#28CD41',
  },
  {
    id: 'equine',
    label: 'Лошади',
    icon: '🐴',
    description: 'Спортивная и рабочая лошадь — хирургия, ортопедия, спортивная медицина',
    species: ['лошади'],
    emphasizedTopics: ['surgery', 'anatomy', 'therapy', 'diagnostics', 'pharmacology', 'pathophysiology'],
    promptContext: 'Студент специализируется на лошадях. Все примеры, кейсы и клинические ситуации давай из equine практики — спортивная медицина, ортопедия, хирургия копыт, анестезия лошадей.',
    color: '#8B6914',
  },
  {
    id: 'exotic',
    label: 'Экзотические животные',
    icon: '🦜',
    description: 'Птицы, рептилии, грызуны, кролики — специфика нестандартных пациентов',
    species: ['птица'],
    emphasizedTopics: ['therapy', 'pharmacology', 'diagnostics', 'anatomy', 'parasitology', 'microbiology'],
    promptContext: 'Студент специализируется на экзотических животных (птицы, рептилии, грызуны, кролики). Давай примеры из exotic pet практики. Учитывай специфику метаболизма, дозирования и диагностики у нестандартных пациентов.',
    color: '#AF52DE',
  },
  {
    id: 'mixed',
    label: 'Смешанная практика',
    icon: '🔄',
    description: 'Все виды животных — универсальный ветеринарный врач',
    species: ['КРС', 'МРС', 'свиньи', 'птица', 'собаки', 'кошки', 'лошади'],
    emphasizedTopics: [
      'pharmacology', 'surgery', 'diagnostics', 'therapy', 'parasitology',
      'epizootology', 'obstetrics', 'hematology', 'anatomy', 'pathophysiology',
      'microbiology', 'zoohygiene',
    ],
    promptContext: 'Студент изучает смешанную практику (все виды животных). Давай разнообразные примеры из разных областей ветеринарии.',
    color: '#007AFF',
  },
];

export const TRACK_MAP: Record<SpecializationTrack, TrackDefinition> = TRACKS.reduce(
  (acc, t) => { acc[t.id] = t; return acc; },
  {} as Record<SpecializationTrack, TrackDefinition>
);

export function getTrackDefinition(id: SpecializationTrack | undefined): TrackDefinition {
  if (!id || !TRACK_MAP[id]) return TRACK_MAP.mixed;
  return TRACK_MAP[id];
}

export function getTrackPromptContext(id: SpecializationTrack | undefined): string {
  return getTrackDefinition(id).promptContext;
}

export function getTrackSpecies(id: SpecializationTrack | undefined): SpeciesType[] {
  return getTrackDefinition(id).species;
}

export function getTrackEmphasizedTopics(id: SpecializationTrack | undefined): string[] {
  return getTrackDefinition(id).emphasizedTopics;
}
