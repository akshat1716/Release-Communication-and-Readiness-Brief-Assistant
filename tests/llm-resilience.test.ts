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
    // Attempt 2 contains repair instruction and error summary
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
});
