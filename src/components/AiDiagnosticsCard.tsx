'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Activity, CheckCircle2, Loader2, XCircle } from 'lucide-react';

type AiStatus = 'idle' | 'checking' | 'ok' | 'fail';

interface AiTestResponse {
  ok: boolean;
  reply?: string;
  latencyMs?: number;
  error?: string;
}

/**
 * Карточка «Статус ИИ» — проверяет живое соединение с языковой моделью.
 * Помогает отличить реальную генерацию от резервного (fallback) контента:
 * если ИИ недоступен, большинство разделов молча подставляют запасные данные.
 */
export function AiDiagnosticsCard() {
  const [status, setStatus] = useState<AiStatus>('idle');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Отменяем летящий запрос при размонтировании (паттерн аудита: без setState после unmount)
  useEffect(() => () => abortRef.current?.abort(), []);

  const runCheck = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    setStatus('checking');
    setError('');

    try {
      const res = await fetch('/api/ai-test', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (controller.signal.aborted) return;

      const data: AiTestResponse = await res.json();

      if (res.ok && data.ok) {
        setLatencyMs(data.latencyMs ?? null);
        setReply(data.reply ?? '');
        setStatus('ok');
        toast.success(`ИИ работает (${data.latencyMs ?? '?'} мс)`);
      } else {
        setError(data.error || `Ошибка сервера (${res.status})`);
        setStatus('fail');
        toast.error('ИИ недоступен — разделы будут использовать резервный контент');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) return;
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'Превышено время ожидания (30 с)'
        : 'Ошибка соединения с сервером');
      setStatus('fail');
      toast.error('ИИ недоступен — разделы будут использовать резервный контент');
    }
  };

  return (
    <Card className="squircle border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                Статус ИИ
                {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-[#28CD41]" />}
                {status === 'fail' && <XCircle className="w-4 h-4 text-[#FF3B30]" />}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {status === 'idle' && 'Проверьте живое соединение с языковой моделью'}
                {status === 'checking' && 'Отправляем тестовый запрос…'}
                {status === 'ok' && `Работает · ${latencyMs ?? '?'} мс · «${reply}»`}
                {status === 'fail' && `Недоступен: ${error}`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={status === 'ok' ? 'outline' : 'default'}
            disabled={status === 'checking'}
            onClick={runCheck}
            className="shrink-0"
          >
            {status === 'checking' && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {status === 'checking' ? 'Проверяем…' : status === 'ok' ? 'Ещё раз' : 'Проверить ИИ'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
