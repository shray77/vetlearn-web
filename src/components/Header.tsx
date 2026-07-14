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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Flame, Zap, Settings, Moon, Trash2, Bell, BellOff,
} from 'lucide-react';
import { PawPrint as PhPawPrint } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { TRACKS, getTrackDefinition } from '@/lib/tracks';
import type { SpecializationTrack } from '@/lib/types';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { profile, clearAllData, notificationsEnabled, setNotificationsEnabled, notificationPermission, setNotificationPermission, setSpecializationTrack } = useStore();
  const [adminOpen, setAdminOpen] = useState(false);
  const [trackSheetOpen, setTrackSheetOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const track = getTrackDefinition(profile.specializationTrack);

  const requestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      setNotificationsEnabled(true);
      return;
    }
    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      new Notification('VetLearn AI', {
        body: 'Уведомления включены! Теперь вы будете получать напоминания об учёбе.',
        icon: '/icon-192.png',
      });
    }
  };

  const handleLogoTap = () => {
    tapCountRef.current++;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      setAdminOpen(true);
    }
  };

  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5 touch-target" onClick={handleLogoTap}>
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#28CD41] to-[#1FA833] dark:from-[#30D158] dark:to-[#28CD41] flex items-center justify-center cursor-pointer active:scale-90 transition-transform">
              <PhPawPrint size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold leading-tight tracking-tight">VetLearn AI</h1>
              <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Персонализированное обучение</p>
            </div>
          </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF3CD] dark:bg-[#3D3000] text-[#856404] dark:text-[#FFD666] text-[11px] font-semibold tabular-nums">
            <Flame className="w-3 h-3" />
            <span>{profile.streak}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F9EC] dark:bg-[#1A3D22] text-[#1FA833] dark:text-[#30D158] text-[11px] font-semibold tabular-nums">
            <Zap className="w-3 h-3" />
            <span>{profile.xp}</span>
          </div>

          {/* Track badge — tap to open track switcher */}
          <button
            onClick={() => setTrackSheetOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: `${track.color}15`,
              color: track.color,
            }}
            title={`Специализация: ${track.label}`}
          >
            <span className="text-sm">{track.icon}</span>
            <span className="hidden sm:inline">{track.label}</span>
          </button>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full touch-target"
                title="Настройки"
              >
                <Settings className="h-[18px] w-[18px]" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-title-md">Настройки</DialogTitle>
                <DialogDescription className="text-body">Управление приложением и данными</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {/* Dark mode toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Тёмная тема</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={isDark}
                    aria-label="Переключить тёмную тему"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className={`toggle-switch`}
                  >
                  </button>
                </div>

                {/* Notifications toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      {notificationsEnabled ? <Bell className="w-4 h-4 text-[#FF9500]" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium">Уведомления</span>
                      {notificationPermission === 'denied' && (
                        <p className="text-[11px] text-[#FF3B30]">Заблокированы в настройках браузера</p>
                      )}
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={notificationsEnabled}
                    aria-label="Переключить уведомления"
                    onClick={requestNotifications}
                    disabled={notificationPermission === 'denied'}
                    className={`toggle-switch ${notificationPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                  </button>
                </div>

                {/* Clear data */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FF3B30]/5 border border-[#FF3B30]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">Очистить все данные</span>
                      <p className="text-[11px] text-muted-foreground">Удалить историю, прогресс и кэш</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 rounded-xl text-xs font-semibold"
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

      {/* Track switcher sheet */}
      <Sheet open={trackSheetOpen} onOpenChange={setTrackSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[20px] max-h-[80vh] overflow-y-auto">
          <SheetHeader className="text-left mb-3">
            <SheetTitle className="text-base">Специализация</SheetTitle>
            <SheetDescription className="text-xs">
              Выберите трек — это настроит контент и AI-рекомендации
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2 px-1 pb-6">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSpecializationTrack(t.id as SpecializationTrack);
                  toast.success(`Специализация: ${t.label}`);
                  setTrackSheetOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                  profile.specializationTrack === t.id
                    ? 'border-[#28CD41] bg-[#28CD41]/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${t.color}15` }}
                >
                  {t.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
                </div>
                {profile.specializationTrack === t.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28CD41] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
