'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { DashboardTab } from '@/components/DashboardTab';
import { AdaptiveLearningTab } from '@/components/AdaptiveLearningTab';
import { ClinicalCasesTab } from '@/components/ClinicalCasesTab';
import { VoiceTutorTab } from '@/components/VoiceTutorTab';
import { ResourcesTab } from '@/components/ResourcesTab';

// ==================== MAIN APP ====================

export default function Home() {
  const { activeTab, setActiveTab, updateStreak } = useStore();

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardTab onNavigate={handleNavigate} />}
            {activeTab === 'learning' && <AdaptiveLearningTab />}
            {activeTab === 'cases' && <ClinicalCasesTab />}
            {activeTab === 'tutor' && <VoiceTutorTab />}
            {activeTab === 'resources' && <ResourcesTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
    </div>
  );
}
