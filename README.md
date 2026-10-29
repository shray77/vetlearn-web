# VetLearn AI

> AI-платформа персонализированного обучения ветеринарной медицине.
> Next.js 16 + React 19 + z-ai-web-dev-sdk + zustand (client-side persist).

[![Version](https://img.shields.io/badge/version-0.4.2-28CD41.svg)]()
[![Stack](https://img.shields.io/badge/Next.js-16-000000.svg)](https://nextjs.org/)
[![AI](https://img.shields.io/badge/AI-z--ai--web--dev--sdk-AF52DE.svg)](https://www.npmjs.com/package/z-ai-web-dev-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-28CD41.svg)](LICENSE)

## Возможности

### Основные модули

| Модуль | Описание |
|--------|----------|
| 🏠 **Dashboard** | Профиль, XP, streak, челлендж дня, лиги, достижения, аналитика |
| 📚 **Adaptive Learning** | Placement-тест + адаптивный квиз с real-time сложностью |
| 🩺 **Clinical Cases** | AI-генерация кейсов с многошаговым разбором |
| 🎤 **Voice Tutor** | Голосовой AI-репетитор (STT + TTS через z-ai SDK) |
| 🃏 **Flashcards** | AI-карточки + SM-2 интервальное повторение + OCR |
| 🧠 **MindMap** | AI-интеллект-карты по темам |
| 🎓 **Mock Exam** | Устный AI-экзамен со свободным ответом |
| 📋 **Resources** | Curated учебные материалы (книги/видео/статьи) |
| 🏥 **Simulator** | Многофазный клинический симулятор (анамнез → диагноз → лечение) |
| 🩻 **OSCE-станции** | Визуальная диагностика в формате реального экзамена |
| 🔬 **Атлас** | Библиотека рентген/УЗИ/цитология с подробными разборами |

### Специализации (Tracks)

5 треков с фильтрацией контента и AI-aware промптами:
- 🐕 Мелкие животные (собаки, кошки)
- 🐄 Крупные животные (КРС, МРС, свиньи)
- 🐴 Лошади
- 🦜 Экзотика (птицы, рептилии, грызуны)
- 🔄 Смешанная практика

### Импорт материалов

Загружайте собственные конспекты (`.txt`, `.md`, `.pdf`, `.jpg`, `.png`) —
AI автоматически генерирует карточки или тестовые вопросы. PDF-парсинг
через `pdf-parse`, изображения через VLM OCR.

### Daily Challenges

Каждый день — новый детерминированный челлендж (6 типов). Награды 15-40 XP.
7-day strip показывает историю выполнения.

### Лиги и достижения

- **Недельные лиги**: Bronze / Silver / Gold / Platinum (по XP за неделю)
- **15 достижений**: streak, ответы, точность, уровень, кейсы, симулятор, mastery

### Глубокая аналитика

- Тренды по темам за 14 дней
- Weakness detection по типам вопросов
- Лучшее время суток для занятий
- Urgent topic detection
- Самая длинная серия успешных тестов

### Экспорт/импорт прогресса

JSON-бэкап всего состояния — перенос между устройствами, восстановление
после очистки браузера. Кнопки в Settings → «Резервная копия».

## Технологии

- **Next.js 16** (App Router, output: standalone)
- **React 19** + TypeScript
- **Tailwind CSS 4** + shadcn/ui (Radix primitives)
- **zustand 5** (persist → localStorage, schema version 6)
- **z-ai-web-dev-sdk 0.0.17** (LLM + VLM + ASR + TTS)
- **framer-motion**, **recharts**
- **pdf-parse** для PDF-импорта

Демо-версия работает на GitHub Pages (статический экспорт с
офлайн-мостом API): `scripts/vl201_build_pages.sh` собирает и
публикует её в ветку `gh-pages`.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (localStorage + IndexedDB)                          │
│  • zustand store (v6) — profile, flashcards, histories,     │
│    OSCE, importedDocuments, completedChallenges             │
│  • IndexedDB — полные тексты импортированных документов     │
└─────────────────────────────────────────────────────────────┘
                          ↕ fetch
┌─────────────────────────────────────────────────────────────┐
│ Next.js standalone server (port 3000)                       │
│  • src/proxy.ts — rate-limit (10 req/min per IP on AI)      │
│  • src/app/api/* — 21 роут                                    │
│  • Singleton ZAI client (src/lib/zai.ts)                    │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│ z-ai-web-dev-sdk → cloud (LLM / VLM / ASR / TTS)            │
└─────────────────────────────────────────────────────────────┘
```

**Без серверной БД.** Весь персистентный стейт — в браузере пользователя.
Экспорт/импорт через JSON для переноса между устройствами.

## Разработка

```bash
# Установка
bun install

# Dev-сервер
bun run dev

# Production-сборка
bun run build

# Линт
bun run lint

# Type-check
bunx tsc --noEmit
```

### Структура

```
src/
├── app/
│   ├── api/           # 21 API routes (AI routes rate-limited via src/proxy.ts)
│   └── page.tsx       # Main app shell + tab router
├── components/
│   ├── ui/            # shadcn/ui primitives
│   ├── atlas/         # D.9 Atlas tab
│   ├── import/        # D.2 Import dialog
│   ├── osce/          # D.3 OSCE stations
│   ├── simulator/     # Clinical simulator
│   ├── AnalyticsCard.tsx       # D.5 deep analytics
│   ├── AchievementsPanel.tsx   # D.7 leagues + badges
│   ├── DashboardTab.tsx        # Main dashboard
│   ├── Header.tsx              # Header + track switcher + settings
│   ├── BottomNav.tsx           # Bottom navigation
│   └── ...
├── lib/
│   ├── store.ts          # zustand store (persist v6)
│   ├── types.ts          # all TypeScript types
│   ├── tracks.ts         # D.1 specialization tracks
│   ├── daily-challenges.ts  # D.6 challenge generator
│   ├── analytics.ts      # D.5 analytics compute
│   ├── achievements.ts   # D.7 leagues + achievements
│   ├── atlas-bank.ts     # D.9 atlas entries
│   ├── osce-bank.ts      # D.3 OSCE stations
│   ├── export-import.ts  # D.4 backup/restore
│   ├── indexeddb.ts      # full-text storage for imported docs
│   ├── zai.ts            # ZAI singleton
│   ├── sm2.ts            # SM-2 spaced repetition
│   └── ...
└── proxy.ts              # Next.js 16 proxy (rate-limit)
```

## Безопасность

- `/api/stt` — 10MB cap, base64-валидация, 30s timeout
- `src/proxy.ts` — in-memory token bucket rate-limit (10 req/min per IP)
- `next.config.ts` — security headers (X-Frame-Options, HSTS, CSP-Report-Only)
- Singleton ZAI client — нет re-instantiation на каждый запрос
- Логи санитизованы (error.message, не весь SDK error object)
- Prisma удалена (мёртвый код), DATABASE_URL не используется

## Лицензия

[MIT](LICENSE) — код распространяется под лицензией MIT.
Юридические условия использования: [`public/terms.html`](public/terms.html).
