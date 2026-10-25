'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/**
 * Плавающий тумблер темы — DS-паттерн vet-ds v2.2.
 * Подпись показывает ЦЕЛЬ переключения («тёмная» / «светлая»),
 * а не текущее состояние: у кнопки и так есть иконки.
 * Подпись переключается чистым CSS (как и иконки) — ноль стейта,
 * ноль гидрационных расхождений. Портирован из артефакт-слоя
 * Task 157 (.vlds-toggle) в исходники (Task 158).
 */
export function DsThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="vlds-toggle"
      aria-label="Переключить тему"
      title="Переключить тему"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Sun className="vlds-sun" aria-hidden="true" />
      <Moon className="vlds-moon" aria-hidden="true" />
      <span className="vlds-label vlds-label-light">тёмная</span>
      <span className="vlds-label vlds-label-dark">светлая</span>
    </button>
  );
}
