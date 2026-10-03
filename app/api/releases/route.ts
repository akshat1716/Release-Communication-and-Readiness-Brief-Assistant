import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logStep } from '@/lib/logger';
import { runDeterministicChecks } from '@/lib/checks';
import { computeCitedSourceHash } from '@/lib/crypto';
import { ReleasePackageData } from '@/lib/types/release';

export async function GET() {
  try {
    const releases = await prisma.release.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { versionNum: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ success: true, releases });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Database error';
    logStep('Failed to fetch releases', { error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const packageData = body as ReleasePackageData;

    if (!packageData.releaseName || !packageData.versionLabel) {
      return NextResponse.json(
        { success: false, error: 'Release name and version label are required' },
        { status: 400 }
      );
    }

    const packageJsonStr = JSON.stringify(packageData);
    const packageHash = computeCitedSourceHash([], []);

    // Create Release & Version 1 in transaction
    const release = await prisma.release.create({
      data: {
        name: packageData.releaseName,
        versionLabel: packageData.versionLabel,
        currentVersionNum: 1,
        versions: {
          create: {
            versionNum: 1,
            packageSnapshot: packageJsonStr,
            packageHash,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    const activeVersion = release.versions[0];

    // Store items in database
    const allItems = [
      ...packageData.features,
      ...packageData.bugFixes,
      ...packageData.changedBehaviours,
      ...packageData.qaSummaries,
      ...packageData.knownLimitations,
      ...packageData.migrationNotes,
      ...packageData.affectedUserGroups,
    ];

    if (allItems.length > 0) {
      await prisma.releaseItem.createMany({
        data: allItems.map((item) => ({
          id: item.id,
          releaseVersionId: activeVersion.id,
          category: item.category,
          title: item.title,
          description: item.description,
        })),
      });
    }

    // Run deterministic checks
    const checkResults = runDeterministicChecks(packageData);
    await prisma.checkResult.createMany({
      data: checkResults.map((c) => ({
        releaseVersionId: activeVersion.id,
        ruleId: c.ruleId,
        name: c.name,
        status: c.status,
        message: c.message,
        details: c.details,
      })),
    });

    logStep('Created new release package', {
      releaseId: release.id,
      versionNum: 1,
      itemsCount: allItems.length,
    });

    return NextResponse.json({
      success: true,
      release,
      version: activeVersion,
      checks: checkResults,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create release';
    logStep('Failed to create release package', { error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
