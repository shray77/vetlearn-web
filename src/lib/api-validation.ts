import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Общая zod-валидация тел запросов AI-роутов (P2).
 *
 * Зачем: zod был объявлен в зависимостях, но не использовался ни разу, а
 * ручная валидация была дырявой (count без клампа, строки без лимитов,
 * TypeError на мусорных структурах → 500 вместо 400). Все строки, уходящие
 * в промпты, теперь лимитированы — мегабайтная инъекция в prompts больше
 * не проходит.
 *
 * Философия: безопасный fallback через .catch() для полей с дефолтами,
 * жёсткий 400 для структурообразующих полей (topics, message и т.п.).
 */

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Неверный формат запроса';
  const path = issue.path.length ? ` (${issue.path.map(String).join('.')})` : '';
  return `Неверный формат запроса: ${issue.message}${path}`;
}

export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: badRequest('Тело запроса должно быть корректным JSON') };
  }
  return parseData(raw, schema);
}

/** Вариант для уже распарсенных объектов (например, внутри exam-хендлеров). */
export function parseData<T>(
  raw: unknown,
  schema: z.ZodType<T>
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: badRequest(firstIssue(parsed.error)) };
  }
  return { ok: true, data: parsed.data };
}

// --- Переиспользуемые кусочки ---

/** Строка с жёстким лимитом длины (анти-инъекция в промпт). */
export const limitedString = (max: number) => z.string().max(max);

/** Опциональная строка с лимитом; null/undefined → undefined. */
export const optionalLimitedString = (max: number) =>
  z.string().max(max).nullish().transform((v) => v ?? undefined);

/** Целое с клампом; мусор ("abc", NaN, объект) → fallback, а не 500. */
export const clampedInt = (min: number, max: number, fallback: number) =>
  z.coerce
    .number()
    .catch(fallback)
    .transform((n) => Math.max(min, Math.min(max, Math.round(n))));

/** Строковый enum с безопасным fallback вместо отклонения запроса. */
export const safeEnum = <T extends readonly string[]>(values: T, fallback: T[number]) =>
  z.enum([...values] as unknown as [T[number], ...T[number][]]).catch(fallback);

/** Словарь строка → число (skillMap и т.п.) с лимитом числа ключей. */
export const numberRecord = (maxKeys: number) =>
  z.record(z.string().max(100), z.number()).catch({}).transform((rec) =>
    Object.fromEntries(Object.entries(rec).slice(0, maxKeys))
  );
