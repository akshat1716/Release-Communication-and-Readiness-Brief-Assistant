import { ReleasePackageData } from '../types/release';
import { LlmError } from './errors';

/**
 * Flag indicating whether the installed Gemini SDK supports a thinking budget config.
 * Checked against @google/generative-ai v0.21.0 (GenerationConfig lacks thinkingConfig).
 */
export const SUPPORTS_THINKING_BUDGET = false;

/**
 * Returns compact JSON serialization (no whitespace / indentation)
 * to minimize token consumption across all prompts.
 */
export function serializePackageForPrompt(packageData: ReleasePackageData): string {
  return JSON.stringify(packageData);
}

/**
 * Estimates token count based on a standard heuristic (characters / 4).
 * Documented explicitly as an approximation for pre-flight budgeting.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Configuration options for token budgets and cost calculations.
 */
export interface LlmTokenConfig {
  maxInputTokens: number;
  maxOutputTokens: number;
  priceInputPerM: number;
  priceOutputPerM: number;
}

export function getLlmTokenConfig(): LlmTokenConfig {
  return {
    maxInputTokens: parseInt(process.env.LLM_MAX_INPUT_TOKENS || '50000', 10),
    maxOutputTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '8192', 10),
    priceInputPerM: parseFloat(process.env.LLM_PRICE_INPUT_PER_M || '0.30'),
    priceOutputPerM: parseFloat(process.env.LLM_PRICE_OUTPUT_PER_M || '2.50'),
  };
}

/**
 * Pre-flight validation ensuring prompt does not exceed max input token limits.
 * Rejects with HTTP 413 and LlmError if over the limit.
 */
export function assertPromptWithinLimits(prompt: string, maxTokens?: number): number {
  const config = getLlmTokenConfig();
  const limit = maxTokens ?? config.maxInputTokens;
  const estimated = estimateTokenCount(prompt);

  if (estimated > limit) {
    throw new LlmError({
      code: 'PROMPT_TOO_LARGE',
      statusCode: 413,
      retryable: false,
      attempts: 0,
      message: `Prompt exceeds input limit: estimated ${estimated} tokens exceeds maximum allowed ${limit} tokens (LLM_MAX_INPUT_TOKENS).`,
      details: { estimatedTokens: estimated, maxAllowed: limit },
    });
  }

  return estimated;
}

export interface UsageMetrics {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  thoughtsTokens?: number;
}

export interface CostEstimateResult {
  estimatedCostUsd: number;
  rates: {
    inputPerM: number;
    outputPerM: number;
  };
  breakdown: {
    inputCostUsd: number;
    outputCostUsd: number;
  };
}

/**
 * Calculates estimated USD cost based on token usage and environment rates.
 * Note: Thinking tokens, if present, are billed as output tokens.
 */
export function calculateLlmCost(
  usage: UsageMetrics,
  config?: Pick<LlmTokenConfig, 'priceInputPerM' | 'priceOutputPerM'>
): CostEstimateResult {
  const cfg = config ?? getLlmTokenConfig();
  const inputCost = (usage.promptTokens / 1_000_000) * cfg.priceInputPerM;
  const billableOutputTokens = usage.candidatesTokens + (usage.thoughtsTokens || 0);
  const outputCost = (billableOutputTokens / 1_000_000) * cfg.priceOutputPerM;
  const totalCost = Number((inputCost + outputCost).toFixed(6));

  return {
    estimatedCostUsd: totalCost,
    rates: {
      inputPerM: cfg.priceInputPerM,
      outputPerM: cfg.priceOutputPerM,
    },
    breakdown: {
      inputCostUsd: Number(inputCost.toFixed(6)),
      outputCostUsd: Number(outputCost.toFixed(6)),
    },
  };
}
