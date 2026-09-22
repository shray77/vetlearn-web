/**
 * Multi-strategy JSON extraction utility.
 *
 * AI models frequently return JSON wrapped in markdown fences,
 * peppered with trailing commas or single-quoted strings.
 * This module tries four increasingly aggressive parsing strategies
 * and returns the first successful result.
 */

/**
 * Strategy 1: Direct JSON.parse
 */
function tryDirectParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Strategy 2: Remove markdown fences aggressively and parse
 */
function tryStripMarkdownFences(text: string): unknown | null {
  try {
    // Remove various markdown fence patterns
    let cleaned = text
      .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .replace(/^```\s*/gm, '')
      .trim();
    if (cleaned !== text) {
      return JSON.parse(cleaned);
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Strategy 3: Regex extract outermost JSON object
 */
function tryRegexExtract(text: string): unknown | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // fall through
    }
  }
  return null;
}

/**
 * Strategy 4: Fix common JSON issues then parse
 * - Trailing commas before } or ]
 * - Single quotes -> double quotes (апострофы внутри слов не трогаем — "dog's" должно остаться словом)
 */
function tryFixCommonIssues(text: string): unknown | null {
  try {
    // First try to extract JSON portion
    let jsonStr = text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      jsonStr = match[0];
    }

    // Fix trailing commas before } or ]
    const noTrailing = jsonStr.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(noTrailing);
    } catch {
      // fall through
    }

    // Внутрисловных апострофов нет — смело меняем все одинарные кавычки
    if (!/\w'\w/.test(noTrailing)) {
      const singleQuoted = noTrailing.replace(/(?<![\\])'/g, '"');
      try {
        return JSON.parse(singleQuoted);
      } catch {
        // fall through
      }
    }

    // Апострофы внутри слов есть: меняем только «структурные» одинарные кавычки —
    // открывающие (после { [ , : или перевода строки) и закрывающие (перед , } ] :)
    const structural = noTrailing
      .replace(/([{[,:\n]\s*)'/g, '$1"')
      .replace(/'(?=\s*[,}\]:])/g, '"');
    return JSON.parse(structural);
  } catch {
    return null;
  }
}

/**
 * Try all extraction strategies in order, return first successful parse.
 *
 * @param text - Raw text that should contain JSON
 * @returns Parsed JSON value, or null if all strategies fail
 */
export function extractJSON(text: string): unknown | null {
  const strategies = [
    tryDirectParse,
    tryStripMarkdownFences,
    tryRegexExtract,
    tryFixCommonIssues,
  ];

  for (const strategy of strategies) {
    const result = strategy(text);
    if (result !== null) return result;
  }
  return null;
}
