import { VetTopic, SpeciesType, DifficultyType } from './types';

export const VET_TOPICS: VetTopic[] = [
  {
    id: 'pharmacology',
    name: 'Фармакология',
    icon: '',
    color: '#E87963',
    description: 'Антибиотики, НПВС, анестезия, антипаразитарные препараты',
    subtopics: [
      { id: 'antibiotics', name: 'Антибиотики', parentTopicId: 'pharmacology', description: 'Классификация, спектр действия, побочные эффекты', questionCount: 25 },
      { id: 'nsaid', name: 'НПВС', parentTopicId: 'pharmacology', description: 'Механизм действия, дозировки, противопоказания', questionCount: 15 },
      { id: 'anesthesia', name: 'Анестезия', parentTopicId: 'pharmacology', description: 'Препараты, протоколы, мониторинг', questionCount: 20 },
      { id: 'antiparasitic', name: 'Антипаразитарные', parentTopicId: 'pharmacology', description: 'Антигельминтные, инсектициды, акарициды', questionCount: 18 },
    ],
  },
  {
    id: 'surgery',
    name: 'Хирургия',
    icon: '',
    color: '#4ECDC4',
    description: 'Стерилизация, швы, ампутация, лапаротомия',
    subtopics: [
      { id: 'sterilization', name: 'Стерилизация', parentTopicId: 'surgery', description: 'Методы, подготовка инструментов, асептика', questionCount: 15 },
      { id: 'sutures', name: 'Швы', parentTopicId: 'surgery', description: 'Типы шовного материала, техники наложения', questionCount: 20 },
      { id: 'amputation', name: 'Ампутация', parentTopicId: 'surgery', description: 'Показания, техника, послеоперационный уход', questionCount: 10 },
      { id: 'laparotomy', name: 'Лапаротомия', parentTopicId: 'surgery', description: 'Доступы, техника, осложнения', questionCount: 12 },
    ],
  },
  {
    id: 'diagnostics',
    name: 'Диагностика',
    icon: '',
    color: '#45B7D1',
    description: 'Лабораторная, инструментальная, рентген, УЗИ',
    subtopics: [
      { id: 'lab_diag', name: 'Лабораторная диагностика', parentTopicId: 'diagnostics', description: 'ОАК, биохимия, мазки, посевы', questionCount: 25 },
      { id: 'instrumental', name: 'Инструментальная', parentTopicId: 'diagnostics', description: 'ЭКГ, ЭЭГ, эндоскопия', questionCount: 15 },
      { id: 'xray', name: 'Рентген', parentTopicId: 'diagnostics', description: 'Интерпретация снимков, техники', questionCount: 20 },
      { id: 'ultrasound', name: 'УЗИ', parentTopicId: 'diagnostics', description: 'Ультразвуковая диагностика различных органов', questionCount: 18 },
    ],
  },
  {
    id: 'therapy',
    name: 'Терапия',
    icon: '',
    color: '#96CEB4',
    description: 'Внутренние болезни: ЖКТ, дыхательная, мочевыделительная',
    subtopics: [
      { id: 'gastro', name: 'Болезни ЖКТ', parentTopicId: 'therapy', description: 'Гастрит, энтерит, колит, панкреатит', questionCount: 25 },
      { id: 'respiratory', name: 'Дыхательная система', parentTopicId: 'therapy', description: 'Пневмония, бронхит, астма', questionCount: 20 },
      { id: 'urinary', name: 'Мочевыделительная', parentTopicId: 'therapy', description: 'Нефрит, цистит, уролитиаз', questionCount: 18 },
      { id: 'cardiology', name: 'Кардиология', parentTopicId: 'therapy', description: 'Недостаточность, аритмии, миокардит', questionCount: 15 },
    ],
  },
  {
    id: 'parasitology',
    name: 'Паразитология',
    icon: '',
    color: '#F3EAD3',
    description: 'Гельминтозы, арахнозы, энтомозы, протозоозы',
    subtopics: [
      { id: 'helminthoses', name: 'Гельминтозы', parentTopicId: 'parasitology', description: 'Нематодозы, трематодозы, цестодозы', questionCount: 22 },
      { id: 'arachnoses', name: 'Арахнозы', parentTopicId: 'parasitology', description: 'Клещи, саркоптоз, демодекоз', questionCount: 18 },
      { id: 'entomoses', name: 'Энтомозы', parentTopicId: 'parasitology', description: 'Мухи, блохи, вши, оводы', questionCount: 15 },
      { id: 'protozooses', name: 'Протозоозы', parentTopicId: 'parasitology', description: 'Пироплазмоз, лейшманиоз, токсоплазмоз', questionCount: 20 },
    ],
  },
  {
    id: 'epizootology',
    name: 'Эпизоотология',
    icon: '',
    color: '#B9A5E3',
    description: 'Инфекционные болезни, карантин, вакцинация',
    subtopics: [
      { id: 'infectious', name: 'Инфекционные болезни', parentTopicId: 'epizootology', description: 'Чума, ящур, бешенство, сибирская язва', questionCount: 30 },
      { id: 'quarantine', name: 'Карантинные меры', parentTopicId: 'epizootology', description: 'Режимы, дезинфекция, ограничения', questionCount: 12 },
      { id: 'vaccination', name: 'Вакцинация', parentTopicId: 'epizootology', description: 'Схемы, типы вакцин, календарь прививок', questionCount: 18 },
    ],
  },
  {
    id: 'obstetrics',
    name: 'Акушерство и гинекология',
    icon: '',
    color: '#FFB6C1',
    description: 'Беременность, роды, послеродовой период',
    subtopics: [
      { id: 'pregnancy', name: 'Беременность', parentTopicId: 'obstetrics', description: 'Диагностика, осложнения, уход', questionCount: 18 },
      { id: 'parturition', name: 'Роды', parentTopicId: 'obstetrics', description: 'Нормальные и патологические роды', questionCount: 15 },
      { id: 'postpartum', name: 'Послеродовой период', parentTopicId: 'obstetrics', description: 'Осложнения, мастит, метрит', questionCount: 12 },
    ],
  },
  {
    id: 'hematology',
    name: 'Анемия и болезни крови',
    icon: '',
    color: '#B3261E',
    description: 'Анемии, лейкозы, коагулопатии',
    subtopics: [
      { id: 'anemia', name: 'Анемии', parentTopicId: 'hematology', description: 'Типы, диагностика, лечение', questionCount: 18 },
      { id: 'leukemia', name: 'Лейкозы', parentTopicId: 'hematology', description: 'Диагностика, классификация, терапия', questionCount: 12 },
      { id: 'coagulopathy', name: 'Коагулопатии', parentTopicId: 'hematology', description: 'Нарушения свёртываемости, терапия', questionCount: 14 },
    ],
  },
  {
    id: 'anatomy',
    name: 'Анатомия и физиология',
    icon: '',
    color: '#8A5A14',
    description: 'Опорно-двигательная, сердечно-сосудистая, пищеварительная, нервная системы',
    subtopics: [
      { id: 'musculoskeletal', name: 'Опорно-двигательная система', parentTopicId: 'anatomy', description: 'Кости, суставы, мышцы, связки', questionCount: 20 },
      { id: 'cardiovascular_anat', name: 'Сердечно-сосудистая система', parentTopicId: 'anatomy', description: 'Сердце, сосуды, кровообращение', questionCount: 18 },
      { id: 'digestive_anat', name: 'Пищеварительная система', parentTopicId: 'anatomy', description: 'Желудок, кишечник, печень, поджелудочная', questionCount: 18 },
      { id: 'nervous_anat', name: 'Нервная система', parentTopicId: 'anatomy', description: 'Головной и спинной мозг, периферические нервы', questionCount: 16 },
    ],
  },
  {
    id: 'pathophysiology',
    name: 'Патологическая физиология',
    icon: '',
    color: '#6D4FC4',
    description: 'Воспаление, гипоксия, шок, опухолевый рост',
    subtopics: [
      { id: 'inflammation', name: 'Воспаление и лихорадка', parentTopicId: 'pathophysiology', description: 'Медиаторы, фазы воспаления, местные и общие реакции', questionCount: 18 },
      { id: 'circulation_disorders', name: 'Нарушения кровообращения', parentTopicId: 'pathophysiology', description: 'Стаз, тромбоз, эмболия, кровотечения', questionCount: 16 },
      { id: 'hypoxia_shock', name: 'Гипоксия и шок', parentTopicId: 'pathophysiology', description: 'Виды гипоксии, патогенез шока, компенсаторные механизмы', questionCount: 16 },
      { id: 'neoplasia', name: 'Опухолевый рост', parentTopicId: 'pathophysiology', description: 'Бенigna и злокачественные опухоли, метастазирование', questionCount: 14 },
    ],
  },
  {
    id: 'microbiology',
    name: 'Микробиология',
    icon: '',
    color: '#2C3E50',
    description: 'Бактерии, вирусы, грибы, иммунитет',
    subtopics: [
      { id: 'bacteria', name: 'Бактерии и их свойства', parentTopicId: 'microbiology', description: 'Морфология, физиология, классификация', questionCount: 20 },
      { id: 'viruses', name: 'Вирусы', parentTopicId: 'microbiology', description: 'Строение, репликация, патогенность', questionCount: 18 },
      { id: 'fungi_protozoa', name: 'Грибы и простейшие', parentTopicId: 'microbiology', description: 'Микозы, патогенные простейшие', questionCount: 14 },
      { id: 'immunity', name: 'Иммунитет', parentTopicId: 'microbiology', description: 'Врождённый и адаптивный, вакцинальный иммунитет', questionCount: 18 },
    ],
  },
  {
    id: 'zoohygiene',
    name: 'Зоогигиена и кормление',
    icon: '',
    color: '#4C7A3F',
    description: 'Гигиена содержания, кормление, санитарные требования',
    subtopics: [
      { id: 'housing_hygiene', name: 'Гигиена содержания', parentTopicId: 'zoohygiene', description: 'Микроклимат, плотность посадки, параметры воздуха', questionCount: 16 },
      { id: 'animal_nutrition', name: 'Кормление животных', parentTopicId: 'zoohygiene', description: 'Нормы кормления, рационы, витамины', questionCount: 20 },
      { id: 'sanitary', name: 'Санитарные требования', parentTopicId: 'zoohygiene', description: 'Дезинфекция, дератизация, утилизация отходов', questionCount: 14 },
      { id: 'water_ventilation', name: 'Водоснабжение и вентиляция', parentTopicId: 'zoohygiene', description: 'Качество воды, системы вентиляции, требования', questionCount: 12 },
    ],
  },
];

export const SPECIES_OPTIONS: { value: SpeciesType; label: string; icon: string }[] = [
  { value: 'КРС', label: 'КРС', icon: '' },
  { value: 'МРС', label: 'МРС', icon: '' },
  { value: 'свиньи', label: 'Свиньи', icon: '' },
  { value: 'птица', label: 'Птица', icon: '' },
  { value: 'собаки', label: 'Собаки', icon: '' },
  { value: 'кошки', label: 'Кошки', icon: '' },
  { value: 'лошади', label: 'Лошади', icon: '' },
];

export const DIFFICULTY_OPTIONS: { value: DifficultyType; label: string; color: string }[] = [
  { value: 'beginner', label: 'Начинающий', color: '#4C7A3F' },
  { value: 'intermediate', label: 'Средний', color: '#B4531C' },
  { value: 'advanced', label: 'Продвинутый', color: '#B3261E' },
  { value: 'expert', label: 'Экспертный', color: '#6D4FC4' },
];

export function getTopicById(id: string): VetTopic | undefined {
  return VET_TOPICS.find(t => t.id === id);
}

export function getSubtopicById(topicId: string, subtopicId: string) {
  const topic = getTopicById(topicId);
  return topic?.subtopics.find(s => s.id === subtopicId);
}

export function getAllSubtopics(): { topicId: string; topicName: string; subtopicId: string; subtopicName: string }[] {
  const result: { topicId: string; topicName: string; subtopicId: string; subtopicName: string }[] = [];
  for (const topic of VET_TOPICS) {
    for (const sub of topic.subtopics) {
      result.push({
        topicId: topic.id,
        topicName: topic.name,
        subtopicId: sub.id,
        subtopicName: sub.name,
      });
    }
  }
  return result;
}
