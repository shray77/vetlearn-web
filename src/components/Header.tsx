'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Download, Upload, PawPrint,
} from 'lucide-react';
import { toast } from 'sonner';
import { TRACKS, getTrackDefinition } from '@/lib/tracks';
import type { SpecializationTrack } from '@/lib/types';
import { DsIcon } from '@/lib/ds-icons';
import { buildExport, parseImport, downloadExport, readFileAsText } from '@/lib/export-import';
import type { VetLearnStore } from '@/lib/store';

export function Header() {
  const { theme, setTheme } = useTheme();
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const clearAllData = useStore((s) => s.clearAllData);
  const notificationsEnabled = useStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useStore((s) => s.setNotificationsEnabled);
  const notificationPermission = useStore((s) => s.notificationPermission);
  const setNotificationPermission = useStore((s) => s.setNotificationPermission);
  const setSpecializationTrack = useStore((s) => s.setSpecializationTrack);
  const [adminOpen, setAdminOpen] = useState(false);
  const [trackSheetOpen, setTrackSheetOpen] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  // P2: таймер reload после импорта — с очисткой при unmount
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
  }, []);

  const track = getTrackDefinition(profile.specializationTrack);

  const handleExport = () => {
    try {
      const payload = buildExport(useStore.getState() as VetLearnStore);
      downloadExport(payload);
      toast.success('Прогресс экспортирован');
    } catch (err) {
      console.error('[export] error:', err);
      toast.error('Не удалось экспортировать');
    }
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const payload = parseImport(text);
      // Apply each field of the imported state to the store via setState.
      // We use the persist API by setting through useStore.setState.
      const stateSlice = payload.state as Partial<VetLearnStore>;
      useStore.setState(stateSlice as Partial<VetLearnStore>, false);
      toast.success('Прогресс импортирован. Перезагрузите страницу для применения.');
      // P2: таймер перезагрузки с очисткой при unmount — без него reload
      // срабатывал даже если компонент уже размонтирован (переключение таба).
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error((err as Error).message || 'Не удалось импортировать');
    }
  };

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
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#2A2620]/80 backdrop-blur-xl border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5 touch-target" onClick={handleLogoTap}>
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#4C7A3F] to-[#3D6332] dark:from-[#34D399] dark:to-[#4C7A3F] flex items-center justify-center cursor-pointer active:scale-90 transition-transform">
              <PawPrint size={16} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold leading-tight tracking-tight">VetLearn AI</h1>
              <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Персонализированное обучение</p>
            </div>
          </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3EAD3] dark:bg-[#33290F] text-[#8A5A14] dark:text-[#D9A24A] text-[11px] font-semibold tabular-nums">
            <Flame className="w-3 h-3" />
            <span>{profile.streak}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EDF3EA] dark:bg-[#203528] text-[#3D6332] dark:text-[#34D399] text-[11px] font-semibold tabular-nums">
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
            <DsIcon name={track.icon} className="w-3.5 h-3.5" />
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
            {/* max-h + скролл: на низких экранах блоки настроек не влезают (Task 160) */}
            <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
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
                      {notificationsEnabled ? <Bell className="w-4 h-4 text-[#B4531C]" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium">Уведомления</span>
                      {notificationPermission === 'denied' && (
                        <p className="text-[11px] text-[#B3261E]">Заблокированы в настройках браузера</p>
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

                {/* Export/Import — D.4 cross-device backup */}
                <div className="p-3.5 rounded-2xl bg-[#33608C]/5 border border-[#33608C]/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#33608C]/10 flex items-center justify-center">
                      <Download className="w-4 h-4 text-[#33608C]" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">Резервная копия</span>
                      <p className="text-[11px] text-muted-foreground">Экспорт/импорт прогресса между устройствами</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-xl text-xs font-semibold"
                      onClick={handleExport}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Экспорт
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-xl text-xs font-semibold"
                      onClick={handleImportClick}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Импорт
                    </Button>
                  </div>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportFile(f);
                      e.target.value = '';
                    }}
                  />
                </div>

                {/* Clear data */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#B3261E]/5 border border-[#B3261E]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#B3261E]/10 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-[#B3261E]" />
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
                    ? 'border-[#4C7A3F] bg-[#4C7A3F]/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${t.color}15` }}
                >
                  <DsIcon name={t.icon} className="w-6 h-6" style={{ color: t.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
                </div>
                {profile.specializationTrack === t.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#4C7A3F] shrink-0" />
                )}
              </button>
            ))}

            {/* D.1 V3 — Track switch history */}
            {profile.trackSwitchHistory && profile.trackSwitchHistory.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/30">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  История переключений
                </p>
                <div className="space-y-1">
                  {profile.trackStartDate && (
                    <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/30">
                      <span className="text-muted-foreground">Начало:</span>
                      <span className="font-medium">{profile.trackStartDate}</span>
                    </div>
                  )}
                  {profile.trackSwitchHistory.slice().reverse().map((h, i) => {
                    const t = TRACKS.find((tr) => tr.id === h.track);
                    return (
                      <div key={i} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/30">
                        <span className="flex items-center gap-1.5">
                          <DsIcon name={t?.icon} className="w-3.5 h-3.5" style={t ? { color: t.color } : undefined} />
                          {t?.label || h.track}
                        </span>
                        <span className="text-muted-foreground">{h.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
