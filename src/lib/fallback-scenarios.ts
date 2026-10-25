// --- Fallback scenarios for simulator (extracted for faster cold start) ---

export interface ExaminationFinding {
  region: string;
  toolId: string;
  finding: string;
  isNormal: boolean;
  relevance: 'critical' | 'important' | 'minor';
}

export interface LabTest {
  id: string;
  name: string;
  icon: string;
  cost: number;
  category: string;
  result?: string;
  isRevealed: boolean;
}

export interface SimulatorScenario {
  id: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  weight: string;
  difficulty: string;
  topic: string;
  ownerComplaint: string;
  correctDiagnosis: string;
  diagnosisOptions: string[];
  treatmentPlan: string;
  treatmentOptions: string[];
  // Строка правильного лечения (заполняется при шаффле вариантов, чтобы оценка не зависела от позиции)
  correctTreatment?: string;
  findings: ExaminationFinding[];
  availableTests: LabTest[];
  budget: number;
  xpReward: number;
  anamnesisQuestions?: { question: string; answer: string }[];
}

export const FALLBACK_SCENARIOS: SimulatorScenario[] = [
  // 1. Кошка — воспаление мочевого пузыря
  {
    id: 'sim_fb_cystitis',
    species: 'кошки',
    breed: 'Британская короткошёрстная',
    age: '4 года',
    sex: 'самец',
    weight: '5,5 кг',
    difficulty: 'intermediate',
    topic: 'Урология',
    ownerComplaint: 'Барсик постоянно ходит в лоток, но мочи почти нет. Кричит, когда пытается пописать. Вчера была кровь в лотке.',
    correctDiagnosis: 'Идиопатический цистит кошек',
    diagnosisOptions: ['Идиопатический цистит кошек', 'Мочекаменная болезнь', 'Пиелонефрит', 'Уретральная обструкция'],
    treatmentPlan: 'Спазмолитики (но-шпа), противовоспалительные (мелоксикам 0,1 мг/кг), фитопрепараты (цистон). Увеличение потребления воды (питьевой фонтан, влажный корм). Рекомендовано УЗИ контроля через 10 дней.',
    treatmentOptions: ['Спазмолитики + НПВС + увеличение водопотребления', 'Антибиотики широкого спектра', 'Хирургическое удаление камней', 'Только диета'],
    findings: [
      { region: 'abdomen', toolId: 'palpation', finding: 'Мочевой пузырь увеличен, уплотнён, при пальпации животное проявляет выраженную болезненность.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 38,8°C — в пределах нормы.', isNormal: true, relevance: 'minor' },
      { region: 'abdomen', toolId: 'stethoscope', finding: 'Перистальтика кишечника сохранена, шумов нет.', isNormal: true, relevance: 'minor' },
      { region: 'head', toolId: 'inspection', finding: 'Слизистые бледно-розовые, чистые. Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца ритмичные, чистые. ЧСС 160 уд/мин. Дыхание везикулярное.', isNormal: true, relevance: 'minor' },
      { region: 'skin', toolId: 'inspection', finding: 'Шерстный покров в норме, кожные покровы без изменений.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Безболезненны, суставы подвижны.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Безболезненны, мышечный тонус в норме.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'urinalysis', name: 'Анализ мочи', icon: '', cost: 500, category: 'other', result: 'Цвет: розоватый. Реакция: кислая (pH 6,0). Белок: 0,5 г/л. Лейкоциты: 15-20 в п/з. Эритроциты: сплошь в поле зрения. Кристаллы: отсутствуют. Бактерии: не обнаружены.', isRevealed: false },
      { id: 'cbc', name: 'ОАК', icon: '', cost: 800, category: 'blood', result: 'В пределах нормы. Лейкоциты: 9,2×10⁹/л. Эритроциты: 8,1×10¹²/л. Гемоглобин: 110 г/л.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '', cost: 1500, category: 'blood', result: 'Креатинин: 95 мкмоль/л (норма до 140). Мочевина: 6,5 ммоль/л. Остальное в норме.', isRevealed: false },
      { id: 'ultrasound', name: 'УЗИ брюшной полости', icon: '', cost: 1800, category: 'imaging', result: 'Мочевой пузырь утолщён стенками (3,5 мм, норма до 1,5 мм). Конкрементов не выявлено. Почки без структурных изменений.', isRevealed: false },
      { id: 'xray', name: 'Рентген брюшной полости', icon: '', cost: 1500, category: 'imaging', result: 'Конкрементов в мочевыводящих путях не обнаружено. Мочевой пузырь увеличен. Тени камней отсутствуют.', isRevealed: false },
    ],
    budget: 5000,
    xpReward: 65,
    anamnesisQuestions: [
      { question: 'Когда начались проблемы с мочеиспусканием?', answer: 'Дня три назад заметил, что часто ходит в лоток.' },
      { question: 'Кровь в моче была только один раз?', answer: 'Да, вчера вечером заметил капли крови.' },
      { question: 'Что ест кошка?', answer: 'Сухой корм премиум-класс, иногда влажный. Воды пьёт мало.' },
      { question: 'Аппетит изменён?', answer: 'Ест нормально, активность обычная.' },
      { question: 'Был ли стресс?', answer: 'Да, неделю назад переехали на новую квартиру.' },
      { question: 'Раньше были проблемы с мочевым?', answer: 'Нет, первый раз.' },
    ],
  },
  // 2. Собака — отравление
  {
    id: 'sim_fb_antifreeze',
    species: 'собаки',
    breed: 'Лабрадор',
    age: '3 года',
    sex: 'самец',
    weight: '28 кг',
    difficulty: 'beginner',
    topic: 'Токсикология',
    ownerComplaint: 'Бобик вырвался и сожрал что-то на прогулке. Сначала была сильная рвота, сейчас вялый, не встаёт.',
    correctDiagnosis: 'Отравление этиленгликолем',
    diagnosisOptions: ['Отравление этиленгликолем', 'Панкреатит острый', 'Вирусный энтерит', 'Инородное тело ЖКТ'],
    treatmentPlan: 'Промывание желудка (если менее 2 часов), антидот — 4-метилпиразол (фомепизол) 20 мг/кг в/в, затем 15 мг/кг через 12 и 24 часа. Инфузионная терапия физраствор + глюкоза. Диурез форсированный. Гепатопротекторы.',
    treatmentOptions: ['Фомепизол + инфузия + промывание', 'Промывание + активированный уголь', 'Антибиотики + инфузия', 'Только инфузионная терапия'],
    findings: [
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот болезненный в эпигастральной области. Печень увеличена.', isNormal: false, relevance: 'important' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 37,2°C — снижена.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'inspection', finding: 'Слизистые бледные, сухие. Глаза запавшие — признаки обезвоживания.', isNormal: false, relevance: 'critical' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца приглушены, брадикардия 60 уд/мин.', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'inspection', finding: 'Кожные покровы сухие, тургор снижен. Время возврата складки кожи — 3 секунды.', isNormal: false, relevance: 'important' },
      { region: 'neck', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Безболезненны.', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Безболезненны.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '', cost: 800, category: 'blood', result: 'Лейкоциты: 15,2×10⁹/л (лейкоцитоз). Эритроциты: 5,8×10¹²/л. Гемоглобин: 105 г/л (снижен). Гематокрит: 32% (снижен).', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '', cost: 1500, category: 'blood', result: 'Креатинин: 280 мкмоль/л (норма до 120). Мочевина: 22 ммоль/л. АЛТ: 350 ЕД/л. Щелочная фосфатаза: 250 ЕД/л. Глюкоза: 3,0 ммоль/л (гипогликемия).', isRevealed: false },
      { id: 'urinalysis', name: 'Анализ мочи', icon: '', cost: 500, category: 'other', result: 'Плотность: 1010 (гипостенурия). Реакция: кислая pH 5,5. Белок: 2,0 г/л. Кристаллы оксалата кальция: ++. Глюкоза: положительно.', isRevealed: false },
      { id: 'coagulation', name: 'Коагулограмма', icon: '', cost: 1200, category: 'blood', result: 'Протромбиновое время удлинено: 18 сек (норма до 12). АЧТВ: 35 сек (удлинено).', isRevealed: false },
    ],
    budget: 5000,
    xpReward: 55,
    anamnesisQuestions: [
      { question: 'Что именно съел собака?', answer: 'Не знаю точно, гулял без поводка. Заметил, что лизал что-то возле гаража.' },
      { question: 'Сколько времени прошло?', answer: 'Часа 3-4 назад вырвался.' },
      { question: 'Сколько раз была рвота?', answer: 'Раз 5-6, сначала жёлтая пена, потом просто слюна.' },
      { question: 'Мочился ли после прогулки?', answer: 'Нет, не мочился с утра.' },
      { question: 'Пил ли воду?', answer: 'Пил много, но потом перестал.' },
      { question: 'Есть ли прививки?', answer: 'Да, все по графику.' },
    ],
  },
  // 3. Корова — мастит
  {
    id: 'sim_fb_mastitis',
    species: 'КРС',
    breed: 'Голштинская',
    age: '5 лет',
    sex: 'самка',
    weight: '580 кг',
    difficulty: 'intermediate',
    topic: 'Акушерство и гинекология',
    ownerComplaint: 'У Зорьки второе вымя горячее и плотное, молоко с хлопьями и розоватое. Доится плохо из этого четвертика.',
    correctDiagnosis: 'Клинический мастит (стрептококковый)',
    diagnosisOptions: ['Клинический мастит (стрептококковый)', 'Травма вымени', 'Ушиб вымени', 'Актиномикоз вымени'],
    treatmentPlan: 'Внутривымянные инъекции цефалоспоринов (цефаклор 200 мг в каждый поражённый квартал, 3 раза в день, 5 дней). Массаж вымени снизу-вверх. Холодные компрессы между дойками. Окситоцин 10 ЕД в/м для улучшения молокоотдачи.',
    treatmentOptions: ['Антибиотикотерапия + массаж + окситоцин', 'Только массаж и компрессы', 'Хирургическое дренирование', 'НПВС без антибиотиков'],
    findings: [
      { region: 'abdomen', toolId: 'palpation', finding: 'Вымя асимметрично: правая задняя доля увеличена, горячая, плотная, болезненная.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 39,8°C (повышена).', isNormal: false, relevance: 'critical' },
      { region: 'skin', toolId: 'inspection', finding: 'Кожа вымени покрасневшая, отёчная. Поражённая доля увеличена в 2 раза.', isNormal: false, relevance: 'critical' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Лимфатический узел вымени (надвымянный) увеличен до 5 см, подвижный.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'inspection', finding: 'Слизистые розовые, влажные, чистые.', isNormal: true, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца ритмичные, ЧСС 72 уд/мин.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Безболезненны, суставы без изменений.', isNormal: true, relevance: 'minor' },
      { region: 'tail', toolId: 'inspection', finding: 'Видимых изменений нет.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'milk_test', name: 'Проба молока (калифорнийский тест)', icon: '', cost: 300, category: 'other', result: 'Реакция: +++ (жидкость образует плотный сгусток). РН молока: 6,5 (снижено, норма 6,6-6,8).', isRevealed: false },
      { id: 'cbc', name: 'ОАК', icon: '', cost: 800, category: 'blood', result: 'Лейкоциты: 14,8×10⁹/л (лейкоцитоз, нейтрофилёз). Сдвиг формулы влево.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '', cost: 1500, category: 'blood', result: 'С-реактивный белок: 45 мг/л (повышен). Остальные показатели в норме.', isRevealed: false },
      { id: 'bacteriology', name: 'Бактериологический посев молока', icon: '', cost: 1200, category: 'microscopy', result: 'Выделен Streptococcus uberis. Чувствителен к цефалоспоринам, пенициллину.', isRevealed: false },
    ],
    budget: 4000,
    xpReward: 65,
    anamnesisQuestions: [
      { question: 'Когда заметили изменения в вымени?', answer: 'Два дня назад началось, вчера значительно ухудшилось.' },
      { question: 'Какая по счёту лактация?', answer: 'Третья лактация, отёл был 4 месяца назад.' },
      { question: 'Молочная продуктивность?', answer: 'Обычно 28 литров в день, сейчас упало до 18.' },
      { question: 'Были проблемы с выменем раньше?', answer: 'В прошлую лактацию был субклинический мастит в другом квартале.' },
      { question: 'Как происходит доение?', answer: 'Доильный зал, машина. После доения обработку сосков проводим.' },
    ],
  },
  // 4. Лошадь — колика
  {
    id: 'sim_fb_colic',
    species: 'лошади',
    breed: 'Ахалтекинец',
    age: '8 лет',
    sex: 'самец',
    weight: '450 кг',
    difficulty: 'advanced',
    topic: 'Хирургия',
    ownerComplaint: 'Гасан перестал есть сено, часто ложится и встаёт, бьёт ногой по животу. Потеет сильно.',
    correctDiagnosis: 'Кишечная непроходимость (обтурационная колика)',
    diagnosisOptions: ['Кишечная непроходимость (обтурационная колика)', 'Спастическая колика', 'Перитонит', 'Язвенная болезнь желудка'],
    treatmentPlan: 'Консервативная терапия: зондирование желудка, промывание (вышло 8 литров сока). Спазмолитики (но-шпа 10 мл в/в). Дротаверин + новокаиновая блокада. Инфузия: 10 литров физраствора + 5 литров 5% глюкозы в/в. При отсутствии эффекта через 4-6 часов — показана лапаротомия.',
    treatmentOptions: ['Зондирование + спазмолитики + инфузия (при неэффективности — хирургия)', 'Только спазмолитики и обезболивание', 'Промывание желудка', 'Сразу хирургическое вмешательство'],
    findings: [
      { region: 'abdomen', toolId: 'stethoscope', finding: 'Перистальтика отсутствует в правой подвздошной области. Глухие звуки слева.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот вздут, при пальпации — напряжение. При ректальном исследовании: уплотнённая петля тонкого кишечника.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 38,9°C — верхняя граница нормы.', isNormal: true, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Тоны сердца приглушены, тахикардия 55 уд/мин (норма 28-44).', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'Обильный пот, особенно в области грудной клетки и шеи. Слизистые бледно-розовые.', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'inspection', finding: 'Слизистые влажные, розовые. Видимых патологий нет.', isNormal: true, relevance: 'minor' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Копыта тёплые, пульс пальпируется (нормальный).', isNormal: true, relevance: 'minor' },
      { region: 'hind_legs', toolId: 'inspection', finding: 'Животное часто переступает задними ногами — признак боли.', isNormal: false, relevance: 'important' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '', cost: 800, category: 'blood', result: 'Лейкоциты: 18,5×10⁹/л (лейкоцитоз). Гематокрит: 55% (гематокрит повышен — гемоконцентрация).', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '', cost: 1500, category: 'blood', result: 'Лактат: 6,5 ммоль/л (норма до 2,0 — тяжёлая ишемия). Мочевина: 12 ммоль/л. Глюкоза: 8,5 ммоль/л (стрессовая гипергликемия).', isRevealed: false },
      { id: 'abdominocentesis', name: 'Абдоминоцентез', icon: '', cost: 1000, category: 'other', result: 'Жидкость: мутная, желтоватая. Белок: 35 г/л. Лейкоциты: 25×10⁹/л (значительно повышено). Бактерии: не обнаружены.', isRevealed: false },
      { id: 'ultrasound', name: 'УЗИ брюшной полости', icon: '', cost: 2000, category: 'imaging', result: 'Расширенные петли тонкого кишечника (до 8 см в диаметре). Уменьшение перистальтики. Наличие жидкости в брюшной полости — до 3 литров.', isRevealed: false },
    ],
    budget: 6000,
    xpReward: 80,
    anamnesisQuestions: [
      { question: 'Когда началось беспокойство?', answer: 'Утром, около 6 часов. На ночь ещё был нормальным.' },
      { question: 'Кормили сегодня?', answer: 'Сено не трогал. Воду отпивал немного.' },
      { question: 'Был стул?', answer: 'Нет стула с утра. Вчера ещё был нормальный.' },
      { question: 'Случались колики раньше?', answer: 'Год назад была спастическая, прошла после спазмолитиков.' },
      { question: 'Изменили кормление?', answer: 'Вчера дали больше овса, чем обычно.' },
    ],
  },
  // 5. Свинья — бронхопневмония
  {
    id: 'sim_fb_pneumonia',
    species: 'свиньи',
    breed: 'Йоркширская',
    age: '3 месяца',
    sex: 'самец',
    weight: '32 кг',
    difficulty: 'intermediate',
    topic: 'Инфекционные болезни',
    ownerComplaint: 'У поросят кашель, хрюканье стало грубым, двое лежат и не встают. Температура у всех повышена.',
    correctDiagnosis: 'Энзоотическая пневмония (микоплазменная)',
    diagnosisOptions: ['Энзоотическая пневмония (микоплазменная)', 'Пастереллёз', 'Сальмонеллёз', 'Цирковирусная инфекция'],
    treatmentPlan: 'Тилозин (тизол 10 мг/кг в/м, 2 раза в день, 5 дней) или флорфеникол. Симптоматическая: бронхолитики, витамины А и Е. Улучшение вентиляции помещения. Вакцинация поголовья.',
    treatmentOptions: ['Тилозин + бронхолитики + улучшение условий', 'Антибиотики широкого спектра (амоксициллин)', 'Только витамины', 'Забой больных животных'],
    findings: [
      { region: 'thorax', toolId: 'stethoscope', finding: 'Жёсткое дыхание с хрипами (крепитация) в кранио-вентральных долях лёгких. Дыхание ослаблено.', isNormal: false, relevance: 'critical' },
      { region: 'thorax', toolId: 'percussion', finding: 'Укорочение перкуторного звука в передних долях лёгких (уплотнение).', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 40,5°C (лихорадка).', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'inspection', finding: 'Выделения из носа — серозно-катаральные, обильные. Конъюнктивит. Шум в носовой полости при дыхании (стридор).', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'Кожа цианотичная в области ушей и пятачка.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'palpation', finding: 'Подкожные лимфоузлы увеличены, безболезненны.', isNormal: false, relevance: 'minor' },
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот мягкий, безболезненный. Перистальтика сохранена.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '', cost: 800, category: 'blood', result: 'Лейкоциты: 16,0×10⁹/л (лейкоцитоз). Нейтрофилёз со сдвигом влево. Лимфопения.', isRevealed: false },
      { id: 'xray', name: 'Рентген грудной клетки', icon: '', cost: 2000, category: 'imaging', result: 'Усиление бронхиального рисунка, инфильтративные тени в кранио-вентральных долях. Уплотнение лёгочной ткани.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '', cost: 1500, category: 'blood', result: 'С-реактивный белок: 65 мг/л (значительно повышен). Фибриноген: 6,0 г/л (повышен).', isRevealed: false },
      { id: 'serology', name: 'Серологический тест на микоплазму', icon: '', cost: 1000, category: 'microscopy', result: 'ИФА: антитела к Mycoplasma hyopneumoniae — положительно, титр 1:640.', isRevealed: false },
    ],
    budget: 5000,
    xpReward: 70,
    anamnesisQuestions: [
      { question: 'Когда появился кашель?', answer: 'Около недели назад у одного поросёнка, сейчас у нескольких.' },
      { question: 'Сколько поросят болеет?', answer: 'Из 12 в секции — 6 кашляют, 2 не встают.' },
      { question: 'Вакцинация проводилась?', answer: 'Только от чумы. От микоплазмы не вакцинировали.' },
      { question: 'Условия содержания?', answer: 'Загон закрытый, вентиляция слабая. Плотность посадки высокая.' },
      { question: 'Кормление?', answer: 'Сухой комбикорм, вода из автопоилок.' },
    ],
  },
  // 6. Овца — копытная гниль
  {
    id: 'sim_fid_footrot',
    species: 'МРС',
    breed: 'Дорпер',
    age: '4 года',
    sex: 'самка',
    weight: '55 кг',
    difficulty: 'beginner',
    topic: 'Хирургия',
    ownerComplaint: 'У половины стада овцы хромают, из копыт ужасный запах. Несколько особей лежат и не могут встать.',
    correctDiagnosis: 'Некробактериоз копытец',
    diagnosisOptions: ['Некробактериоз копытец', 'Язвенная болезнь копытец', 'Травма копыта', 'Острый межпальцевый абсцесс'],
    treatmentPlan: 'Обработка копыт: очистка от некротических тканей, антисептическая ванна (10% раствор цинксульфата или 5% формалин). Местно: спрей на основе сульфаниламидов. Системно: тилозин 10 мг/кг в/м 3 дня. Улучшение подстилки и дренирование территории.',
    treatmentOptions: ['Ванна для копыт + тилозин + очистка', 'Только антибиотики в/м', 'Забой поражённых', 'Ванна для копыт без антибиотиков'],
    findings: [
      { region: 'hind_legs', toolId: 'inspection', finding: 'Межкопытная щель заполнена некротическими массами серо-чёрного цвета. Резкий гнилостный запах. Отёк межпальцевой области.', isNormal: false, relevance: 'critical' },
      { region: 'front_legs', toolId: 'inspection', finding: 'У отдельных особей начальные признаки — покраснение межпальцевой зоны.', isNormal: false, relevance: 'important' },
      { region: 'hind_legs', toolId: 'palpation', finding: 'Копыто тёплое, болезненное. При надавливании — выделение зловонного экссудата.', isNormal: false, relevance: 'critical' },
      { region: 'abdomen', toolId: 'thermometer', finding: 'Температура 40,1°C (повышена).', isNormal: false, relevance: 'important' },
      { region: 'head', toolId: 'inspection', finding: 'Слизистые бледные, чистые. Животное угнетено.', isNormal: true, relevance: 'minor' },
      { region: 'skin', toolId: 'inspection', finding: 'Волосяной покров в области копыт загрязнён, с примесью экссудата.', isNormal: false, relevance: 'minor' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Дыхание везикулярное, тоны сердца в норме.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '', cost: 800, category: 'blood', result: 'Лейкоциты: 12,5×10⁹/л (умеренный лейкоцитоз). Нейтрофилия.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '', cost: 1500, category: 'blood', result: 'В пределах нормы. Незначительное повышение СРБ.', isRevealed: false },
      { id: 'bacteriology', name: 'Бакпосев из копыта', icon: '', cost: 1000, category: 'microscopy', result: 'Выделен Fusobacterium necrophorum + Bacteroides melaninogenicus. Чувствительны к тилозину, цефалоспоринам.', isRevealed: false },
    ],
    budget: 4000,
    xpReward: 50,
    anamnesisQuestions: [
      { question: 'Когда началась хромота?', answer: 'Где-то 10 дней назад у нескольких овец, быстро распространяется.' },
      { question: 'Сколько животных в стаде?', answer: '120 голов, из них хромают около 60.' },
      { question: 'Пастбище влажное?', answer: 'Да, последние две недели дожди, грязь повсюду.' },
      { question: 'Обрабатывали ли копыта раньше?', answer: 'Нет, первый раз с такой проблемой.' },
    ],
  },
  // 7. Курица — сальмонеллёз
  {
    id: 'sim_fb_pullorosis',
    species: 'птица',
    breed: 'Леггорн',
    age: '6 месяцев',
    sex: 'самка',
    weight: '1,8 кг',
    difficulty: 'intermediate',
    topic: 'Инфекционные болезни',
    ownerComplaint: 'У несушек понос белого цвета, несколько птиц погибло. Яйценоскость резко упала. Птицы вялые, перья взъерошены.',
    correctDiagnosis: 'Пуллороз (сальмонеллёз)',
    diagnosisOptions: ['Пуллороз (сальмонеллёз)', 'Кокцидиоз', 'Пастереллёз', 'Инфекционный бронхит'],
    treatmentPlan: 'Энрофлоксацин 10 мг/кг в/м или в воде 3-5 дней. Сульфадиметоксин в комбинации с триметопримом. Витамины группы B. Дезинфекция птичника. Убой клинически больных птиц. Карантин стада.',
    treatmentOptions: ['Энрофлоксацин + сульфаниламиды + дезинфекция', 'Только антибиотик в воде', 'Никакого лечения — убой', 'Витамины и иммуностимуляторы'],
    findings: [
      { region: 'abdomen', toolId: 'palpation', finding: 'Живот увеличен. При пальпации — фибринозные наложения на кишечнике. Печень увеличена.', isNormal: false, relevance: 'critical' },
      { region: 'head', toolId: 'inspection', finding: 'Гребень бледный, сморщенный. Глаза полузакрыты. Из клоаки — белёсые испражнения, загрязнение перьев вокруг клоаки.', isNormal: false, relevance: 'critical' },
      { region: 'head', toolId: 'otoscope', finding: 'При осмотре ротовой полости через отоскоп: слизистая сухая, покрыта беловато-серым налётом.', isNormal: false, relevance: 'important' },
      { region: 'thorax', toolId: 'stethoscope', finding: 'Дыхание учащено, жёсткое. Хрипов нет.', isNormal: false, relevance: 'important' },
      { region: 'skin', toolId: 'inspection', finding: 'Перья взъерошены, тусклые. Птица истощена.', isNormal: false, relevance: 'important' },
      { region: 'front_legs', toolId: 'palpation', finding: 'Суставы без изменений.', isNormal: true, relevance: 'minor' },
    ],
    availableTests: [
      { id: 'cbc', name: 'ОАК', icon: '', cost: 600, category: 'blood', result: 'Лейкоциты: 35×10⁹/л (выраженный лейкоцитоз). Гематокрит: 28% (анемия).', isRevealed: false },
      { id: 'bacteriology', name: 'Бакпосев из клоаки', icon: '', cost: 800, category: 'microscopy', result: 'Выделена Salmonella gallinarum. Чувствительна к энрофлоксацину, гентамицину.', isRevealed: false },
      { id: 'biochemistry', name: 'Биохимия крови', icon: '', cost: 1200, category: 'blood', result: 'АЛТ: 180 ЕД/л (повышен). АСТ: 250 ЕД/л (повышен). Общий белок: 42 г/л (снижен).', isRevealed: false },
      { id: 'autopsy', name: 'Патологоанатомическое вскрытие', icon: '', cost: 1500, category: 'other', result: 'Печень увеличена, диффузно-токсического изменения с некротическими очагами 1-3 мм. Селезёнка увеличена. Сердце: фибринозный перикардит. Кишечник: катаральный энтерит.', isRevealed: false },
    ],
    budget: 4000,
    xpReward: 65,
    anamnesisQuestions: [
      { question: 'Когда начались проблемы?', answer: 'Около 5 дней назад начали падать яйценоскость.' },
      { question: 'Сколько птиц в стаде?', answer: '500 несушек, заболело около 80, пало 15.' },
      { question: 'Появлялись ли новые птицы?', answer: 'Да, две недели назад закупили 50 кур от другого фермера.' },
      { question: 'Чем кормите?', answer: 'Комбикорм + зерно + премикс. Вода из скважины.' },
      { question: 'Делали дезинфекцию?', answer: 'Нет давно, месяцев 6 назад.' },
    ],
  },
];

export function getFallbackScenario(): SimulatorScenario {
  // Выбираем случайный сценарий из 7 для разнообразия
  const idx = Math.floor(Math.random() * FALLBACK_SCENARIOS.length);
  const base = JSON.parse(JSON.stringify(FALLBACK_SCENARIOS[idx]));
  // Правильное лечение фиксируем строкой до возможного шаффла вариантов
  base.correctTreatment = Array.isArray(base.treatmentOptions) && base.treatmentOptions.length > 0
    ? base.treatmentOptions[0]
    : base.treatmentPlan;
  // Обновляем id чтобы был уникальный
  return { ...base, id: `sim_${Date.now()}` };
}
