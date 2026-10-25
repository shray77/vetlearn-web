'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import type { TutorMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Mic, Volume2, Send, RotateCcw, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function VoiceTutorTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const tutorMessages = useStore((s) => s.tutorMessages);
  const addTutorMessage = useStore((s) => s.addTutorMessage);
  const clearTutorMessages = useStore((s) => s.clearTutorMessages);
  const addXP = useStore((s) => s.addXP);
  const profile = useStore((s) => s.profile);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // FIX #3: track current audio + object URL for proper cleanup
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  // FIX #4: track stream for cleanup
  const streamRef = useRef<MediaStream | null>(null);
  // FIX: guard against double-tap during async getUserMedia
  const isStartingRef = useRef(false);
  // FIX: auto-stop long recordings to avoid huge base64 payloads
  const maxRecTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX: client-side timeout for STT fetch (SDK can hang)
  const sttAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tutorMessages]);

  // FIX #3/#4: Cleanup on unmount — revoke URL, stop audio, stop stream,
  // clear recording timeout, abort any in-flight STT request.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      if (maxRecTimeoutRef.current) {
        clearTimeout(maxRecTimeoutRef.current);
        maxRecTimeoutRef.current = null;
      }
      if (sttAbortRef.current) {
        sttAbortRef.current.abort();
        sttAbortRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const userMessage = inputText.trim();
    setInputText('');

    const userMsg: TutorMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      topic: selectedTopic || undefined,
    };
    addTutorMessage(userMsg);

    setIsLoading(true);
    try {
      const history = tutorMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const topicName = selectedTopic ? VET_TOPICS.find(t => t.id === selectedTopic)?.name : undefined;
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          topic: topicName || undefined,
          topicId: selectedTopic || undefined,
          context: `Студент уровня ${profile.level}, точность: ${profile.totalAnswers > 0 ? Math.round((profile.correctAnswers / profile.totalAnswers) * 100) : 0}%. ${topicName ? `Фокус на теме: ${topicName}. Отвечай ТОЛЬКО по этой теме, если вопрос не связан — мягко перенаправляй.` : ''}`,
          history,
        }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success) {
        const aiMsg: TutorMessage = {
          id: `msg_${Date.now()}_ai`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          topic: selectedTopic || undefined,
        };
        addTutorMessage(aiMsg);
        addXP(2);
      }
    } catch {
      toast.error('Ошибка репетитора');
    } finally {
      setIsLoading(false);
    }
  };

  // FIX #3: Proper audio cleanup — stop previous, revoke URL on end/error
  const handleSpeak = useCallback(async (text: string, messageId: string) => {
    // If same message is playing — stop it
    if (isPlayingAudio === messageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      setIsPlayingAudio(null);
      return;
    }

    // Stop any currently playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    try {
      const res = await fetch('/api/tutor/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setIsPlayingAudio(messageId);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioUrlRef.current = null;
          audioRef.current = null;
          setIsPlayingAudio(null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioUrlRef.current = null;
          audioRef.current = null;
          setIsPlayingAudio(null);
        };
        audio.play();
      }
    } catch {
      toast.error('Ошибка озвучки');
    }
  }, [isPlayingAudio]);

  // FIX #4: Proper MediaRecorder cleanup
  const handleStartRecording = async () => {
    // Race-condition guard: if a previous start is still pending
    // (await getUserMedia), or we're already recording, ignore.
    if (isStartingRef.current || isRecording) return;
    isStartingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (maxRecTimeoutRef.current) {
          clearTimeout(maxRecTimeoutRef.current);
          maxRecTimeoutRef.current = null;
        }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          // Client-side timeout: if z-ai ASR hangs, abort after 30s.
          const controller = new AbortController();
          sttAbortRef.current = controller;
          const timeout = setTimeout(() => controller.abort(), 30_000);
          try {
            const res = await fetch('/api/stt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio }),
              signal: controller.signal,
            });
            const data = await res.json();
            if (data.success && data.text) {
              setInputText(data.text);
              toast.success('Речь распознана');
            } else {
              toast.error(data.error || 'Ошибка распознавания');
            }
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') {
              toast.error('Таймаут распознавания речи');
            } else {
              toast.error('Ошибка распознавания');
            }
          } finally {
            clearTimeout(timeout);
            sttAbortRef.current = null;
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      // Auto-stop after 60s to avoid huge base64 payloads (10 MB cap on server).
      maxRecTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 60_000);
    } catch {
      toast.error('Нет доступа к микрофону');
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleStopRecording = () => {
    // Ignore if a start is in progress (getUserMedia still pending) or
    // not currently recording. Prevents the double-tap race where the
    // second click tried to stop a recorder that hadn't started yet.
    if (isStartingRef.current) return;
    if (maxRecTimeoutRef.current) {
      clearTimeout(maxRecTimeoutRef.current);
      maxRecTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] pb-4">
      {/* Topic selector */}
      <div className="px-1 mb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedTopic('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              !selectedTopic ? 'bg-[#6D4FC4] text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
             Общий чат
          </button>
          {VET_TOPICS.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id === selectedTopic ? '' : t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedTopic === t.id ? 'bg-[#6D4FC4] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t.icon} {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1">
        {tutorMessages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#6D4FC4]/10 flex items-center justify-center mx-auto mb-3 animate-float">
              <Mic className="w-8 h-8 text-[#6D4FC4]" />
            </div>
            <h3 className="text-base font-semibold mb-1">Голосовой репетитор</h3>
            <p className="text-sm text-muted-foreground px-8">
              Задайте вопрос или выберите тему для обсуждения. AI-репетитор объяснит любой ветеринарный концепт.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center px-8">
              {[
                'Объясни фармакокинетику антибиотиков',
                'Что такое дифференциальная диагностика?',
                'Как лечить пневмонию у КРС?',
                'Методы обезболивания у собак',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setInputText(q)}
                  className="px-3 py-1.5 rounded-xl bg-muted text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {tutorMessages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              {msg.role === 'assistant' && msg.topic && (
                <Badge variant="secondary" className="text-[10px] mb-1 ml-1">{msg.topic}</Badge>
              )}
              <div
                className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#4C7A3F] text-white rounded-br-md'
                    : 'bg-card border shadow-sm rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleSpeak(msg.content, msg.id)}
                    className={`ml-1 p-0.5 rounded transition-all ${
                      isPlayingAudio === msg.id ? 'text-[#6D4FC4]' : 'text-muted-foreground hover:text-[#6D4FC4]'
                    }`}
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border shadow-sm p-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-border/50 bg-background">
        <div className="flex items-center gap-2">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              isRecording
                ? 'bg-[#B3261E] text-white animate-pulse-ring'
                : 'bg-[#6D4FC4]/10 text-[#6D4FC4] hover:bg-[#6D4FC4]/20'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Задайте вопрос репетитору..."
            className="squircle-sm min-h-[40px] max-h-32 resize-none text-sm border-border/50"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl p-0 shrink-0 bg-[#4C7A3F] hover:bg-[#3D6332] text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {tutorMessages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground h-8"
            onClick={clearTutorMessages}
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Очистить чат
          </Button>
        )}
      </div>
    </div>
  );
}
