/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisTab, { StepProgressState } from '../components/AnalysisTab';

const mockInitialSteps: StepProgressState[] = [
  { key: 'step-a', name: 'Step A: User Impact Classifications', status: 'idle' },
  { key: 'step-b', name: 'Step B: Operational Gap Analysis', status: 'idle' },
  { key: 'step-c', name: 'Step C: QA Claim Verification', status: 'idle' },
  { key: 'step-d', name: 'Step D: Audience Summaries & Risks', status: 'idle' },
];

const mockFailedSteps: StepProgressState[] = [
  { key: 'step-a', name: 'Step A: User Impact Classifications', status: 'completed', durationMs: 1200, tokensUsed: 350 },
  { key: 'step-b', name: 'Step B: Operational Gap Analysis', status: 'completed', durationMs: 1400, tokensUsed: 400 },
  { key: 'step-c', name: 'Step C: QA Claim Verification', status: 'failed', durationMs: 800, error: '503 Service Unavailable' },
  { key: 'step-d', name: 'Step D: Audience Summaries & Risks', status: 'idle' },
];

describe('AnalysisTab Component UI & Step Recovery Tests', () => {
  it('renders progress bar and disabled trigger button during active analysis', () => {
    render(
      <AnalysisTab
        classifications={[]}
        missingInfos={[]}
        verifications={[]}
        stepStates={mockInitialSteps}
        onRunWholeWorkflow={vi.fn()}
        onRetryStep={vi.fn()}
        onResumeFrom={vi.fn()}
        isAnalyzing={true}
        currentStep="Step B: Operational Gap Analysis"
      />
    );

    expect(screen.getByText(/Executing Analysis Pipeline/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Step B: Operational Gap Analysis/i).length).toBeGreaterThanOrEqual(1);

    const runBtn = screen.getByRole('button', { name: /start multi-step ai analysis|running pipeline/i });
    expect(runBtn).toBeDisabled();
  });

  it('renders step failure with error message, Retry Step C, and Resume From Here buttons', () => {
    const onRetryMock = vi.fn();
    const onResumeMock = vi.fn();

    render(
      <AnalysisTab
        classifications={[]}
        missingInfos={[]}
        verifications={[]}
        stepStates={mockFailedSteps}
        onRunWholeWorkflow={vi.fn()}
        onRetryStep={onRetryMock}
        onResumeFrom={onResumeMock}
        isAnalyzing={false}
        analysisError="Analysis pipeline failed at Step C"
      />
    );

    // Shows which step failed
    expect(screen.getByText('503 Service Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Analysis pipeline failed at Step C')).toBeInTheDocument();

    // Retry Step C button
    const retryBtn = screen.getByLabelText(/retry only step c/i);
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetryMock).toHaveBeenCalledWith('step-c');

    // Resume From Here button
    const resumeBtn = screen.getByLabelText(/resume workflow starting from step c/i);
    expect(resumeBtn).toBeInTheDocument();
    fireEvent.click(resumeBtn);
    expect(onResumeMock).toHaveBeenCalledWith('step-c');
  });

  it('triggers onRunWholeWorkflow when clicking start/re-run workflow button', () => {
    const onRunWhole = vi.fn();

    render(
      <AnalysisTab
        classifications={[]}
        missingInfos={[]}
        verifications={[]}
        stepStates={mockInitialSteps}
        onRunWholeWorkflow={onRunWhole}
        onRetryStep={vi.fn()}
        onResumeFrom={vi.fn()}
        isAnalyzing={false}
      />
    );

    const startBtn = screen.getByRole('button', { name: /start multi-step ai analysis/i });
    fireEvent.click(startBtn);
    expect(onRunWhole).toHaveBeenCalled();
  });
});
