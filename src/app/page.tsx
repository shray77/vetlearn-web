'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
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
import { OnboardingModal } from '@/components/OnboardingModal';
import { OSCEListTab } from '@/components/osce/OSCEListTab';
import { AtlasTab } from '@/components/atlas/AtlasTab';
import { getDueCardIds } from '@/lib/sm2';
import { toast } from 'sonner';

// ==================== MAIN APP ====================

export default function Home() {
  const { activeTab, setActiveTab, updateStreak, srCards, flashcards, notificationsEnabled, notificationPermission, lastReminderDate, setLastReminderDate, profile } = useStore();
  const mainRef = useRef<HTMLElement>(null);

  // FIX: Hydration guard — wait until zustand persist rehydrates from localStorage
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // useStore.persist.rehydrate() is synchronous after mount in zustand
    // Wait one tick to ensure the store has hydrated from localStorage
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) updateStreak();
  }, [hydrated, updateStreak]);

  // ===== Notification reminders on app open =====
  useEffect(() => {
    if (!hydrated) return;
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
  }, [hydrated, notificationsEnabled, notificationPermission, srCards, flashcards, lastReminderDate, setLastReminderDate, profile.streak, profile.streakLastDate]);

  // Auto-scroll to top when switching tabs
  useEffect(() => {
    if (mainRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  // Show nothing until hydrated to avoid SSR/client mismatch
  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 pb-20">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#28CD41] to-[#1FA833] flex items-center justify-center mx-auto mb-3 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paw-print w-5 h-5 text-white"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
              </div>
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            </div>
          </div>
        </main>
        <BottomNav activeTab="dashboard" onTabChange={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main ref={mainRef} className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 pb-24">
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
            {activeTab === 'osce' && <ErrorBoundary><OSCEListTab /></ErrorBoundary>}
            {activeTab === 'atlas' && <ErrorBoundary><AtlasTab /></ErrorBoundary>}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
      <OnboardingModal />
    </div>
  );
}
