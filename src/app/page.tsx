'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { DashboardTab } from '@/components/DashboardTab';
import { AdaptiveLearningTab } from '@/components/AdaptiveLearningTab';
import { ClinicalCasesTab } from '@/components/ClinicalCasesTab';
import { VoiceTutorTab } from '@/components/VoiceTutorTab';
import { MockExamTab } from '@/components/MockExamTab';
import { FlashcardsTab } from '@/components/FlashcardsTab';
import { ResourcesTab } from '@/components/ResourcesTab';
import { MindMapTab } from '@/components/MindMapTab';
import { SimulatorTab } from '@/components/simulator/SimulatorTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getDueCardIds } from '@/lib/sm2';
import { toast } from 'sonner';

// ==================== MAIN APP ====================

export default function Home() {
  const { activeTab, setActiveTab, updateStreak, srCards, flashcards, notificationsEnabled, notificationPermission, lastReminderDate, setLastReminderDate, profile } = useStore();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  // ===== Notification reminders on app open =====
  useEffect(() => {
    if (!notificationsEnabled || notificationPermission !== 'granted') return;

    const today = new Date().toISOString().split('T')[0];
    if (lastReminderDate === today) return; // Already shown today

    // Check for due SR cards
    const allIds = flashcards.map(c => c.id);
    const dueIds = getDueCardIds(srCards, allIds);

    // Check streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const streakAtRisk = profile.streakLastDate !== yesterdayStr && profile.streakLastDate !== today;

    if (dueIds.length > 0) {
      toast.info(`У вас ${dueIds.length} карточек к повторению!`, {
        description: 'Откройте Карточки, чтобы начать повторение',
        duration: 5000,
      });
      try {
        new Notification('VetLearn AI — Повторение', {
          body: `${dueIds.length} карточек ждут повторения. Не забудьте!`,
          icon: '/icon-192.png',
        });
      } catch {}
      setLastReminderDate(today);
    } else if (streakAtRisk && profile.streak > 0) {
      toast.warning('Серия под угрозой!', {
        description: 'Занимайтесь сегодня, чтобы не потерять серию',
        duration: 5000,
      });
      try {
        new Notification('VetLearn AI — Серия', {
          body: `Ваша серия ${profile.streak} дней под угрозой! Занимайтесь сегодня!`,
          icon: '/icon-192.png',
        });
      } catch {}
      setLastReminderDate(today);
    }
  }, [notificationsEnabled, notificationPermission, srCards, flashcards, lastReminderDate, setLastReminderDate, profile.streak, profile.streakLastDate]);

  // Auto-scroll to top when switching tabs
  useEffect(() => {
    if (mainRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main ref={mainRef} className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <ErrorBoundary><DashboardTab onNavigate={handleNavigate} /></ErrorBoundary>}
            {activeTab === 'learning' && <ErrorBoundary><AdaptiveLearningTab /></ErrorBoundary>}
            {activeTab === 'cases' && <ErrorBoundary><ClinicalCasesTab /></ErrorBoundary>}
            {activeTab === 'tutor' && <ErrorBoundary><VoiceTutorTab /></ErrorBoundary>}
            {activeTab === 'flashcards' && <ErrorBoundary><FlashcardsTab /></ErrorBoundary>}
            {activeTab === 'exam' && <ErrorBoundary><MockExamTab /></ErrorBoundary>}
            {activeTab === 'resources' && <ErrorBoundary><ResourcesTab /></ErrorBoundary>}
            {activeTab === 'mindmap' && <ErrorBoundary><MindMapTab /></ErrorBoundary>}
            {activeTab === 'simulator' && <ErrorBoundary><SimulatorTab /></ErrorBoundary>}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
    </div>
  );
}
