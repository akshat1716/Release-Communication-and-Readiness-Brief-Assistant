/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SummariesTab from '../components/SummariesTab';
import { StatementData } from '../lib/types/release';

const mockStatements: StatementData[] = [
  {
    id: 'stmt-1',
    audience: 'INTERNAL',
    text: 'Internal technical statement about auth migration.',
    originalText: 'Internal technical statement about auth migration.',
    citations: ['F1', 'QA1'],
    status: 'DRAFT',
    sourceHash: 'hash1',
    isStale: false,
    orderIndex: 1,
  },
  {
    id: 'stmt-2',
    audience: 'INTERNAL',
    text: 'Approved internal statement.',
    originalText: 'Approved internal statement.',
    citations: ['F2'],
    status: 'APPROVED',
    sourceHash: 'hash2',
    isStale: false,
    orderIndex: 2,
  },
  {
    id: 'stmt-3',
    audience: 'INTERNAL',
    text: 'Stale statement that cited modified item.',
    originalText: 'Stale statement that cited modified item.',
    citations: ['C1'],
    status: 'NEEDS_REVIEW',
    sourceHash: 'hash3',
    isStale: true,
    staleReason: 'Cited item C1 was modified in v2',
    orderIndex: 3,
  },
];

describe('SummariesTab Component UI & Interaction Tests', () => {
  it('renders loading skeleton state when isLoading is true', () => {
    const { container } = render(
      <SummariesTab
        statements={[]}
        onUpdateStatement={vi.fn()}
        isLoading={true}
      />
    );

    const region = container.querySelector('[aria-busy="true"]');
    expect(region).toBeInTheDocument();
    expect(screen.getByLabelText('Loading statements')).toBeInTheDocument();
  });

  it('renders empty state with guidance when no statements exist', () => {
    render(
      <SummariesTab
        statements={[]}
        onUpdateStatement={vi.fn()}
        isLoading={false}
      />
    );

    expect(
      screen.getByText(/No internal statements generated yet/i)
    ).toBeInTheDocument();
  });

  it('renders status badges correctly for DRAFT, APPROVED, and STALE statements', () => {
    render(
      <SummariesTab
        statements={mockStatements}
        onUpdateStatement={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getAllByText('DRAFT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('STALE - NEEDS RE-REVIEW')).toBeInTheDocument();
    expect(screen.getByText(/Cited item C1 was modified in v2/)).toBeInTheDocument();
  });

  it('triggers onUpdateStatement when approving and rejecting statements', async () => {
    const onUpdateMock = vi.fn().mockResolvedValue(undefined);

    render(
      <SummariesTab
        statements={mockStatements}
        onUpdateStatement={onUpdateMock}
        isLoading={false}
      />
    );

    // Approve button for statement #1
    const approveBtn = screen.getByLabelText('Approve statement #1');
    fireEvent.click(approveBtn);
    expect(onUpdateMock).toHaveBeenCalledWith('stmt-1', undefined, 'APPROVED');

    // Reject button for statement #1
    const rejectBtn = screen.getByLabelText('Reject statement #1');
    fireEvent.click(rejectBtn);
    expect(onUpdateMock).toHaveBeenCalledWith('stmt-1', undefined, 'REJECTED');
  });

  it('opens inline editor, edits text, and saves changes', async () => {
    const onUpdateMock = vi.fn().mockResolvedValue(undefined);

    render(
      <SummariesTab
        statements={mockStatements}
        onUpdateStatement={onUpdateMock}
        isLoading={false}
      />
    );

    const editBtn = screen.getByLabelText('Edit statement #1');
    fireEvent.click(editBtn);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Updated human text' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    expect(onUpdateMock).toHaveBeenCalledWith('stmt-1', 'Updated human text');
  });
});
