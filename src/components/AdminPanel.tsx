'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Crown, Minus, Plus, Wand2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile, addXP, updateSkillMap, setSkillMap, clearAllData } = useStore();
  const [level, setLevel] = useState(profile.level);
  const [xpInput, setXpInput] = useState(String(profile.xp));
  const [streakInput, setStreakInput] = useState(String(profile.streak));

  const handleSetLevel = () => {
    const newXP = (level - 1) * 100;
    updateProfile({ level, xp: newXP, xpToNext: 100 });
    setXpInput(String(newXP));
    toast.success(`Уровень: ${level}`);
  };

  const handleSetXP = () => {
    const xp = parseInt(xpInput) || 0;
    const lvl = Math.floor(xp / 100) + 1;
    const toNext = lvl * 100 - xp;
    updateProfile({ xp, level: lvl, xpToNext: toNext > 0 ? toNext : 100 });
    setLevel(lvl);
    toast.success(`XP: ${xp}`);
  };

  const handleSetStreak = () => {
    const s = parseInt(streakInput) || 0;
    updateProfile({ streak: s });
    toast.success(`Серия: ${s}`);
  };

  const handleMaxSkills = () => {
    const fullMap: Record<string, number> = {};
    for (const t of VET_TOPICS) fullMap[t.id] = 100;
    setSkillMap(fullMap);
    toast.success('Все навыки: 100%');
  };

  const handleGodMode = () => {
    updateProfile({ level: 99, xp: 9900, xpToNext: 100, streak: 365, totalAnswers: 500, correctAnswers: 487, completedCases: 50, assessmentsCompleted: 42 });
    const fullMap: Record<string, number> = {};
    for (const t of VET_TOPICS) fullMap[t.id] = Math.floor(Math.random() * 30) + 70;
    setSkillMap(fullMap);
    setLevel(99); setXpInput('9900'); setStreakInput('365');
    toast.success('God Mode включён!');
  };

  const handleResetProgress = () => {
    clearAllData();
    toast.success('Прогресс сброшен');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-background rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background z-10 px-5 pt-4 pb-2 border-b">
          <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#FF9500]" />
              <h2 className="text-lg font-bold">Админ-панель</h2>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Секретная панель управления. 7 тапов по логотипу.</p>

          {/* God Mode */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-[#FF9500]/10 to-[#AF52DE]/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF9500]/20 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-[#FF9500]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">God Mode</h3>
                  <p className="text-[10px] text-muted-foreground">Уровень 99, максимальные навыки</p>
                </div>
              </div>
              <Button size="sm" className="h-8" onClick={handleGodMode}>Включить</Button>
            </CardContent>
          </Card>

          {/* Level */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Уровень (сейчас: {profile.level})</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLevel(Math.max(1, level - 1))}><Minus className="w-3 h-3" /></Button>
                <input
                  type="number" min="1" max="99" value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                  className="flex-1 h-8 text-center rounded-lg border bg-background text-sm"
                />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLevel(Math.min(99, level + 1))}><Plus className="w-3 h-3" /></Button>
                <Button size="sm" className="h-8" onClick={handleSetLevel}>ОК</Button>
              </div>
            </CardContent>
          </Card>

          {/* XP */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">XP (сейчас: {profile.xp})</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="99999" value={xpInput}
                  onChange={(e) => setXpInput(e.target.value)}
                  className="flex-1 h-8 px-3 rounded-lg border bg-background text-sm"
                />
                <Button size="sm" className="h-8" onClick={handleSetXP}>ОК</Button>
              </div>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Серия (сейчас: {profile.streak})</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="999" value={streakInput}
                  onChange={(e) => setStreakInput(e.target.value)}
                  className="flex-1 h-8 px-3 rounded-lg border bg-background text-sm"
                />
                <Button size="sm" className="h-8" onClick={handleSetStreak}>ОК</Button>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Навыки</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8" onClick={handleMaxSkills}>Все 100%</Button>
                <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => { updateProfile({ skillMap: {} }); toast.success('Навыки сброшены'); }}>Сбросить</Button>
              </div>
              <div className="mt-2 space-y-1">
                {VET_TOPICS.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="font-medium">{profile.skillMap[t.id] || 0}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Статистика</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Тестов пройдено</span><span>{profile.assessmentsCompleted}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Кейсов пройдено</span><span>{profile.completedCases}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Всего ответов</span><span>{profile.totalAnswers}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Правильных</span><span>{profile.correctAnswers}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Точность</span><span>{profile.totalAnswers > 0 ? Math.round((profile.correctAnswers / profile.totalAnswers) * 100) : 0}%</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Reset */}
          <Button variant="destructive" className="w-full h-10" onClick={handleResetProgress}>
            <Trash2 className="w-4 h-4 mr-2" /> Сбросить весь прогресс
          </Button>

          <div className="h-4" />
        </div>
      </motion.div>
    </motion.div>
  );
}
