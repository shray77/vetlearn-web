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
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ==================== MAIN APP ====================

export default function Home() {
  const { activeTab, setActiveTab, updateStreak } = useStore();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

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
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
    </div>
  );
}
