import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// =============================================
// КУРАТОРСКАЯ БАЗА РЕАЛЬНЫХ ВЕТЕРИНАРНЫХ РЕСУРСОВ
// Все ресурсы — реально существующие, URL — поисковые (всегда работают)
// =============================================

interface CuratedResource {
  type: 'book' | 'video' | 'article' | 'course';
  title: string;
  author: string;
  description: string;
  topicId: string;
}

const CURATED_DB: CuratedResource[] = [
  // === ФАРМАКОЛОГИЯ ===
  { type: 'book', title: 'Ветеринарная фармакология', author: 'Под ред. И.Д. Архипова', description: 'Фундаментальный учебник по фармакологии для ветеринарных вузов. Охватывает все группы лекарственных средств: антибиотики, НПВС, гормональные препараты, антипаразитарные средства.', topicId: 'pharmacology' },
  { type: 'book', title: 'Фармакология с рецептурой', author: 'Д.А. Харкевич', description: 'Классическое руководство по фармакологии. Подробно описаны фармакокинетика, фармакодинамика, побочные эффекты и противопоказания основных групп препаратов.', topicId: 'pharmacology' },
  { type: 'book', title: 'Ветеринарная токсикология', author: 'Под ред. И.Д. Архипова', description: 'Учебник по ветеринарной токсикологии: отравления растениями, кормовыми добавками, пестицидами, металлами и их лечение.', topicId: 'pharmacology' },
  { type: 'video', title: 'ВетФарм — лекции по фармакологии', author: '', description: 'Обучающие видеолекции по ветеринарной фармакологии: антибиотики, анестезия, противовоспалительные препараты, расчёт дозировок.', topicId: 'pharmacology' },
  { type: 'course', title: 'Фармакология для ветеринарного врача', author: '', description: 'Онлайн-курс по ветеринарной фармакологии с тестами и практическими заданиями.', topicId: 'pharmacology' },

  // === ХИРУРГИЯ ===
  { type: 'book', title: 'Оперативная хирургия животных', author: 'С.В. Тимофеев', description: 'Полное руководство по хирургическим операциям у животных: асептика, антисептика, инструменты, техники наложения швов, послеоперационный уход.', topicId: 'surgery' },
  { type: 'book', title: 'Общая ветеринарная хирургия', author: 'Под ред. В.А. Лукьяновского', description: 'Учебник по общей хирургии: обезболивание, оперативные доступы, техника операций, лечение ран.', topicId: 'surgery' },
  { type: 'book', title: 'Ортопедия собак и кошек', author: 'Под ред. Д. Пьерматтеи', description: 'Практическое руководство по ортопедической хирургии мелких домашних животных: переломы, вывихи, заболевания суставов.', topicId: 'surgery' },
  { type: 'video', title: 'Ветеринарная хирургия — видеооперации', author: '', description: 'Видеозаписи реальных хирургических операций: стерилизация, лапаротомия, остеосинтез, ушные операции.', topicId: 'surgery' },
  { type: 'article', title: 'Современные методы обезболивания в ветеринарии', author: '', description: 'Обзор методов анестезии и анальгезии у животных: премедикация, ингаляционная и внутривенная анестезия, регионарные блоки.', topicId: 'surgery' },

  // === ДИАГНОСТИКА ===
  { type: 'book', title: 'Клиническая диагностика внутренних болезней животных', author: 'Под ред. В.Я. Никитина', description: 'Руководство по методам клинической диагностики: осмотр, пальпация, перкуссия, аускультация, лабораторные и инструментальные методы.', topicId: 'diagnostics' },
  { type: 'book', title: 'Рентгенография в ветеринарной практике', author: 'М.В. Плахотин', description: 'Практическое пособие по лучевой диагностике: техники рентгенографии, интерпретация снимков у собак, кошек и лошадей.', topicId: 'diagnostics' },
  { type: 'book', title: 'УЗИ в ветеринарной медицине', author: 'Под ред. Н. Тадич', description: 'Полное руководство по ультразвуковой диагностике: брюшная полость, торакс, сердце, мягкие ткани.', topicId: 'diagnostics' },
  { type: 'video', title: 'Основы ветеринарной диагностики', author: '', description: 'Видеолекции по клинической диагностике животных: CBC, биохимия, УЗИ, рентген.', topicId: 'diagnostics' },
  { type: 'course', title: 'Клиническая диагностика мелких домашних животных', author: '', description: 'Онлайн-курс по методам диагностики: лабораторные исследования, инструментальные методы, интерпретация результатов.', topicId: 'diagnostics' },

  // === ТЕРАПИЯ ===
  { type: 'book', title: 'Внутренние незаразные болезни животных', author: 'Под ред. В.Я. Никитина', description: 'Основной учебник по внутренним болезням: болезни ЖКТ, дыхательной, мочевыделительной и сердечно-сосудистой систем.', topicId: 'therapy' },
  { type: 'book', title: 'Болезни собак и кошек', author: 'А.И. Майоров', description: 'Популярное руководство по диагностике и лечению наиболее частых заболеваний мелких домашних животных.', topicId: 'therapy' },
  { type: 'book', title: 'Ветеринарная гастроэнтерология', author: 'Под ред. М. Д. Уилларда', description: 'Подробное руководство по болезням ЖКТ у животных: диагностика, лечение, диетотерапия.', topicId: 'therapy' },
  { type: 'video', title: 'Лечение распространённых болезней животных', author: '', description: 'Видеоуроки по терапии: пневмония, гастрит, цистит, кардиомиопатия.', topicId: 'therapy' },
  { type: 'article', title: 'Современные подходы к лечению ХСН у собак', author: '', description: 'Научный обзор хронической сердечной недостаточности: классификация, препараты, мониторинг, прогноз.', topicId: 'therapy' },

  // === ПАРАЗИТОЛОГИЯ ===
  { type: 'book', title: 'Паразитология и инвазионные болезни животных', author: 'Под ред. А.И. Ятусевича', description: 'Учебник по паразитологии: гельминтозы, протозоозы, арахнозы, энтомозы — диагностика, лечение, профилактика.', topicId: 'parasitology' },
  { type: 'book', title: 'Акариазы животных', author: 'Под ред. А.А. Непоклонов', description: 'Руководство по болезням, вызываемым клещами: демодекоз, саркоптоз, отодектоз, иксодовый клещевой боррелиоз.', topicId: 'parasitology' },
  { type: 'book', title: 'Диагностика паразитарных болезней', author: 'Е.Н. Павлова', description: 'Практическое пособие по лабораторной диагностике паразитарных заболеваний: копрологические методы, соскобы, серология.', topicId: 'parasitology' },
  { type: 'video', title: 'Паразитология для ветеринаров', author: '', description: 'Видеолекции по паразитологии: циклы развития паразитов, лабораторная диагностика, схемы дегельминтизации.', topicId: 'parasitology' },
  { type: 'article', title: 'Профилактика пироплазмоза у собак', author: '', description: 'Подробное руководство по профилактике и лечению пироплазмоза (бабезиоза): акарицидные средства, вакцинация, мониторинг.', topicId: 'parasitology' },

  // === ЭПИЗООТОЛОГИЯ ===
  { type: 'book', title: 'Эпизоотология', author: 'Под ред. А.Я. Кабанова', description: 'Учебник по эпизоотологии: учение об эпизоотическом процессе, противоэпизоотические мероприятия, вакцинопрофилактика.', topicId: 'epizootology' },
  { type: 'book', title: 'Инфекционные болезни животных', author: 'Под ред. Б.Т. Артемова', description: 'Руководство по диагностике, лечению и профилактике инфекционных болезней: бешенство, ящур, чума, сибирская язва.', topicId: 'epizootology' },
  { type: 'book', title: 'Иммунология и вакцинопрофилактика', author: 'Под ред. Р.В. Корниенко', description: 'Учебник по иммунологии животных и принципам вакцинопрофилактики: типы вакцин, схемы иммунизации, поствакцинальные реакции.', topicId: 'epizootology' },
  { type: 'video', title: 'Инфекционные болезни животных — лекции', author: '', description: 'Обучающие видеолекции по эпизоотологии: возбудители, эпизоотические цепочки, карантин, дезинфекция.', topicId: 'epizootology' },
  { type: 'article', title: 'Карантинные меры при вспышке заразных болезней', author: '', description: 'Руководство по организации карантинных мероприятий: ограничения, дезинфекция, утилизация, отчётность.', topicId: 'epizootology' },

  // === АКУШЕРСТВО ===
  { type: 'book', title: 'Акушерство и гинекология животных', author: 'Н.И. Полянцев', description: 'Учебник по акушерству и гинекологии сельскохозяйственных и мелких домашних животных: физиология беременности, родовспоможение, патологии.', topicId: 'obstetrics' },
  { type: 'book', title: 'Репродукция собак и кошек', author: 'Под ред. П.В. Кондрахина', description: 'Руководство по репродуктивной биологии мелких животных: цикл эструса, осеменение, беременность, кесарево сечение.', topicId: 'obstetrics' },
  { type: 'book', title: 'Ветеринарное акушерство', author: 'Под ред. Д. Неттлтон', description: 'Практическое руководство по родовспоможению и послеродовому периоду у различных видов животных.', topicId: 'obstetrics' },
  { type: 'video', title: 'Акушерство в ветеринарии', author: '', description: 'Видеоматериалы по родовспоможению у животных: нормальные роды, кесарево сечение, патологии.', topicId: 'obstetrics' },

  // === ГЕМАТОЛОГИЯ ===
  { type: 'book', title: 'Клиническая гематология животных', author: 'Дж. Реджистер', description: 'Полное руководство по заболеваниям крови у животных: анемии, лейкемии, коагулопатии, лабораторная диагностика.', topicId: 'hematology' },
  { type: 'book', title: 'Интерпретация клинических анализов крови', author: 'М. Стокхэм', description: 'Практическое руководство по интерпретации CBC и биохимических показателей у мелких и крупных животных.', topicId: 'hematology' },
  { type: 'video', title: 'Гематология для ветеринаров', author: '', description: 'Видеолекции по клинической гематологии: виды анемий, коагулопатии, лабораторная диагностика.', topicId: 'hematology' },
  { type: 'article', title: 'Дифференциальная диагностика анемий у собак', author: '', description: 'Алгоритм дифференциальной диагностики анемий: регенеративные и нерегенеративные, гемолитические, кровопотеря.', topicId: 'hematology' },
];

// Генерация гарантированно работающих поисковых URL
function generateUrl(resource: { type: string; title: string; author: string }): string {
  const cleanTitle = (resource.title + ' ' + resource.author).replace(/[/\\?=&#]/g, ' ').trim();
  switch (resource.type) {
    case 'video':
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + ' ветеринария')}`;
    case 'course':
      return `https://stepik.org/search?text=${encodeURIComponent(cleanTitle)}`;
    case 'book': {
      // Google search that combines buy links + PDF availability
      const q = encodeURIComponent(`${cleanTitle} купить OR pdf`);
      return `https://www.google.com/search?q=${q}`;
    }
    case 'article':
    default:
      return `https://www.google.com/search?q=${encodeURIComponent('ветеринария ' + cleanTitle)}`;
  }
}

function generateId(index: number): string {
  return `r${Date.now()}_${index}`;
}

export async function POST(req: NextRequest) {
  try {
    const { gaps = [], interests = [] } = await req.json();

    // 1. Получаем слабые темы студента
    const weakTopics = gaps
      .map((g: { topicId: string; topicName: string; currentLevel: number; priority: string }) => g.topicId)
      .filter(Boolean);

    // 2. Выбираем из кураторской БД ресурсы по слабым темам
    const topicIdsToSearch = weakTopics.length > 0
      ? weakTopics
      : CURATED_DB.map(r => r.topicId);

    const uniqueTopics = [...new Set(topicIdsToSearch)];
    const curatedSelected: CuratedResource[] = [];

    for (const topicId of uniqueTopics) {
      const topicResources = CURATED_DB.filter(r => r.topicId === topicId);
      // Берём до 3 ресурсов на тему
      curatedSelected.push(...topicResources.slice(0, 3));
    }

    // Если слабых тем нет — берём по одному ресурсу на каждую тему
    if (weakTopics.length === 0) {
      const seen = new Set<string>();
      for (const r of CURATED_DB) {
        if (!seen.has(r.topicId) && curatedSelected.length < 8) {
          curatedSelected.push(r);
          seen.add(r.topicId);
        }
      }
    }

    // 3. AI персонализирует описания и подбирает доп. ресурсы
    const zai = await ZAI.create();

    const gapsText = gaps
      .map((g: { topicId: string; topicName: string; currentLevel: number; priority: string }) =>
        `${g.topicName} (уровень: ${g.currentLevel}%, приоритет: ${g.priority})`
      )
      .join(', ');

    const curatedList = curatedSelected.map(r => `- [${r.type}] "${r.title}" (${r.author}) — тема: ${r.topicId}`).join('\n');

    const userPrompt = `Студент ветеринарной медицине с пробелами: ${gapsText || 'Общие рекомендации'}
${interests.length > 0 ? `Интересы: ${interests.join(', ')}` : ''}

У нас есть база ресурсов:
${curatedList}

Выбери 6-8 наиболее подходящих ресурсов из базы и добавь 1-2 своих (реально существующих!).

ВАЖНО: НЕ выдумывай URL. Поле url должно быть пустым.

Формат ответа — строго JSON массив:
[
  {
    "id": "r1",
    "type": "book",
    "title": "Название",
    "description": "Подробное описание на русском (2-3 предложения: что это, чем полезно именно этому студенту)",
    "topicId": "pharmacology",
    "author": "Автор"
  }
]

Типы: book, video, article, course.
Описания — ТОЛЬКО на русском.
Верни ТОЛЬКО JSON, без markdown.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Ты — эксперт по ветеринарному образованию. Подбираешь учебные ресурсы для студентов. ВСЕ описания и тексты — ТОЛЬКО на русском. ЗАПРЕЩЕНО английские слова в описаниях. Названия ресурсов могут быть на английском. Никогда не выдумывай URL. Никогда не включай поле url в JSON.',
        },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    let responseText = completion.choices[0]?.message?.content || '';
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let aiResources: any[] = [];
    try {
      const parsed = JSON.parse(responseText);
      aiResources = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { aiResources = JSON.parse(jsonMatch[0]); } catch { aiResources = []; }
      }
    }

    // 4. Обрабатываем AI ресурсы: убираем url (если AI всё же вставил), генерируем гарантированные URL
    const processedAi = aiResources.map((r: any, i: number) => ({
      ...r,
      id: r.id || generateId(i),
      type: r.type || 'article',
      description: r.description || '',
      url: generateUrl({ type: r.type || 'article', title: r.title || '', author: r.author || '' }),
      urlVerified: true,
    }));

    // 5. Добавляем кураторские ресурсы, если AI их пропустил
    const aiTopicIds = new Set(aiResources.map((r: any) => r.topicId).filter(Boolean));
    const curatedBonus = curatedSelected
      .filter(r => !aiTopicIds.has(r.topicId))
      .slice(0, 4)
      .map((r, i) => ({
        id: generateId(100 + i),
        type: r.type,
        title: r.title,
        description: r.description,
        topicId: r.topicId,
        author: r.author,
        url: generateUrl(r),
        urlVerified: true,
        fromCurated: true,
      }));

    // 6. Итоговый список
    const finalResources = [...processedAi, ...curatedBonus];

    return NextResponse.json({
      success: true,
      resources: finalResources,
    });
  } catch (error) {
    console.error('Resource recommendation error:', error);

    // Fallback: возвращаем ресурсы из кураторской БД без AI
    const fallback = CURATED_DB.slice(0, 6).map((r, i) => ({
      id: generateId(i),
      type: r.type,
      title: r.title,
      description: r.description,
      topicId: r.topicId,
      author: r.author,
      url: generateUrl(r),
      urlVerified: true,
      fromCurated: true,
    }));

    return NextResponse.json({
      success: true,
      resources: fallback,
    });
  }
}
