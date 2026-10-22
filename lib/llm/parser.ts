/**
 * Defensive JSON parsing utility.
 * Rule: Strict JSON.parse first.
 * Fallback: Only strips a single surrounding ``` or ```json code fence.
 * No regex bracket extraction and no trailing-comma fixing.
 * Anything else throws SyntaxError to trigger the repair path.
 */
export function defensiveJsonParse(rawText: string): unknown {
  if (typeof rawText !== 'string') {
    throw new SyntaxError('Expected string input for JSON parsing');
  }

  // 1. Strict parse first
  try {
    return JSON.parse(rawText);
  } catch (initialErr) {
    // 2. Fallback: check for a single surrounding markdown code fence
    const trimmed = rawText.trim();
    if (trimmed.startsWith('```')) {
      const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
      if (match && match[1] !== undefined) {
        return JSON.parse(match[1].trim());
      }
    }

    // Anything else throws to be handled by caller / repair logic
    throw initialErr;
  }
}
