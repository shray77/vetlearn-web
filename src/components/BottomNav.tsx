'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Brain, Stethoscope, Mic, Lightbulb, PawPrint,
  Info, BarChart3, Layers, GraduationCap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Главная', icon: PawPrint },
  { id: 'learning', label: 'Обучение', icon: BookOpen },
  { id: 'cases', label: 'Кейсы', icon: Stethoscope },
  { id: 'tutor', label: 'Репетитор', icon: Mic },
  { id: 'flashcards', label: 'Карточки', icon: Layers },
  { id: 'exam', label: 'Экзамен', icon: GraduationCap },
  { id: 'resources', label: 'Ресурсы', icon: Lightbulb },
  { id: 'about', label: 'О проекте', icon: Info },
];

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
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <Layers className="w-4 h-4 text-[#28CD41] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Карточки</p>
                  <p className="text-[11px] text-muted-foreground">AI-генерированные карточки с терминами и определениями для быстрого запоминания</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50">
                <GraduationCap className="w-4 h-4 text-[#E74C3C] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-xs">Экзамен</p>
                  <p className="text-[11px] text-muted-foreground">AI-экзаменатор в формате устного экзамена с оценкой свободных ответов</p>
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
            <p className="text-xs text-center text-muted-foreground">
              🏆 Создано для конкурса «Центр-инвест»
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BottomNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
        <div className="max-w-4xl mx-auto flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'about') {
                    setAboutOpen(true);
                  } else {
                    onTabChange(item.id);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 ${
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
        </div>
      </nav>
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}
