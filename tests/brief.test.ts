import { describe, it, expect } from 'vitest';
import { compileFinalBrief } from '../lib/brief';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';
import { StatementData, DeterministicCheckResult, AIRiskLimitationData } from '../lib/types/release';

describe('Final Brief Compiler Engine', () => {
  const passingChecks: DeterministicCheckResult[] = [
    { ruleId: 'CHECK_QA_EMPTY', name: 'QA Evidence', status: 'PASS', message: 'QA provided' },
  ];

  const failingChecks: DeterministicCheckResult[] = [
    { ruleId: 'CHECK_BEHAVIOUR_MIGRATION', name: 'Migration', status: 'FAIL', message: 'Migration missing' },
  ];

  const draftStatements: StatementData[] = [
    {
      id: 's1',
      audience: 'INTERNAL',
      text: 'Draft internal statement',
      originalText: 'Draft internal statement',
      citations: ['F1'],
      status: 'DRAFT',
      sourceHash: 'hash1',
      isStale: false,
      orderIndex: 1,
    },
  ];

  const approvedStatements: StatementData[] = [
    {
      id: 's1',
      audience: 'INTERNAL',
      text: 'Approved internal statement [F1]',
      originalText: 'Draft internal statement',
      citations: ['F1'],
      status: 'APPROVED',
      sourceHash: 'hash1',
      isStale: false,
      orderIndex: 1,
    },
    {
      id: 's2',
      audience: 'CLIENT',
      text: 'Approved client statement [F1, U1]',
      originalText: 'Draft client statement',
      citations: ['F1', 'U1'],
      status: 'APPROVED',
      sourceHash: 'hash2',
      isStale: false,
      orderIndex: 2,
    },
  ];

  const staleApprovedStatement: StatementData = {
    id: 's3',
    audience: 'INTERNAL',
    text: 'Stale statement that was approved in v1',
    originalText: 'Stale statement that was approved in v1',
    citations: ['F1'],
    status: 'APPROVED',
    sourceHash: 'old-outdated-hash',
    isStale: true, // Cited item changed
    staleReason: 'Cited item F1 was modified in v2',
    orderIndex: 3,
  };

  const risks: AIRiskLimitationData[] = [
    { text: 'Retention limit 30 days', source: 'PACKAGE', severity: 'LOW', citations: ['L1'] },
  ];

  it('should block compilation when statements are unreviewed DRAFTs', () => {
    const res = compileFinalBrief(SAMPLE_RELEASE_PACKAGE, draftStatements, passingChecks, risks);

    expect(res.success).toBe(false);
    expect(res.blockedReason).toContain('Final brief generation blocked');
    expect(res.unreviewedCount).toBe(1);
  });

  it('should block compilation when readiness checks fail', () => {
    const res = compileFinalBrief(SAMPLE_RELEASE_PACKAGE, approvedStatements, failingChecks, risks);

    expect(res.success).toBe(false);
    expect(res.blockedReason).toContain('check(s) failed');
  });

  it('should block compilation and exclude stale statements from brief output', () => {
    const mixed = [...approvedStatements, staleApprovedStatement];
    const res = compileFinalBrief(SAMPLE_RELEASE_PACKAGE, mixed, passingChecks, risks);

    // Blocked because of stale statement needing re-review
    expect(res.success).toBe(false);
    expect(res.blockedReason).toContain('STALE (cited items modified/removed)');

    // When allowPartial is true, stale statements MUST be excluded from approved lists
    const resPartial = compileFinalBrief(SAMPLE_RELEASE_PACKAGE, mixed, passingChecks, risks, { allowPartial: true });
    expect(resPartial.success).toBe(true);
    expect(resPartial.briefMarkdown).not.toContain('Stale statement that was approved in v1');
    expect(resPartial.briefJson?.approvedInternalStatements.length).toBe(1);
  });

  it('should compile successfully when all statements are APPROVED and non-stale', () => {
    const res = compileFinalBrief(SAMPLE_RELEASE_PACKAGE, approvedStatements, passingChecks, risks);

    expect(res.success).toBe(true);
    expect(res.briefMarkdown).toContain('Approved internal statement');
    expect(res.briefMarkdown).toContain('Approved client statement');
    expect(res.briefJson?.approvedInternalStatements.length).toBe(1);
    expect(res.briefJson?.approvedClientStatements.length).toBe(1);
  });

  it('should allow partial brief compilation with warnings when allowPartial is true', () => {
    const mixedStatements = [...approvedStatements, ...draftStatements];
    const res = compileFinalBrief(SAMPLE_RELEASE_PACKAGE, mixedStatements, failingChecks, risks, {
      allowPartial: true,
    });

    expect(res.success).toBe(true);
    expect(res.briefMarkdown).toContain('DISCLAIMER & WARNINGS');
    expect(res.briefJson?.warnings.length).toBeGreaterThan(0);
  });
});
