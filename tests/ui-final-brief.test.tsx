/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FinalBriefTab from '../components/FinalBriefTab';
import { StatementData, DeterministicCheckResult } from '../lib/types/release';

const mockChecks: DeterministicCheckResult[] = [
  { ruleId: 'CHECK_QA_EMPTY', name: 'QA Evidence Verification', status: 'PASS', message: 'OK' },
];

const mockDraftStatements: StatementData[] = [
  {
    id: 's1',
    audience: 'INTERNAL',
    text: 'Draft statement text',
    originalText: 'Draft statement text',
    citations: ['F1'],
    status: 'DRAFT',
    sourceHash: 'h1',
    isStale: false,
    orderIndex: 1,
  },
];

const mockApprovedStatements: StatementData[] = [
  {
    id: 's1',
    audience: 'INTERNAL',
    text: 'Approved statement text',
    originalText: 'Approved statement text',
    citations: ['F1'],
    status: 'APPROVED',
    sourceHash: 'h1',
    isStale: false,
    orderIndex: 1,
  },
];

describe('FinalBriefTab Component UI & Governance Tests', () => {
  it('is blocked by default when unreviewed draft statements remain', () => {
    render(
      <FinalBriefTab
        releaseId="rel-1"
        versionId="ver-1"
        statements={mockDraftStatements}
        checks={mockChecks}
        onGenerateBrief={vi.fn()}
      />
    );

    expect(screen.getByText('Governance Readiness Safeguard Alert')).toBeInTheDocument();
    expect(screen.getByText(/still in DRAFT or NEEDS_REVIEW/i)).toBeInTheDocument();

    const compileBtn = screen.getByRole('button', { name: /compile final brief/i });
    expect(compileBtn).toBeDisabled();
  });

  it('unblocks compilation button when allow partial brief checkbox is checked', () => {
    render(
      <FinalBriefTab
        releaseId="rel-1"
        versionId="ver-1"
        statements={mockDraftStatements}
        checks={mockChecks}
        onGenerateBrief={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText(/allow partial brief generation/i);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const compileBtn = screen.getByRole('button', { name: /compile final brief/i });
    expect(compileBtn).not.toBeDisabled();
  });

  it('is completely unblocked when all statements are approved and checks pass', () => {
    render(
      <FinalBriefTab
        releaseId="rel-1"
        versionId="ver-1"
        statements={mockApprovedStatements}
        checks={mockChecks}
        onGenerateBrief={vi.fn()}
      />
    );

    expect(screen.queryByText('Governance Readiness Safeguard Alert')).not.toBeInTheDocument();

    const compileBtn = screen.getByRole('button', { name: /compile final brief/i });
    expect(compileBtn).not.toBeDisabled();
  });

  it('renders loading compilation skeleton when isGenerating is true', () => {
    render(
      <FinalBriefTab
        releaseId="rel-1"
        versionId="ver-1"
        statements={mockApprovedStatements}
        checks={mockChecks}
        onGenerateBrief={vi.fn()}
        isGenerating={true}
      />
    );

    expect(screen.getByText(/Compiling Brief.../i)).toBeInTheDocument();
    expect(screen.getByLabelText('Compiling release brief')).toBeInTheDocument();
  });

  it('displays compiled markdown output when brief is generated', async () => {
    const onGenerate = vi.fn().mockResolvedValue({
      markdown: '# Core Platform v2.4.0 Release Brief\n\nApproved items here.',
    });

    render(
      <FinalBriefTab
        releaseId="rel-1"
        versionId="ver-1"
        statements={mockApprovedStatements}
        checks={mockChecks}
        onGenerateBrief={onGenerate}
      />
    );

    const compileBtn = screen.getByRole('button', { name: /compile final brief/i });
    fireEvent.click(compileBtn);

    const output = await screen.findByTestId('final-brief-markdown');
    expect(output).toBeInTheDocument();
    expect(output.textContent).toContain('Core Platform v2.4.0 Release Brief');
  });
});
