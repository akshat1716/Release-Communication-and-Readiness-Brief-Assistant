import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logStep } from '@/lib/logger';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const existingStatement = await prisma.statement.findUnique({
      where: { id },
    });

    if (!existingStatement) {
      return NextResponse.json({ success: false, error: 'Statement not found' }, { status: 404 });
    }

    const { text, status } = body;

    // Validate status values allowed for human review
    const allowedStatuses = ['DRAFT', 'EDITED', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW'];

    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Determine final status
    let finalStatus = existingStatement.status;
    let newText = existingStatement.text;

    if (text !== undefined && text !== existingStatement.text) {
      newText = text;
      // If user edited text and didn't explicitly set APPROVED or REJECTED, set status to EDITED
      if (!status || status === 'DRAFT') {
        finalStatus = 'EDITED';
      }
    }

    if (status) {
      finalStatus = status;
    }

    // If human reviewer approves or edits statement, clear isStale flag
    const isStale = finalStatus === 'APPROVED' ? false : existingStatement.isStale;

    const updated = await prisma.statement.update({
      where: { id },
      data: {
        text: newText,
        status: finalStatus,
        isStale,
        staleReason: isStale ? existingStatement.staleReason : null,
      },
    });

    logStep('Human reviewer updated statement status/text', {
      statementId: id,
      previousStatus: existingStatement.status,
      newStatus: finalStatus,
      textChanged: newText !== existingStatement.text,
    });

    return NextResponse.json({
      success: true,
      statement: updated,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Error updating statement';
    logStep('Failed updating statement', { statementId: params.id, error: errMessage });
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
