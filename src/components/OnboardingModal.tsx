'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { TRACKS } from '@/lib/tracks';
import type { SpecializationTrack } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

export function OnboardingModal() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const setSpecializationTrack = useStore((s) => s.setSpecializationTrack);
  const [selected, setSelected] = useState<SpecializationTrack | null>(null);
  const [open, setOpen] = useState(!profile.specializationTrack);

  const handleSelect = (id: SpecializationTrack) => {
    setSelected(id);
  };

  const handleConfirm = () => {
    if (!selected) {
      toast.error('Выберите специализацию');
      return;
    }
    setSpecializationTrack(selected);
    const trackDef = TRACKS.find((t) => t.id === selected);
    toast.success(`Специализация: ${trackDef?.label}`);
    setOpen(false);
  };

  const handleSkip = () => {
    setSpecializationTrack('mixed');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-background z-10 px-5 pt-4 pb-3 border-b">
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-3 sm:hidden" />
              <h2 className="text-lg font-bold">Выберите специализацию</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Это настроит контент, кейсы и AI-рекомендации под ваш учебный трек.
                Можно сменить позже в настройках.
              </p>
            </div>

            <div className="p-4 space-y-2">
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                    selected === t.id
                      ? 'border-[#28CD41] bg-[#28CD41]/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: `${t.color}15` }}
                  >
                    {t.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {t.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.species.slice(0, 4).map((sp) => (
                        <span
                          key={sp}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-background/80 text-muted-foreground"
                        >
                          {sp}
                        </span>
                      ))}
                      {t.species.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-background/80 text-muted-foreground">
                          +{t.species.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                  {selected === t.id && (
                    <div className="w-6 h-6 rounded-full bg-[#28CD41] flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="sticky bottom-0 bg-background px-4 py-3 border-t flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="flex-1">
                Позже
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={!selected}
                className="flex-1 bg-[#28CD41] hover:bg-[#1FA833] text-white"
              >
                Подтвердить
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
