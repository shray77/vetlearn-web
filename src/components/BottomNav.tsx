'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Stethoscope, Mic, Lightbulb, PawPrint,
  Info, BarChart3, Layers, GraduationCap, Grid3X3, Activity,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// ===== MAIN TABS (always visible in bottom bar) =====
const MAIN_TABS = [
  { id: 'dashboard', label: 'Главная', icon: PawPrint },
  { id: 'learning', label: 'Обучение', icon: BookOpen },
  { id: 'cases', label: 'Кейсы', icon: Stethoscope },
  { id: 'tutor', label: 'Репетитор', icon: Mic },
];

// ===== EXTRA TABS (in "Ещё" sheet) =====
const EXTRA_TABS = [
  { id: 'flashcards', label: 'Карточки', icon: Layers, color: '#28CD41', desc: 'Термин ↔ определение + интервальное повторение' },
  { id: 'mindmap', label: 'Карта знаний', icon: BarChart3, color: '#007AFF', desc: 'AI интеллект-карты по темам' },
  { id: 'exam', label: 'Экзамен', icon: GraduationCap, color: '#E74C3C', desc: 'Устный ИИ-экзамен' },
  { id: 'resources', label: 'Ресурсы', icon: Lightbulb, color: '#FF9500', desc: 'Учебные материалы' },
  { id: 'simulator', label: 'Симулятор', icon: Activity, color: '#5856D6', desc: 'Практика: осмотр, диагноз, лечение' },
];

// ===== ABOUT MODAL =====
function AboutModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-[#28CD41]" />
            О VetLearn AI
          </DialogTitle>
          <DialogDescription>AI-платформа для обучения ветеринарной медицине</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Что такое VetLearn AI?</h4>
            <p className="text-muted-foreground leading-relaxed">
              VetLearn AI — это платформа персонализированного обучения ветеринарной медицине,
              использующая искусственный интеллект для адаптации учебного процесса под каждого студента.
              Система анализирует ваши знания и предлагает оптимальный путь обучения.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Модули платформы</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <BookOpen className="w-4 h-4 text-[#28CD41] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Тестирование</p>
                  <p className="text-[11px] text-muted-foreground">Адаптивные тесты по всем ветеринарным дисциплинам с AI-генерацией вопросов</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <Stethoscope className="w-4 h-4 text-[#007AFF] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Клинические кейсы</p>
                  <p className="text-[11px] text-muted-foreground">Уникальные клинические случаи с пошаговым разбором и обратной связью</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <Mic className="w-4 h-4 text-[#AF52DE] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Репетитор</p>
                  <p className="text-[11px] text-muted-foreground">Голосовой AI-помощник для объяснения сложных ветеринарных концепций</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <Layers className="w-4 h-4 text-[#28CD41] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Карточки + SM-2</p>
                  <p className="text-[11px] text-muted-foreground">AI-карточки с интервальным повторением, сканирование конспектов</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <BarChart3 className="w-4 h-4 text-[#007AFF] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Интеллект-карты</p>
                  <p className="text-[11px] text-muted-foreground">AI создаёт иерархические карты знаний по ветеринарным темам</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <GraduationCap className="w-4 h-4 text-[#E74C3C] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Экзамен</p>
                  <p className="text-[11px] text-muted-foreground">AI-экзаменатор в формате устного экзамена с оценкой свободных ответов</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <Lightbulb className="w-4 h-4 text-[#FF9500] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Ресурсы</p>
                  <p className="text-[11px] text-muted-foreground">Персонализированные учебные материалы и рекомендации на основе знаний</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <BarChart3 className="w-4 h-4 text-[#FF3B30] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Карта знаний</p>
                  <p className="text-[11px] text-muted-foreground">Визуализация уровня знаний по всем дисциплинам в виде радарной диаграммы</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">AI-обучение</h4>
            <p className="text-muted-foreground leading-relaxed">
              Платформа использует искусственный интеллект для персонализации обучения:
              генерация уникальных вопросов, анализ ошибок, построение индивидуального
              плана обучения и адаптация сложности материалов под ваш уровень.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#28CD41]/5 border border-[#28CD41]/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#28CD41]/15 text-[#28CD41] border border-[#28CD41]/25">
                v0.2.0-beta
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">Версия в разработке</span>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Создано для конкурса «Центр-инвест»
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== MAIN NAVIGATION =====
export function BottomNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isExtraTabActive = EXTRA_TABS.some(t => t.id === activeTab);

  const handleTabClick = (tabId: string) => {
    setMoreOpen(false);
    if (tabId === 'about') {
      setAboutOpen(true);
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
        <div className="max-w-4xl mx-auto flex items-center justify-around h-16 px-2">
          {/* 4 main tabs */}
          {MAIN_TABS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-[#28CD41]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#28CD41]"
                    />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* "Ещё" button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all duration-200 ${
              isExtraTabActive
                ? 'text-[#007AFF]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <Grid3X3 className={`w-5 h-5 transition-transform duration-200 ${isExtraTabActive ? 'scale-110' : ''}`} />
              {isExtraTabActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#007AFF]"
                />
              )}
            </div>
            <span className={`text-[10px] font-medium ${isExtraTabActive ? 'font-semibold text-[#007AFF]' : ''}`}>
              Ещё
            </span>
          </button>
        </div>
      </nav>

      {/* "Ещё" bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] px-4 pb-12">
          <SheetHeader className="text-left mb-2">
            <SheetTitle className="text-base">Разделы</SheetTitle>
            <SheetDescription className="text-xs">
              Выберите раздел для перехода
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-2">
            {EXTRA_TABS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all duration-200 ${
                    isActive
                      ? 'border-[#007AFF]/30 bg-[#007AFF]/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted active:scale-[0.98]'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  {isActive && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF] shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Divider + About */}
            <div className="border-t border-border/50 my-1" />

            <button
              onClick={() => { setMoreOpen(false); setAboutOpen(true); }}
              className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">О проекте</p>
                <p className="text-[11px] text-muted-foreground">Информация о VetLearn AI</p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}
