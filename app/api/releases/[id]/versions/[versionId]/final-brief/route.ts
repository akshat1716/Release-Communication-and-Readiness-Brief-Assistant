import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { compileFinalBrief } from '@/lib/brief';
import { logStep } from '@/lib/logger';
import {
  ReleasePackageData,
  StatementData,
  DeterministicCheckResult,
  AIRiskLimitationData,
} from '@/lib/types/release';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const { id: releaseId, versionId } = params;
    const body = await req.json().catch(() => ({}));
    const allowPartial = Boolean(body?.allowPartial);

    const version = await prisma.releaseVersion.findUnique({
      where: { id: versionId },
      include: {
        checks: true,
        statements: { orderBy: { orderIndex: 'asc' } },
        riskLimitations: true,
      },
    });

    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    const packageData: ReleasePackageData = JSON.parse(version.packageSnapshot);

    const stmts: StatementData[] = version.statements.map((s) => ({
      id: s.id,
      audience: s.audience as StatementData['audience'],
      text: s.text,
      originalText: s.originalText,
      citations: JSON.parse(s.citations || '[]'),
      status: s.status as StatementData['status'],
      sourceHash: s.sourceHash,
      isStale: s.isStale,
      staleReason: s.staleReason || undefined,
      orderIndex: s.orderIndex,
    }));

    const checks: DeterministicCheckResult[] = version.checks.map((c) => ({
      ruleId: c.ruleId,
      name: c.name,
      status: c.status as DeterministicCheckResult['status'],
      message: c.message,
      details: c.details || undefined,
    }));

    const risks: AIRiskLimitationData[] = version.riskLimitations.map((r) => ({
      text: r.text,
      source: r.source as AIRiskLimitationData['source'],
      severity: r.severity as AIRiskLimitationData['severity'],
      citations: JSON.parse(r.citations || '[]'),
    }));

    const briefResult = compileFinalBrief(packageData, stmts, checks, risks, { allowPartial });

    if (!briefResult.success) {
      logStep('Final brief compilation blocked due to unreviewed statements or check failures', {
        releaseId,
        versionId,
        blockedReason: briefResult.blockedReason,
      });

      return NextResponse.json(
        {
          success: false,
          error: briefResult.blockedReason,
          unreviewedCount: briefResult.unreviewedCount,
          rejectedCount: briefResult.rejectedCount,
          failedCheckCount: briefResult.failedCheckCount,
        },
        { status: 400 }
      );
    }

    // Persist generated brief
    const finalBrief = await prisma.finalBrief.create({
      data: {
        releaseId,
        releaseVersionId: versionId,
        contentJson: JSON.stringify(briefResult.briefJson),
      },
    });

    logStep('Successfully compiled and saved reviewed final release brief', {
      releaseId,
      versionId,
      briefId: finalBrief.id,
      allowPartial,
    });

    return NextResponse.json({
      success: true,
      brief: finalBrief,
      markdown: briefResult.briefMarkdown,
      briefJson: briefResult.briefJson,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Error generating final brief';
    logStep('Failed final brief compilation', { versionId: params.versionId, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
