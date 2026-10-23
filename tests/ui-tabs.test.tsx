/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReleaseTabs, { ReleaseTabKey } from '../components/ReleaseTabs';

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('ReleaseTabs Component (Accessibility, States & Keyboard Navigation)', () => {
  it('renders all 6 release tabs within a tablist with correct initial active state', () => {
    const onTabChange = vi.fn();

    render(
      <ReleaseTabs
        activeTab="package"
        onTabChange={onTabChange}
        checksCount={6}
        statementsCount={4}
        versionsCount={2}
      />
    );

    const tablist = screen.getByRole('tablist', { name: /release management sections/i });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);

    const packageTab = screen.getByRole('tab', { name: /package form/i });
    expect(packageTab).toHaveAttribute('aria-selected', 'true');
    expect(packageTab).toHaveAttribute('tabIndex', '0');

    const checksTab = screen.getByRole('tab', { name: /checks \(6\)/i });
    expect(checksTab).toHaveAttribute('aria-selected', 'false');
    expect(checksTab).toHaveAttribute('tabIndex', '-1');

    const summariesTab = screen.getByRole('tab', { name: /summaries \(4\)/i });
    expect(summariesTab).toBeInTheDocument();

    const compareTab = screen.getByRole('tab', { name: /versions \/ compare \(2\)/i });
    expect(compareTab).toBeInTheDocument();

    const briefTab = screen.getByRole('tab', { name: /final brief/i });
    expect(briefTab).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();

    render(
      <ReleaseTabs
        activeTab="package"
        onTabChange={onTabChange}
        checksCount={3}
        statementsCount={2}
        versionsCount={1}
      />
    );

    const summariesTab = screen.getByRole('tab', { name: /summaries \(2\)/i });
    fireEvent.click(summariesTab);

    expect(onTabChange).toHaveBeenCalledWith('summaries');
  });

  it('navigates to next tab on ArrowRight and wraps around', () => {
    const onTabChange = vi.fn();

    const { rerender } = render(
      <ReleaseTabs
        activeTab="package"
        onTabChange={onTabChange}
        checksCount={3}
        statementsCount={2}
        versionsCount={1}
      />
    );

    const tablist = screen.getByRole('tablist');

    // ArrowRight from 'package' -> should select 'checks'
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('checks');

    // Rerender as if state updated to 'brief' (last tab)
    rerender(
      <ReleaseTabs
        activeTab="brief"
        onTabChange={onTabChange}
        checksCount={3}
        statementsCount={2}
        versionsCount={1}
      />
    );

    // ArrowRight from last tab ('brief') -> should wrap to first ('package')
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('package');
  });

  it('navigates to previous tab on ArrowLeft and wraps around', () => {
    const onTabChange = vi.fn();

    const { rerender } = render(
      <ReleaseTabs
        activeTab="checks"
        onTabChange={onTabChange}
        checksCount={3}
        statementsCount={2}
        versionsCount={1}
      />
    );

    const tablist = screen.getByRole('tablist');

    // ArrowLeft from 'checks' -> should select 'package'
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith('package');

    // Rerender on first tab ('package')
    rerender(
      <ReleaseTabs
        activeTab="package"
        onTabChange={onTabChange}
        checksCount={3}
        statementsCount={2}
        versionsCount={1}
      />
    );

    // ArrowLeft from 'package' -> should wrap to last ('brief')
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith('brief');
  });

  it('jumps to first tab on Home and last tab on End', () => {
    const onTabChange = vi.fn();

    render(
      <ReleaseTabs
        activeTab="analysis"
        onTabChange={onTabChange}
        checksCount={3}
        statementsCount={2}
        versionsCount={1}
      />
    );

    const tablist = screen.getByRole('tablist');

    // Press Home -> jump to 'package'
    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(onTabChange).toHaveBeenCalledWith('package');

    // Press End -> jump to 'brief'
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(onTabChange).toHaveBeenCalledWith('brief');
  });
});
