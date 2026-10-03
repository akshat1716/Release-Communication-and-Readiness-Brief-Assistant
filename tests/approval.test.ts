import { describe, it, expect } from 'vitest';
import { runStepD } from '../lib/llm';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';

describe('AI Cannot Approve Hard Rule Policy', () => {
  it('should ensure LLM Step D produces only DRAFT statements', async () => {
    // Process step D output
    const { data } = await runStepD(SAMPLE_RELEASE_PACKAGE);

    // Verify all internal and client statements contain no approval flag
    for (const stmt of data.internalStatements) {
      expect(stmt).not.toHaveProperty('status', 'APPROVED');
      expect((stmt as unknown as { status?: string }).status).toBeUndefined();
    }

    for (const stmt of data.clientStatements) {
      expect(stmt).not.toHaveProperty('status', 'APPROVED');
      expect((stmt as unknown as { status?: string }).status).toBeUndefined();
    }
  });

  it('should verify production guard blocks MOCK_LLM=true in NODE_ENV=production', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalMock = process.env.MOCK_LLM;

    try {
      process.env.NODE_ENV = 'production';
      process.env.MOCK_LLM = 'true';

      await expect(runStepD(SAMPLE_RELEASE_PACKAGE)).rejects.toThrow(
        'MOCK_LLM=true or missing LLM_API_KEY is strictly prohibited in production environment'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.MOCK_LLM = originalMock;
    }
  });
});
