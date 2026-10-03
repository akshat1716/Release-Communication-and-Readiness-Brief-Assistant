import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runStepC } from '@/lib/llm';
import { logStep } from '@/lib/logger';
import { ReleasePackageData } from '@/lib/types/release';

export const maxDuration = 60;

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
    const { data, latencyMs, model } = await runStepC(packageData);

    await prisma.aIClaimVerification.deleteMany({
      where: { releaseVersionId: versionId },
    });

    await prisma.aIClaimVerification.createMany({
      data: data.verifications.map((v) => ({
        releaseVersionId: versionId,
        itemId: v.itemId,
        claimText: v.claimText,
        status: v.status,
        reason: v.reason,
        qaCitations: JSON.stringify(v.qaCitations),
      })),
    });

    await prisma.analysisRun.create({
      data: {
        releaseVersionId: versionId,
        stepName: 'STEP_C_QA_CLAIMS',
        model,
        latencyMs,
        status: 'COMPLETED',
      },
    });

    logStep('Completed Step C: QA Claim Verification', {
      versionId,
      model,
      latencyMs,
      verificationsCount: data.verifications.length,
    });

    return NextResponse.json({
      success: true,
      step: 'STEP_C_QA_CLAIMS',
      verifications: data.verifications,
      latencyMs,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Step C failed';
    logStep('Step C execution error', { versionId: params.versionId, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
