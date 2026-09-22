'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { VET_TOPICS } from '@/lib/vet-topics';
import type { MindMapNode } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, ChevronRight, ChevronDown, Map, Zap, RotateCcw,
  Download, X,
} from 'lucide-react';
import { toast } from 'sonner';

// ===== Tree Node Component =====
function TreeNode({
  node,
  depth = 0,
  defaultExpanded = false,
}: {
  node: MindMapNode;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const color = node.color || (depth === 0 ? '#28CD41' : undefined);

  return (
    <div className="select-none">
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition-all hover:bg-muted/50 active:scale-[0.99] ${
          depth === 0 ? 'cursor-default' : ''
        }`}
        style={{
          paddingLeft: `${depth * 20 + 8}px`,
        }}
      >
        {hasChildren ? (
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.div>
        ) : (
          <div className="w-3.5 shrink-0" />
        )}

        {/* Color dot */}
        {color && (
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}

        <div className="flex-1 min-w-0">
          <span
            className={`font-medium leading-tight ${
              depth === 0 ? 'text-sm text-foreground' : depth === 1 ? 'text-xs text-foreground' : 'text-[11px] text-muted-foreground'
            }`}
          >
            {node.label}
          </span>
          {node.description && (expanded || depth < 1) && (
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              {node.description}
            </p>
          )}
        </div>

        {hasChildren && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
            {node.children.length}
          </Badge>
        )}
      </button>

      {/* Children */}
      <AnimatePresence initial={false}>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                defaultExpanded={depth < 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Count total nodes =====
function countNodes(node: MindMapNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// ===== Main MindMapTab =====
export function MindMapTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const addXP = useStore((s) => s.addXP);

  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const selectedTopicData = VET_TOPICS.find(t => t.id === selectedTopic);
  const subtopics = selectedTopicData?.subtopics || [];

  const handleGenerate = async () => {
    if (!selectedTopic) {
      toast.error('Выберите тему');
      return;
    }
    setIsGenerating(true);
    setMindMap(null);
    try {
      const topicName = selectedTopicData?.name || selectedTopic;
      const subtopicName = selectedSubtopic
        ? subtopics.find(s => s.id === selectedSubtopic)?.name
        : undefined;

      const res = await fetch('/api/mindmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicName,
          subtopic: subtopicName,
        }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.success && data.mindMap) {
        setMindMap(data.mindMap);
        setIsFallback(data.isFallback || false);
        addXP(10);
        toast.success(data.isFallback ? 'Карта загружена (резервный вариант)' : 'Интеллект-карта создана!');
      } else {
        toast.error(data.error || 'Ошибка генерации');
      }
    } catch {
      toast.error('Ошибка соединения');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export mind map as text
  const handleExport = useCallback(() => {
    if (!mindMap) return;

    function nodeToText(node: MindMapNode, depth: number = 0): string {
      const indent = '  '.repeat(depth);
      let text = `${indent}${depth === 0 ? '' : '- '}${node.label}`;
      if (node.description) {
        text += ` — ${node.description}`;
      }
      text += '\n';
      if (node.children) {
        for (const child of node.children) {
          text += nodeToText(child, depth + 1);
        }
      }
      return text;
    }

    const text = `🗺️ ${mindMap.label} — Интеллект-карта\n${'═'.repeat(30)}\n\n${nodeToText(mindMap)}\n\nСгенерировано в VetLearn AI`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Карта скопирована!');
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  }, [mindMap]);

  const totalNodes = mindMap ? countNodes(mindMap) : 0;

  return (
    <div className="space-y-4 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-lg font-bold mb-1">Интеллект-карты</h2>
        <p className="text-sm text-muted-foreground">AI создаёт иерархические карты по ветеринарным темам</p>
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

      {/* Generate button */}
      <Button
        className="w-full squircle-sm bg-[#007AFF] hover:bg-[#0066DD] text-white h-14 text-sm font-bold shadow-lg"
        onClick={handleGenerate}
        disabled={isGenerating || !selectedTopic}
      >
        {isGenerating ? (
          <><Zap className="w-4 h-4 mr-2 animate-pulse" /> Генерация карты...</>
        ) : (
          <><Map className="w-4 h-4 mr-2" /> Создать интеллект-карту</>
        )}
      </Button>

      {isGenerating && <LoadingSpinner text="AI строит иерархическую карту знаний..." />}

      {/* Mind Map Display */}
      {mindMap && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <Card className="squircle border-0 shadow-sm overflow-hidden">
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${mindMap.children[0]?.color || '#28CD41'}, ${mindMap.children[1]?.color || '#007AFF'}, ${mindMap.children[2]?.color || '#FF9500'})` }} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-[#007AFF]" />
                  <h3 className="text-sm font-bold">{mindMap.label}</h3>
                  {isFallback && (
                    <Badge variant="secondary" className="text-[9px]">резерв</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {totalNodes} понятий
                  </Badge>
                  <div className="flex gap-1.5">
                    {mindMap.children.slice(0, 5).map((child, i) => (
                      child.color && (
                        <div
                          key={child.id}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: child.color }}
                          title={child.label}
                        />
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={handleExport}
                >
                  <Download className="w-3 h-3 mr-1" /> Копировать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={() => {
                    setMindMap(null);
                  }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Новая карта
                </Button>
              </div>

              {/* Tree visualization */}
              <div className="border border-border/50 rounded-xl p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <TreeNode node={mindMap} defaultExpanded={true} />
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          {mindMap.children.length > 0 && (
            <Card className="squircle-sm border-0 shadow-sm mt-3">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">Разделы:</p>
                <div className="flex flex-wrap gap-2">
                  {mindMap.children.map((child) => (
                    <div key={child.id} className="flex items-center gap-1.5">
                      {child.color && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color }} />
                      )}
                      <span className="text-[10px] text-muted-foreground">{child.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!mindMap && !isGenerating && (
        <Card className="squircle border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-3">
              <Map className="w-8 h-8 text-[#007AFF]" />
            </div>
            <p className="text-sm font-semibold mb-1">Визуализируйте знания</p>
            <p className="text-xs text-muted-foreground">
              Выберите тему и AI создаст интерактивную интеллект-карту с ключевыми понятиями
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
