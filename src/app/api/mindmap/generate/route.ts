import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { MindMapNode } from '@/lib/types';
import { extractJSON } from '@/lib/json-utils';

const SYSTEM_PROMPT = `Ты — опытный профессор ветеринарной медицины, создающий структурированные интеллект-карты (mind maps) для студентов. ALL text in your response MUST be in Russian only.

Создавай иерархические интеллект-карты по ветеринарным дисциплинам, которые помогают студентам систематизировать знания.

ПРАВИЛА:
- Все тексты — ТОЛЬКО на русском языке
- Структура должна быть логичной: от общего к частному
- Каждый узел — одно чёткое понятие (2-5 слов)
- 2-4 уровня вложенности
- 3-6 ветвей на первом уровне
- Ключевые термины и их взаимосвязи
- Покрытие основных разделов темы

ФОРМАТ ОТВЕТА — строго JSON:
{
  "topic": "Название темы",
  "children": [
    {
      "id": "n1",
      "label": "Название раздела",
      "description": "Краткое описание раздела (1-2 предложения)",
      "color": "#HEX",
      "children": [
        {
          "id": "n1_1",
          "label": "Подраздел",
          "description": "Описание",
          "children": []
        }
      ]
    }
  ]
}

Цвета для веток (используй в порядке): "#28CD41", "#007AFF", "#FF9500", "#AF52DE", "#FF3B30", "#5856D6", "#00C7BE", "#FF2D55"
ID должны быть уникальными. Верни ТОЛЬКО JSON без комментариев.`;



function validateMindMap(data: any): MindMapNode | null {
  if (!data || typeof data !== 'object') return null;
  
  const children = data.children;
  if (!Array.isArray(children) || children.length === 0) return null;
  
  function validateNode(node: any, depth: number = 0): any {
    if (!node || typeof node !== 'object') return null;
    return {
      id: node.id || `node_${Math.random().toString(36).substring(2, 8)}`,
      label: typeof node.label === 'string' && node.label.trim() 
        ? node.label.trim() 
        : 'Без названия',
      description: typeof node.description === 'string' ? node.description.trim() : undefined,
      color: node.color || undefined,
      children: Array.isArray(node.children) 
        ? node.children.map((c: any) => validateNode(c, depth + 1)).filter(Boolean).slice(0, 6)
        : [],
    };
  }

  return {
    id: 'root',
    label: typeof data.topic === 'string' ? data.topic : 'Тема',
    children: children.map(c => validateNode(c, 0)).filter(Boolean),
  };
}

const COLORS = ['#28CD41', '#007AFF', '#FF9500', '#AF52DE', '#FF3B30', '#5856D6', '#00C7BE', '#FF2D55'];

function getFallbackMindMap(topic: string): MindMapNode {
  return {
    id: 'root',
    label: topic,
    children: [
      { id: 'n1', label: 'Определение', color: COLORS[0], description: 'Основное понятие и его клиническое значение', children: [
        { id: 'n1_1', label: 'Этиология', description: 'Причины возникновения', children: [] },
        { id: 'n1_2', label: 'Патогенез', description: 'Механизм развития', children: [] },
      ]},
      { id: 'n2', label: 'Диагностика', color: COLORS[1], description: 'Методы выявления заболевания', children: [
        { id: 'n2_1', label: 'Клинические признаки', description: 'Симптомы и их выраженность', children: [] },
        { id: 'n2_2', label: 'Лабораторные методы', description: 'Анализы и их интерпретация', children: [] },
        { id: 'n2_3', label: 'Инструментальные', description: 'Рентген, УЗИ и другие методы', children: [] },
      ]},
      { id: 'n3', label: 'Лечение', color: COLORS[2], description: 'Терапевтические и хирургические подходы', children: [
        { id: 'n3_1', label: 'Консервативное', description: 'Медикаментозная терапия', children: [] },
        { id: 'n3_2', label: 'Хирургическое', description: 'Оперативное вмешательство', children: [] },
      ]},
      { id: 'n4', label: 'Профилактика', color: COLORS[3], description: 'Меры предупреждения заболевания', children: [
        { id: 'n4_1', label: 'Вакцинация', description: 'Иммунопрофилактика', children: [] },
        { id: 'n4_2', label: 'Зоогигиена', description: 'Санитарные мероприятия', children: [] },
      ]},
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { topic, subtopic } = await req.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Укажите тему для генерации карты' },
        { status: 400 }
      );
    }

    const fullTopic = subtopic ? `${topic} — ${subtopic}` : topic;

    const zai = await ZAI.create();

    const userPrompt = `Создай детальную интеллект-карту (mind map) по теме: ${fullTopic}

Структура:
- 3-5 основных ветвей
- Каждая ветвь с 2-4 подразделами
- Ключевые термины и определения
- Логическая иерархия от общего к частному

Все тексты на русском языке. Верни ТОЛЬКО JSON.`;

    let responseText = '';
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
    responseText = completion.choices[0]?.message?.content || '';

    let parsed = extractJSON(responseText);

    if (!parsed) {
      console.warn('[mindmap/generate] JSON parsing failed, using fallback');
      return NextResponse.json({ 
        success: true, 
        mindMap: getFallbackMindMap(fullTopic), 
        isFallback: true 
      });
    }

    const validated = validateMindMap(parsed);
    if (!validated) {
      return NextResponse.json({ 
        success: true, 
        mindMap: getFallbackMindMap(fullTopic), 
        isFallback: true 
      });
    }

    // Assign colors to branches that don't have them
    if (validated.children) {
      validated.children.forEach((child, i) => {
        if (!child.color) {
          child.color = COLORS[i % COLORS.length];
        }
      });
    }

    return NextResponse.json({ success: true, mindMap: validated });
  } catch (error) {
    console.error('[mindmap/generate] Error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации карты' },
      { status: 500 }
    );
  }
}
