import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runStepB, classifyError, LlmError } from '@/lib/llm';
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
    const { data, latencyMs, model, tokensUsed, estimatedCostUsd, costDetails } = await runStepB(packageData);

    await prisma.aIMissingInfo.deleteMany({
      where: { releaseVersionId: versionId },
    });

    await prisma.aIMissingInfo.createMany({
      data: data.missingInfos.map((m) => ({
        releaseVersionId: versionId,
        category: m.category,
        description: m.description,
        suggestion: m.suggestion,
      })),
    });

    await prisma.analysisRun.create({
      data: {
        releaseVersionId: versionId,
        stepName: 'STEP_B_MISSING_INFO',
        model,
        tokensUsed: tokensUsed || 0,
        latencyMs,
        status: 'COMPLETED',
      },
    });

    logStep('Completed Step B: Missing Information Analysis', {
      versionId,
      model,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      gapsCount: data.missingInfos.length,
    });

    return NextResponse.json({
      success: true,
      step: 'STEP_B_MISSING_INFO',
      missingInfos: data.missingInfos,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      costDetails,
    });
  } catch (error: unknown) {
    const classified = classifyError(error);
    const statusCode = error instanceof LlmError ? error.statusCode : classified.statusCode;
    const errMessage = error instanceof Error ? error.message : classified.message;

    logStep('Step B execution error', {
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
