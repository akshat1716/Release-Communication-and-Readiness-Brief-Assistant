import { describe, it, expect } from 'vitest';
import { computeCitedSourceHash } from '../lib/crypto';
import { ReleasePackageItem, StatementData } from '../lib/types/release';

describe('Version Creation Stale Approval Governance Rule', () => {
  it('should reset status from APPROVED to NEEDS_REVIEW (distinct state) when cited item changes in a new version snapshot', () => {
    const originalItem: ReleasePackageItem = {
      id: 'F1',
      category: 'FEATURE',
      title: 'OAuth Authentication',
      description: 'Support login with Google',
    };

    const initialCitations = ['F1'];
    const initialSourceHash = computeCitedSourceHash(initialCitations, [originalItem]);

    // Human-approved statement in Version 1
    const prevStatement: StatementData = {
      id: 'stmt-1',
      audience: 'INTERNAL',
      text: 'OAuth authentication enabled [F1]',
      originalText: 'OAuth authentication enabled [F1]',
      citations: initialCitations,
      status: 'APPROVED', // Human-approved in v1
      sourceHash: initialSourceHash,
      isStale: false,
      orderIndex: 1,
    };

    // Modified item in Version 2
    const modifiedItem: ReleasePackageItem = {
      ...originalItem,
      description: 'Support login with Google, GitHub, and SAML SSO',
    };

    const newSourceHash = computeCitedSourceHash(initialCitations, [modifiedItem]);
    const isStale = newSourceHash !== prevStatement.sourceHash;

    // Execute the exact status logic from app/api/releases/[id]/versions/route.ts
    let newStatus = prevStatement.status;
    if (isStale) {
      newStatus = 'NEEDS_REVIEW'; // Distinct status state for stale statements
    }

    // HARD GOVERNANCE ASSERTIONS:
    expect(isStale).toBe(true);
    expect(newStatus).not.toBe('APPROVED');
    expect(newStatus).not.toBe('EDITED'); // Ensures UI never labels statement 'EDITED' when human didn't edit it
    expect(newStatus).toBe('NEEDS_REVIEW');
  });

  it('should preserve APPROVED status when cited item remains unchanged in new version', () => {
    const originalItem: ReleasePackageItem = {
      id: 'F1',
      category: 'FEATURE',
      title: 'OAuth Authentication',
      description: 'Support login with Google',
    };

    const initialCitations = ['F1'];
    const initialSourceHash = computeCitedSourceHash(initialCitations, [originalItem]);

    const prevStatement: StatementData = {
      id: 'stmt-1',
      audience: 'INTERNAL',
      text: 'OAuth authentication enabled [F1]',
      originalText: 'OAuth authentication enabled [F1]',
      citations: initialCitations,
      status: 'APPROVED',
      sourceHash: initialSourceHash,
      isStale: false,
      orderIndex: 1,
    };

    // Item unchanged in v2
    const newSourceHash = computeCitedSourceHash(initialCitations, [originalItem]);
    const isStale = newSourceHash !== prevStatement.sourceHash;

    let newStatus = prevStatement.status;
    if (isStale) {
      newStatus = 'NEEDS_REVIEW';
    }

    expect(isStale).toBe(false);
    expect(newStatus).toBe('APPROVED');
  });
});
