import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runStepD, classifyError, LlmError } from '@/lib/llm';
import { logStep } from '@/lib/logger';
import { computeCitedSourceHash } from '@/lib/crypto';
import { ReleasePackageData, ReleasePackageItem } from '@/lib/types/release';

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
    const allItems: ReleasePackageItem[] = [
      ...packageData.features,
      ...packageData.bugFixes,
      ...packageData.changedBehaviours,
      ...packageData.qaSummaries,
      ...packageData.knownLimitations,
      ...packageData.migrationNotes,
      ...packageData.affectedUserGroups,
    ];

    const { data, latencyMs, model, tokensUsed, estimatedCostUsd, costDetails } = await runStepD(packageData);

    // Delete existing statements and risks for this version
    await prisma.statement.deleteMany({
      where: { releaseVersionId: versionId },
    });

    await prisma.aIRiskLimitation.deleteMany({
      where: { releaseVersionId: versionId },
    });

    // Save Internal Statements (STRICTLY DRAFT STATUS ONLY)
    let orderCounter = 1;
    const internalStmtsData = data.internalStatements.map((s) => ({
      releaseVersionId: versionId,
      audience: 'INTERNAL',
      text: s.text,
      originalText: s.text,
      citations: JSON.stringify(s.citations),
      status: 'DRAFT', // SERVER-SIDE ENFORCEMENT: AI CAN ONLY CREATE DRAFT STATEMENTS
      sourceHash: computeCitedSourceHash(s.citations, allItems),
      isStale: false,
      orderIndex: orderCounter++,
    }));

    const clientStmtsData = data.clientStatements.map((s) => ({
      releaseVersionId: versionId,
      audience: 'CLIENT',
      text: s.text,
      originalText: s.text,
      citations: JSON.stringify(s.citations),
      status: 'DRAFT', // SERVER-SIDE ENFORCEMENT: AI CAN ONLY CREATE DRAFT STATEMENTS
      sourceHash: computeCitedSourceHash(s.citations, allItems),
      isStale: false,
      orderIndex: orderCounter++,
    }));

    await prisma.statement.createMany({
      data: [...internalStmtsData, ...clientStmtsData],
    });

    // Save Risks and Limitations
    await prisma.aIRiskLimitation.createMany({
      data: data.risksAndLimitations.map((r) => ({
        releaseVersionId: versionId,
        text: r.text,
        source: r.source,
        severity: r.severity,
        citations: JSON.stringify(r.citations),
      })),
    });

    await prisma.analysisRun.create({
      data: {
        releaseVersionId: versionId,
        stepName: 'STEP_D_SUMMARIES',
        model,
        tokensUsed: tokensUsed || 0,
        latencyMs,
        status: 'COMPLETED',
      },
    });

    logStep('Completed Step D: Audience Summaries & Risk Matrix', {
      versionId,
      model,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      internalCount: internalStmtsData.length,
      clientCount: clientStmtsData.length,
    });

    return NextResponse.json({
      success: true,
      step: 'STEP_D_SUMMARIES',
      internalStatements: internalStmtsData,
      clientStatements: clientStmtsData,
      risksAndLimitations: data.risksAndLimitations,
      latencyMs,
      tokensUsed: tokensUsed || 0,
      estimatedCostUsd: estimatedCostUsd || 0,
      costDetails,
    });
  } catch (error: unknown) {
    const classified = classifyError(error);
    const statusCode = error instanceof LlmError ? error.statusCode : classified.statusCode;
    const errMessage = error instanceof Error ? error.message : classified.message;

    logStep('Step D execution error', {
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
