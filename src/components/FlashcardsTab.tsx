'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import { getDueCardIds, getSRStats, getSRStatusLabel } from '@/lib/sm2';
import type { Flashcard, FlashcardDeck, SRRating } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Layers, ChevronLeft, ChevronRight, RotateCcw, Sparkles,
  CheckCircle2, XCircle, BookOpen, Brain, Trophy, X, Zap,
  Camera, RefreshCw, Timer, AlertCircle, Clock, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImportDialog } from '@/components/import/ImportDialog';

type StudyMode = 'learn' | 'quiz' | 'sr'; // sr = spaced repetition review

// SR Rating button config
const SR_RATINGS: Array<{ rating: SRRating; label: string; color: string; bg: string; hoverBg: string; icon: typeof RotateCcw }> = [
  { rating: 0, label: 'Снова', color: 'text-[#FF3B30]', bg: 'bg-[#FF3B30]/10', hoverBg: 'hover:bg-[#FF3B30]/20', icon: RotateCcw },
  { rating: 1, label: 'Трудно', color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10', hoverBg: 'hover:bg-[#FF9500]/20', icon: AlertCircle },
  { rating: 2, label: 'Хорошо', color: 'text-[#28CD41]', bg: 'bg-[#28CD41]/10', hoverBg: 'hover:bg-[#28CD41]/20', icon: CheckCircle2 },
  { rating: 3, label: 'Легко', color: 'text-[#007AFF]', bg: 'bg-[#007AFF]/10', hoverBg: 'hover:bg-[#007AFF]/20', icon: Sparkles },
];

export function FlashcardsTab() {
  const {
    flashcards, setFlashcards, flashcardHistory, addFlashcardDeckToHistory, addXP,
    srCards, registerSRCards, reviewCard, reviewCards,
  } = useStore();

  // Generation state
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Card viewing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<StudyMode>('learn');

  // Quiz mode tracking
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  const [isRevealed, setIsRevealed] = useState(false);

  // OCR state
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SR review state
  const [srReviewCards, setSrReviewCards] = useState<Flashcard[]>([]);
  const [srReviewedToday, setSrReviewedToday] = useState(0);

  // Results
  const [showResults, setShowResults] = useState(false);

  // View: 'main' (generation/selection) or 'deck' (reviewing cards)
  const [view, setView] = useState<'main' | 'deck'>('main');

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTopicData = VET_TOPICS.find(t => t.id === selectedTopic);
  const subtopics = selectedTopicData?.subtopics || [];
  const hasFlashcards = flashcards.length > 0;

  // ===== SR Stats =====
  const srStats = useMemo(() => {
    const allIds = flashcards.map(c => c.id);
    return getSRStats(srCards, allIds);
  }, [srCards, flashcards]);

  const dueCardIds = useMemo(() => {
    const allIds = flashcards.map(c => c.id);
    return getDueCardIds(srCards, allIds);
  }, [srCards, flashcards]);

  // ===== Reset functions =====
  const resetQuiz = useCallback(() => {
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setIsRevealed(false);
    setShowResults(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const exitDeck = useCallback(() => {
    setFlashcards([]);
    resetQuiz();
    setView('main');
    setSrReviewCards([]);
    setSrReviewedToday(0);
  }, [setFlashcards, resetQuiz]);

  // ===== Generation =====
  const handleGenerate = async () => {
    if (!selectedTopic) {
      toast.error('Выберите тему');
      return;
    }
    setIsGenerating(true);
    try {
      const topicName = selectedTopicData?.name || selectedTopic;
      const subtopicName = selectedSubtopic
        ? subtopics.find(s => s.id === selectedSubtopic)?.name
        : undefined;

      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicName,
          subtopic: subtopicName,
          count: 10,
        }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success) {
        if (!data.flashcards || !Array.isArray(data.flashcards) || data.flashcards.length === 0) {
          toast.error('Не удалось создать карточки');
          return;
        }
        setFlashcards(data.flashcards);
        // Register all cards in SR system
        registerSRCards(data.flashcards.map(c => c.id));
        resetQuiz();
        setView('deck');
        addXP(5);
        toast.success(data.isFallback ? 'Карточки загружены (резервный вариант).' : `${data.flashcards.length} карточек создано!`);
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsGenerating(false);
    }
  };

  // ===== OCR =====
  const handleOCRUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, загрузите изображение');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Изображение слишком большое (макс. 10 МБ)');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setOcrImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process OCR
    setIsOCRProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/flashcards/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success) {
        if (data.flashcards && data.flashcards.length > 0) {
          setFlashcards(data.flashcards);
          registerSRCards(data.flashcards.map(c => c.id));
          resetQuiz();
          setView('deck');
          addXP(10);
          toast.success(`Распознано! ${data.flashcards.length} карточек создано из изображения`);
        } else {
          toast.info(data.extractedText || 'Не удалось извлечь учебный текст из изображения');
        }
      } else {
        toast.error(data.error || 'Ошибка обработки');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsOCRProcessing(false);
      setOcrImagePreview(null);
    }
  };

  // ===== SR Review =====
  const startSRReview = useCallback(() => {
    const dueCards = flashcards.filter(c => dueCardIds.includes(c.id));
    if (dueCards.length === 0) {
      toast.info('Нет карточек к повторению');
      return;
    }
    // Shuffle for variety
    const shuffled = [...dueCards].sort(() => Math.random() - 0.5);
    setSrReviewCards(shuffled);
    setSrReviewedToday(0);
    setMode('sr');
    setView('deck');
    resetQuiz();
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards, dueCardIds, resetQuiz]);

  const handleSRRate = (rating: SRRating) => {
    const card = mode === 'sr' ? srReviewCards[currentIndex] : flashcards[currentIndex];
    if (!card) return;

    // Update SM-2 state
    reviewCard(card.id, rating);
    setSrReviewedToday(prev => prev + 1);

    if (mode === 'sr') {
      // Auto-advance in SR mode
      if (currentIndex < srReviewCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setIsRevealed(false);
      } else {
        // SR review complete
        addXP(srReviewedToday + 1);
        setShowResults(true);
      }
    }
  };

  // ===== Navigation =====
  const handleNext = () => {
    if (mode === 'sr') return; // SR uses handleSRRate for navigation

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setIsRevealed(false);
    } else if (mode === 'quiz') {
      finishQuiz();
    } else {
      // Learn mode: mark all as "known" and finish
      const reviews = flashcards.map(c => ({
        cardId: c.id,
        rating: 2 as SRRating, // "Good"
      }));
      reviewCards(reviews);
      const newKnown = new Set(knownCards);
      flashcards.forEach(c => newKnown.add(c.id));
      setKnownCards(newKnown);
      finishQuiz();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setIsRevealed(false);
    }
  };

  const handleRate = (knew: boolean) => {
    const card = flashcards[currentIndex];
    if (!card) return;

    if (knew) {
      setKnownCards(prev => new Set(prev).add(card.id));
      reviewCard(card.id, 2); // Good
    } else {
      setUnknownCards(prev => new Set(prev).add(card.id));
      reviewCard(card.id, 0); // Again
    }

    setTimeout(() => handleNext(), 300);
  };

  const finishQuiz = () => {
    const deck: FlashcardDeck = {
      id: `deck_${Date.now()}`,
      topic: selectedTopicData?.name || selectedTopic,
      subtopic: selectedSubtopic
        ? subtopics.find(s => s.id === selectedSubtopic)?.name
        : undefined,
      cards: flashcards,
      known: knownCards.size,
      unknown: unknownCards.size,
      createdAt: new Date().toISOString(),
    };
    addFlashcardDeckToHistory(deck);
    addXP(knownCards.size * 3);
    setShowResults(true);
  };

  // ===== Touch swipe =====
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
  };
  const handleTouchEnd = () => {
    if (touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        if (mode === 'learn') handleNext();
        else if (mode === 'quiz' && (isRevealed || currentIndex < flashcards.length - 1)) handleNext();
      } else {
        handlePrev();
      }
    }
    touchEndX.current = null;
  };

  const currentCard = mode === 'sr' ? srReviewCards[currentIndex] : flashcards[currentIndex];

  // Scroll to top when entering deck view
  useEffect(() => {
    if (view === 'deck' && !showResults && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [view, showResults]);

  // Keyboard navigation
  useEffect(() => {
    if (view !== 'deck' || showResults) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'sr' && isFlipped) {
        // SR keyboard shortcuts: 1-4 for ratings
        if (e.key >= '1' && e.key <= '4') {
          e.preventDefault();
          handleSRRate((parseInt(e.key) - 1) as SRRating);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (mode === 'learn' || isRevealed) handleNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (mode === 'learn') {
          setIsFlipped(prev => !prev);
        } else if (!isRevealed) {
          setIsRevealed(true);
          setIsFlipped(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, showResults, mode, isFlipped, isRevealed, currentIndex, flashcards, srReviewCards]);

  // ===== MAIN VIEW =====
  if (view === 'main') {
    return (
      <div className="space-y-4 pb-4" ref={containerRef}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-lg font-bold mb-1">AI Карточки</h2>
          <p className="text-sm text-muted-foreground">Сгенерируйте или отсканируйте карточки для запоминания</p>
        </motion.div>

        {/* SR Due Cards Banner */}
        {dueCardIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={startSRReview}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-[#FF9500]/30 bg-gradient-to-r from-[#FF9500]/5 to-[#FF3B30]/5 hover:from-[#FF9500]/10 hover:to-[#FF3B30]/10 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FF9500]/15 flex items-center justify-center shrink-0">
                <Timer className="w-6 h-6 text-[#FF9500]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-[#FF9500]">
                  {dueCardIds.length} карточек к повторению
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Интервальное повторение — нажмите для начала
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#FF9500]" />
            </button>
          </motion.div>
        )}

        {/* OCR Scan Button */}
        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-[#AF52DE]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Сканировать конспект</h3>
                <p className="text-[11px] text-muted-foreground">Фото текста → AI создаёт карточки</p>
              </div>
              <Button
                size="sm"
                className="squircle-sm bg-[#AF52DE] hover:bg-[#9B30D9] text-white h-9 text-xs font-semibold"
                onClick={() => fileInputRef.current?.click()}
                disabled={isOCRProcessing}
              >
                {isOCRProcessing ? (
                  <><Zap className="w-3 h-3 mr-1 animate-pulse" /> Обработка...</>
                ) : (
                  <><Camera className="w-3 h-3 mr-1" /> Сканировать</>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleOCRUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
            {ocrImagePreview && (
              <div className="mt-3 relative">
                <img src={ocrImagePreview} alt="Preview" className="w-full max-h-32 object-cover rounded-xl" />
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                  <LoadingSpinner text="AI читает текст..." />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import from notes/file — D.2 */}
        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#28CD41]/10 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-[#28CD41]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Импорт из конспекта</h3>
                <p className="text-[11px] text-muted-foreground">TXT/MD/фото → AI создаёт карточки</p>
              </div>
              <Button
                size="sm"
                className="squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-9 text-xs font-semibold"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="w-3 h-3 mr-1" /> Импорт
              </Button>
            </div>
          </CardContent>
        </Card>
        <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} mode="flashcards" />

        {/* Topic selector */}
        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Тема</h3>
            <div className="flex flex-wrap gap-2">
              {VET_TOPICS.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTopic(t.id === selectedTopic ? '' : t.id);
                    setSelectedSubtopic('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTopic === t.id
                      ? 'bg-[#28CD41] text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subtopic selector */}
        {selectedTopic && subtopics.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="squircle-sm border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Раздел (необязательно)</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSubtopic('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      !selectedSubtopic ? 'bg-[#28CD41]/10 text-[#28CD41] border border-[#28CD41]/30' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Все разделы
                  </button>
                  {subtopics.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubtopic(s.id === selectedSubtopic ? '' : s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedSubtopic === s.id
                          ? 'bg-[#28CD41]/10 text-[#28CD41] border border-[#28CD41]/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Mode selector */}
        <Card className="squircle-sm border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Режим обучения</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('learn')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                  mode === 'learn'
                    ? 'bg-[#28CD41]/10 border-2 border-[#28CD41]/30 shadow-sm'
                    : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                }`}
              >
                <BookOpen className={`w-6 h-6 ${mode === 'learn' ? 'text-[#28CD41]' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-semibold ${mode === 'learn' ? 'text-[#28CD41]' : 'text-muted-foreground'}`}>Обучение</span>
                <span className="text-[10px] text-muted-foreground text-center">Переворачивайте карточки для изучения</span>
              </button>
              <button
                onClick={() => setMode('quiz')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                  mode === 'quiz'
                    ? 'bg-[#FF9500]/10 border-2 border-[#FF9500]/30 shadow-sm'
                    : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                }`}
              >
                <Brain className={`w-6 h-6 ${mode === 'quiz' ? 'text-[#FF9500]' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-semibold ${mode === 'quiz' ? 'text-[#FF9500]' : 'text-muted-foreground'}`}>Тест</span>
                <span className="text-[10px] text-muted-foreground text-center">Оцените свои знания</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Generate button */}
        <Button
          className="w-full squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-14 text-sm font-bold shadow-lg"
          onClick={handleGenerate}
          disabled={isGenerating || !selectedTopic}
        >
          {isGenerating ? (
            <><Zap className="w-4 h-4 mr-2 animate-pulse" /> Генерация карточек...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Сгенерировать карточки</>
          )}
        </Button>

        {isGenerating && <LoadingSpinner text="AI создаёт карточки по выбранной теме..." />}

        {/* SR Stats */}
        {srStats.total > 0 && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#007AFF]" />
                Интервальное повторение (SM-2)
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold">{srStats.total}</div>
                  <div className="text-[9px] text-muted-foreground">Всего</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[#FF9500]/10">
                  <div className="text-lg font-bold text-[#FF9500]">{srStats.due}</div>
                  <div className="text-[9px] text-muted-foreground">К повторению</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[#007AFF]/10">
                  <div className="text-lg font-bold text-[#007AFF]">{srStats.learning}</div>
                  <div className="text-[9px] text-muted-foreground">Изучаются</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[#28CD41]/10">
                  <div className="text-lg font-bold text-[#28CD41]">{srStats.mature}</div>
                  <div className="text-[9px] text-muted-foreground">Усвоены</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent decks */}
        {flashcardHistory.length > 0 && (
          <Card className="squircle-sm border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#28CD41]" />
                Недавние колоды
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {flashcardHistory.slice(0, 5).map(deck => (
                  <div
                    key={deck.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{deck.topic}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {deck.cards.length} карт. • {new Date(deck.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-[#28CD41] font-medium">✓ {deck.known}</span>
                      <span className="text-[10px] text-muted-foreground">/</span>
                      <span className="text-[10px] text-[#FF3B30] font-medium">✗ {deck.unknown}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ===== RESULTS VIEW =====
  if (showResults) {
    const total = knownCards.size + unknownCards.size;
    const pct = total > 0 ? Math.round((knownCards.size / total) * 100) : 0;
    const isSRMode = mode === 'sr';

    return (
      <div className="space-y-4 pb-4" ref={containerRef}>
        <Button variant="ghost" size="sm" onClick={exitDeck}>
          <RotateCcw className="w-4 h-4 mr-1" /> Назад
        </Button>

        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <div className="text-5xl mb-3">
                {isSRMode ? '🧠' : pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '📚'}
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-1">
                {isSRMode ? `${srReviewedToday} карт.` : `${pct}%`}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {isSRMode
                  ? 'карточек повторено сегодня'
                  : `${knownCards.size} из ${total} карточек изучено`}
              </p>
            </motion.div>

            {!isSRMode && (
              <div className="flex justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#28CD41]/10 flex items-center justify-center mx-auto mb-1">
                    <CheckCircle2 className="w-6 h-6 text-[#28CD41]" />
                  </div>
                  <p className="text-lg font-bold text-[#28CD41]">{knownCards.size}</p>
                  <p className="text-[10px] text-muted-foreground">Знаю</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-1">
                    <XCircle className="w-6 h-6 text-[#FF3B30]" />
                  </div>
                  <p className="text-lg font-bold text-[#FF3B30]">{unknownCards.size}</p>
                  <p className="text-[10px] text-muted-foreground">Не знаю</p>
                </div>
              </div>
            )}

            {isSRMode && dueCardIds.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FF9500]/5 border border-[#FF9500]/20 mb-4">
                <p className="text-xs text-muted-foreground">
                  Осталось {dueCardIds.length} карточек к повторению
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-12 text-sm font-semibold"
            onClick={() => {
              if (isSRMode) {
                startSRReview();
              } else {
                resetQuiz();
                setShowResults(false);
              }
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isSRMode ? 'Ещё раз' : 'Повторить'}
          </Button>
          <Button
            className="squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-12 text-sm font-semibold"
            onClick={exitDeck}
          >
            <Sparkles className="w-4 h-4 mr-2" /> Новые
          </Button>
        </div>
      </div>
    );
  }

  // ===== DECK VIEW =====
  const displayCards = mode === 'sr' ? srReviewCards : flashcards;
  const progressPct = displayCards.length > 0
    ? ((currentIndex + 1) / displayCards.length) * 100
    : 0;
  const isLastCard = currentIndex >= displayCards.length - 1;
  const isNextDisabled = mode === 'quiz' && !isRevealed && isLastCard;

  // Get SR status for current card
  const currentSRData = currentCard ? srCards[currentCard.id] : null;
  const srLabel = currentSRData ? getSRStatusLabel(currentSRData) : null;

  return (
    <div className="space-y-4 pb-4" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={exitDeck}>
          <X className="w-4 h-4 mr-1" /> Выход
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`text-[10px] ${
              mode === 'sr' ? 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20'
                : mode === 'quiz' ? 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20'
                : 'bg-[#28CD41]/10 text-[#28CD41] border-[#28CD41]/20'
            }`}
          >
            {mode === 'sr' ? (
              <><RefreshCw className="w-3 h-3 mr-1" /> Повторение</>
            ) : mode === 'quiz' ? (
              <><Brain className="w-3 h-3 mr-1" /> Тест</>
            ) : (
              <><BookOpen className="w-3 h-3 mr-1" /> Обучение</>
            )}
          </Badge>
          {selectedTopicData && mode !== 'sr' && (
            <Badge variant="outline" className="text-[10px]">
              {selectedTopicData.icon} {selectedTopicData.name}
            </Badge>
          )}
          {mode === 'sr' && srLabel && (
            <Badge variant="outline" className="text-[10px]">
              <Clock className="w-3 h-3 mr-1" /> {srLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {currentIndex + 1} / {displayCards.length} {mode === 'sr' ? '(к повторению)' : 'карточек'}
          </span>
          {mode === 'quiz' && (
            <span className="text-[#28CD41] font-medium">
              ✓ {knownCards.size}
              <span className="text-muted-foreground mx-1">•</span>
              <span className="text-[#FF3B30]">✗ {unknownCards.size}</span>
            </span>
          )}
          {mode === 'sr' && (
            <span className="text-[#007AFF] font-medium">
              Повторено: {srReviewedToday}
            </span>
          )}
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Card */}
      {currentCard && (
        <div key={currentIndex} className="cursor-pointer select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (mode === 'sr' && !isFlipped) {
              setIsFlipped(true);
            } else if (mode === 'learn') {
              setIsFlipped(prev => !prev);
            } else if (!isRevealed) {
              setIsRevealed(true);
              setIsFlipped(true);
            }
          }}>
          {/* Front: term */}
          <div
            className="relative"
            style={{
              height: '280px',
              opacity: isFlipped ? 0 : 1,
              transform: isFlipped ? 'scale(0.95)' : 'scale(1)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              pointerEvents: isFlipped ? 'none' : 'auto',
              position: isFlipped ? 'absolute' : 'relative',
              inset: isFlipped ? 0 : undefined,
              zIndex: isFlipped ? 0 : 1,
            }}
          >
            <Card className={`squircle border-0 shadow-md w-full h-full flex flex-col justify-between ${
              mode === 'sr'
                ? 'bg-gradient-to-br from-[#007AFF]/5 via-background to-[#5856D6]/5'
                : 'bg-gradient-to-br from-[#28CD41]/5 via-background to-[#28CD41]/10'
            }`}>
              <CardContent className="p-5 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className="text-[10px]">
                      #{currentIndex + 1}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {mode === 'sr' ? 'Нажмите для ответа' : mode === 'learn' ? 'Нажмите, чтобы перевернуть' : 'Нажмите, чтобы увидеть ответ'}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <h3 className="text-xl font-bold text-center leading-tight">
                      {currentCard.term}
                    </h3>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">Термин</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back: definition */}
          <div
            style={{
              height: '280px',
              opacity: isFlipped ? 1 : 0,
              transform: isFlipped ? 'scale(1)' : 'scale(0.95)',
              transition: 'opacity 0.3s ease 0.15s, transform 0.3s ease 0.15s',
              pointerEvents: isFlipped ? 'auto' : 'none',
              position: isFlipped ? 'relative' : 'absolute',
              inset: isFlipped ? undefined : 0,
              zIndex: isFlipped ? 1 : 0,
            }}
          >
            <Card className="squircle border-0 shadow-md bg-gradient-to-br from-[#007AFF]/5 via-background to-[#AF52DE]/5 w-full h-full flex flex-col justify-between">
              <CardContent className="p-5 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="text-[10px] bg-[#007AFF] text-white">
                      Определение
                    </Badge>
                    {currentSRData && mode === 'sr' && (
                      <Badge variant="outline" className="text-[9px]">
                        интервал: {currentSRData.interval} дн. • EF: {currentSRData.easeFactor.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed font-medium">
                    {currentCard.definition}
                  </p>
                  {currentCard.example && (
                    <div className="mt-3 p-2.5 rounded-lg bg-muted/50 border border-border/30">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">Пример:</p>
                      <p className="text-xs leading-relaxed">{currentCard.example}</p>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">{currentCard.term}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SR Rating Buttons */}
      {mode === 'sr' && isFlipped && currentCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-xs text-center text-muted-foreground mb-3">Как хорошо вы знаете?</p>
          <div className="grid grid-cols-4 gap-2">
            {SR_RATINGS.map(({ rating, label, color, bg, hoverBg, icon: Icon }) => (
              <Button
                key={rating}
                className={`squircle-sm h-14 flex flex-col items-center justify-center gap-1 ${bg} ${hoverBg} border-0 text-xs font-semibold`}
                onClick={() => handleSRRate(rating)}
              >
                <Icon className={`w-4 h-4 ${color}`} />
                <span className={color}>{label}</span>
              </Button>
            ))}
          </div>
          <p className="text-[9px] text-center text-muted-foreground mt-2">
            Клавиши 1-4 для быстрой оценки
          </p>
        </motion.div>
      )}

      {/* Quiz mode: rate buttons */}
      {mode === 'quiz' && isRevealed && currentCard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-xs text-center text-muted-foreground mb-3">Оцените свой ответ:</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="squircle-sm h-12 text-sm font-semibold bg-[#28CD41] hover:bg-[#1FA833] text-white"
              onClick={() => handleRate(true)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Знаю
            </Button>
            <Button
              className="squircle-sm h-12 text-sm font-semibold bg-[#FF3B30] hover:bg-[#E0342B] text-white"
              onClick={() => handleRate(false)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Не знаю
            </Button>
          </div>
        </motion.div>
      )}

      {/* Navigation (only for learn/quiz modes) */}
      {mode !== 'sr' && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="squircle-sm h-10 text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад
          </Button>

          <div className="flex gap-1">
            {displayCards.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i === currentIndex
                    ? 'bg-[#28CD41] scale-125'
                    : i < currentIndex
                      ? knownCards.has(displayCards[i].id)
                        ? 'bg-[#28CD41]/50'
                        : unknownCards.has(displayCards[i].id)
                          ? 'bg-[#FF3B30]/50'
                          : 'bg-muted-foreground/30'
                    : 'bg-muted/50'
                }`}
              />
            ))}
          </div>

          <Button
            size="lg"
            onClick={handleNext}
            disabled={isNextDisabled}
            className={`squircle-sm h-11 px-6 font-bold shadow-md ${isLastCard ? 'bg-[#28CD41] hover:bg-[#1FA833] text-white' : 'bg-[#007AFF] hover:bg-[#0066DD] text-white'}`}
          >
            {isLastCard ? (
              <><Trophy className="w-4 h-4 mr-1" /> Готово</>
            ) : (
              <>Далее <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">
          {mode === 'sr'
            ? 'Клавиши 1-4 для оценки'
            : mode === 'learn'
              ? '← → для навигации, пробел — перевернуть'
              : '← → для навигации, пробел — показать ответ'}
        </p>
      </div>
    </div>
  );
}

// ===== Helpers =====
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
