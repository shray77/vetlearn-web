'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import { saveDocumentText } from '@/lib/indexeddb';
import type { Flashcard, AssessmentQuestion, ImportedDocument, SpecializationTrack } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { X, Upload, FileText, Image as ImageIcon, Sparkles, Check, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Stage = 'input' | 'extracting' | 'preview' | 'saving';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** 'flashcards' or 'questions' — what to generate */
  mode: 'flashcards' | 'questions';
}

export function ImportDialog({ open, onClose, mode }: ImportDialogProps) {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const addImportedDocument = useStore((s) => s.addImportedDocument);
  const addFlashcardDeckToHistory = useStore((s) => s.addFlashcardDeckToHistory);
  const setFlashcards = useStore((s) => s.setFlashcards);
  const registerSRCards = useStore((s) => s.registerSRCards);
  const addXP = useStore((s) => s.addXP);
  const profile = useStore((s) => s.profile);
  const [stage, setStage] = useState<Stage>('input');
  const [rawText, setRawText] = useState('');
  const [filename, setFilename] = useState('');
  const [fileType, setFileType] = useState<'txt' | 'md' | 'pdf' | 'image'>('txt');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [extractedText, setExtractedText] = useState('');
  const [generated, setGenerated] = useState<Array<Flashcard | AssessmentQuestion>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<{ term?: string; definition?: string; question?: string; explanation?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStage('input');
    setRawText('');
    setFilename('');
    setFileType('txt');
    setExtractedText('');
    setGenerated([]);
    setEditingId(null);
    setEditValue({});
    setSelectedTopic('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  // 206-b#21: Esc-закрытие для кастомной модалки (иначе только тап по оверлею)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFile = (file: File) => {
    setFilename(file.name);
    if (file.type.startsWith('image/')) {
      setFileType('image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawText(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setFileType('pdf');
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawText(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // txt/md/any text — read as text
      setFileType(file.name.endsWith('.md') ? 'md' : 'txt');
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawText(reader.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error('Сначала вставьте текст или загрузите файл');
      return;
    }
    setStage('extracting');
    try {
      const res = await fetch('/api/import/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawText, fileType, filename }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Ошибка извлечения текста');
        setStage('input');
        return;
      }
      setExtractedText(data.text);
      if (!data.text || data.text.trim().length < 50) {
        toast.error('Не удалось извлечь достаточно текста');
        setStage('input');
        return;
      }

      // Generate flashcards or questions
      const genRes = await fetch(`/api/import/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: data.text,
          topicId: selectedTopic || undefined,
          count: mode === 'flashcards' ? 12 : 10,
        }),
      });
      const genData = await genRes.json();
      if (!genData.success) {
        toast.error(genData.error || 'Ошибка генерации');
        setStage('input');
        return;
      }
      setGenerated(mode === 'flashcards' ? genData.flashcards : genData.questions);
      setStage('preview');
      toast.success(`Сгенерировано ${genData.flashcards?.length || genData.questions?.length || 0} элементов`);
    } catch (err) {
      console.error('[import] error:', err);
      toast.error('Ошибка при обработке');
      setStage('input');
    }
  };

  const handleSave = async () => {
    if (generated.length === 0) {
      toast.error('Нет элементов для сохранения');
      return;
    }
    setStage('saving');

    const docId = `import_${Date.now()}`;
    const doc: ImportedDocument = {
      id: docId,
      filename: filename || 'Вставленный текст',
      fileType,
      uploadedAt: new Date().toISOString(),
      sourceTextPreview: extractedText.slice(0, 500),
      topicId: selectedTopic || undefined,
      trackId: profile.specializationTrack as SpecializationTrack | undefined,
      generatedFlashcards: mode === 'flashcards' ? (generated as Flashcard[]) : [],
      generatedQuestions: mode === 'questions' ? (generated as AssessmentQuestion[]) : undefined,
    };

    // Save full text to IndexedDB
    await saveDocumentText(docId, extractedText);

    // Save metadata to zustand (localStorage)
    addImportedDocument(doc);

    if (mode === 'flashcards') {
      const cards = generated as Flashcard[];
      // Set as current flashcards deck
      setFlashcards(cards);
      registerSRCards(cards.map((c) => c.id));
      addFlashcardDeckToHistory({
        id: `deck_${docId}`,
        topic: selectedTopic ? VET_TOPICS.find((t) => t.id === selectedTopic)?.name || 'Импорт' : 'Импорт',
        cards,
        known: 0,
        unknown: 0,
        createdAt: new Date().toISOString(),
      });
      addXP(15);
      toast.success(`Карточки сохранены (+15 XP)`);
    } else {
      // For questions — caller (MockExamTab) should pick up from importedDocuments
      addXP(20);
      toast.success(`Вопросы сохранены (+20 XP). Откройте Экзамен для прохождения.`);
    }

    handleClose();
  };

  const startEdit = (item: Flashcard | AssessmentQuestion) => {
    setEditingId(item.id);
    if ('term' in item) {
      setEditValue({ term: item.term, definition: item.definition });
    } else {
      setEditValue({ question: item.question, explanation: item.explanation });
    }
  };

  const applyEdit = (id: string) => {
    setGenerated((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if ('term' in item) {
          return { ...item, term: editValue.term || item.term, definition: editValue.definition || item.definition };
        }
        return { ...item, question: editValue.question || item.question, explanation: editValue.explanation || item.explanation };
      })
    );
    setEditingId(null);
    setEditValue({});
  };

  const deleteItem = (id: string) => {
    setGenerated((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'flashcards' ? 'Импорт карточек' : 'Импорт вопросов'}
            className="w-full max-w-2xl bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background z-10 px-5 pt-4 pb-3 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {mode === 'flashcards' ? ' Импорт карточек' : ' Импорт вопросов'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stage === 'input' && 'Загрузите конспект/текст для генерации'}
                  {stage === 'extracting' && 'Обрабатываем...'}
                  {stage === 'preview' && `Сгенерировано ${generated.length} — проверьте и сохраните`}
                  {stage === 'saving' && 'Сохраняем...'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8" aria-label="Закрыть окно импорта">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Stage: input */}
              {stage === 'input' && (
                <>
                  {/* Topic selector */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Тема (опционально)
                    </label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border bg-background text-sm"
                    >
                      <option value="">— Автоопределение —</option>
                      {VET_TOPICS.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Drag-and-drop area */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Перетащите файл или нажмите</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      .txt, .md, .pdf, .jpg, .png (до 10 МБ)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.pdf,text/*,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </div>

                  {/* Or paste text */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Или вставьте текст вручную
                    </label>
                    <textarea
                      value={(fileType === 'image' || fileType === 'pdf') ? '' : rawText}
                      onChange={(e) => {
                        setRawText(e.target.value);
                        setFileType('txt');
                        if (!filename) setFilename('Вставленный текст');
                      }}
                      placeholder="Вставьте сюда текст лекции, конспекта..."
                      className="w-full min-h-[120px] p-3 rounded-xl border bg-background text-sm resize-y"
                      disabled={fileType === 'image' || fileType === 'pdf'}
                    />
                  </div>

                  {filename && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                      {fileType === 'image' ? <ImageIcon className="w-4 h-4" /> : fileType === 'pdf' ? <FileText className="w-4 h-4 text-[#B3261E]" /> : <FileText className="w-4 h-4" />}
                      <span className="font-medium truncate flex-1">{filename}</span>
                      <button
                        onClick={() => {
                          setFilename('');
                          setRawText('');
                          setFileType('txt');
                        }}
                        aria-label="Убрать файл"
                        className="-m-1 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted touch-area"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <Button
                    onClick={handleExtract}
                    disabled={!rawText.trim()}
                    className="w-full bg-[#4C7A3F] hover:bg-[#3D6332] text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Сгенерировать {mode === 'flashcards' ? 'карточки' : 'вопросы'}
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">
                    ⚠ Загружайте только собственные материалы. Не нарушайте авторские права.
                  </p>
                </>
              )}

              {/* Stage: extracting */}
              {stage === 'extracting' && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#4C7A3F]/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-[#4C7A3F] animate-pulse" />
                  </div>
                  <p className="text-sm font-medium">Извлекаем текст и генерируем...</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Это может занять 10-20 секунд</p>
                </div>
              )}

              {/* Stage: preview */}
              {stage === 'preview' && (
                <>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {generated.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border bg-card space-y-2"
                      >
                        {editingId === item.id ? (
                          <>
                            {'term' in item && (
                              <>
                                <input
                                  value={editValue.term || ''}
                                  onChange={(e) => setEditValue({ ...editValue, term: e.target.value })}
                                  className="w-full h-8 px-2 rounded border bg-background text-sm font-medium"
                                />
                                <textarea
                                  value={editValue.definition || ''}
                                  onChange={(e) => setEditValue({ ...editValue, definition: e.target.value })}
                                  className="w-full min-h-[60px] p-2 rounded border bg-background text-xs"
                                />
                              </>
                            )}
                            {'question' in item && (
                              <>
                                <textarea
                                  value={editValue.question || ''}
                                  onChange={(e) => setEditValue({ ...editValue, question: e.target.value })}
                                  className="w-full min-h-[60px] p-2 rounded border bg-background text-sm"
                                />
                                <textarea
                                  value={editValue.explanation || ''}
                                  onChange={(e) => setEditValue({ ...editValue, explanation: e.target.value })}
                                  className="w-full min-h-[40px] p-2 rounded border bg-background text-xs"
                                />
                              </>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => applyEdit(item.id)} className="h-7 text-xs bg-[#4C7A3F] hover:bg-[#3D6332] text-white">
                                <Check className="w-3 h-3 mr-1" /> OK
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">
                                Отмена
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {'term' in item && (
                                  <>
                                    <p className="text-sm font-semibold">{item.term}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{item.definition}</p>
                                    {item.example && (
                                      <p className="text-[11px] italic text-muted-foreground mt-1">→ {item.example}</p>
                                    )}
                                  </>
                                )}
                                {'question' in item && (
                                  <>
                                    <p className="text-sm font-medium">{item.question}</p>
                                    <p className="text-xs text-muted-foreground mt-1">✓ {item.options[item.correctIndex]}</p>
                                    {item.explanation && (
                                      <p className="text-[11px] italic text-muted-foreground mt-1">{item.explanation}</p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                {/* 206-b#17/#22: тачи ≥44px + aria-label для иконок-кнопок */}
                                <button
                                  onClick={() => startEdit(item)}
                                  className="p-2.5 -m-1 rounded-lg hover:bg-muted text-muted-foreground touch-area"
                                  aria-label="Редактировать элемент"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  className="p-2.5 -m-1 rounded-lg hover:bg-[#B3261E]/10 text-[#B3261E] touch-area"
                                  aria-label="Удалить элемент"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setStage('input')} className="flex-1">
                      Назад
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={generated.length === 0}
                      className="flex-1 bg-[#4C7A3F] hover:bg-[#3D6332] text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Сохранить ({generated.length})
                    </Button>
                  </div>
                </>
              )}

              {/* Stage: saving */}
              {stage === 'saving' && (
                <div className="py-12 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-[#4C7A3F] animate-pulse" />
                  <p className="text-sm">Сохраняем...</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
