'use client';

import React, { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  PawPrint, Flame, Zap, Settings, Moon, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { profile, clearAllData } = useStore();
  const [adminOpen, setAdminOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    tapCountRef.current++;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      setAdminOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={handleLogoTap}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#28CD41] to-[#1FA833] flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">VetLearn AI</h1>
              <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Персонализированное обучение</p>
            </div>
          </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border/50 shrink-0">
            v0.2.0-beta
          </span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF3CD] dark:bg-[#3D3000] text-[#856404] dark:text-[#FFD666] text-xs font-medium">
            <Flame className="w-3 h-3" />
            <span>{profile.streak}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8F9EC] dark:bg-[#1A3D22] text-[#1FA833] dark:text-[#28CD41] text-xs font-medium">
            <Zap className="w-3 h-3" />
            <span>{profile.xp}</span>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                title="Настройки"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Настройки</DialogTitle>
                <DialogDescription>Управление приложением и данными</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Moon className="w-4 h-4" />
                    <span className="text-sm">Тёмная тема</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? 'Светлая' : 'Тёмная'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/20">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                    <div>
                      <span className="text-sm">Очистить все данные</span>
                      <p className="text-[10px] text-muted-foreground">Удалить историю, прогресс и кэш</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      clearAllData();
                      toast.success('Все данные очищены');
                    }}
                  >
                    Сбросить
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <AnimatePresence>
            {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
