import { NextResponse } from 'next/server';
import { SAMPLE_RELEASE_PACKAGE } from '@/lib/fixtures/sample-release';
import { logStep } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  logStep('Fetched sample release package fixture', { action: 'GET_SAMPLE_RELEASE' });
  return NextResponse.json({
    success: true,
    package: SAMPLE_RELEASE_PACKAGE,
  });
}
