import { describe, it, expect } from 'vitest';
import { runStepA, runStepB, runStepC, runStepD } from '../lib/llm';
import { StepAOutputSchema, StepBOutputSchema, StepCOutputSchema, StepDOutputSchema } from '../lib/llm/schemas';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';

describe('LLM Service & Schema Validation', () => {
  it('should validate Step A output schema', async () => {
    const { data } = await runStepA(SAMPLE_RELEASE_PACKAGE);
    const parsed = StepAOutputSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(data.classifications.length).toBeGreaterThan(0);
  });

  it('should validate Step B output schema and detect gaps', async () => {
    const { data } = await runStepB(SAMPLE_RELEASE_PACKAGE);
    const parsed = StepBOutputSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(data.missingInfos.length).toBeGreaterThan(0);
    expect(data.missingInfos.some((m) => m.category === 'MIGRATION')).toBe(true);
  });

  it('should validate Step C output schema and flag unsupported claims', async () => {
    const { data } = await runStepC(SAMPLE_RELEASE_PACKAGE);
    const parsed = StepCOutputSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(data.verifications.some((v) => v.itemId === 'F1' && v.status === 'UNSUPPORTED')).toBe(true);
  });

  it('should validate Step D output schema and generate citations', async () => {
    const { data } = await runStepD(SAMPLE_RELEASE_PACKAGE);
    const parsed = StepDOutputSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(data.internalStatements.length).toBeGreaterThan(0);
    expect(data.clientStatements.length).toBeGreaterThan(0);
    expect(data.risksAndLimitations.length).toBeGreaterThan(0);
  });
});
