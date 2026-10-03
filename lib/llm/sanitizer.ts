import { ReleasePackageItem } from '../types/release';
import { logStep } from '../logger';

export interface CitationSanitizationResult {
  validCitations: string[];
  invalidCitations: string[];
  sanitized: boolean;
}

/**
 * Validates citation IDs against valid IDs present in the release package snapshot.
 * Strips hallucinated/non-existent IDs.
 */
export function sanitizeCitations(
  citations: string[],
  packageItems: ReleasePackageItem[]
): CitationSanitizationResult {
  const validItemIds = new Set(packageItems.map((item) => item.id.toUpperCase()));
  const validCitations: string[] = [];
  const invalidCitations: string[] = [];

  for (const rawId of citations) {
    const cleanId = rawId.trim().toUpperCase();
    if (validItemIds.has(cleanId)) {
      validCitations.push(cleanId);
    } else {
      invalidCitations.push(rawId);
    }
  }

  const sanitized = invalidCitations.length > 0;

  if (sanitized) {
    logStep('Sanitized hallucinated AI citations', {
      rawCitations: citations,
      validCitations,
      invalidCitations,
    });
  }

  return {
    validCitations,
    invalidCitations,
    sanitized,
  };
}
