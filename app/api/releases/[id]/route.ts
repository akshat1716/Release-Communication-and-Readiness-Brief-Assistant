import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logStep } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const releaseId = params.id;
    const release = await prisma.release.findUnique({
      where: { id: releaseId },
      include: {
        versions: {
          orderBy: { versionNum: 'desc' },
          include: {
            checks: true,
            statements: {
              orderBy: { orderIndex: 'asc' },
            },
            classifications: true,
            missingInfos: true,
            claimVerifications: true,
            riskLimitations: true,
            finalBriefs: {
              orderBy: { generatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!release) {
      return NextResponse.json({ success: false, error: 'Release not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, release });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Error fetching release';
    logStep('Error fetching release detail', { releaseId: params.id, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
