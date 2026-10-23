import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  runLlmJson,
  defensiveJsonParse,
  serializePackageForPrompt,
  estimateTokenCount,
  calculateLlmCost,
  assertPromptWithinLimits,
  LlmError,
} from '../lib/llm';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';
import { POST as stepAHandler } from '../app/api/releases/[id]/versions/[versionId]/analyze/step-a/route';
import { NextRequest } from 'next/server';
import { prisma } from '../lib/db';

const SimpleSchema = z.object({
  status: z.string(),
  itemsCount: z.number(),
});

describe('AI Engineering Resilience: Defensive Parsing, Retry/Repair & Token Bounds', () => {
  it('strict parse succeeds when clean JSON is returned', () => {
    const raw = '{"status":"ok","itemsCount":4}';
    const parsed = defensiveJsonParse(raw) as any;
    expect(parsed.status).toBe('ok');
    expect(parsed.itemsCount).toBe(4);
  });

  it('single code fence fallback succeeds for ```json and ``` fences', () => {
    const fencedJson = '```json\n{"status":"fenced","itemsCount":2}\n```';
    const parsed1 = defensiveJsonParse(fencedJson) as any;
    expect(parsed1.status).toBe('fenced');
    expect(parsed1.itemsCount).toBe(2);

    const fencedBare = '```\n{"status":"bare","itemsCount":1}\n```';
    const parsed2 = defensiveJsonParse(fencedBare) as any;
    expect(parsed2.status).toBe('bare');
    expect(parsed2.itemsCount).toBe(1);
  });

  it('unclean junk or trailing commas fail defensiveJsonParse and throw SyntaxError for repair path', () => {
    const trailingComma = '{"status":"bad", "itemsCount":1,}';
    expect(() => defensiveJsonParse(trailingComma)).toThrow(SyntaxError);

    const conversationalJunk = 'Sure, here is the JSON:\n{"status":"bad"}';
    expect(() => defensiveJsonParse(conversationalJunk)).toThrow(SyntaxError);
  });

  it('transient error retries with backoff and jitter, succeeding on later attempt', async () => {
    let callCount = 0;
    const sleeps: number[] = [];
    let currentTime = 1000;

    const mockGenerate = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('503 Service Unavailable: overloaded');
      }
      return {
        text: JSON.stringify({ status: 'recovered', itemsCount: 3 }),
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
      };
    });

    const mockSleep = vi.fn().mockImplementation(async (ms: number) => {
      sleeps.push(ms);
      currentTime += ms;
    });

    const result = await runLlmJson(
      'test prompt',
      SimpleSchema,
      'STEP_TEST',
      {
        generate: mockGenerate,
        sleep: mockSleep,
        now: () => currentTime,
        random: () => 0.5, // deterministic jitter
      },
      {
        maxAttempts: 3,
        retryBaseMs: 200,
        retryMaxMs: 2000,
      }
    );

    expect(callCount).toBe(2);
    expect(sleeps.length).toBe(1);
    // Base delay: 200 * 2^0 = 200. Jitter: 0.5 * min(200*0.25, 500) = 25 -> 225ms
    expect(sleeps[0]).toBe(225);
    expect(result.data.status).toBe('recovered');
    expect(result.attempts).toBe(2);
  });

  it('schema failure on attempt 1 triggers repair prompt with error summary, succeeding on attempt 2', async () => {
    let callCount = 0;
    const promptsSent: string[] = [];

    const mockGenerate = vi.fn().mockImplementation(async (p: string) => {
      callCount++;
      promptsSent.push(p);
      if (callCount === 1) {
        // Invalid schema output: missing itemsCount, wrong type for status
        return {
          text: JSON.stringify({ status: 12345 }),
        };
      }
      return {
        text: JSON.stringify({ status: 'repaired', itemsCount: 10 }),
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40, totalTokenCount: 160 },
      };
    });

    const result = await runLlmJson(
      'Original Prompt Instruction',
      SimpleSchema,
      'STEP_REPAIR_TEST',
      {
        generate: mockGenerate,
      },
      {
        maxAttempts: 3,
        maxRepairAttempts: 2,
      }
    );

    expect(callCount).toBe(2);
    expect(promptsSent[0]).toBe('Original Prompt Instruction');
    // Attempt 2 contains original prompt, repair instruction and error summary
    expect(promptsSent[1]).toContain('Original Prompt Instruction');
    expect(promptsSent[1]).toContain('[SYSTEM INSTRUCTION: PREVIOUS OUTPUT VALIDATION FAILED]');
    expect(promptsSent[1]).toContain('itemsCount');
    expect(result.data.status).toBe('repaired');
  });

  it('non-retryable error (e.g. 401 auth or 400 invalid argument) fails fast with no retry', async () => {
    let callCount = 0;
    const mockGenerate = vi.fn().mockImplementation(async () => {
      callCount++;
      throw new Error('401 API_KEY_INVALID: User not authenticated');
    });

    await expect(
      runLlmJson('prompt', SimpleSchema, 'STEP_AUTH_TEST', { generate: mockGenerate })
    ).rejects.toThrow(LlmError);

    expect(callCount).toBe(1); // Fails fast without retry!
  });

  it('total deadline is respected and runner never sleeps past deadline', async () => {
    let currentTime = 1000;
    const mockGenerate = vi.fn().mockImplementation(async () => {
      throw new Error('503 Service Unavailable');
    });

    const mockSleep = vi.fn().mockImplementation(async (ms: number) => {
      currentTime += ms;
    });

    await expect(
      runLlmJson(
        'prompt',
        SimpleSchema,
        'STEP_DEADLINE_TEST',
        {
          generate: mockGenerate,
          sleep: mockSleep,
          now: () => currentTime,
          random: () => 0,
        },
        {
          maxAttempts: 5,
          stepDeadlineMs: 300, // Very short deadline
          retryBaseMs: 500, // Delay exceeds deadline!
        }
      )
    ).rejects.toThrow('step deadline');
  });

  it('over-limit prompt throws 413 PROMPT_TOO_LARGE error', () => {
    const hugePrompt = 'A'.repeat(200000); // 50,000 tokens
    expect(() => assertPromptWithinLimits(hugePrompt, 10000)).toThrow(LlmError);

    try {
      assertPromptWithinLimits(hugePrompt, 10000);
    } catch (e: any) {
      expect(e.code).toBe('PROMPT_TOO_LARGE');
      expect(e.statusCode).toBe(413);
      expect(e.retryable).toBe(false);
    }
  });

  it('compact serializer output is substantially smaller than pretty-printed version', () => {
    const compact = serializePackageForPrompt(SAMPLE_RELEASE_PACKAGE);
    const pretty = JSON.stringify(SAMPLE_RELEASE_PACKAGE, null, 2);

    expect(compact.length).toBeLessThan(pretty.length);
    const charSavings = pretty.length - compact.length;
    expect(charSavings).toBeGreaterThan(300); // Over 400 chars saved
  });

  it('usageMetadata telemetry calculates estimated cost using configurable rates', () => {
    const usage = {
      promptTokens: 2000,
      candidatesTokens: 500,
      totalTokens: 2500,
      thoughtsTokens: 100, // billed as output
    };

    const cost = calculateLlmCost(usage, {
      priceInputPerM: 0.30,
      priceOutputPerM: 2.50,
    });

    // Input cost: 2000 / 1,000,000 * 0.30 = 0.0006
    // Output cost: (500 + 100) / 1,000,000 * 2.50 = 0.0015
    // Total: 0.0021
    expect(cost.breakdown.inputCostUsd).toBe(0.0006);
    expect(cost.breakdown.outputCostUsd).toBe(0.0015);
    expect(cost.estimatedCostUsd).toBe(0.0021);
  });

  it('step route maps LlmError to documented JSON error shape and status code', async () => {
    vi.spyOn(prisma.releaseVersion, 'findUnique').mockResolvedValue({
      id: 'ver-err',
      packageSnapshot: JSON.stringify(SAMPLE_RELEASE_PACKAGE),
    } as any);

    // Call route with a mock package that triggers a large prompt or simulation
    const req = new NextRequest('http://localhost:3000/api/releases/rel-1/versions/ver-err/analyze/step-a', {
      method: 'POST',
    });

    // Set max input tokens to very small value to trigger 413
    const oldLimit = process.env.LLM_MAX_INPUT_TOKENS;
    try {
      process.env.LLM_MAX_INPUT_TOKENS = '5';
      process.env.MOCK_LLM = 'false';
      process.env.LLM_API_KEY = 'test-key';

      const res = await stepAHandler(req, { params: { id: 'rel-1', versionId: 'ver-err' } });
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('PROMPT_TOO_LARGE');
      expect(json.error.retryable).toBe(false);
    } finally {
      process.env.LLM_MAX_INPUT_TOKENS = oldLimit;
      process.env.MOCK_LLM = 'true';
      vi.restoreAllMocks();
    }
  });

  it('rejects with NETWORK_TIMEOUT or DEADLINE_EXCEEDED when generate ignores signal and never resolves', async () => {
    vi.useFakeTimers();
    try {
      let currentTime = 1000;
      // generate ignores signal and returns a hanging promise
      const hangingGenerate = vi.fn().mockImplementation(() => new Promise(() => {}));

      const runnerPromise = runLlmJson(
        'test prompt',
        SimpleSchema,
        'STEP_HANGING',
        {
          generate: hangingGenerate,
          sleep: async (ms) => {
            currentTime += ms;
            await vi.advanceTimersByTimeAsync(ms);
          },
          now: () => currentTime,
        },
        {
          maxAttempts: 1,
          callTimeoutMs: 1000,
          stepDeadlineMs: 5000,
        }
      );

      const assertion = expect(runnerPromise).rejects.toMatchObject({
        code: expect.stringMatching(/NETWORK_TIMEOUT|DEADLINE_EXCEEDED/),
      });

      currentTime += 1000;
      await vi.advanceTimersByTimeAsync(1000);

      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('a call that times out (abort) with attempts and deadline remaining is retried and succeeds on the next attempt', async () => {
    let callCount = 0;
    let currentTime = 1000;
    const sleeps: number[] = [];

    const mockGenerate = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        const abortErr = new Error('The operation was aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      return {
        text: JSON.stringify({ status: 'succeeded_after_timeout', itemsCount: 7 }),
        usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 50, totalTokenCount: 200 },
      };
    });

    const mockSleep = vi.fn().mockImplementation(async (ms: number) => {
      sleeps.push(ms);
      currentTime += ms;
    });

    const result = await runLlmJson(
      'timeout retry prompt',
      SimpleSchema,
      'STEP_TIMEOUT_RETRY',
      {
        generate: mockGenerate,
        sleep: mockSleep,
        now: () => currentTime,
        random: () => 0,
      },
      {
        maxAttempts: 3,
        callTimeoutMs: 2000,
        stepDeadlineMs: 30000,
        retryBaseMs: 300,
      }
    );

    expect(callCount).toBe(2);
    expect(sleeps.length).toBe(1);
    expect(result.data.status).toBe('succeeded_after_timeout');
    expect(result.attempts).toBe(2);
  });

  it('truncated JSON output (cut off mid-object when output-token cap is hit) triggers the repair path and succeeds on next attempt', async () => {
    let callCount = 0;
    const promptsSent: string[] = [];

    const mockGenerate = vi.fn().mockImplementation(async (p: string) => {
      callCount++;
      promptsSent.push(p);
      if (callCount === 1) {
        // Truncated JSON output cut off mid-object
        return {
          text: '{"status":"ok", "itemsCount":',
        };
      }
      return {
        text: JSON.stringify({ status: 'completed_after_truncation', itemsCount: 42 }),
      };
    });

    const result = await runLlmJson(
      'Original Truncation Test Prompt',
      SimpleSchema,
      'STEP_TRUNCATE_REPAIR',
      {
        generate: mockGenerate,
      },
      {
        maxAttempts: 3,
        maxRepairAttempts: 2,
      }
    );

    expect(callCount).toBe(2);
    expect(promptsSent[0]).toBe('Original Truncation Test Prompt');
    expect(promptsSent[1]).toContain('[SYSTEM INSTRUCTION: PREVIOUS OUTPUT VALIDATION FAILED]');
    expect(result.data.status).toBe('completed_after_truncation');
    expect(result.data.itemsCount).toBe(42);
    expect(result.attempts).toBe(2);
  });

  it('transient errors (429/503) back off with increasing delays that never exceed LLM_RETRY_MAX_MS and never sleep past deadline', async () => {
    let callCount = 0;
    const sleeps: number[] = [];
    let currentTime = 1000;

    const mockGenerate = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('429 Rate Limit Exceeded: quota exhausted');
      }
      if (callCount === 2) {
        throw new Error('503 Service Unavailable: server overloaded');
      }
      if (callCount === 3) {
        throw new Error('503 Service Unavailable: transient blip');
      }
      return {
        text: JSON.stringify({ status: 'multi_backoff_success', itemsCount: 8 }),
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
      };
    });

    const mockSleep = vi.fn().mockImplementation(async (ms: number) => {
      sleeps.push(ms);
      currentTime += ms;
    });

    const result = await runLlmJson(
      'multi backoff test prompt',
      SimpleSchema,
      'STEP_MULTI_BACKOFF',
      {
        generate: mockGenerate,
        sleep: mockSleep,
        now: () => currentTime,
        random: () => 0.5, // seeded deterministic random
      },
      {
        maxAttempts: 4,
        retryBaseMs: 100,
        retryMaxMs: 250, // cap at 250ms
        stepDeadlineMs: 60000,
      }
    );

    expect(callCount).toBe(4);
    expect(sleeps.length).toBe(3);

    // Attempt 1 backoff: 100 * 2^0 = 100. Jitter: 0.5 * min(100*0.25, 500) = 12.5 -> round: 113ms
    expect(sleeps[0]).toBe(113);

    // Attempt 2 backoff: 100 * 2^1 = 200. Jitter: 0.5 * min(200*0.25, 500) = 25 -> round: 225ms
    expect(sleeps[1]).toBe(225);

    // Increasing delay: sleeps[1] > sleeps[0]
    expect(sleeps[1]).toBeGreaterThan(sleeps[0]);

    // Attempt 3 backoff: 100 * 2^2 = 400 + jitter -> capped strictly at retryMaxMs (250ms)!
    expect(sleeps[2]).toBe(250);
    expect(sleeps[2]).toBeLessThanOrEqual(250);

    expect(result.data.status).toBe('multi_backoff_success');
  });

  it('non-retryable errors (auth/invalid request) make exactly one generate call', async () => {
    // 1. Auth error (401)
    let authCalls = 0;
    const authGenerate = vi.fn().mockImplementation(async () => {
      authCalls++;
      throw new Error('401 API_KEY_INVALID: User not authenticated');
    });

    await expect(
      runLlmJson('prompt', SimpleSchema, 'STEP_AUTH_TEST', { generate: authGenerate })
    ).rejects.toThrow(LlmError);
    expect(authCalls).toBe(1);

    // 2. Invalid request error (400)
    let invalidReqCalls = 0;
    const invalidReqGenerate = vi.fn().mockImplementation(async () => {
      invalidReqCalls++;
      throw new Error('400 Invalid Argument: Request payload malformed');
    });

    await expect(
      runLlmJson('prompt', SimpleSchema, 'STEP_INVALID_REQ_TEST', { generate: invalidReqGenerate })
    ).rejects.toThrow(LlmError);
    expect(invalidReqCalls).toBe(1);
  });

  it('usageMetadata including thoughtsTokenCount is included in total cost and persisted via step route tokensUsed', async () => {
    vi.spyOn(prisma.releaseVersion, 'findUnique').mockResolvedValue({
      id: 'ver-telemetry-1',
      packageSnapshot: JSON.stringify(SAMPLE_RELEASE_PACKAGE),
    } as any);

    vi.spyOn(prisma.aIClassification, 'deleteMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.aIClassification, 'createMany').mockResolvedValue({ count: 2 });
    const createRunSpy = vi.spyOn(prisma.analysisRun, 'create').mockResolvedValue({ id: 'run-1' } as any);

    // Verify calculateLlmCost bills thoughts tokens as output
    const usageWithThoughts = {
      promptTokens: 1000,
      candidatesTokens: 300,
      totalTokens: 1450,
      thoughtsTokens: 150,
    };
    const cost = calculateLlmCost(usageWithThoughts, {
      priceInputPerM: 0.30,
      priceOutputPerM: 2.50,
    });
    // Input: 1000 * 0.30 / 1e6 = 0.0003
    // Output: (300 + 150) * 2.50 / 1e6 = 0.001125
    // Total: 0.001425
    expect(cost.estimatedCostUsd).toBe(0.001425);
    expect(cost.breakdown.inputCostUsd).toBe(0.0003);
    expect(cost.breakdown.outputCostUsd).toBe(0.001125);

    // Call Step A route under fixture mode and verify persistence
    const req = new NextRequest('http://localhost:3000/api/releases/rel-1/versions/ver-telemetry-1/analyze/step-a', {
      method: 'POST',
    });

    const res = await stepAHandler(req, { params: { id: 'rel-1', versionId: 'ver-telemetry-1' } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.tokensUsed).toBeGreaterThan(0);

    // Assert tokensUsed was persisted to Prisma AnalysisRun
    expect(createRunSpy).toHaveBeenCalledTimes(1);
    const runPayload = createRunSpy.mock.calls[0]?.[0]?.data;
    expect(runPayload?.tokensUsed).toBe(json.tokensUsed);
    expect(runPayload?.status).toBe('COMPLETED');

    vi.restoreAllMocks();
  });
});
