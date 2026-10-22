/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SummariesTab from '../components/SummariesTab';
import FinalBriefTab from '../components/FinalBriefTab';
import { StatementData } from '../lib/types/release';

describe('Safe Rendering of AI Content (XSS / Injection Immunity)', () => {
  const maliciousScriptPayload = '<script>alert(1)</script>';
  const maliciousImgPayload = '<img src=x onerror=alert(1)>';
  const maliciousCombinedText = `Malicious statement: ${maliciousScriptPayload} and ${maliciousImgPayload}`;

  const statementsWithInjections: StatementData[] = [
    {
      id: 'stmt-xss-1',
      audience: 'INTERNAL',
      text: maliciousCombinedText,
      originalText: maliciousCombinedText,
      citations: ['F1'],
      status: 'DRAFT',
      sourceHash: 'hash-xss',
      isStale: false,
      orderIndex: 1,
    },
  ];

  it('renders script and img payloads in SummariesTab as inert text without creating DOM script or img elements', () => {
    const { container } = render(
      <SummariesTab
        statements={statementsWithInjections}
        onUpdateStatement={vi.fn()}
      />
    );

    // Verify text is visible on screen as literal text
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();

    // Verify NO executable <script> or <img> DOM elements were created inside the statement container
    const scriptElements = container.querySelectorAll('script');
    expect(scriptElements.length).toBe(0);

    const imgElements = container.querySelectorAll('img');
    expect(imgElements.length).toBe(0);
  });

  it('renders raw markdown containing injection payloads as inert plain text in FinalBriefTab', async () => {
    const onGenerate = vi.fn().mockResolvedValue({
      markdown: `# Release Brief\n\nStatement: ${maliciousScriptPayload} and ${maliciousImgPayload}`,
    });

    const { container } = render(
      <FinalBriefTab
        releaseId="rel-1"
        versionId="ver-1"
        statements={[
          {
            ...statementsWithInjections[0],
            status: 'APPROVED',
          },
        ]}
        checks={[]}
        onGenerateBrief={onGenerate}
      />
    );

    const compileBtn = screen.getByRole('button', { name: /compile final brief/i });
    fireEvent.click(compileBtn);

    const outputPre = await screen.findByTestId('final-brief-markdown');
    expect(outputPre).toBeInTheDocument();

    // Text is rendered literally inside <pre>
    expect(outputPre.textContent).toContain('<script>alert(1)</script>');
    expect(outputPre.textContent).toContain('<img src=x onerror=alert(1)>');

    // Confirm no script or img elements created
    expect(container.querySelectorAll('script').length).toBe(0);
    expect(container.querySelectorAll('img').length).toBe(0);
  });
});
