import { describe, it, expect } from 'vitest';
import { sanitizeCitations } from '../lib/llm/sanitizer';
import { ReleasePackageItem } from '../lib/types/release';

describe('Citation Sanitizer', () => {
  const sampleItems: ReleasePackageItem[] = [
    { id: 'F1', category: 'FEATURE', title: 'Feature 1', description: 'Desc' },
    { id: 'QA1', category: 'QA', title: 'QA 1', description: 'Desc' },
    { id: 'L1', category: 'LIMITATION', title: 'Limitation 1', description: 'Desc' },
  ];

  it('should preserve valid item citations', () => {
    const rawCitations = ['F1', 'QA1'];
    const result = sanitizeCitations(rawCitations, sampleItems);

    expect(result.validCitations).toEqual(['F1', 'QA1']);
    expect(result.invalidCitations).toEqual([]);
    expect(result.sanitized).toBe(false);
  });

  it('should strip hallucinated non-existent citation IDs', () => {
    const rawCitations = ['F1', 'QA99', 'INVALID_ID'];
    const result = sanitizeCitations(rawCitations, sampleItems);

    expect(result.validCitations).toEqual(['F1']);
    expect(result.invalidCitations).toEqual(['QA99', 'INVALID_ID']);
    expect(result.sanitized).toBe(true);
  });

  it('should handle case insensitivity gracefully', () => {
    const rawCitations = ['f1', 'qa1'];
    const result = sanitizeCitations(rawCitations, sampleItems);

    expect(result.validCitations).toEqual(['F1', 'QA1']);
  });
});
