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
 * - Single quotes -> double quotes
 */
function tryFixCommonIssues(text: string): unknown | null {
  try {
    // First try to extract JSON portion
    let jsonStr = text;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      jsonStr = match[0];
    }

    let fixed = jsonStr;

    // Fix trailing commas before } or ]
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    // Fix single quotes -> double quotes (naive but handles most cases)
    fixed = fixed.replace(/(?<![\\])'/g, '"');

    return JSON.parse(fixed);
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
