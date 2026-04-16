'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import type { Flashcard, FlashcardDeck } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Layers, ChevronLeft, ChevronRight, RotateCcw, Sparkles,
  CheckCircle2, XCircle, BookOpen, Brain, Trophy, X, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

type StudyMode = 'learn' | 'quiz';

export function FlashcardsTab() {
  const { flashcards, setFlashcards, flashcardHistory, addFlashcardDeckToHistory, addXP } = useStore();

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

  // Results
  const [showResults, setShowResults] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTopicData = VET_TOPICS.find(t => t.id === selectedTopic);
  const subtopics = selectedTopicData?.subtopics || [];
  const hasFlashcards = flashcards.length > 0;

  // Reset tracking when new cards are generated
  const resetQuiz = useCallback(() => {
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setIsRevealed(false);
    setShowResults(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

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
      const data = await res.json();
      if (data.success) {
        if (!data.flashcards || !Array.isArray(data.flashcards) || data.flashcards.length === 0) {
          toast.error('Не удалось создать карточки');
          return;
        }
        setFlashcards(data.flashcards);
        resetQuiz();
        addXP(5);
        if (data.isFallback) {
          toast.success('Карточки загружены (резервный вариант).');
        } else {
          toast.success(`${data.flashcards.length} карточек создано!`);
        }
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setIsRevealed(false);
    } else if (mode === 'quiz') {
      finishQuiz();
    } else {
      // Learn mode: mark all as "known" and finish
      flashcards.forEach(c => knownCards.add(c.id));
      setKnownCards(new Set(knownCards));
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
    } else {
      setUnknownCards(prev => new Set(prev).add(card.id));
    }

    // Auto-advance
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

  const handleExit = () => {
    setFlashcards([]);
    resetQuiz();
  };

  const handleRestart = () => {
    resetQuiz();
  };

  const handleBackToGen = () => {
    setFlashcards([]);
    resetQuiz();
  };

  const currentCard = flashcards[currentIndex];

  // Scroll to top when entering deck view
  useEffect(() => {
    if (hasFlashcards && !showResults && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasFlashcards, showResults]);

  // Keyboard navigation
  useEffect(() => {
    if (!hasFlashcards || showResults) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (mode === 'learn' || isRevealed) {
          handleNext();
        }
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
  }, [hasFlashcards, showResults, mode, isRevealed, currentIndex, flashcards, handlePrev, handleNext]);

  // === GENERATION VIEW ===
  if (!hasFlashcards) {
    return (
      <div className="space-y-4 pb-4" ref={containerRef}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-lg font-bold mb-1">AI Карточки</h2>
          <p className="text-sm text-muted-foreground">Сгенерируйте карточки для запоминания ветеринарных терминов</p>
        </motion.div>

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

  // === RESULTS VIEW ===
  if (showResults) {
    const total = knownCards.size + unknownCards.size;
    const pct = total > 0 ? Math.round((knownCards.size / total) * 100) : 0;

    return (
      <div className="space-y-4 pb-4" ref={containerRef}>
        <Button variant="ghost" size="sm" onClick={handleBackToGen}>
          <RotateCcw className="w-4 h-4 mr-1" /> Новые карточки
        </Button>

        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <div className="text-5xl mb-3">
                {pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '📚'}
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-1">{pct}%</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {knownCards.size} из {total} карточек изучено
              </p>
            </motion.div>

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
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="squircle-sm bg-[#28CD41] hover:bg-[#1FA833] text-white h-12 text-sm font-semibold"
            onClick={handleRestart}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Повторить
          </Button>
          <Button
            className="squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-12 text-sm font-semibold"
            onClick={handleBackToGen}
          >
            <Sparkles className="w-4 h-4 mr-2" /> Новые
          </Button>
        </div>
      </div>
    );
  }

  // === FLASHCARD DECK VIEW ===
  const progressPct = flashcards.length > 0
    ? ((currentIndex + 1) / flashcards.length) * 100
    : 0;

  const isLastCard = currentIndex >= flashcards.length - 1;

  // In quiz mode on last card, must reveal before finishing
  const isNextDisabled = mode === 'quiz' && !isRevealed && isLastCard;

  return (
    <div className="space-y-4 pb-4" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleExit}>
          <X className="w-4 h-4 mr-1" /> Выход
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`text-[10px] ${mode === 'quiz' ? 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20' : 'bg-[#28CD41]/10 text-[#28CD41] border-[#28CD41]/20'}`}
          >
            {mode === 'quiz' ? (
              <><Brain className="w-3 h-3 mr-1" /> Тест</>
            ) : (
              <><BookOpen className="w-3 h-3 mr-1" /> Обучение</>
            )}
          </Badge>
          {selectedTopicData && (
            <Badge variant="outline" className="text-[10px]">
              {selectedTopicData.icon} {selectedTopicData.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {currentIndex + 1} / {flashcards.length} карточек
          </span>
          {mode === 'quiz' && (
            <span className="text-[#28CD41] font-medium">
              ✓ {knownCards.size}
              <span className="text-muted-foreground mx-1">•</span>
              <span className="text-[#FF3B30]">✗ {unknownCards.size}</span>
            </span>
          )}
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Card — CSS 3D flip, NO Framer Motion (it breaks preserve-3d) */}
      {currentCard && (
        <div key={currentIndex}>
          <div
            className="cursor-pointer select-none"
            style={{ perspective: '1200px' }}
            onClick={() => {
              if (mode === 'learn') {
                setIsFlipped(prev => !prev);
              } else if (!isRevealed) {
                setIsRevealed(true);
                setIsFlipped(true);
              }
            }}
          >
            {/* Flip container — pure CSS 3D */}
            <div
              className="relative w-full"
              style={{
                height: '280px',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front of card (term) */}
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <Card className="squircle border-0 shadow-md bg-gradient-to-br from-[#28CD41]/5 via-background to-[#28CD41]/10 w-full h-full flex flex-col justify-between overflow-hidden">
                  <CardContent className="p-5 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline" className="text-[10px]">
                          #{currentIndex + 1}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {mode === 'learn' ? 'Нажмите, чтобы перевернуть' : 'Нажмите, чтобы увидеть ответ'}
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

              {/* Back of card (definition) */}
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <Card className="squircle border-0 shadow-md bg-gradient-to-br from-[#007AFF]/5 via-background to-[#AF52DE]/5 w-full h-full flex flex-col justify-between overflow-hidden">
                  <CardContent className="p-5 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="text-[10px] bg-[#007AFF] text-white">
                          Определение
                        </Badge>
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
          </div>
        </div>
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

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="squircle-sm h-10"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Назад
        </Button>

        <div className="flex gap-1">
          {flashcards.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === currentIndex
                  ? 'bg-[#28CD41] scale-125'
                  : i < currentIndex
                    ? knownCards.has(flashcards[i].id)
                      ? 'bg-[#28CD41]/50'
                      : unknownCards.has(flashcards[i].id)
                        ? 'bg-[#FF3B30]/50'
                        : 'bg-muted-foreground/30'
                    : 'bg-muted/50'
              }`}
            />
          ))}
        </div>

        <Button
          size="sm"
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`squircle-sm h-10 font-semibold ${isLastCard ? 'bg-[#28CD41] hover:bg-[#1FA833] text-white' : 'bg-[#007AFF] hover:bg-[#0066DD] text-white'}`}
        >
          {isLastCard ? (
            <><Trophy className="w-4 h-4 mr-1" /> Готово</>
          ) : (
            <>Далее <ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </div>

      {/* Keyboard hint */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">
          {mode === 'learn'
            ? '← → для навигации, пробел — перевернуть'
            : '← → для навигации, пробел — показать ответ'}
        </p>
      </div>
    </div>
  );
}
