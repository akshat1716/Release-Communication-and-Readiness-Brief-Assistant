import { describe, it, expect, vi } from 'vitest';
import { POST as stepAHandler } from '../app/api/releases/[id]/versions/[versionId]/analyze/step-a/route';
import { POST as stepBHandler } from '../app/api/releases/[id]/versions/[versionId]/analyze/step-b/route';
import { POST as stepCHandler } from '../app/api/releases/[id]/versions/[versionId]/analyze/step-c/route';
import { POST as stepDHandler } from '../app/api/releases/[id]/versions/[versionId]/analyze/step-d/route';
import { POST as finalBriefHandler } from '../app/api/releases/[id]/versions/[versionId]/final-brief/route';
import { NextRequest } from 'next/server';
import { prisma } from '../lib/db';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';

describe('Comprehensive AI Approval Lock Integration Test', () => {
  it('should verify that step-d route handler strictly creates DRAFT statements and never APPROVED', async () => {
    vi.spyOn(prisma.releaseVersion, 'findUnique').mockResolvedValue({
      id: 'ver-1',
      releaseId: 'rel-1',
      versionNum: 1,
      packageSnapshot: JSON.stringify(SAMPLE_RELEASE_PACKAGE),
      packageHash: 'hash-1',
      createdAt: new Date(),
    } as any);

    vi.spyOn(prisma.statement, 'deleteMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.aIRiskLimitation, 'deleteMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.analysisRun, 'create').mockResolvedValue({} as any);
    vi.spyOn(prisma.aIRiskLimitation, 'createMany').mockResolvedValue({ count: 0 });

    const createManySpy = vi.spyOn(prisma.statement, 'createMany').mockResolvedValue({ count: 8 });

    const req = new NextRequest(
      'http://localhost:3000/api/releases/rel-1/versions/ver-1/analyze/step-d',
      { method: 'POST' }
    );

    const res = await stepDHandler(req, { params: { id: 'rel-1', versionId: 'ver-1' } });
    const json = await res.json();
    expect(json.success).toBe(true);

    const payload = createManySpy.mock.calls[0][0].data;
    expect(payload.length).toBeGreaterThan(0);
    for (const stmt of payload) {
      expect(stmt.status).toBe('DRAFT');
      expect(stmt.status).not.toBe('APPROVED');
    }

    vi.restoreAllMocks();
  });

  it('should verify final-brief route handler does not mark any statement as APPROVED and blocks unreviewed DRAFTs', async () => {
    vi.spyOn(prisma.releaseVersion, 'findUnique').mockResolvedValue({
      id: 'ver-1',
      releaseId: 'rel-1',
      versionNum: 1,
      packageSnapshot: JSON.stringify(SAMPLE_RELEASE_PACKAGE),
      packageHash: 'hash-1',
      createdAt: new Date(),
      checks: [{ ruleId: 'CHECK_QA_EMPTY', name: 'QA', status: 'PASS', message: 'OK' }],
      statements: [
        {
          id: 'stmt-1',
          audience: 'INTERNAL',
          text: 'Draft statement text',
          originalText: 'Draft statement text',
          citations: '["F1"]',
          status: 'DRAFT', // Unreviewed DRAFT
          sourceHash: 'hash',
          isStale: false,
          orderIndex: 1,
        },
      ],
      riskLimitations: [],
    } as any);

    const updateStatementSpy = vi.spyOn(prisma.statement, 'update');

    const req = new NextRequest(
      'http://localhost:3000/api/releases/rel-1/versions/ver-1/final-brief',
      { method: 'POST', body: JSON.stringify({ allowPartial: false }) }
    );

    const res = await finalBriefHandler(req, { params: { id: 'rel-1', versionId: 'ver-1' } });
    const json = await res.json();

    // Must be blocked because statement is DRAFT
    expect(json.success).toBe(false);
    expect(json.error).toContain('DRAFT status');

    // Confirm no statement status mutation occurred
    expect(updateStatementSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
