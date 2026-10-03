import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePackageData, compareStatements } from '@/lib/diff';
import { logStep } from '@/lib/logger';
import { ReleasePackageData, StatementData } from '@/lib/types/release';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const releaseId = params.id;
    const { searchParams } = new URL(req.url);

    const v1Num = parseInt(searchParams.get('v1') || '1', 10);
    const v2Num = parseInt(searchParams.get('v2') || '2', 10);

    const version1 = await prisma.releaseVersion.findUnique({
      where: { releaseId_versionNum: { releaseId, versionNum: v1Num } },
      include: { statements: { orderBy: { orderIndex: 'asc' } } },
    });

    const version2 = await prisma.releaseVersion.findUnique({
      where: { releaseId_versionNum: { releaseId, versionNum: v2Num } },
      include: { statements: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!version1 || !version2) {
      return NextResponse.json(
        { success: false, error: 'One or both release versions not found' },
        { status: 404 }
      );
    }

    const package1: ReleasePackageData = JSON.parse(version1.packageSnapshot);
    const package2: ReleasePackageData = JSON.parse(version2.packageSnapshot);

    const packageDiff = comparePackageData(package1, package2);

    const stmts1: StatementData[] = version1.statements.map((s) => ({
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

    const stmts2: StatementData[] = version2.statements.map((s) => ({
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

    const statementDiff = compareStatements(stmts1, stmts2);

    logStep('Compared two release versions side-by-side', {
      releaseId,
      v1Num,
      v2Num,
    });

    return NextResponse.json({
      success: true,
      v1Num,
      v2Num,
      packageDiff,
      statementDiff,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Error comparing versions';
    logStep('Failed version comparison', { releaseId: params.id, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
