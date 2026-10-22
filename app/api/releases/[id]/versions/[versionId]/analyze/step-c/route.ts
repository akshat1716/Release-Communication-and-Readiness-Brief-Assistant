import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runStepC, classifyError, LlmError } from '@/lib/llm';
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
    const { data, latencyMs, model, tokensUsed, estimatedCostUsd, costDetails } = await runStepC(packageData);

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
        tokensUsed: tokensUsed || 0,
        latencyMs,
        status: 'COMPLETED',
      },
    });

    logStep('Completed Step C: QA Claim Verification', {
      versionId,
      model,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      verificationsCount: data.verifications.length,
    });

    return NextResponse.json({
      success: true,
      step: 'STEP_C_QA_CLAIMS',
      verifications: data.verifications,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      costDetails,
    });
  } catch (error: unknown) {
    const classified = classifyError(error);
    const statusCode = error instanceof LlmError ? error.statusCode : classified.statusCode;
    const errMessage = error instanceof Error ? error.message : classified.message;

    logStep('Step C execution error', {
      versionId: params.versionId,
      error: errMessage,
      code: classified.code,
      statusCode,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: classified.code,
          message: errMessage,
          retryable: classified.retryable,
        },
      },
      { status: statusCode }
    );
  }
}
