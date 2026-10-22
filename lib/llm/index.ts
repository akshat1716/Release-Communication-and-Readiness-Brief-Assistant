import { GoogleGenerativeAI } from '@google/generative-ai';
import { logStep } from '../logger';
import { ReleasePackageData } from '../types/release';
import {
  StepAOutputSchema,
  StepAOutput,
  StepBOutputSchema,
  StepBOutput,
  StepCOutputSchema,
  StepCOutput,
  StepDOutputSchema,
  StepDOutput,
} from './schemas';
import {
  getMockStepAOutput,
  getMockStepBOutput,
  getMockStepCOutput,
  getMockStepDOutput,
} from './fixtures';
import { sanitizeCitations } from './sanitizer';
import { runLlmJson, RunLlmJsonDependencies, RunLlmJsonResult } from './runner';
import {
  serializePackageForPrompt,
  estimateTokenCount,
  calculateLlmCost,
  assertPromptWithinLimits,
  getLlmTokenConfig,
  CostEstimateResult,
  UsageMetrics,
  SUPPORTS_THINKING_BUDGET,
} from './tokens';
import { LlmError, classifyError, LlmErrorCode } from './errors';
import { defensiveJsonParse } from './parser';

export {
  runLlmJson,
  serializePackageForPrompt,
  estimateTokenCount,
  calculateLlmCost,
  assertPromptWithinLimits,
  getLlmTokenConfig,
  LlmError,
  classifyError,
  defensiveJsonParse,
  SUPPORTS_THINKING_BUDGET,
};
export type { LlmErrorCode, CostEstimateResult, UsageMetrics };

export function isMockMode(): boolean {
  const isExplicitMock = process.env.MOCK_LLM === 'true';
  const noApiKey = !process.env.LLM_API_KEY || process.env.LLM_API_KEY.trim() === '';
  return isExplicitMock || noApiKey;
}

export function checkProductionMockGuard(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const isMock = process.env.MOCK_LLM === 'true';
  const noApiKey = !process.env.LLM_API_KEY || process.env.LLM_API_KEY.trim() === '';

  if (isProd && (isMock || noApiKey)) {
    const errorMsg = 'MOCK_LLM=true or missing LLM_API_KEY is strictly prohibited in production environment';
    logStep('CRITICAL: Blocked startup/execution due to MOCK_LLM or missing API key in production', {
      error: errorMsg,
      env: process.env.NODE_ENV,
    });
    throw new Error(errorMsg);
  }
}

export interface CallGeminiJsonResult<T> {
  data: T;
  latencyMs: number;
  model: string;
  tokensUsed?: number;
  estimatedCostUsd?: number;
  costDetails?: CostEstimateResult;
  usage?: UsageMetrics;
}

/**
 * Public Gemini JSON call wrapper with bounded retry, repair, backoff, and token budgeting.
 */
export async function callGeminiJson<T>(
  prompt: string,
  schema: { parse: (val: unknown) => T },
  stepName: string,
  depsOverride?: Partial<RunLlmJsonDependencies>
): Promise<CallGeminiJsonResult<T>> {
  checkProductionMockGuard();

  const apiKey = process.env.LLM_API_KEY || '';
  const modelName = process.env.LLM_MODEL || 'gemini-1.5-flash';

  if (!apiKey && !depsOverride?.generate) {
    throw new LlmError({
      code: 'AUTH_ERROR',
      statusCode: 401,
      retryable: false,
      attempts: 0,
      message: 'LLM_API_KEY is not configured in environment variables',
    });
  }

  const defaultGenerate = async (
    promptText: string,
    options: { signal?: AbortSignal; maxOutputTokens?: number }
  ) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: options.maxOutputTokens,
      },
    });

    // Note: @google/generative-ai generateContent accepts contents and optional requestOptions
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
    });

    const response = result.response;
    return {
      text: response.text(),
      usageMetadata: response.usageMetadata,
    };
  };

  const runnerDeps: RunLlmJsonDependencies = {
    generate: depsOverride?.generate ?? defaultGenerate,
    sleep: depsOverride?.sleep,
    now: depsOverride?.now,
    random: depsOverride?.random,
  };

  try {
    const runnerRes = await runLlmJson(prompt, schema, stepName, runnerDeps);

    logStep(`LLM call succeeded for ${stepName}`, {
      stepName,
      model: modelName,
      attempts: runnerRes.attempts,
      latencyMs: runnerRes.latencyMs,
      tokensUsed: runnerRes.usage.totalTokens,
      estimatedCostUsd: runnerRes.costEstimate.estimatedCostUsd,
      success: true,
    });

    return {
      data: runnerRes.data,
      latencyMs: runnerRes.latencyMs,
      model: modelName,
      tokensUsed: runnerRes.usage.totalTokens,
      estimatedCostUsd: runnerRes.costEstimate.estimatedCostUsd,
      costDetails: runnerRes.costEstimate,
      usage: runnerRes.usage,
    };
  } catch (err: unknown) {
    const classified = classifyError(err);
    logStep(`LLM call failed for ${stepName}`, {
      stepName,
      model: modelName,
      code: classified.code,
      error: classified.message,
      success: false,
    });
    throw err;
  }
}

export async function runStepA(
  packageData: ReleasePackageData,
  depsOverride?: Partial<RunLlmJsonDependencies>
): Promise<CallGeminiJsonResult<StepAOutput>> {
  checkProductionMockGuard();

  if (isMockMode() && !depsOverride?.generate) {
    return {
      data: getMockStepAOutput(packageData),
      latencyMs: 50,
      model: 'mock-fixture',
      tokensUsed: 350,
      estimatedCostUsd: 0.0001,
    };
  }

  const compactPackageJson = serializePackageForPrompt(packageData);

  const prompt = `You are a release engineering AI assistant. Analyze the release package and classify each item in features, bugFixes, and changedBehaviours by user impact.

Release Package JSON:
${compactPackageJson}

Instructions:
1. For every item in features, bugFixes, and changedBehaviours, provide an object with:
   - itemId: string (exact ID e.g. F1, B1, C1)
   - impact: strictly one of ["BREAKING", "USER_VISIBLE", "INTERNAL_ONLY", "SECURITY", "PERFORMANCE"]
   - rationale: short explanation of the classification based strictly on the description.

Return JSON in this format:
{
  "classifications": [
    { "itemId": "F1", "impact": "USER_VISIBLE", "rationale": "..." }
  ]
}`;

  return callGeminiJson(prompt, StepAOutputSchema, 'STEP_A_CLASSIFY', depsOverride);
}

export async function runStepB(
  packageData: ReleasePackageData,
  depsOverride?: Partial<RunLlmJsonDependencies>
): Promise<CallGeminiJsonResult<StepBOutput>> {
  checkProductionMockGuard();

  if (isMockMode() && !depsOverride?.generate) {
    return {
      data: getMockStepBOutput(packageData),
      latencyMs: 50,
      model: 'mock-fixture',
      tokensUsed: 420,
      estimatedCostUsd: 0.00015,
    };
  }

  const compactPackageJson = serializePackageForPrompt(packageData);

  const prompt = `You are a release communication AI auditor. Analyze the release package for missing release information or operational gaps (e.g. changed behaviour without migration notes, features claiming platform support without QA evidence, missing deployment/rollback notes).

Release Package JSON:
${compactPackageJson}

Return JSON with "missingInfos" array:
{
  "missingInfos": [
    {
      "category": "MIGRATION" | "QA" | "DEPLOYMENT" | "SECURITY" | "PERFORMANCE" | "OTHER",
      "description": "Detailed explanation of missing info",
      "suggestion": "Actionable recommendation"
    }
  ]
}`;

  return callGeminiJson(prompt, StepBOutputSchema, 'STEP_B_MISSING_INFO', depsOverride);
}

export async function runStepC(
  packageData: ReleasePackageData,
  depsOverride?: Partial<RunLlmJsonDependencies>
): Promise<CallGeminiJsonResult<StepCOutput>> {
  checkProductionMockGuard();

  if (isMockMode() && !depsOverride?.generate) {
    return {
      data: getMockStepCOutput(packageData),
      latencyMs: 50,
      model: 'mock-fixture',
      tokensUsed: 480,
      estimatedCostUsd: 0.0002,
    };
  }

  const compactPackageJson = serializePackageForPrompt(packageData);

  const prompt = `You are a QA evidence auditor. Check every feature, bugfix, or changed behavior claim against the supplied QA evidence entries. Identify claims NOT supported or only partially supported by QA evidence.

Release Package JSON:
${compactPackageJson}

Return JSON with "verifications" array:
{
  "verifications": [
    {
      "itemId": "F1",
      "claimText": "Specific claim made in item",
      "status": "SUPPORTED" | "PARTIALLY_SUPPORTED" | "UNSUPPORTED",
      "reason": "Detailed rationale referencing QA evidence or lack thereof",
      "qaCitations": ["QA1"]
    }
  ]
}`;

  return callGeminiJson(prompt, StepCOutputSchema, 'STEP_C_QA_CLAIMS', depsOverride);
}

export async function runStepD(
  packageData: ReleasePackageData,
  depsOverride?: Partial<RunLlmJsonDependencies>
): Promise<CallGeminiJsonResult<StepDOutput>> {
  checkProductionMockGuard();

  const allItems = [
    ...packageData.features,
    ...packageData.bugFixes,
    ...packageData.changedBehaviours,
    ...packageData.qaSummaries,
    ...packageData.knownLimitations,
    ...packageData.migrationNotes,
    ...packageData.affectedUserGroups,
  ];

  let rawOutput: StepDOutput;
  let latencyMs = 50;
  let model = 'mock-fixture';
  let tokensUsed = 600;
  let estimatedCostUsd = 0.00025;
  let costDetails: CostEstimateResult | undefined = undefined;
  let usage: UsageMetrics | undefined = undefined;

  if (isMockMode() && !depsOverride?.generate) {
    rawOutput = getMockStepDOutput(packageData);
  } else {
    const compactPackageJson = serializePackageForPrompt(packageData);

    const prompt = `You are a technical documentation AI writer. Draft two audience-specific release summaries based strictly on the supplied release package:
1. Internal Technical Summary: aimed at engineers and SREs.
2. Non-Technical Stakeholder/Client Summary: aimed at product managers and customer success.

RULES:
- Do NOT invent facts. Only use provided package items and QA evidence.
- Every statement MUST cite the item ID(s) or QA evidence ID(s) supporting it (e.g. ["F1", "QA1"]).
- Also list known risks and limitations labelled by source ("PACKAGE" or "AI_IDENTIFIED").

Release Package JSON:
${compactPackageJson}

Return JSON:
{
  "internalStatements": [
    { "audience": "INTERNAL", "text": "...", "citations": ["F1", "QA1"] }
  ],
  "clientStatements": [
    { "audience": "CLIENT", "text": "...", "citations": ["F1", "U1"] }
  ],
  "risksAndLimitations": [
    { "text": "...", "source": "PACKAGE" | "AI_IDENTIFIED", "severity": "LOW" | "MEDIUM" | "HIGH", "citations": ["L1"] }
  ]
}`;

    const res = await callGeminiJson(prompt, StepDOutputSchema, 'STEP_D_SUMMARIES', depsOverride);
    rawOutput = res.data;
    latencyMs = res.latencyMs;
    model = res.model;
    tokensUsed = res.tokensUsed ?? 0;
    estimatedCostUsd = res.estimatedCostUsd ?? 0;
    costDetails = res.costDetails;
    usage = res.usage;
  }

  // Citation Sanitization Step: Strip hallucinated item IDs
  const sanitizeStatementCitations = (stmts: typeof rawOutput.internalStatements) =>
    stmts.map((s) => ({
      ...s,
      citations: sanitizeCitations(s.citations, allItems).validCitations,
    }));

  const sanitizedOutput: StepDOutput = {
    internalStatements: sanitizeStatementCitations(rawOutput.internalStatements),
    clientStatements: sanitizeStatementCitations(rawOutput.clientStatements),
    risksAndLimitations: rawOutput.risksAndLimitations.map((r) => ({
      ...r,
      citations: sanitizeCitations(r.citations, allItems).validCitations,
    })),
  };

  return {
    data: sanitizedOutput,
    latencyMs,
    model,
    tokensUsed,
    estimatedCostUsd,
    costDetails,
    usage,
  };
}
