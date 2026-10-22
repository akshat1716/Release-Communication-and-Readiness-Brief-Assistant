/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChecksTab from '../components/ChecksTab';
import { DeterministicCheckResult } from '../lib/types/release';

const mockChecksList: DeterministicCheckResult[] = [
  { ruleId: 'CHECK_QA_EMPTY', name: 'QA Evidence Verification', status: 'PASS', message: 'QA evidence verified' },
  { ruleId: 'CHECK_LIMITATIONS_EMPTY', name: 'Known Limitations Section', status: 'WARN', message: 'Consider documenting known limitations' },
  { ruleId: 'CHECK_BEHAVIOUR_MIGRATION', name: 'Behaviour Change & Migration Alignment', status: 'FAIL', message: 'Missing migration notes for changed behaviour' },
];

describe('ChecksTab Component UI Tests', () => {
  it('renders loading skeleton when isLoading or isReRunning is true', () => {
    render(
      <ChecksTab
        checks={[]}
        isLoading={true}
      />
    );

    expect(screen.getByLabelText('Loading checks')).toBeInTheDocument();
  });

  it('renders error state banner with retry button', () => {
    const onRetry = vi.fn();
    render(
      <ChecksTab
        checks={[]}
        error="Failed to evaluate deterministic checks from database"
        onReRunChecks={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to evaluate deterministic checks from database')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders empty state when checks array is empty', () => {
    render(
      <ChecksTab
        checks={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('No Deterministic Checks Found')).toBeInTheDocument();
  });

  it('renders pass, warning, and failure counts and cards properly', () => {
    render(
      <ChecksTab
        checks={mockChecksList}
        isLoading={false}
      />
    );

    expect(screen.getByText(/1 Passed/)).toBeInTheDocument();
    expect(screen.getByText(/1 Warnings/)).toBeInTheDocument();
    expect(screen.getByText(/1 Failed/)).toBeInTheDocument();

    expect(screen.getByText('CHECK_QA_EMPTY')).toBeInTheDocument();
    expect(screen.getByText('CHECK_LIMITATIONS_EMPTY')).toBeInTheDocument();
    expect(screen.getByText('CHECK_BEHAVIOUR_MIGRATION')).toBeInTheDocument();
  });
});
