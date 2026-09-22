// --- Server-only in-memory store for simulator scenarios (anti-cheat) ---
//
// /api/simulator/generate запоминает канонический сценарий (с правильными ответами),
// а клиенту отдаёт sanitized-копию БЕЗ ответов. /api/simulator/evaluate сверяет
// присланные клиентом ответы с каноном — подделать результат подстановкой своего
// "правильного диагноза" в payload больше нельзя.
//
// Хранилище in-memory с TTL: без БД, переживает смену таба/перезагрузку страницы
// клиента, но не рестарт сервера (в этом случае evaluate деградирует в режим
// частичной проверки — см. комментарий в evaluate/route.ts).

import type { SimulatorScenario } from './fallback-scenarios';

/** Публичная версия сценария — то, что безопасно отдавать клиенту */
export type PublicSimulatorScenario = Omit<
  SimulatorScenario,
  'correctDiagnosis' | 'correctTreatment' | 'treatmentPlan'
>;

interface StoredScenario {
  scenario: SimulatorScenario;
  createdAt: number;
}

const TTL_MS = 3 * 60 * 60 * 1000; // 3 часа — с запасом на долгую сессию
const MAX_ENTRIES = 2000;

// На Devils-серверах Next может поднимать несколько изолятов — каждый получит свою
// копию Map. Это ок: generate и evaluate обычно попадают в один инстант (sticky-less
// сценарии с одним инстансом), а при промахе evaluate просто деградирует мягко.
const store = new Map<string, StoredScenario>();

function cleanup(now: number): void {
  for (const [key, entry] of store) {
    if (now - entry.createdAt > TTL_MS) store.delete(key);
  }
}

/** Запомнить канонический сценарий после генерации */
export function rememberScenario(scenario: SimulatorScenario): void {
  if (!scenario || typeof scenario.id !== 'string' || !scenario.id) return;
  const now = Date.now();
  if (store.size >= MAX_ENTRIES) {
    cleanup(now);
    if (store.size >= MAX_ENTRIES) {
      // Выкидываем четверть самых старых записей (Map итерируется в порядке вставки)
      const evictCount = Math.ceil(MAX_ENTRIES / 4);
      let evicted = 0;
      for (const key of store.keys()) {
        store.delete(key);
        if (++evicted >= evictCount) break;
      }
    }
  }
  // Глубокая копия — чтобы клиентские мутации (isRevealed и т.п.) не трогали канон
  store.set(scenario.id, {
    scenario: JSON.parse(JSON.stringify(scenario)) as SimulatorScenario,
    createdAt: now,
  });
}

/** Получить канонический сценарий по id (или null, если не помним / устарел) */
export function getCanonicalScenario(id: unknown): SimulatorScenario | null {
  if (typeof id !== 'string' || !id) return null;
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return entry.scenario;
}

/** Убрать правильные ответы из сценария перед отправкой клиенту (анти-спойлер + анти-чит) */
export function sanitizeScenario(scenario: SimulatorScenario): PublicSimulatorScenario {
  const copy = JSON.parse(JSON.stringify(scenario)) as Record<string, unknown>;
  delete copy.correctDiagnosis;
  delete copy.correctTreatment;
  delete copy.treatmentPlan;
  return copy as unknown as PublicSimulatorScenario;
}
