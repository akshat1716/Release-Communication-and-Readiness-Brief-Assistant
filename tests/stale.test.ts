import { describe, it, expect } from 'vitest';
import { evaluateStatementStaleStatus } from '../lib/stale';
import { computeCitedSourceHash } from '../lib/crypto';
import { ReleasePackageItem, StatementData } from '../lib/types/release';

describe('Stale Statement Detector', () => {
  const itemF1: ReleasePackageItem = {
    id: 'F1',
    category: 'FEATURE',
    title: 'OAuth Auth',
    description: 'OAuth authentication support',
  };

  const itemQA1: ReleasePackageItem = {
    id: 'QA1',
    category: 'QA',
    title: 'OAuth Test Run',
    description: 'Passed all OAuth tests',
  };

  const initialItems = [itemF1, itemQA1];

  it('should return isStale: false when cited items remain unchanged', () => {
    const citations = ['F1', 'QA1'];
    const sourceHash = computeCitedSourceHash(citations, initialItems);

    const statement: Pick<StatementData, 'id' | 'citations' | 'sourceHash'> = {
      id: 'stmt-1',
      citations,
      sourceHash,
    };

    const res = evaluateStatementStaleStatus(statement, initialItems);
    expect(res.isStale).toBe(false);
    expect(res.staleReason).toBeUndefined();
  });

  it('should return isStale: true when a cited item is modified in newer version', () => {
    const citations = ['F1', 'QA1'];
    const sourceHash = computeCitedSourceHash(citations, initialItems);

    const statement: Pick<StatementData, 'id' | 'citations' | 'sourceHash'> = {
      id: 'stmt-1',
      citations,
      sourceHash,
    };

    // Modify itemF1 description
    const modifiedItems: ReleasePackageItem[] = [
      { ...itemF1, description: 'OAuth 2.0 with PKCE security support' },
      itemQA1,
    ];

    const res = evaluateStatementStaleStatus(statement, modifiedItems);
    expect(res.isStale).toBe(true);
    expect(res.staleReason).toContain('modified in a newer release version');
  });

  it('should return isStale: true when a cited item is deleted from package', () => {
    const citations = ['F1', 'QA1'];
    const sourceHash = computeCitedSourceHash(citations, initialItems);

    const statement: Pick<StatementData, 'id' | 'citations' | 'sourceHash'> = {
      id: 'stmt-1',
      citations,
      sourceHash,
    };

    // Remove QA1 from package
    const itemsWithoutQA1 = [itemF1];

    const res = evaluateStatementStaleStatus(statement, itemsWithoutQA1);
    expect(res.isStale).toBe(true);
    expect(res.staleReason).toContain('removed from release package');
  });
});
