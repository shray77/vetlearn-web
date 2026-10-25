/**
 * offline-api.ts — клиентский офлайн-шим для /api/* (Task 158).
 *
 * Реконструкция OfflineApiBridge, который ранее вливался в статический
 * экспорт деплой-скриптом рабочей машины (см. зеркало gh-pages): компонент
 * патчил window.fetch и отвечал резервным контентом вместо серверных
 * роутов. Теперь логика живёт в исходниках и включается флагом сборки
 * NEXT_PUBLIC_OFFLINE_API_BRIDGE=1 (только Pages-экспорт; серверная
 * сборка мост не ставит и ходит в настоящие роуты).
 *
 * Поведение зеркалит фолбэк-ветки src/app/api/*: статические банки
 * вопросов, OSCE-ключевые слова, FALLBACK_SCENARIOS и честные
 * isFallback-маркеры (клиент показывает «резервный контент» прозрачным
 * тостом — архитектура fallback transparency, коммит 0b99f183).
 */

import {
  getPlacementQuestions,
  determineLevel,
  getStaticQuestionsForTopic,
} from './question-bank';
import { FALLBACK_SCENARIOS } from './fallback-scenarios';
import { getOSCEStationById } from './osce-bank';
import { OSCE_REFERENCES } from './osce-references';


type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function offline503(label: string): Response {
  return json(
    {
      error: `Офлайн-версия: ${label} недоступна без сервера с ИИ. Полная версия — на хостинге проекта.`,
    },
    503,
  );
}

async function parseBody(init?: RequestInit): Promise<any> {
  try {
    const raw = typeof (init as any)?.body === 'string' ? (init as any).body : '';
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ----- Экзаменационные вопросы-шаблоны (офлайн-режим) ----- */

const EXAM_HINTS = ['Думайте вслух, структурируйте ответ', 'Опирайтесь на клинические протоколы'];

function examQuestion(topic: string, index: number) {
  const templates = [
    `Расскажите об основных принципах диагностики при подозрении на заболевание в тематике «${topic}». Какие методы вы бы использовали?`,
    `Опишите ключевые препараты и схемы лечения в тематике «${topic}». На что важно обратить внимание?`,
    `Какие профилактические меры наиболее важны в тематике «${topic}» и почему?`,
    `Перечислите типичные ошибки при работе в тематике «${topic}» и способы их избежать.`,
  ];
  return { id: `q${index + 1}`, text: templates[index % templates.length], hints: EXAM_HINTS };
}

/* ----- Резервный клинический кейс (офлайн-режим) ----- */

const FALLBACK_CASE = {
  id: `case_${Date.now()}`,
  title: 'Хронический дерматит у собаки',
  species: 'собаки',
  difficulty: 'intermediate',
  topic: 'Дерматология',
  presentation:
    'Собака породы немецкая овчарка, 5 лет, владельцы отмечают зуд и покраснение кожи в области живота и паховых складок в течение 2 месяцев',
  history:
    'Зуд прогрессирует, собака постоянно чешется. Ранее лечили антигистаминными препаратами без эффекта. Корм не меняли. Проводили обработку от блох 1 месяц назад.',
  examination:
    'Эритема и папулёзная сыпь в области живота, паховых складок, подмышечных впадин. Корки на локтях. Лимфоузлы увеличены. Температура 38.8°C.',
  labResults:
    'ОАК: эозинофилия 2800/мкл (норма до 1200). Соскоб кожи: обнаружены клещи Sarcoptes scabiei. Бакпосев: рост Staphylococcus pseudintermedius.',
  questions: [
    {
      id: 'cq1',
      question: 'Какой диагноз наиболее вероятен на основании анамнеза и результатов обследования?',
      type: 'diagnosis',
      options: [
        'Саркоптоз с вторичной пиодермией',
        'Атопический дерматит',
        'Пищевая аллергия',
        'Дерматофития',
      ],
      correctIndex: 0,
      explanation:
        'Обнаружение клещей Sarcoptes scabiei в соскобе кожи подтверждает диагноз саркоптоза. Эозинофилия и рост Staphylococcus pseudintermedius указывают на вторичную пиодермию.',
      difficulty: 'intermediate',
    },
    {
      id: 'cq2',
      question: 'Какой препарат выбора для лечения саркоптоза у собак?',
      type: 'treatment',
      options: [
        'Амитраз (препарат для обработки кожи)',
        'Ивермектин (подкожно или перорально)',
        'Гризеофульвин (перорально)',
        'Кетоконазол (перорально)',
      ],
      correctIndex: 1,
      explanation:
        'Ивермектин — препарат выбора при саркоптозе. Применяется подкожно или перорально в дозе 0.2-0.3 мг/кг с интервалом 10-14 дней, курс 3-4 инъекции. Амитраз менее эффективен при генерализованной форме.',
      difficulty: 'intermediate',
    },
    {
      id: 'cq3',
      question: 'Какое дополнительное лечение необходимо для вторичной бактериальной пиодермии?',
      type: 'treatment',
      options: [
        'Противогрибковые препараты',
        'Антибиотики чувствительного штамма на 3-4 недели',
        'Глюкокортикоиды системно',
        'Иммуносупрессоры',
      ],
      correctIndex: 1,
      explanation:
        'При вторичной пиодермии необходимы антибиотики, к которым чувствителен выделенный штамм Staphylococcus pseudintermedius. Курс длительный — 3-4 недели, продолжают ещё 7-10 дней после клинического выздоровления.',
      difficulty: 'intermediate',
    },
    {
      id: 'cq4',
      question: 'Какое осложнение может возникнуть при назначении ивермектина собакам некоторых пород?',
      type: 'lab',
      options: [
        'Гепатотоксичность',
        'Нейротоксичность (MLR-мутация)',
        'Нефротоксичность',
        'Кардиотоксичность',
      ],
      correctIndex: 1,
      explanation:
        'У собак с мутацией гена MDR1 (породы колли, бобтейл, шелти и др.) ивермектин может вызвать тяжёлую нейротоксичность — депрессию, атаксию, миоклонус, кому. Поэтому перед назначением рекомендуется тест на MDR1 или использование альтернативных препаратов.',
      difficulty: 'advanced',
    },
  ],
  createdAt: new Date().toISOString(),
};

/* ----- Резервные флеш-карточки (офлайн-режим) ----- */

const FALLBACK_FLASHCARDS = [
  {
    id: 'fc1',
    term: 'Саркоптоз',
    definition:
      'Контагиозное паразитарное заболевание, вызываемое клещом Sarcoptes scabiei, характеризующееся сильным зудом и дерматитом.',
    example: 'У собаки наблюдается зуд и корки на локтях — подозрение на саркоптоз.',
  },
  {
    id: 'fc2',
    term: 'Дифференциальная диагностика',
    definition:
      'Метод диагностики, основанный на последовательном исключении заболеваний со сходными клиническими признаками для определения истинной болезни.',
    example:
      'При хромоте у собаки проводится дифференциальная диагностика между травмой, остеоандрозом и дисплазией.',
  },
  {
    id: 'fc3',
    term: 'Эозинофилия',
    definition:
      'Увеличение количества эозинофилов в периферической крови выше нормы, часто свидетельствующее об аллергической реакции или паразитарной инвазии.',
    example: 'ОАК собаки показал эозинофилию 2800/мкл — это указывает на возможный паразитоз.',
  },
  {
    id: 'fc4',
    term: 'Пиодермия',
    definition:
      'Бактериальная инфекция кожи, наиболее часто вызываемая Staphylococcus pseudintermedius у собак, проявляющаяся пустулами, папулами и корками.',
    example: 'У собаки обнаружены пустулы на животе — диагностирована поверхностная пиодермия.',
  },
  {
    id: 'fc5',
    term: 'MDR1-мутация',
    definition:
      'Генетическая мутация гена MDR1, приводящая к повышенной чувствительности к ивермектину и другим препаратам. Встречается у колли, шелти, бобтейлов.',
    example: 'Перед назначением ивермектина колли необходимо проверить наличие MDR1-мутации.',
  },
  {
    id: 'fc6',
    term: 'МДР-1',
    definition:
      'Белок множественной лекарственной устойчивости (P-glycoprotein), обеспечивающий защиту головного мозга от токсичных веществ. Мутация гена MDR1 приводит к нейротоксичности.',
    example:
      'У собак с мутацией MDR1 ивермектин проникает через гематоэнцефалический барьер, вызывая нейротоксичность.',
  },
  {
    id: 'fc7',
    term: 'Атропин',
    definition:
      'М-холинолитик, применяемый в ветеринарии для купирования бронхоспазма, уменьшения секреции слюнных желез и как антидот при отравлении фосфорорганическими веществами.',
    example: 'При отравлении собаки ФОС введён атропин в дозе 0.05 мг/кг.',
  },
  {
    id: 'fc8',
    term: 'Лапаротомия',
    definition:
      'Хирургическая операция — вскрытие брюшной полости через разрез передней брюшной стенки для доступа к органам брюшной полости.',
    example: 'Проведена срединная лапаротомия для удаления инородного тела из кишечника собаки.',
  },
  {
    id: 'fc9',
    term: 'Копрология',
    definition:
      'Метод лабораторной диагностики, заключающийся в исследовании фекалий на наличие яиц гельминтов, цист простейших и их личинок.',
    example: 'Копрологическое исследование выявило яйца токсокар у щенка.',
  },
  {
    id: 'fc10',
    term: 'Иммунопрофилактика',
    definition:
      'Комплекс мероприятий по созданию искусственного иммунитета у животных с помощью вакцин и сывороток для профилактики инфекционных заболеваний.',
    example: 'По плану иммунопрофилактики щенку введена комплексная вакцина от чумы, парвовирусного энтерита и аденовироза.',
  },
];

/* ----- Роутер офлайн-ответов ----- */

async function handleOfflineApi(pathname: string, init?: RequestInit): Promise<Response | null> {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/api/ai-test') {
    return json({
      ok: false,
      error: 'Офлайн-версия: ИИ недоступен — разделы используют резервный контент',
      latencyMs: 0,
    });
  }

  if (path === '/api/assessment/placement') {
    const body = await parseBody(init);
    const action = body.action || 'get_questions';

    if (action === 'get_questions') {
      const count = clampInt(body.count, 9, 21, 15);
      const questions = getPlacementQuestions(count);
      return json({
        success: true,
        questions,
        totalQuestions: questions.length,
        isPlacement: true,
        description:
          'Входное тестирование для определения вашего уровня подготовки. Вопросы охватывают все основные темы ветеринарной медицины на разных уровнях сложности.',
      });
    }

    if (action === 'analyze_results') {
      const { questions, answers } = body;
      if (!Array.isArray(questions) || !Array.isArray(answers) || questions.length !== answers.length) {
        return json({ error: 'Укажите вопросы и ответы для анализа' }, 400);
      }
      const result = determineLevel(questions, answers);
      return json({
        success: true,
        isPlacement: true,
        ...result,
        message:
          result.level === 'advanced'
            ? 'Отличный результат! У вас продвинутый уровень подготовки. AI будет генерировать сложные вопросы для дальнейшего развития.'
            : result.level === 'intermediate'
              ? 'Хороший результат! У вас средний уровень. AI подберёт вопросы чуть выше вашего уровня для роста.'
              : 'Добро пожаловать! Базовый уровень — это отличная отправная точка. AI начнёт с фундаментальных тем и постепенно усложнять.',
      });
    }

    return json({ error: 'Неизвестное действие. Используйте get_questions или analyze_results.' }, 400);
  }

  if (path === '/api/assessment') {
    const body = await parseBody(init);
    const topics = Array.isArray(body.topics) ? body.topics : [];
    const difficulty: Difficulty = DIFFICULTIES.includes(body.difficulty)
      ? body.difficulty
      : 'intermediate';
    const count = clampInt(body.count, 1, 50, 10);
    const collected: any[] = [];
    const seen = new Set<string>();
    const perTopic = Math.max(1, Math.ceil(count / Math.max(1, topics.length)));

    for (const topic of topics) {
      for (const q of getStaticQuestionsForTopic(topic.id, difficulty as Difficulty, perTopic)) {
        if (!seen.has(q.id)) {
          seen.add(q.id);
          collected.push(q);
        }
      }
    }
    for (const topic of topics) {
      if (collected.length >= count) break;
      for (const q of getStaticQuestionsForTopic(topic.id, 'intermediate', count)) {
        if (!seen.has(q.id)) {
          seen.add(q.id);
          collected.push(q);
        }
      }
    }
    const questions = shuffle(collected).slice(0, count);
    return json({ success: true, questions, totalQuestions: questions.length, isFallback: true });
  }

  if (path === '/api/assessment/result') {
    const body = await parseBody(init);
    const questions = Array.isArray(body.questions) ? body.questions : [];
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (questions.length === 0) {
      return json({ error: 'Ошибка при анализе результатов' }, 400);
    }
    const score = Math.round(
      (answers.filter((a: unknown, i: number) => a != null && a === questions[i]?.correctIndex)
        .length /
        questions.length) *
        100,
    );
    const byTopic: Record<string, { correct: number; total: number; topicName: string }> = {};
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const topicId = q.topicId || 'unknown';
      if (!byTopic[topicId]) {
        byTopic[topicId] = { correct: 0, total: 0, topicName: q.topicName || topicId };
      }
      byTopic[topicId].total++;
      if (answers[i] != null && answers[i] === q.correctIndex) byTopic[topicId].correct++;
    }
    const skillMap: Record<string, number> = {};
    const gaps: unknown[] = [];
    for (const [topicId, stat] of Object.entries(byTopic)) {
      const pct = Math.round((stat.correct / stat.total) * 100);
      skillMap[topicId] = pct;
      if (pct < 70) {
        gaps.push({
          topicId,
          topicName: stat.topicName,
          currentLevel: pct,
          targetLevel: 80,
          priority: pct < 40 ? 'high' : 'medium',
          reason: 'Низкий процент правильных ответов по теме (офлайн-анализ)',
        });
      }
    }
    return json({
      success: true,
      score,
      skillMap,
      gaps,
      strengths: [],
      learningPath: [],
      summary: `Результат: ${score}%. Офлайн-анализ: детальные ИИ-рекомендации доступны в серверной версии.`,
      isFallback: true,
    });
  }

  if (path === '/api/exam') {
    const body = await parseBody(init);
    const action = body.action;
    const topics = Array.isArray(body.topics) ? body.topics.filter((t: unknown) => typeof t === 'string') : [];
    const mainTopic = topics[0] || 'ветеринарной медицины';

    if (action === 'start') {
      const count = clampInt(body.questionCount, 3, 30, 10);
      return json({
        success: true,
        examId: `exam_${Date.now()}`,
        firstQuestion: examQuestion(mainTopic, 0),
        examPlan: `Экзамен по темам: ${topics.join(', ') || 'общая ветеринария'}. Количество вопросов: ${count}. (Офлайн-версия: вопросы по шаблонам, без ИИ.)`,
        isFallback: true,
      });
    }

    if (action === 'answer') {
      const count = clampInt(body.questionCount, 1, 30, 10);
      const index = clampInt(body.currentQuestionIndex, 0, 100, 0);
      const isLast = !!body.isLastQuestion || index >= count - 1;
      const answerLen = (String(body.answer || '') || '').trim().length;
      const score = answerLen < 40 ? 3 : answerLen < 200 ? 6 : 8;
      const feedback = {
        correct: score >= 4,
        score,
        explanation:
          'Офлайн-версия: ИИ-проверка недоступна, выставлена базовая оценка по объёму ответа. Полный разбор — в серверной версии.',
        followUp: null,
      };
      if (isLast) {
        return json({
          success: true,
          feedback,
          nextQuestion: null,
          examComplete: true,
          results: {
            overallScore: 60,
            grade: 'Удовлетворительно',
            summary:
              'Экзамен завершён в офлайн-режиме. Оценка выставлена по базовым критериям без ИИ-анализа.',
            strengths: [],
            weaknesses: [],
            recommendations: [
              'Пройдите экзамен в серверной версии для детального ИИ-разбора ответов',
            ],
          },
          isFallback: true,
        });
      }
      return json({
        success: true,
        feedback,
        nextQuestion: examQuestion(topics[(index + 1) % Math.max(1, topics.length)] || mainTopic, index + 1),
        examComplete: false,
        results: null,
        isFallback: true,
      });
    }

    return json({ error: 'Укажите действие: start или answer' }, 400);
  }

  if (path === '/api/case/generate') {
    return json({ success: true, case: FALLBACK_CASE, isFallback: true });
  }

  if (path === '/api/case/evaluate') {
    const body = await parseBody(init);
    const questions = Array.isArray(body.case?.questions) ? body.case.questions : [];
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const correctCount = answers.filter(
      (a: unknown, i: number) => a !== null && a === questions[i]?.correctIndex,
    ).length;
    const feedback = questions.map((q: any, i: number) => {
      const answer = answers[i];
      return {
        questionIndex: i,
        correct: answer !== null && answer === q?.correctIndex,
        studentAnswer: answer !== null && q?.options?.[answer] ? q.options[answer] : 'Не ответил',
        correctAnswer: q?.options?.[q?.correctIndex] ?? 'Не указан',
        explanation: q?.explanation || 'Объяснение недоступно.',
      };
    });
    return json({
      success: true,
      score: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      feedback,
      overallFeedback: `Правильных ответов: ${correctCount} из ${questions.length}`,
      keyTakeaways: [],
      xpEarned: 20 * correctCount,
      isFallback: true,
    });
  }

  if (path === '/api/simulator/generate') {
    const scenario = JSON.parse(JSON.stringify(FALLBACK_SCENARIOS[Math.floor(Math.random() * FALLBACK_SCENARIOS.length)])) as any;
    scenario.correctTreatment =
      Array.isArray(scenario.treatmentOptions) && scenario.treatmentOptions.length > 0
        ? scenario.treatmentOptions[0]
        : scenario.treatmentPlan;
    scenario.id = `sim_${Date.now()}`;
    return json({ success: true, scenario, isFallback: true });
  }

  if (path === '/api/simulator/evaluate') {
    return json({
      success: true,
      score: 65,
      diagnosisCorrect: true,
      treatmentCorrect: true,
      examinationScore: 60,
      economyScore: 70,
      feedback:
        'Офлайн-версия: автоматическая оценка ограничена, сценарий засчитан как пройденный. Детальный разбор действий — в серверной версии с ИИ.',
      diagnosisFeedback: 'Диагноз принят (офлайн-режим без детального разбора).',
      treatmentFeedback: 'Назначения приняты (офлайн-режим).',
      examinationFeedback: 'Осмотр зачтён по выполненным шагам.',
      keyTakeaways: ['Полный разбор диагностического поиска доступен в серверной версии.'],
      xpEarned: 40,
      grade: 'satisfactory',
      isFallback: true,
    });
  }

  if (path === '/api/flashcards/generate') {
    return json({ success: true, flashcards: FALLBACK_FLASHCARDS, isFallback: true });
  }

  if (path === '/api/osce/evaluate') {
    const body = await parseBody(init);
    const stationId = String(body.stationId || '');
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const station = getOSCEStationById(stationId);
    if (!station) return json({ error: 'Станция не найдена' }, 404);
    if (answers.length !== station.questions.length) {
      return json(
        { error: `Ожидается ${station.questions.length} ответов, получено ${answers.length}` },
        400,
      );
    }
    const scores = station.questions.map((question: any, i: number) => {
      const answer = (answers[i] || '').toLowerCase();
      const total = question.keywords.length > 0 ? question.keywords.length : 1;
      return Math.min(
        10,
        Math.round(
          question.keywords.filter((k: string) => answer.includes(k.toLowerCase())).length /
            total *
            10,
        ),
      );
    });
    const feedback = station.questions.map(
      (_q: unknown, i: number) => `Автоматическая оценка: ${scores[i]}/10 (на основе совпадения ключевых слов).`,
    );
    const totalScore = Math.round(
      scores.reduce((sum: number, s: number) => sum + s, 0) / Math.max(1, scores.length),
    );
    return json({
      success: true,
      scores,
      feedback,
      totalScore,
      referenceAnswers: OSCE_REFERENCES[stationId],
      fallback: true,
    });
  }

  if (path === '/api/mindmap/generate') return offline503('ИИ-генерация майнд-карт');
  if (path === '/api/resources/recommend') return offline503('ИИ-подбор ресурсов');
  if (path === '/api/import/extract' || path.startsWith('/api/import/')) {
    return offline503('Импорт учебных материалов');
  }
  if (path === '/api/flashcards/ocr') return offline503('Распознавание карточек по фото');
  if (path === '/api/tutor/chat' || path === '/api/tutor/speak') {
    return offline503('Голосовой репетитор');
  }
  if (path === '/api/stt') return offline503('Распознавание речи');

  return json({ error: 'Недоступно в офлайн-версии' }, 503);
}

/* ----- Установка перехватчика window.fetch ----- */

let installed = false;

export function installOfflineApiBridge(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url =
        typeof input === 'string'
          ? new URL(input, window.location.href)
          : input instanceof URL
            ? new URL(input.toString(), window.location.href)
            : new URL(input.url, window.location.href);
      if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
        const response = await handleOfflineApi(url.pathname, init);
        if (response) return response;
      }
    } catch {
      // путь не разобрался — прозрачно проваливаемся в настоящий fetch
    }
    return realFetch(input, init);
  };
}
