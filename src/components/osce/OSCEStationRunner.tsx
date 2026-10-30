'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { OSCE_TYPE_LABELS } from '@/lib/osce-bank';
import { DsIcon } from '@/lib/ds-icons';
import { DIFFICULTY_LABELS } from '@/components/ui/utility';
import type { OSCEStation, OSCEResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Clock, Send, AlertCircle, CheckCircle2,
  XCircle, Trophy, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  station: OSCEStation;
  onExit: () => void;
}

type Stage = 'answering' | 'submitting' | 'result';

export function OSCEStationRunner({ station, onExit }: Props) {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const addOSCEResult = useStore((s) => s.addOSCEResult);
  const addXP = useStore((s) => s.addXP);
  const [stage, setStage] = useState<Stage>('answering');
  const [answers, setAnswers] = useState<string[]>(station.questions.map(() => ''));
  const [timeLeft, setTimeLeft] = useState(station.timeLimitSec);
  const [result, setResult] = useState<OSCEResult | null>(null);
  // Плейсхолдер вместо DOM-инъекции при битой картинке
  const [imgFailed, setImgFailed] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const info = OSCE_TYPE_LABELS[station.type];

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 206-a#2: гейт был захардкожен на 30 символов — сервер валидирует по q.minLength
  // (в банке 40-80), клиент пропускал короткие ответы и ловил 400 после отправки
  const allAnswered = answers.every((a, i) => a.trim().length >= (station.questions[i]?.minLength ?? 30));
  const minRequired = Math.max(...station.questions.map(q => q.minLength), 30);
  const timeWarning = timeLeft < 60;

  const handleSubmit = useCallback(async () => {
    if (stage !== 'answering') return;
    setStage('submitting');
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch('/api/osce/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: station.id, answers }),
      });
      const data = await res.json();
      if (data.fallback) {
        toast.warning('ИИ-оценка недоступна — выставлены базовые баллы');
      }
      if (!data.success) {
        toast.error(data.error || 'Ошибка оценки');
        setStage('answering');
        return;
      }

      const osceResult: OSCEResult = {
        stationId: station.id,
        stationType: station.type,
        answers,
        scores: data.scores,
        feedback: data.feedback,
        // Эталоны приходят с сервера только после проверки (P2-фикс утечки)
        referenceAnswers: Array.isArray(data.referenceAnswers) ? data.referenceAnswers : undefined,
        totalScore: data.totalScore,
        durationSec,
        completedAt: new Date().toISOString(),
      };
      setResult(osceResult);
      addOSCEResult(osceResult);
      addXP(osceResult.totalScore >= 7 ? 25 : osceResult.totalScore >= 5 ? 15 : 5);
      setStage('result');
      toast.success(`Результат: ${data.totalScore}/10`);
    } catch (err) {
      console.error('[osce] submit error:', err);
      toast.error('Ошибка при отправке ответов');
      setStage('answering');
    }
  }, [stage, station.id, answers, addOSCEResult, addXP]);

  // Ref indirection so timer can call latest handleSubmit without re-running effect
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  // 206-a#2: автосабмит по таймеру срабатывает ОДИН раз. Раньше при провале
  // запроса (400 «слишком коротко» / сеть) стейдж возвращался в 'answering',
  // эффект таймера реармитился на timeLeft===0 и крутил POST-цикл ~1/сек до 429.
  const autoSubmittedRef = useRef(false);

  // Timer
  useEffect(() => {
    if (stage !== 'answering') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            // Defer to next tick to avoid calling state-setter during state-set
            setTimeout(() => handleSubmitRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
        {stage === 'answering' && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold tabular-nums ${
            timeWarning ? 'bg-[#B3261E]/10 text-[#B3261E] animate-pulse' : 'bg-muted text-muted-foreground'
          }`}>
            <Clock className="w-3 h-3" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Station header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: `${info.color}15`, color: info.color }}
            >
              <DsIcon name={info.icon} className="w-3.5 h-3.5 inline-block align-[-3px] mr-1" /> {info.label}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
              {station.species}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
              {DIFFICULTY_LABELS[station.difficulty] || station.difficulty}
            </span>
          </div>
          <h2 className="text-base font-bold mb-1">{station.imageCaption}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {station.presenterText}
          </p>
          {/* Task 204 (fix 204-b#7): учебный дисклеймер в шапке станции */}
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Учебная станция — не ветеринарная консультация.
          </p>
        </CardContent>
      </Card>

      {/* Image */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {imgFailed ? (
            <div
              className="w-full aspect-video flex items-center justify-center"
              style={{ backgroundColor: `${info.color}10` }}
            >
              <DsIcon name={info.icon} className="w-16 h-16" style={{ color: info.color }} />
            </div>
          ) : (
            <img
              src={station.imageUrl}
              alt={station.imageCaption}
              className="w-full aspect-video object-cover bg-muted dark:brightness-90 dark:contrast-[0.97]"
              onError={() => setImgFailed(true)}
            />
          )}
          <p className="text-[10px] text-muted-foreground text-center py-1.5 border-t">
            {station.attribution && <>© {station.attribution}</>}
          </p>
        </CardContent>
      </Card>

      {/* Stage: answering */}
      {stage === 'answering' && (
        <div className="space-y-3">
          {station.questions.map((q, i) => {
            const tooShort = answers[i].trim().length > 0 && answers[i].trim().length < q.minLength;
            return (
              <Card key={q.id} className="border-0 shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {i + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.prompt}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Тип: {q.type} · мин. {q.minLength} символов
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={answers[i]}
                    onChange={(e) => {
                      const newAnswers = [...answers];
                      newAnswers[i] = e.target.value.slice(0, q.maxLength);
                      setAnswers(newAnswers);
                    }}
                    placeholder="Введите развёрнутый ответ..."
                    className="w-full min-h-[80px] p-2.5 rounded-lg border bg-background text-sm resize-y"
                  />
                  <div className="flex items-center justify-between text-[10px]">
                    {tooShort ? (
                      <span className="text-[#B4531C]">
                        Минимум {q.minLength} символов (ещё {q.minLength - answers[i].trim().length})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {answers[i].length} / {q.maxLength}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="w-full bg-[#4C7A3F] hover:bg-[#3D6332] text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {allAnswered ? 'Отправить ответы' : `Ответьте на все вопросы (мин. ${minRequired} символов)`}
          </Button>
        </div>
      )}

      {/* Stage: submitting */}
      {stage === 'submitting' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#33608C]/10 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6 text-[#33608C] animate-pulse" />
            </div>
            <p className="text-sm font-medium">AI-экзаменатор оценивает ответы...</p>
            <p className="text-[11px] text-muted-foreground mt-1">Это может занять 15-30 секунд</p>
          </CardContent>
        </Card>
      )}

      {/* Stage: result */}
      {stage === 'result' && result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Total score */}
          <Card className={`border-0 shadow-sm ${result.totalScore >= 7 ? 'bg-[#4C7A3F]/5' : result.totalScore >= 5 ? 'bg-[#B4531C]/5' : 'bg-[#B3261E]/5'}`}>
            <CardContent className="p-5 text-center">
              <Trophy className={`w-10 h-10 mx-auto mb-2 ${
                result.totalScore >= 7 ? 'text-[#4C7A3F]' : result.totalScore >= 5 ? 'text-[#B4531C]' : 'text-[#B3261E]'
              }`} />
              <div className="text-3xl font-bold tabular-nums">{result.totalScore}/10</div>
              <p className="text-xs text-muted-foreground mt-1">
                {result.totalScore >= 7 ? 'Отлично!' : result.totalScore >= 5 ? 'Хорошо, но есть что улучшить' : 'Требуется повторение'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Время: {formatTime(result.durationSec)} · +{result.totalScore >= 7 ? 25 : result.totalScore >= 5 ? 15 : 5} XP
              </p>
            </CardContent>
          </Card>

          {/* Per-question feedback */}
          {station.questions.map((q, i) => {
            // Сервер может прислать меньше scores/feedback/answers, чем вопросов — не роняем рендер NaN/undefined
            const score = result.scores[i] ?? 0;
            const fb = result.feedback[i] ?? 'Обратная связь недоступна.';
            const answer = result.answers?.[i] ?? '—';
            return (
              <Card key={q.id} className="border-0 shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    {score >= 7 ? (
                      <CheckCircle2 className="w-4 h-4 text-[#4C7A3F] shrink-0 mt-0.5" />
                    ) : score >= 5 ? (
                      <AlertCircle className="w-4 h-4 text-[#B4531C] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#B3261E] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-medium line-clamp-1">{q.prompt}</p>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{score}/10</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-1">
                        <span className="font-medium">Ваш ответ:</span> {String(answer).slice(0, 150)}
                        {String(answer).length > 150 && '...'}
                      </p>
                      <p className="text-[11px] italic">
                        <span className="font-medium not-italic">AI:</span> {fb}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 p-1.5 rounded bg-muted/50">
                        <span className="font-medium">Эталон:</span> {result.referenceAnswers?.[i] || station.referenceAnswers?.[i] || 'Эталон недоступен'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button
            onClick={onExit}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            К списку станций
          </Button>
        </motion.div>
      )}
    </div>
  );
}
