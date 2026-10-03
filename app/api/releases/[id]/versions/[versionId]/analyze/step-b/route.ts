import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runStepB } from '@/lib/llm';
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
    const { data, latencyMs, model } = await runStepB(packageData);

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
        latencyMs,
        status: 'COMPLETED',
      },
    });

    logStep('Completed Step B: Missing Information Analysis', {
      versionId,
      model,
      latencyMs,
      gapsCount: data.missingInfos.length,
    });

    return NextResponse.json({
      success: true,
      step: 'STEP_B_MISSING_INFO',
      missingInfos: data.missingInfos,
      latencyMs,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Step B failed';
    logStep('Step B execution error', { versionId: params.versionId, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
