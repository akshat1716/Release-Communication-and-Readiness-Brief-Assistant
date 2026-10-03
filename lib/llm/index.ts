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

export function isMockMode(): boolean {
  const isExplicitMock = process.env.MOCK_LLM === 'true';
  const noApiKey = !process.env.LLM_API_KEY || process.env.LLM_API_KEY.trim() === '';
  return isExplicitMock || noApiKey;
}

function checkProductionMockGuard(): void {
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

async function callGeminiJson<T>(
  prompt: string,
  schema: { parse: (val: unknown) => T },
  stepName: string,
  maxRetries = 2
): Promise<{ data: T; latencyMs: number; model: string }> {
  checkProductionMockGuard();

  const apiKey = process.env.LLM_API_KEY || '';
  const modelName = process.env.LLM_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured in environment variables');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsedJson = JSON.parse(text);
      const validatedData = schema.parse(parsedJson);
      const latencyMs = Date.now() - startTime;

      logStep(`LLM call succeeded for ${stepName}`, {
        stepName,
        model: modelName,
        attempt,
        latencyMs,
        success: true,
      });

      return { data: validatedData, latencyMs, model: modelName };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logStep(`LLM attempt ${attempt} failed for ${stepName}`, {
        stepName,
        model: modelName,
        attempt,
        error: lastError.message,
        success: false,
      });
    }
  }

  throw new Error(`LLM call failed after ${maxRetries + 1} attempts for ${stepName}: ${lastError?.message}`);
}

export async function runStepA(
  packageData: ReleasePackageData
): Promise<{ data: StepAOutput; latencyMs: number; model: string }> {
  checkProductionMockGuard();

  if (isMockMode()) {
    return { data: getMockStepAOutput(packageData), latencyMs: 50, model: 'mock-fixture' };
  }

  const prompt = `You are a release engineering AI assistant. Analyze the release package and classify each item in features, bugFixes, and changedBehaviours by user impact.

Release Package JSON:
${JSON.stringify(packageData, null, 2)}

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

  return callGeminiJson(prompt, StepAOutputSchema, 'STEP_A_CLASSIFY');
}

export async function runStepB(
  packageData: ReleasePackageData
): Promise<{ data: StepBOutput; latencyMs: number; model: string }> {
  checkProductionMockGuard();

  if (isMockMode()) {
    return { data: getMockStepBOutput(packageData), latencyMs: 50, model: 'mock-fixture' };
  }

  const prompt = `You are a release communication AI auditor. Analyze the release package for missing release information or operational gaps (e.g. changed behaviour without migration notes, features claiming platform support without QA evidence, missing deployment/rollback notes).

Release Package JSON:
${JSON.stringify(packageData, null, 2)}

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

  return callGeminiJson(prompt, StepBOutputSchema, 'STEP_B_MISSING_INFO');
}

export async function runStepC(
  packageData: ReleasePackageData
): Promise<{ data: StepCOutput; latencyMs: number; model: string }> {
  checkProductionMockGuard();

  if (isMockMode()) {
    return { data: getMockStepCOutput(packageData), latencyMs: 50, model: 'mock-fixture' };
  }

  const prompt = `You are a QA evidence auditor. Check every feature, bugfix, or changed behavior claim against the supplied QA evidence entries. Identify claims NOT supported or only partially supported by QA evidence.

Release Package JSON:
${JSON.stringify(packageData, null, 2)}

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

  return callGeminiJson(prompt, StepCOutputSchema, 'STEP_C_QA_CLAIMS');
}

export async function runStepD(
  packageData: ReleasePackageData
): Promise<{ data: StepDOutput; latencyMs: number; model: string }> {
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

  if (isMockMode()) {
    rawOutput = getMockStepDOutput(packageData);
  } else {

    const prompt = `You are a technical documentation AI writer. Draft two audience-specific release summaries based strictly on the supplied release package:
1. Internal Technical Summary: aimed at engineers and SREs.
2. Non-Technical Stakeholder/Client Summary: aimed at product managers and customer success.

RULES:
- Do NOT invent facts. Only use provided package items and QA evidence.
- Every statement MUST cite the item ID(s) or QA evidence ID(s) supporting it (e.g. ["F1", "QA1"]).
- Also list known risks and limitations labelled by source ("PACKAGE" or "AI_IDENTIFIED").

Release Package JSON:
${JSON.stringify(packageData, null, 2)}

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

    const res = await callGeminiJson(prompt, StepDOutputSchema, 'STEP_D_SUMMARIES');
    rawOutput = res.data;
    latencyMs = res.latencyMs;
    model = res.model;
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

  return { data: sanitizedOutput, latencyMs, model };
}
