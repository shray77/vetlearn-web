/**
 * Client-side export/import of user progress.
 *
 * Exports the full persisted state from zustand (minus transient UI state
 * like activeTab, isAssessmentActive). Imported data is merged with current
 * state — for arrays, imported replaces local (after user confirmation);
 * for profile, imported overwrites local.
 */

import type { VetLearnStore } from './store';

export const EXPORT_FORMAT_VERSION = 1;

/**
 * Fields exported to the JSON file. Anything not in this list is considered
 * transient UI state and is skipped.
 */
const EXPORTED_KEYS: Array<keyof VetLearnStore> = [
  'profile',
  'flashcards',
  'flashcardHistory',
  'srCards',
  'assessmentHistory',
  'caseHistory',
  'simulatorHistory',
  'completedSimulations',
  'importedDocuments',
  'osceHistory',
  'osceSkillMap',
  'bookmarkedResources',
];

export interface ExportPayload {
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  state: Partial<VetLearnStore>;
}

/**
 * Build the export payload from the current store state.
 * Caller is responsible for calling useStore.getState() to get the live state.
 */
export function buildExport(state: VetLearnStore): ExportPayload {
  const exported: Partial<VetLearnStore> = {};
  for (const key of EXPORTED_KEYS) {
    (exported as Record<string, unknown>)[key as string] = state[key];
  }
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '0.2.0',
    state: exported,
  };
}

/**
 * Validate an imported payload. Returns the state slice to merge, or throws
 * with a human-readable error.
 */
export function parseImport(json: string): ExportPayload {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Файл не является валидным JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Неверный формат файла');
  }
  if (parsed.formatVersion !== EXPORT_FORMAT_VERSION) {
    throw new Error(`Несовместимая версия файла (ожидалась ${EXPORT_FORMAT_VERSION}, получено ${parsed.formatVersion})`);
  }
  if (!parsed.state || typeof parsed.state !== 'object') {
    throw new Error('В файле нет поля state');
  }

  return parsed as ExportPayload;
}

/**
 * Trigger a browser download of the export JSON.
 */
export function downloadExport(payload: ExportPayload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `vetlearn-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a File object as text. Used by the import file picker.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsText(file);
  });
}
