import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logStep } from '@/lib/logger';
import { runDeterministicChecks } from '@/lib/checks';
import { computeCitedSourceHash, sha256 } from '@/lib/crypto';
import { ReleasePackageData, ReleasePackageItem } from '@/lib/types/release';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const releaseId = params.id;
    const body = await req.json();
    const packageData = body as ReleasePackageData;

    const existingRelease = await prisma.release.findUnique({
      where: { id: releaseId },
      include: {
        versions: {
          orderBy: { versionNum: 'desc' },
          take: 1,
          include: {
            statements: true,
          },
        },
      },
    });

    if (!existingRelease) {
      return NextResponse.json({ success: false, error: 'Release not found' }, { status: 404 });
    }

    const previousVersion = existingRelease.versions[0];
    const newVersionNum = existingRelease.currentVersionNum + 1;

    const packageJsonStr = JSON.stringify(packageData);
    const packageHash = sha256(packageJsonStr);

    const allNewItems: ReleasePackageItem[] = [
      ...packageData.features,
      ...packageData.bugFixes,
      ...packageData.changedBehaviours,
      ...packageData.qaSummaries,
      ...packageData.knownLimitations,
      ...packageData.migrationNotes,
      ...packageData.affectedUserGroups,
    ];

    // Create new version and update currentVersionNum
    const newVersion = await prisma.$transaction(async (tx) => {
      await tx.release.update({
        where: { id: releaseId },
        data: {
          name: packageData.releaseName,
          versionLabel: packageData.versionLabel,
          currentVersionNum: newVersionNum,
        },
      });

      const ver = await tx.releaseVersion.create({
        data: {
          releaseId,
          versionNum: newVersionNum,
          packageSnapshot: packageJsonStr,
          packageHash,
        },
      });

      if (allNewItems.length > 0) {
        await tx.releaseItem.createMany({
          data: allNewItems.map((item) => ({
            id: item.id,
            releaseVersionId: ver.id,
            category: item.category,
            title: item.title,
            description: item.description,
          })),
        });
      }

      // Run deterministic checks
      const checks = runDeterministicChecks(packageData);
      await tx.checkResult.createMany({
        data: checks.map((c) => ({
          releaseVersionId: ver.id,
          ruleId: c.ruleId,
          name: c.name,
          status: c.status,
          message: c.message,
          details: c.details,
        })),
      });

      // Carry forward statements from previous version and evaluate stale status
      if (previousVersion && previousVersion.statements.length > 0) {
        for (const prevStmt of previousVersion.statements) {
          const citations: string[] = JSON.parse(prevStmt.citations || '[]');
          const newSourceHash = computeCitedSourceHash(citations, allNewItems);
          const isStale = newSourceHash !== prevStmt.sourceHash;
          const staleReason = isStale
            ? `Cited source item(s) [${citations.join(', ')}] were modified or removed in v${newVersionNum}`
            : prevStmt.staleReason;

          // If statement cited items changed/removed (isStale === true), reset status to NEEDS_REVIEW
          let newStatus = prevStmt.status;
          if (isStale) {
            newStatus = 'NEEDS_REVIEW'; // Distinct state for stale statements needing re-review
          }


          await tx.statement.create({
            data: {
              releaseVersionId: ver.id,
              audience: prevStmt.audience,
              text: prevStmt.text,
              originalText: prevStmt.originalText,
              citations: prevStmt.citations,
              status: newStatus,
              sourceHash: newSourceHash,
              isStale,
              staleReason: isStale ? staleReason : null,
              orderIndex: prevStmt.orderIndex,
            },
          });

        }
      }

      return ver;
    });

    logStep('Created new immutable release version', {
      releaseId,
      versionNum: newVersionNum,
      packageHash,
    });

    return NextResponse.json({
      success: true,
      version: newVersion,
      versionNum: newVersionNum,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Error creating version';
    logStep('Failed creating new version snapshot', { releaseId: params.id, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
