'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/ui/utility';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Video, FileText, GraduationCap, Lightbulb,
  AlertCircle, Loader2, Sparkles, Bookmark, BookmarkCheck,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export function ResourcesTab() {
  // Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)
  const profile = useStore((s) => s.profile);
  const resources = useStore((s) => s.resources);
  const setResources = useStore((s) => s.setResources);
  const bookmarkedResources = useStore((s) => s.bookmarkedResources);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const addXP = useStore((s) => s.addXP);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const handleGenerateResources = async () => {
    setIsLoading(true);
    try {
      const gaps = profile.learningPath.map(item => ({
        topicId: item.topicId,
        topicName: item.topicName,
        currentLevel: item.mastery || 0,
        priority: item.priority,
      }));

      const res = await fetch('/api/resources/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gaps, interests: [] }),
      });
      if (!res.ok) { toast.error('Ошибка сервера'); return; }
      const data = await res.json();
      if (data.isFallback) {
        toast.warning('ИИ недоступен — показана кураторская подборка');
      }
      if (data.success) {
        setResources(data.resources);
        addXP(10);
        toast.success('Рекомендации сгенерированы!');
      }
    } catch {
      toast.error('Ошибка получения рекомендаций');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResources = activeFilter === 'all'
    ? resources
    : resources.filter(r => r.type === activeFilter);

  const typeIcons: Record<string, { icon: typeof BookOpen; label: string; color: string }> = {
    book: { icon: BookOpen, label: 'Учебники', color: 'text-[#4C7A3F]' },
    video: { icon: Video, label: 'Видео', color: 'text-[#B3261E]' },
    article: { icon: FileText, label: 'Статьи', color: 'text-[#33608C]' },
    course: { icon: GraduationCap, label: 'Курсы', color: 'text-[#B4531C]' },
  };

  return (
    <div className="space-y-4 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-lg font-bold mb-1">Рекомендации</h2>
        <p className="text-sm text-muted-foreground">Персонализированные учебные ресурсы на основе ваших знаний</p>
      </motion.div>

      {/* Knowledge gaps summary */}
      {profile.learningPath.length > 0 && (
        <Card className="squircle border-0 shadow-sm bg-gradient-to-br from-[#B4531C]/5 to-[#B3261E]/5">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#B4531C]" /> Область для развития
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.learningPath.filter(p => p.priority === 'high').map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{item.topicName} ({item.mastery ?? 0}%)</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full squircle-sm bg-[#4C7A3F] hover:bg-[#3D6332] text-white h-12 text-sm font-bold"
        onClick={handleGenerateResources}
        disabled={isLoading}
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерация...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Подобрать ресурсы</>
        )}
      </Button>

      {isLoading && <LoadingSpinner text="AI подбирает лучшие ресурсы..." />}

      {/* Filters */}
      {resources.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter('all')}
            aria-pressed={activeFilter === 'all'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}
          >
            Все ({resources.length})
          </button>
          {Object.entries(typeIcons).map(([type, info]) => {
            const count = resources.filter(r => r.type === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                aria-pressed={activeFilter === type}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === type ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                }`}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Resources list */}
      {filteredResources.length > 0 && (
        <div className="space-y-2">
          {filteredResources.map((resource, i) => {
            const typeInfo = typeIcons[resource.type] || typeIcons.book;
            const isBookmarked = bookmarkedResources.includes(resource.id || `${i}`);
            const Icon = typeInfo.icon;

            return (
              <motion.div
                key={resource.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="squircle-sm border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold">{resource.title}</h4>
                            {resource.author && (
                              <p className="text-[10px] text-muted-foreground">{resource.author}</p>
                            )}
                          </div>
                          {/* 206-b#17/#24: bookmark-иконка → тач-таргет + aria-label */}
                          <button
                            onClick={() => toggleBookmark(resource.id || `${i}`)}
                            aria-label={isBookmarked ? `Убрать «${resource.title}» из закладок` : `Добавить «${resource.title}» в закладки`}
                            aria-pressed={isBookmarked}
                            className="shrink-0 -m-1.5 p-2 rounded-lg hover:bg-muted touch-area"
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-4 h-4 text-[#4C7A3F]" />
                            ) : (
                              <Bookmark className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{resource.description}</p>
                        {resource.url && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[#33608C] hover:underline"
                            >
                              {resource.urlVerified ? 'Открыть' : 'Найти в Google'} <ExternalLink className="w-3 h-3" />
                            </a>
                            <Badge variant={resource.urlVerified ? 'default' : 'secondary'} className="text-[11px] h-4 px-1">
                              {resource.urlVerified ? 'Проверено' : 'Поиск'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {resources.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Lightbulb className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Нажмите &quot;Подобрать ресурсы&quot; чтобы получить персонализированные рекомендации
          </p>
        </div>
      )}
    </div>
  );
}
