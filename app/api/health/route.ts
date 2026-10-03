import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isMockMode } from '@/lib/llm';
import { logStep } from '@/lib/logger';

export async function GET() {
  const isProd = process.env.NODE_ENV === 'production';
  const isMock = process.env.MOCK_LLM === 'true';

  // Requirement: If MOCK_LLM=true and NODE_ENV=production, fail startup / the health check
  if (isProd && isMock) {
    const errorMsg = 'MOCK_LLM=true is strictly prohibited in production environment';
    logStep('Health check failed: MOCK_LLM enabled in production', { error: errorMsg });

    return NextResponse.json(
      {
        status: 'UNHEALTHY',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  let dbStatus = 'HEALTHY';
  let dbError: string | undefined = undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: unknown) {
    dbStatus = 'UNHEALTHY';
    dbError = err instanceof Error ? err.message : 'Database connection failed';
  }

  const isHealthy = dbStatus === 'HEALTHY';

  logStep('Health check executed', {
    status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
    dbStatus,
    mockMode: isMockMode(),
  });

  return NextResponse.json(
    {
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: dbStatus, error: dbError },
        llm: {
          provider: process.env.LLM_PROVIDER || 'gemini',
          model: process.env.LLM_MODEL || 'gemini-2.5-flash',
          mockMode: isMockMode(),
        },
      },
    },
    { status: isHealthy ? 200 : 500 }
  );
}
