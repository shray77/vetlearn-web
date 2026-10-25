# Changelog

Все заметные изменения в vetlearn-web задокументированы здесь.
Формат основан на [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] — 2026-10-26

### Changed

**Дизайн-система vet-ds v2.2 «Научная периодика» — нативно в исходниках** (Task 158)
- Палитра A: бумага `#FAF9F5` (дефолт-светлая) + графит `#211E19` (тёмная,
  тумблером); акцент — зелёная пара «образование» `#4C7A3F` / `#34D399`
- Шрифты: Geist → Inter (+кириллица), Geist Mono → IBM Plex Mono,
  заголовки h1/h2 — Instrument Serif 400 (кириллица деградирует в Georgia)
- Радиусы ≤ 8px, backdrop-blur выключен, мягкие тени, focus-ring акцентом
- Цветовой ремап Apple-палитры в токены ДС (~807 замен в src),
  эмодзи-иконки снесены (179 шт, типографика ✓ ✗ ⚠ и стрелки остались)
- PWA: manifest theme `#4C7A3F`, фон `#FAF9F5`; иконки 192/512
  перерендерены из logo.svg (графит + бумага + зелёный кант; до этого
  под двумя вывесками лежал один файл 1024px)

### Added

**OfflineApiBridge — офлайн-шим API в исходниках**
- `src/lib/offline-api.ts` + `src/components/OfflineApiBridge.tsx`:
  клиентский перехватчик `fetch` для `/api/*` с резервным контентом
  (раньше вливался в собранный бандл деплой-скриптом рабочей машины)
- Включается флагом сборки `NEXT_PUBLIC_OFFLINE_API_BRIDGE=1` — только
  Pages-экспорт; серверная версия не тронута
- **DsThemeToggle** — плавающий тумблер темы с подписью-целью
  («тёмная»/«светлая»), без стейта, подпись переключается CSS

### Fixed

- Базовый шрифт body латентно падал в системный стек со времён Geist:
  переменные next/font перенесены с `<body>` на `<html>` (префлайт
  Tailwind вешает font-family на html, var() обязан резолвиться там же)

## [0.3.0] — 2026-07-17

### Added

**D.1 — Специализации (Tracks)**
- 5 треков: 🐕 мелкие / 🐄 крупные / 🐴 лошади / 🦜 экзотика / 🔄 смешанная
- Onboarding-модал при первом запуске
- Бейдж трека в Header + Sheet для смены
- AI-context инъекция в роуты case/generate, simulator/generate, tutor/chat, assessment
- `/api/track/recommend` — приоритезированный список тем

**D.2 — Импорт материалов**
- Поддержка `.txt`, `.md`, `.pdf` (через `pdf-parse`), `.jpg`, `.png` (через VLM OCR)
- Drag-and-drop + paste-режим
- Inline-редактирование сгенерированных карточек перед сохранением
- IndexedDB для полных текстов (localStorage только метаданные)
- 3 API роута: `/api/import/extract`, `/api/import/flashcards`, `/api/import/questions`

**D.3 — OSCE-станции**
- 10 curated станций (radiology, ultrasound, cytology, histopathology, physical_exam)
- 5-минутный таймер, структурированные вопросы (describe/interpret/diagnose/plan)
- LLM-оценка с эталонными ответами + fallback keyword-hit scoring
- Per-type skillMap, история прохождений
- SVG-плейсхолдеры для всех станций в `/public/osce/`

**D.4 — Экспорт/импорт прогресса**
- JSON-экспорт/импорт всего состояния (profile, flashcards, histories, osce, importedDocuments)
- Кнопки в Settings → «Резервная копия»
- Авто-reload после импорта

**D.5 — Глубокая аналитика**
- Тренды по темам (14 дней)
- Статистика по типам вопросов (weakness detection)
- Лучшее время суток для занятий
- Самая длинная серия успешных тестов
- Urgent topic detection (низкий mastery + много попыток)
- `/api/analytics/insights` (pure compute)
- `AnalyticsCard` на Dashboard

**D.6 — Daily Challenges**
- Детерминированный челлендж дня (6 типов: flashcards/case/tutor/assessment/simulator/osce)
- 7-day strip с историей выполнения
- XP-награды (15-40 XP в зависимости от типа)

**D.7 — Лиги + достижения**
- Недельные лиги: Bronze / Silver / Gold / Platinum
- 15 достижений (streak, answers, accuracy, level, cases, simulator, challenges, mastery)
- `AchievementsPanel` на Dashboard

**D.9 — Радиологический атлас**
- 6 curated записей с разборами (findings, interpretation, DDX, actions, key points)
- 4 модальности: radiology, ultrasound, cytology, histopathology
- Режим обучения (без таймера/оценки), +5 XP за изучение
- `AtlasTab` + модальность-фильтр

### Security / Audit

- `.gitignore`: разрешён merge-конфликт, удалён 441 junk-файл из индекса
- `Caddyfile`: убран SSRF-vulnerable `@transform_port_query` route
- `/api/stt`: 10MB cap, base64 валидация, 30s timeout (Promise.race)
- `src/proxy.ts`: rate-limit на AI-роутах (10 req/min per IP, in-memory token bucket)
- `next.config.ts`: security headers (X-Frame-Options, HSTS, CSP-Report-Only, etc.)
- ZAI singleton через `src/lib/zai.ts` — все 14 AI-роутов переведены
- Prisma полностью удалена (deps, scripts, .zscripts/*.sh шаги)
- Service worker: versioning через `__BUILD_ID__` stamp в build.sh

### Changed

- `/api/version` теперь читает version из `package.json` (раньше hardcoded 0.3.0)
- `/api/tutor/chat`: убран мёртвый `audio` параметр из body
- `src/lib/db.ts`: `log: ['query']` только в dev
- `assessment/route.ts` + `assessment/result/route.ts`: `JSON.parse` заменён на `extractJSON()`
- `VoiceTutorTab`: исправлен race condition (double-tap), добавлен 60s auto-stop + 30s клиентский таймаут
- Версия persist-схемы: 3 → 6 (3 chained migrations)

### Removed

- `prisma/`, `db/`, `src/lib/db.ts` (мёртвый код Prisma)
- `@prisma/client`, `prisma` из dependencies
- `db:push/generate/migrate/reset` из package.json scripts
- `package-lock.json` (только `bun.lock` как canonical)

## [0.2.0] — 2026-07-14

- Initial public version: Dashboard, Adaptive Learning, Cases, Tutor, Flashcards (+OCR), MindMap, MockExam, Simulator, Resources
- SM-2 spaced repetition
- Voice Tutor (STT + TTS)
- 12 топовых тем, 7 видов животных

## [0.1.0] — 2026-06-01

- Initial scaffold
