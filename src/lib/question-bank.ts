// ===== Статический банк вопросов для входного тестирования =====
// Используется для определения начального уровня студента (Placement Test)
// После определения уровня подключается ИИ-генерация уникальных вопросов

import type { AssessmentQuestion } from './types';

export interface QuestionBankItem extends AssessmentQuestion {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ===== ФАРМАКОЛОГИЯ =====
const pharmacologyQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'ph_b1', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'Какой механизм действия характерен для пенициллинов?',
    options: ['Нарушение синтеза клеточной стенки бактерий', 'Ингибирование синтеза белка', 'Нарушение синтеза ДНК', 'Нарушение проницаемости клеточной мембраны'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Пенициллины нарушают синтез пептидогликана клеточной стенки бактерий, что приводит к их лизису. Это distinguishes их от других групп антибиотиков.',
  },
  {
    id: 'ph_b2', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'Для обезболивания у собак чаще всего применяют какой НПВС?',
    options: ['Мелоксикам', 'Ибупрофен', 'Ацетилсалициловая кислота', 'Индометацин'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Мелоксикам — НПВС селективного действия, одобренный для применения у собак. Ибупрофен и ацетилсалициловая кислота токсичны для собак.',
  },
  {
    id: 'ph_b3', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'Что является антидотом при отравлении антихолинэстеразными средствами?',
    options: ['Атропин', 'Протамин', 'Налоксон', 'Флумазенил'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Атропин блокирует мускариновые рецепторы и является основным антидотом при отравлении фосфорорганическими соединениями и антихолинэстеразными препаратами.',
  },
  // Intermediate
  {
    id: 'ph_i1', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'Почему цефалоспорины третьего поколения активнее цефалоспоринов первого поколения против грамотрицательных бактерий?',
    options: [
      'Лучшее проникновение через наружную мембрану и устойчивость к бета-лактамазам',
      'Большая аффинность к пенициллин-связывающим белкам грамположительных бактерий',
      'Способность подавлять синтез ДНК',
      'Наличие дополнительного механизмента действия на рибосомы',
    ],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Цефалоспорины III поколения имеют меньшую аффинность к бета-лактамазам грамотрицательных бактерий и лучше проникают через их наружную мембрану через порины.',
  },
  {
    id: 'ph_i2', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'У кошки наблюдается угнетение дыхания после премедикации ксилазином. Какой препарат показан?',
    options: ['Ипратропия бромид', 'Йохимбин', 'Налоксон', 'Атропин'],
    correctIndex: 1, difficulty: 'intermediate',
    explanation: 'Йохимбин — специфический антагонист альфа-2-адренорецепторов, к которым относится ксилазин. Он эффективнее налоксона для реверсии эффектов ксилазина.',
  },
  {
    id: 'ph_i3', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'Какое антипаразитарное средство из группы макроциклических лактонов применяется при демодекозе собак?',
    options: ['Ивермектин', 'Празиквантел', 'Фенбендазол', 'Метронидазол'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Ивермектин эффективен против Demodex canis, однако у некоторых пород (колли, бобтейл) возможна идиосинкразия из-за мутации гена MDR-1.',
  },
  // Advanced
  {
    id: 'ph_a1', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'При септическом шоке у коровы применяют комбинацию энрофлоксацина и гентамицина. Какая pharmacokinetic rationale за этим выбором?',
    options: [
      'Синергизм за счёт воздействия на разные мишени: ДНК-гиразу и 30S-субъединицу рибосомы',
      'Фармакодинамический антагонизм, компенсируемый увеличением дозы',
      'Усиление биодоступности энрофлоксацина за счёт гентамицина',
      'Совместное ингибирование бета-лактамаз',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Энрофлоксацин (фторхинолон) нарушает репликацию ДНК через ингибирование ДНК-гиразы, а гентамицин (аминогликозид) нарушает синтез белка на 30S-субъединице. Это даёт синергидный эффект.',
  },
  {
    id: 'ph_a2', topicId: 'pharmacology', topicName: 'Фармакология',
    question: 'Собака породы колли нуждается в лечении ивермектином. Что необходимо сделать перед назначением?',
    options: [
      'Провести генетический тест на мутацию гена MDR-1 (ABCB1)',
      'Определить уровень АЛТ и АСТ',
      'Провести пробу на чувствительность к ивермектину',
      'Назначить половинную дозу и наблюдать',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'У колли и родственных пород мутация MDR-1 приводит к дефекту P-гликопротеина, обеспечивающего гематоэнцефалический барьер. Тест позволяет выявить гомозиготных и гетерозиготных носителей.',
  },
];

// ===== ХИРУРГИЯ =====
const surgeryQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'su_b1', topicId: 'surgery', topicName: 'Хирургия',
    question: 'Какой шовной материал рассасывается в организме быстрее всего?',
    options: ['Катгут', 'Викрил (полиглактин 910)', 'Нейлон', 'Пролен'],
    correctIndex: 1, difficulty: 'beginner',
    explanation: 'Викрил теряет 50% прочности через 14 дней и полностью рассасывается за 60-90 дней. Катгут рассасывается быстрее, но вызывает более выраженную тканевую реакцию.',
  },
  {
    id: 'su_b2', topicId: 'surgery', topicName: 'Хирургия',
    question: 'Какой метод стерилизации хирургических инструментов является наиболее надёжным?',
    options: ['Автоклавирование', 'Кипячение', 'Обработка спиртом', 'Обработка хлоргексидином'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Автоклавирование (стерилизация паром под давлением при 121°C, 15 минут) обеспечивает уничтожение всех микроорганизмов, включая споры.',
  },
  {
    id: 'su_b3', topicId: 'surgery', topicName: 'Хирургия',
    question: 'Что такое асептика в хирургии?',
    options: [
      'Комплекс мероприятий по предупреждению попадания микроорганизмов в рану',
      'Комплекс мероприятий по уничтожению микроорганизмов в ране',
      'Метод обезболивания',
      'Способ обработки швов',
    ],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Асептика — предупреждение заражения (профилактика), антисептика — уничтожение уже попавших микроорганизмов. Это фундаментальные понятия хирургии.',
  },
  // Intermediate
  {
    id: 'su_i1', topicId: 'surgery', topicName: 'Хирургия',
    question: 'При лапаротомии у коровы для доступа к сетке выполняют разрез в области:',
    options: ['Левого подреберья по линии молочной вены', 'Правого подреберья', 'Паралюмбального участка слева', 'Срединной линии'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Сетка расположена в левом подреберье, поэтому доступ к ней осуществляется через разрез параллельно рёберной дуге слева, по линии молочной вены.',
  },
  {
    id: 'su_i2', topicId: 'surgery', topicName: 'Хирургия',
    question: 'При наложении кишечного анастомоза по типу «конец в конец» какой слой кишечной стенки прошивается последним?',
    options: ['Серозный', 'Подслизистый', 'Мышечный', 'Слизистый'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'При двухрядном шве сначала сшивают слизистый и подслизистый слои (внутренний шов), затем серозно-мышечный (наружный шов). Серозный слой обеспечивает герметичность.',
  },
  // Advanced
  {
    id: 'su_a1', topicId: 'surgery', topicName: 'Хирургия',
    question: 'У собаки с разрывом клювовидной связки и нестабильностью плечевого сустава показана реконструкция. Какой метод обеспечивает наилучший долгосрочный результат?',
    options: [
      'Латеральная имбрикация с использованием фиксирующей ленты (TightRope)',
      'Только консервативное лечение',
      'Простая капсулорафия',
      'Экзартикуляция плечевого сустава',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Техника TightRope с имплантом из сверхвысокомолекулярного полиэтилена обеспечивает стабилизацию, имитирующую функцию клювовидной связки с минимальной инвазивностью.',
  },
  {
    id: 'su_a2', topicId: 'surgery', topicName: 'Хирургия',
    question: 'При кесаревом сечении у свиньи какой доступ предпочтителен для минимизации послеоперационных осложнений?',
    options: [
      'Боковой разрез в области левого фланка',
      'Срединный разрез белой линии',
      'Парамедианный доступ справа',
      'Вагинальный доступ',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Боковой фланговый доступ у свиней снижает риск расхождения швов белой линии и инфицирования, так как свиньи часто лежат на животе, создавая натяжение срединного рубца.',
  },
];

// ===== ДИАГНОСТИКА =====
const diagnosticsQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'di_b1', topicId: 'diagnostics', topicName: 'Диагностика',
    question: 'Какой показатель общего анализа крови отражает воспалительный процесс?',
    options: ['Лейкоциты', 'Эритроциты', 'Тромбоциты', 'Гемоглобин'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Лейкоцитоз (повышение количества лейкоцитов) — характерный признак воспаления. При этом важно учитывать и лейкоцитарную формулу (сдвиг влево).',
  },
  {
    id: 'di_b2', topicId: 'diagnostics', topicName: 'Диагностика',
    question: 'На рентгенограмме грудной клетки собаки обнаружено затемнение в диафрагмальном куполе справа. Это может указывать на:',
    options: ['Пневмонию правой доли', 'Пневмоторакс', 'Лёгочную эмфизему', 'Перикардит'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Альвеолярный паттерн (затемнение) в диафрагмальном куполе характерен для консолидации лёгочной ткани, что наиболее часто связано с пневмонией.',
  },
  {
    id: 'di_b3', topicId: 'diagnostics', topicName: 'Диагностика',
    question: 'Что показывает биохимический анализ крови при подозрении на заболевание печени?',
    options: [
      'Уровень АЛТ, АСТ, щелочной фосфатазы, билирубина',
      'Уровень креатинина и мочевины',
      'Уровень глюкозы и гликированного гемоглобина',
      'Уровень натрия и калия',
    ],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'АЛТ и АСТ — маркеры цитолиза гепатоцитов, ЩФ — маркер холестаза, билирубин — маркер экскреторной функции печени.',
  },
  // Intermediate
  {
    id: 'di_i1', topicId: 'diagnostics', topicName: 'Диагностика',
    question: 'При УЗИ брюшной полости кошки обнаружена эхогенная структура с акустической тенью в просвете жёлчного пузыря. Наиболее вероятный диагноз:',
    options: ['Жёлчные конкременты', 'Жёлчный полип', 'Слизистая пробка', 'Опухоль жёлчного пузыря'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Эхогенная структура с акустической тенью — классический УЗИ-признак камня (конкремента). Акустическая тень возникает из-за полного поглощения ультразвука кальцинатами.',
  },
  {
    id: 'di_i2', topicId: 'diagnostics', topicName: 'Диагностика',
    question: 'У собаки на ЭКГ выявлено отсутствие зубца P и нерегулярный ритм с различными интервалами RR. Это характерно для:',
    options: ['Фибрилляции предсердий', 'Синусовой аритмии', 'Атриовентрикулярной блокады II степени', 'Предсердной экстрасистолии'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Фибрилляция предсердий характеризуется отсутствием чётких зубцов P (f-волны), абсолютно нерегулярными интервалами RR и наличием случайного QRS комплекса.',
  },
  // Advanced
  {
    id: 'di_a1', topicId: 'diagnostics', topicName: 'Диагностика',
    question: 'При КТ грудной полости собаки обнаружено множественное «матовое стекло» с диффузным утолщением междольковых перегородок и кистозными изменениями. Дифференциальный диагноз включает:',
    options: [
      'Идиопатический лёгочный фиброз, пневмоцистную пневмонию или метастатический карциноматоз лимфатических сосудов',
      'Только бактериальную пневмонию',
      'Пневмоторакс и буллёзную эмфизему',
      'Плевральный выпот и диафрагмальную грыжу',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Синдром «матового стекла» с междольковым утолщением и кистами (синдром «безумной мозаики») характерен для интерстициальных заболеваний лёгких и требует дифференциальной диагностики.',
  },
];

// ===== ТЕРАПИЯ =====
const therapyQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'th_b1', topicId: 'therapy', topicName: 'Терапия',
    question: 'Основной симптом острого гастрита у собак — это:',
    options: ['Рвота', 'Диарея', 'Кашель', 'Лимфаденопатия'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Рвота — ведущий клинический признак острого гастрита. При хроническом гастрите к рвоте могут присоединяться абдоминальная боль, анорексия и потеря веса.',
  },
  {
    id: 'th_b2', topicId: 'therapy', topicName: 'Терапия',
    question: 'Какой препарат является препаратом выбора при острой сердечной недостаточности у собак?',
    options: ['Фуросемид', 'Преднизолон', 'Амоксициллин', 'Диметикон'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Фуросемид (диуретик) быстро снижает preload за счёт выведения натрия и воды, уменьшая отёк лёгких при застойной сердечной недостаточности.',
  },
  // Intermediate
  {
    id: 'th_i1', topicId: 'therapy', topicName: 'Терапия',
    question: 'У собаки диагностирован синдром Кушинга (гиперадренокортицизм). Какой диагностический тест является наиболее специфичным?',
    options: ['Тест с низкими дозами дексаметазона', 'Общий анализ крови', 'Анализ мочи на белок', 'Рентгенография'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Тест с низкими дозами дексаметазона: при АКТГ-зависимом синдроме Кушинга кортизол не подавляется, а при АКТГ-независимом (опухоль надпочечника) — подавляется.',
  },
  {
    id: 'th_i2', topicId: 'therapy', topicName: 'Терапия',
    question: 'У кошки с хронической почечной недостаточностью уровень фосфора повышен до 7 мг/дл. Какой препарат показан?',
    options: ['Карбонат кальция или алюминиевый гель', 'Фуросемид', 'Преднизолон', 'Левотироксин'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Фосфат-биндеры (связыватели фосфора) такие как карбонат кальция предотвращают всасывание фосфора в кишечнике, что критически важно при ХПН для замедления уремии.',
  },
  // Advanced
  {
    id: 'th_a1', topicId: 'therapy', topicName: 'Терапия',
    question: 'У собаки с дилатационной кардиомиопатией и фибрилляцией предсердий назначена пимобендан в комбинации с дигоксином. Какой механизм действия пимобендана дополняет дигоксин?',
    options: [
      'Инотропный положительный эффект через сенсибилизацию тропонина C к кальцию + вазодилатация',
      'Бета-адренергическая стимуляция',
      'Блокада натриевых каналов',
      'Ингибирование АПФ',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Пимобендан (инодилатор) — единственный препарат с двойным механизмом: положительный инотропный эффект (через Ca2+-сенсибилизацию) и вазодилатация, что снижает постнагрузку.',
  },
  {
    id: 'th_a2', topicId: 'therapy', topicName: 'Терапия',
    question: 'У коровы диагностирован травматический ретикулоперитонит. Какой рентгенологический признак подтверждает диагноз?',
    options: [
      'Наличие инородного тела с линейной плотностью в области сетки',
      'Увеличение тени сердца',
      'Газ в porta hepatis',
      'Спленомегалия',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Металлические предметы (проволока, гвозди) видны на рентгенограмме как линейные структуры повышенной плотности. Для подтверждения перитонита — УЗИ с обнаружением жидкости.',
  },
];

// ===== ПАРАЗИТОЛОГИЯ =====
const parasitologyQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'pa_b1', topicId: 'parasitology', topicName: 'Паразитология',
    question: 'Какой препарат чаще всего используется для дегельминтизации собак и кошек?',
    options: ['Пирантел', 'Амоксициллин', 'Кетоконазол', 'Диклофенак'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Пирантел — антигельминтный препарат, действующий на круглых гельминтов (токсокароз, анкилостомоз) путём вызова нервно-мышечной блокады паразита.',
  },
  {
    id: 'pa_b2', topicId: 'parasitology', topicName: 'Паразитология',
    question: 'Клещевой паралич у собак вызывается:',
    options: ['Слюной некоторых видов иксодовых клещей', 'Укусом комара', 'Заражением бактерией Borrelia', 'Инвазией гельминтов'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Нейротоксин в слюне самок клещей Dermacentor и Ixodes вызывает восходящий флакцидный паралич. Удаление клеща обычно приводит к выздоровлению.',
  },
  // Intermediate
  {
    id: 'pa_i1', topicId: 'parasitology', topicName: 'Паразитология',
    question: 'У собаки обнаружены единичные анемичные эритроциты в мазке крови и положительная реакция на бабезиоз (BABESIA). Какой основной переносчик?',
    options: ['Клещ Rhipicephalus sanguineus', 'Комар Anopheles', 'Блоха Ctenocephalides', 'Муха Stomoxys'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Rhipicephalus sanguineus (бурый собачий клещ) — основной переносчик Babesia canis. Передача происходит трансовариально и трансстадиально.',
  },
  {
    id: 'pa_i2', topicId: 'parasitology', topicName: 'Паразитология',
    question: 'Для диагностики саркоптоза у свиней наиболее информативен метод:',
    options: ['Глубокие соскобы кожи с периферии поражённых участков', 'Общий анализ крови', 'Рентгенография', 'УЗИ кожи'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Sarcoptes scabiei var. suis обитает в глубоких слоях эпидермиса, поэтому поверхностные соскобы неинформативны. Необходимы глубокие соскобы до появления капиллярного кровотечения.',
  },
  // Advanced
  {
    id: 'pa_a1', topicId: 'parasitology', topicName: 'Паразитология',
    question: 'У коровы diagnosed неоцеркоз (Setaria). Какой патогенетический механизм вызывает клинические проявления?',
    options: [
      'Миграция неполовозрелых нематод через спинномозговой канал вызывает повреждение мозговых оболочек',
      'Выделение токсинов взрослыми особями в кишечнике',
      'Механическое повреждение печени при миграции',
      'Аллергическая реакция на антигены паразита',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Setaria labiatopapillosa — нитевидная нематода, чьи личинки мигрируют через ЦНС крупного рогатого скота, вызывая симптомы оглушения, круговых движений и парезов.',
  },
];

// ===== ЭПИЗООТОЛОГИЯ =====
const epizootologyQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'ep_b1', topicId: 'epizootology', topicName: 'Эпизоотология',
    question: 'Ящур — это высококонтагиозное заболевание, которое поражает:',
    options: ['КРС, свиней, овец, коз', 'Только собак и кошек', 'Только птиц', 'Только лошадей'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Ящур (FMD) поражает парнокопытных животных: КРС, свиней, овец, коз. Характеризуется афтозными поражениями слизистой рта, кожи вымени и межкопытцевой щели.',
  },
  {
    id: 'ep_b2', topicId: 'epizootology', topicName: 'Эпизоотология',
    question: 'Какая вакцинация считается обязательной для собак в России?',
    options: ['Бешенство', 'Парвовирус', 'Короновирус', 'Лептоспироз'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Вакцинация против бешенства обязательна по закону для всех собак и кошек. Бешенство — зоонозное заболевание, смертельное для животных и человека.',
  },
  // Intermediate
  {
    id: 'ep_i1', topicId: 'epizootology', topicName: 'Эпизоотология',
    question: 'Хозяйство объявлено неблагополучным по ящуру. Какой карантинный срок устанавливается после последнего случая выздоровления или убоя?',
    options: ['21 день', '3 дня', '6 месяцев', '1 год'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Карантин по ящуру снимается через 21 день после последнего случая выздоровления, убоя больного животного или ликвидации очага с проведением заключительных мероприятий.',
  },
  {
    id: 'ep_i2', topicId: 'epizootology', topicName: 'Эпизоотология',
    question: 'Какой тип вакцины используется для профилактики чумы плотоядных?',
    options: ['Модифицированная живая вакцина', 'Инактивированная цельновирионная', 'Субъединичная', 'РНК-вакцина'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Для профилактики чумы собак применяются модифицированные живые вакцины (штамм «Ондерстепоорт» и др.), создающие стойкий иммунитет минимум на 1 год.',
  },
  // Advanced
  {
    id: 'ep_a1', topicId: 'epizootology', topicName: 'Эпизоотология',
    question: 'При проведении дезинфекции в очаге сибирской язвы разрешено использовать только препараты с активностью против:',
    options: ['Спор Bacillus anthracis', 'Вегетативных форм бактерий', 'Вирусов', 'Грибов'],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Споры сибирской язвы исключительно устойчивы во внешней среде (сохраняются до 100 лет). Для их уничтожения используют 10% раствор едкого натра при нагревании или 4% раствор формальдегида.',
  },
];

// ===== АКУШЕРСТВО =====
const obstetricsQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'ob_b1', topicId: 'obstetrics', topicName: 'Акушерство и гинекология',
    question: 'Средняя продолжительность беременности у собак составляет:',
    options: ['63 дня', '30 дней', '120 дней', '280 дней'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Беременность у собак длится в среднем 63 дня (58-68 дней). Диагностику беременности целесообразно проводить с 28-го дня УЗИ.',
  },
  {
    id: 'ob_b2', topicId: 'obstetrics', topicName: 'Акушерство и гинекология',
    question: 'Какой гормон используется для индукции родов у коровы при перенашивании?',
    options: ['Динопрост (PGF2-альфа)', 'Окситоцин', 'Пролактин', 'Эстроген'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Динопрост (простагландин F2-альфа) вызывает лютеолиз и индуцирует родовую деятельность. Окситоцин используется для усиления схваток, но не для индукции.',
  },
  // Intermediate
  {
    id: 'ob_i1', topicId: 'obstetrics', topicName: 'Акушерство и гинекология',
    question: 'У коровы через 72 часа после отёла температура 39.8°C, снижение аппетита, болезненность матки при ректальном исследовании. Наиболее вероятный диагноз:',
    options: ['Метрит', 'Мастит', 'Кетоз', 'Гипокальциемия'],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Метрит (послеродовое воспаление матки) — частое осложнение у коров. Температура 39.8°C, анорексия и болезненность матки — классическая триада симптомов.',
  },
  // Advanced
  {
    id: 'ob_a1', topicId: 'obstetrics', topicName: 'Акушерство и гинекология',
    question: 'У свиньи диагностирована задержка последа через 6 часов после родов. Какой метод лечения предпочтителен?',
    options: [
      'Внутриматочное введение окситоцина + антибиотиков, при неэффективности — ручное отделение',
      'Только ожидание (самостоятельное отторжение)',
      'Экстирпация матки',
      'Немедленная гистерэктомия',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'Начинают с консервативного лечения: окситоцин стимулирует сокращения матки. Антибиотики предотвращают септические осложнения. Ручное отделение — при неэффективности консервативной терапии.',
  },
  {
    id: 'ob_a2', topicId: 'obstetrics', topicName: 'Акушерство и гинекология',
    question: 'При трансабдоминальном УЗИ коровы на 45-й день беременности визуализируется:',
    options: [
      'Амниотическая жидкость с эмбрионом, наличие сердцебиения, длиной около 2.5-3 см',
      'Только усиление кровотока в маточных артериях',
      'Пустой рог матки',
      'Множественные фолликулы',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'На 40-50 день УЗИ надёжно диагностирует беременность: эмбрион длиной 2-3 см с чётким сердцебиением, окружённый амниотической жидкостью. Ранние потери редки после 30-го дня.',
  },
];

// ===== ГЕМАТОЛОГИЯ =====
const hematologyQuestions: QuestionBankItem[] = [
  // Beginner
  {
    id: 'he_b1', topicId: 'hematology', topicName: 'Анемия и болезни крови',
    question: 'Какой тип анемии чаще всего встречается у собак при инвазии анкилостомами?',
    options: ['Железодефицитная (микроцитарная гипохромная)', 'Гемолитическая', 'Апластическая', 'В12-дефицитная'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Анкилостомы питаются кровью хозяина, вызывая хроническую кровопотерю. Это приводит к потере железа и развитию микроцитарной гипохромной анемии.',
  },
  {
    id: 'he_b2', topicId: 'hematology', topicName: 'Анемия и болезни крови',
    question: 'Время кровотечения (по Дьюку) оценивает:',
    options: ['Первичный гемостаз (сосудисто-тромбоцитарный)', 'Вторичный гемостаз (коагуляционный)', 'Фибринолиз', 'Тромбоэластичность'],
    correctIndex: 0, difficulty: 'beginner',
    explanation: 'Тест по Дьюку (время кровотечения из стандартного надреза) отражает функцию тромбоцитов и сосудистой стенки — то есть первичный гемостаз.',
  },
  // Intermediate
  {
    id: 'he_i1', topicId: 'hematology', topicName: 'Анемия и болезни крови',
    question: 'У собаки с аутоиммунной гемолитической анемией (АИГА) обнаружен положительный тест Кумбса. Что это означает?',
    options: [
      'На поверхности эритроцитов присутствуют аутоантитела или комплемент',
      'В крови circulating иммунные комплексы',
      'Обнаружены антитела к ДНК',
      'В сыворотке повышен уровень IgE',
    ],
    correctIndex: 0, difficulty: 'intermediate',
    explanation: 'Прямой тест Кумбса выявляет антитела или комплемент, фиксированные на мембране эритроцитов. Положительный результат подтверждает иммунную природу гемолиза.',
  },
  // Advanced
  {
    id: 'he_a1', topicId: 'hematology', topicName: 'Анемия и болезни крови',
    question: 'У кошки с подозрением на ДВС-синдром (диссиминированное внутрисосудистое свёртывание) какие лабораторные изменения наиболее специфичны?',
    options: [
      'Тромбоцитопения + повышение D-димера + удлинение ПТВ + снижение фибриногена',
      'Только повышение лейкоцитов',
      'Только анемия',
      'Увеличение гематокрита',
    ],
    correctIndex: 0, difficulty: 'advanced',
    explanation: 'ДВС-синдром — патологическая активация коагуляции с потреблением факторов и тромбоцитов. Тромбоцитопения, D-димер, удлинённое ПТВ и гипофибриногенемия — классическая тетрада.',
  },
];

// ===== СОБРАННЫЙ БАНК =====
export const QUESTION_BANK: QuestionBankItem[] = [
  ...pharmacologyQuestions,
  ...surgeryQuestions,
  ...diagnosticsQuestions,
  ...therapyQuestions,
  ...parasitologyQuestions,
  ...epizootologyQuestions,
  ...obstetricsQuestions,
  ...hematologyQuestions,
];

// ===== УТИЛИТЫ =====

/**
 * Получить вопросы для входного тестирования (Placement Test)
 * Берёт 15 вопросов: 5 beginner, 5 intermediate, 5 advanced — случайно перемешанные
 */
export function getPlacementQuestions(count: number = 15): AssessmentQuestion[] {
  const beginner = QUESTION_BANK.filter(q => q.difficulty === 'beginner');
  const intermediate = QUESTION_BANK.filter(q => q.difficulty === 'intermediate');
  const advanced = QUESTION_BANK.filter(q => q.difficulty === 'advanced');

  const perLevel = Math.ceil(count / 3);

  const selected: QuestionBankItem[] = [];
  selected.push(...shuffleArray(beginner).slice(0, perLevel));
  selected.push(...shuffleArray(intermediate).slice(0, perLevel));
  selected.push(...shuffleArray(advanced).slice(0, count - selected.length));

  return shuffleArray(selected).slice(0, count);
}

/**
 * Определить уровень студента на основе результатов Placement Test
 * Возвращает уровень и детальную разбивку
 */
export function determineLevel(
  questions: AssessmentQuestion[],
  answers: (number | null)[]
): {
  level: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  beginnerScore: number;
  intermediateScore: number;
  advancedScore: number;
  weakTopics: string[];
  strongTopics: string[];
  detailedStats: Record<string, { correct: number; total: number; topicName: string }>;
} {
  const stats: Record<string, { correct: number; total: number; topicName: string }> = {};
  let beginnerCorrect = 0;
  let beginnerTotal = 0;
  let intermediateCorrect = 0;
  let intermediateTotal = 0;
  let advancedCorrect = 0;
  let advancedTotal = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const bankQ = QUESTION_BANK.find(bq => bq.id === q.id);
    if (!bankQ || answers[i] === null) continue;

    const topic = q.topicId;
    if (!stats[topic]) {
      stats[topic] = { correct: 0, total: 0, topicName: q.topicName };
    }
    stats[topic].total++;
    if (answers[i] === q.correctIndex) {
      stats[topic].correct++;
    }

    if (bankQ.difficulty === 'beginner') {
      beginnerTotal++;
      if (answers[i] === q.correctIndex) beginnerCorrect++;
    } else if (bankQ.difficulty === 'intermediate') {
      intermediateTotal++;
      if (answers[i] === q.correctIndex) intermediateCorrect++;
    } else {
      advancedTotal++;
      if (answers[i] === q.correctIndex) advancedCorrect++;
    }
  }

  const totalCorrect = beginnerCorrect + intermediateCorrect + advancedCorrect;
  const totalQuestions = beginnerTotal + intermediateTotal + advancedTotal;
  const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const beginnerScore = beginnerTotal > 0 ? Math.round((beginnerCorrect / beginnerTotal) * 100) : 0;
  const intermediateScore = intermediateTotal > 0 ? Math.round((intermediateCorrect / intermediateTotal) * 100) : 0;
  const advancedScore = advancedTotal > 0 ? Math.round((advancedCorrect / advancedTotal) * 100) : 0;

  // Алгоритм определения уровня
  let level: 'beginner' | 'intermediate' | 'advanced';

  if (score >= 80 && advancedScore >= 60) {
    level = 'advanced';
  } else if (score >= 50 && intermediateScore >= 50) {
    level = 'intermediate';
  } else {
    level = 'beginner';
  }

  // Определяем слабые и сильные темы
  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  for (const [topicId, topicStats] of Object.entries(stats)) {
    const pct = topicStats.total > 0 ? Math.round((topicStats.correct / topicStats.total) * 100) : 0;
    if (pct < 50) {
      weakTopics.push(topicStats.topicName);
    } else if (pct >= 80) {
      strongTopics.push(topicStats.topicName);
    }
  }

  return {
    level,
    score,
    beginnerScore,
    intermediateScore,
    advancedScore,
    weakTopics,
    strongTopics,
    detailedStats: stats,
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Получить статические вопросы по конкретной теме для быстрой проверки (без ИИ)
 */
export function getStaticQuestionsForTopic(
  topicId: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  count: number = 5
): AssessmentQuestion[] {
  const filtered = QUESTION_BANK.filter(
    q => q.topicId === topicId && q.difficulty === difficulty
  );
  return shuffleArray(filtered).slice(0, count);
}
