import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runStepA, classifyError, LlmError } from '@/lib/llm';
import { logStep } from '@/lib/logger';
import { ReleasePackageData } from '@/lib/types/release';

export const maxDuration = 60; // Set max duration for Vercel execution limits

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
    const { data, latencyMs, model, tokensUsed, estimatedCostUsd, costDetails } = await runStepA(packageData);

    // Save classifications
    await prisma.aIClassification.deleteMany({
      where: { releaseVersionId: versionId },
    });

    await prisma.aIClassification.createMany({
      data: data.classifications.map((c) => ({
        releaseVersionId: versionId,
        itemId: c.itemId,
        impact: c.impact,
        rationale: c.rationale,
      })),
    });

    await prisma.analysisRun.create({
      data: {
        releaseVersionId: versionId,
        stepName: 'STEP_A_CLASSIFY',
        model,
        tokensUsed: tokensUsed || 0,
        latencyMs,
        status: 'COMPLETED',
      },
    });

    logStep('Completed Step A: Impact Classifications', {
      versionId,
      model,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      itemsCount: data.classifications.length,
    });

    return NextResponse.json({
      success: true,
      step: 'STEP_A_CLASSIFY',
      classifications: data.classifications,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      costDetails,
    });
  } catch (error: unknown) {
    const classified = classifyError(error);
    const statusCode = error instanceof LlmError ? error.statusCode : classified.statusCode;
    const errMessage = error instanceof Error ? error.message : classified.message;

    logStep('Step A execution error', {
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
