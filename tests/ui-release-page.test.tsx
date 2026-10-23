/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import ReleaseDetailPage from '../app/releases/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'release-test-abort' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('ReleaseDetailPage Component Lifecycle Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('aborts in-flight network requests when the release page unmounts', () => {
    let capturedSignal: AbortSignal | undefined;

    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal;
      // Return a pending promise representing an in-flight network request
      return new Promise(() => {});
    });

    const { unmount } = render(<ReleaseDetailPage />);

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    // Unmount while request is in flight
    unmount();

    // Signal must be cleanly aborted on unmount
    expect(capturedSignal?.aborted).toBe(true);
  });
});
