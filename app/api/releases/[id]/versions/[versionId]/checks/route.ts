import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runDeterministicChecks } from '@/lib/checks';
import { logStep } from '@/lib/logger';
import { ReleasePackageData } from '@/lib/types/release';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const { versionId } = params;

    const version = await prisma.releaseVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    const packageData: ReleasePackageData = JSON.parse(version.packageSnapshot);
    const checkResults = runDeterministicChecks(packageData);

    // Replace checks in database
    await prisma.checkResult.deleteMany({
      where: { releaseVersionId: versionId },
    });

    await prisma.checkResult.createMany({
      data: checkResults.map((c) => ({
        releaseVersionId: versionId,
        ruleId: c.ruleId,
        name: c.name,
        status: c.status,
        message: c.message,
        details: c.details,
      })),
    });

    logStep('Executed deterministic readiness checks', {
      versionId,
      totalChecks: checkResults.length,
      passed: checkResults.filter((c) => c.status === 'PASS').length,
    });

    return NextResponse.json({
      success: true,
      checks: checkResults,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed running checks';
    logStep('Failed executing deterministic checks', { versionId: params.versionId, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
