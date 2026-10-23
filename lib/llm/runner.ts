import { LlmError, classifyError } from './errors';
import { defensiveJsonParse } from './parser';
import {
  assertPromptWithinLimits,
  calculateLlmCost,
  estimateTokenCount,
  getLlmTokenConfig,
  UsageMetrics,
  CostEstimateResult,
} from './tokens';

export interface UsageMetadataLike {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  candidatesTokensDetails?: Array<{ thinkingTokenCount?: number }>;
}

export interface GenerateResponseLike {
  text: string;
  usageMetadata?: UsageMetadataLike;
}

export type GenerateFn = (
  prompt: string,
  options: { signal?: AbortSignal; maxOutputTokens?: number }
) => Promise<GenerateResponseLike>;

export interface RunLlmJsonDependencies {
  generate: GenerateFn;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
}

export interface RunLlmJsonOptions {
  maxAttempts?: number;
  stepDeadlineMs?: number;
  callTimeoutMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  maxRepairAttempts?: number;
  maxOutputTokens?: number;
}

export interface RunLlmJsonResult<T> {
  data: T;
  latencyMs: number;
  attempts: number;
  usage: UsageMetrics;
  costEstimate: CostEstimateResult;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
const defaultNow = (): number => Date.now();
const defaultRandom = (): number => Math.random();

/**
 * Pure, dependency-injected LLM JSON runner.
 * Orchestrates pre-flight validation, per-call timeouts, overall step deadlines,
 * exponential backoff with jitter for transient errors, and self-healing repair prompts
 * for parse/validation errors.
 */
export async function runLlmJson<T>(
  prompt: string,
  schema: { parse: (val: unknown) => T },
  stepName: string,
  deps: RunLlmJsonDependencies,
  options?: RunLlmJsonOptions
): Promise<RunLlmJsonResult<T>> {
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? defaultNow;
  const random = deps.random ?? defaultRandom;

  const maxAttempts =
    options?.maxAttempts ??
    parseInt(process.env.LLM_MAX_ATTEMPTS || '3', 10);
  const stepDeadlineMs =
    options?.stepDeadlineMs ??
    parseInt(process.env.LLM_STEP_DEADLINE_MS || '45000', 10);
  const callTimeoutMs =
    options?.callTimeoutMs ??
    parseInt(process.env.LLM_CALL_TIMEOUT_MS || '15000', 10);
  const retryBaseMs =
    options?.retryBaseMs ??
    parseInt(process.env.LLM_RETRY_BASE_MS || '500', 10);
  const retryMaxMs =
    options?.retryMaxMs ??
    parseInt(process.env.LLM_RETRY_MAX_MS || '5000', 10);
  const maxRepairAttempts = options?.maxRepairAttempts ?? 2;
  const tokenConfig = getLlmTokenConfig();
  const maxOutputTokens = options?.maxOutputTokens ?? tokenConfig.maxOutputTokens;

  // 1. Pre-flight token limit check (throws HTTP 413 if exceeded)
  assertPromptWithinLimits(prompt, tokenConfig.maxInputTokens);

  const startTime = now();
  const deadline = startTime + stepDeadlineMs;

  let attempt = 0;
  let repairCount = 0;
  let currentPrompt = prompt;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    attempt++;

    // 2. Check total step deadline before starting attempt
    const currentTime = now();
    if (currentTime >= deadline) {
      throw new LlmError({
        code: 'DEADLINE_EXCEEDED',
        statusCode: 504,
        retryable: false,
        attempts: attempt - 1,
        message: `Step '${stepName}' exceeded total execution deadline of ${stepDeadlineMs}ms (elapsed: ${currentTime - startTime}ms).`,
      });
    }

    // 3. Set up per-call timeout via AbortController, bounded by remaining deadline
    const remainingDeadline = deadline - currentTime;
    const effectiveCallTimeout = Math.min(callTimeoutMs, remainingDeadline);

    if (effectiveCallTimeout <= 0) {
      throw new LlmError({
        code: 'DEADLINE_EXCEEDED',
        statusCode: 504,
        retryable: false,
        attempts: attempt - 1,
        message: `No remaining time budget for step '${stepName}' before deadline.`,
      });
    }

    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let callTimedOut = false;

    const clearCallTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    try {
      timeoutId = setTimeout(() => {
        callTimedOut = true;
        abortController.abort();
      }, effectiveCallTimeout);

      // 4. Generate content with signal and token bounds, racing against the abort signal
      const generatePromise = deps.generate(currentPrompt, {
        signal: abortController.signal,
        maxOutputTokens,
      });

      const response = await new Promise<GenerateResponseLike>((resolve, reject) => {
        let settled = false;

        const onAbort = () => {
          if (settled) return;
          settled = true;
          abortController.signal.removeEventListener('abort', onAbort);
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        };

        if (abortController.signal.aborted) {
          onAbort();
          return;
        }

        abortController.signal.addEventListener('abort', onAbort);

        generatePromise
          .then((res) => {
            if (settled) return;
            settled = true;
            abortController.signal.removeEventListener('abort', onAbort);
            resolve(res);
          })
          .catch((err) => {
            if (settled) return;
            settled = true;
            abortController.signal.removeEventListener('abort', onAbort);
            reject(err);
          });
      });

      clearCallTimer();

      // 5. Defensive JSON Parsing
      const parsedJson = defensiveJsonParse(response.text);

      // 6. Schema validation
      const validatedData = schema.parse(parsedJson);

      // 7. Telemetry & Cost calculations
      const latencyMs = now() - startTime;
      const usageMetadata = response.usageMetadata;
      const promptTokens =
        usageMetadata?.promptTokenCount ?? estimateTokenCount(currentPrompt);
      const candidatesTokens =
        usageMetadata?.candidatesTokenCount ?? estimateTokenCount(response.text);
      const totalTokens =
        usageMetadata?.totalTokenCount ?? promptTokens + candidatesTokens;
      const thoughtsTokens =
        usageMetadata?.thoughtsTokenCount ??
        usageMetadata?.candidatesTokensDetails?.[0]?.thinkingTokenCount ??
        0;

      const usage: UsageMetrics = {
        promptTokens,
        candidatesTokens,
        totalTokens,
        thoughtsTokens,
      };

      const costEstimate = calculateLlmCost(usage, tokenConfig);

      return {
        data: validatedData,
        latencyMs,
        attempts: attempt,
        usage,
        costEstimate,
      };
    } catch (err: unknown) {
      clearCallTimer();

      lastError = err;

      // Handle call timeout specifically
      if (callTimedOut || (err instanceof Error && err.name === 'AbortError')) {
        const remainingAfterTimeout = deadline - now();
        if (remainingAfterTimeout <= 0) {
          throw new LlmError({
            code: 'DEADLINE_EXCEEDED',
            statusCode: 504,
            retryable: false,
            attempts: attempt,
            message: `Step '${stepName}' exceeded total execution deadline of ${stepDeadlineMs}ms.`,
          });
        }
        if (attempt >= maxAttempts) {
          throw new LlmError({
            code: 'NETWORK_TIMEOUT',
            statusCode: 504,
            retryable: false,
            attempts: attempt,
            message: `LLM call timed out after ${effectiveCallTimeout}ms for step '${stepName}'.`,
          });
        }
      }

      // Check if this is a Parse Error (SyntaxError) or Schema Validation Error (ZodError)
      const isParseError = err instanceof SyntaxError;
      const isZodError =
        Boolean(err && typeof err === 'object' && 'issues' in err) ||
        (err instanceof Error && err.name === 'ZodError');

      if (isParseError || isZodError) {
        if (repairCount < maxRepairAttempts && attempt < maxAttempts) {
          repairCount++;

          let errorSummary = 'Invalid JSON output structure.';
          if (isZodError && 'issues' in (err as any)) {
            const issues = (err as any).issues || [];
            errorSummary = issues
              .map((i: any) => `${(i.path || []).join('.')}: ${i.message}`)
              .join('; ');
          } else if (err instanceof Error) {
            errorSummary = err.message;
          }

          // Build repair prompt embedding validation error summary
          currentPrompt = `${prompt}

[SYSTEM INSTRUCTION: PREVIOUS OUTPUT VALIDATION FAILED]
Your previous attempt failed schema validation with the following error(s):
${errorSummary}

Correction instructions:
- Fix all invalid fields listed above.
- Return strictly valid JSON matching the exact expected schema.
- Do NOT include conversational commentary.`;

          continue; // Attempt self-repair immediately without long delay
        }

        // Exhausted repair attempts or max attempts
        throw new LlmError({
          code: 'INVALID_MODEL_OUTPUT',
          statusCode: 502,
          retryable: false,
          attempts: attempt,
          message: `Model output failed schema validation after ${repairCount} repair attempt(s): ${err instanceof Error ? err.message : String(err)}`,
          details: err,
        });
      }

      // Other errors: classify as transient or non-retryable
      const classified = classifyError(err, attempt);

      // Non-retryable errors fail fast immediately
      if (!classified.retryable || attempt >= maxAttempts) {
        throw new LlmError({
          code: classified.code,
          statusCode: classified.statusCode,
          retryable: false,
          attempts: attempt,
          message: classified.message,
          details: err,
        });
      }

      // Transient retryable error: calculate exponential backoff + jitter
      const expBackoff = retryBaseMs * 2 ** (attempt - 1);
      const jitter = random() * Math.min(expBackoff * 0.25, 500);
      const delayMs = Math.min(retryMaxMs, Math.round(expBackoff + jitter));

      const timeBeforeSleep = now();
      const remainingBeforeSleep = deadline - timeBeforeSleep;

      // Rule: Never sleep past the deadline!
      if (delayMs >= remainingBeforeSleep) {
        throw new LlmError({
          code: 'DEADLINE_EXCEEDED',
          statusCode: 504,
          retryable: false,
          attempts: attempt,
          message: `Cannot sleep for ${delayMs}ms because only ${remainingBeforeSleep}ms remains before step deadline.`,
        });
      }

      await sleep(delayMs);
    }
  }

  const finalClassified = classifyError(lastError, attempt);
  throw new LlmError({
    code: finalClassified.code,
    statusCode: finalClassified.statusCode,
    retryable: false,
    attempts: attempt,
    message: finalClassified.message,
    details: lastError,
  });
}
