import { NextRequest, NextResponse } from 'next/server';
import { getPlacementQuestions, determineLevel } from '@/lib/question-bank';

/**
 * POST /api/assessment/placement
 * Входное тестирование для определения уровня студента
 *
 * Body:
 *   action: 'get_questions' | 'analyze_results'
 *   count?: number (количество вопросов, по умолчанию 15)
 *   questions?: AssessmentQuestion[] (при action=analyze_results)
 *   answers?: (number | null)[] (при action=analyze_results)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'get_questions', count = 15, questions, answers } = body;

    if (action === 'get_questions') {
      // Генерация вопросов для Placement Test из статического банка
      const clampedCount = Math.max(9, Math.min(21, count));
      const placementQuestions = getPlacementQuestions(clampedCount);

      return NextResponse.json({
        success: true,
        questions: placementQuestions,
        totalQuestions: placementQuestions.length,
        isPlacement: true,
        description: 'Входное тестирование для определения вашего уровня подготовки. Вопросы охватывают все основные темы ветеринарной медицины на разных уровнях сложности.',
      });
    }

    if (action === 'analyze_results') {
      // Анализ результатов Placement Test
      if (!questions || !answers || !Array.isArray(questions) || !Array.isArray(answers)) {
        return NextResponse.json(
          { error: 'Укажите вопросы и ответы для анализа' },
          { status: 400 }
        );
      }

      if (questions.length !== answers.length) {
        return NextResponse.json(
          { error: 'Количество вопросов не совпадает с количеством ответов' },
          { status: 400 }
        );
      }

      const unanwered = answers.filter(a => a === null).length;
      if (unanwered > questions.length * 0.3) {
        return NextResponse.json(
          { error: 'Слишком много unanswered вопросов. Пожалуйста, ответьте хотя бы на 70% вопросов.' },
          { status: 400 }
        );
      }

      const result = determineLevel(questions, answers);

      return NextResponse.json({
        success: true,
        isPlacement: true,
        ...result,
        message: result.level === 'advanced'
          ? 'Отличный результат! У вас продвинутый уровень подготовки. AI будет генерировать сложные вопросы для дальнейшего развития.'
          : result.level === 'intermediate'
            ? 'Хороший результат! У вас средний уровень. AI подберёт вопросы чуть выше вашего уровня для роста.'
            : 'Добро пожаловать! Базовый уровень — это отличная отправная точка. AI начнёт с фундаментальных тем и постепенно усложнять.',
      });
    }

    return NextResponse.json(
      { error: 'Неизвестное действие. Используйте get_questions или analyze_results.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Placement test error:', error);
    return NextResponse.json(
      { error: 'Ошибка при выполнении входного тестирования' },
      { status: 500 }
    );
  }
}
