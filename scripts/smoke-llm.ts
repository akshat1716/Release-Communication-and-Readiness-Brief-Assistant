import { runStepA } from '../lib/llm';
import { ReleasePackageData } from '../lib/types/release';
import { StepAOutputSchema } from '../lib/llm/schemas';
import { LlmError } from '../lib/llm/errors';

/**
 * Real Gemini API smoke verification script.
 *
 * Requirements:
 * - Reads LLM_API_KEY strictly from the process environment (never from a file).
 * - Makes ONE call through the application's runLlmJson pipeline.
 * - Prints detailed telemetry: model, attempts, latency, token metrics (prompt, candidates,
 *   thoughts, total), cost, schema validation status, and first 200 chars of output.
 * - Supports --timeout-test mode (sets LLM_CALL_TIMEOUT_MS=1) verifying clean abort with
 *   NETWORK_TIMEOUT or DEADLINE_EXCEEDED.
 *
 * Usage:
 *   LLM_API_KEY="your-api-key" npm run smoke:llm
 *   LLM_API_KEY="your-api-key" npm run smoke:llm -- --timeout-test
 */
async function main() {
  const isTimeoutTest = process.argv.includes('--timeout-test');

  // Read LLM_API_KEY ONLY from process environment (never from a file)
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_gemini_api_key_here') {
    console.error('❌ ERROR: LLM_API_KEY environment variable is not set.');
    console.error('Usage:');
    console.error('  LLM_API_KEY="AIzaSy..." npm run smoke:llm');
    console.error('  LLM_API_KEY="AIzaSy..." npm run smoke:llm -- --timeout-test');
    process.exit(1);
  }

  // Force real LLM call (disable mock mode)
  process.env.MOCK_LLM = 'false';

  // Build a tiny sample release package for the test call
  const tinySampleRelease: ReleasePackageData = {
    releaseName: 'Payment Gateway Edge Service',
    versionLabel: 'v1.0.0-rc1',
    features: [
      {
        id: 'F1',
        category: 'FEATURE',
        title: 'Instant SEPA Credit Transfer',
        description: 'Enables sub-10s euro settlements with automated IBAN routing validation.',
      },
    ],
    bugFixes: [
      {
        id: 'B1',
        category: 'BUGFIX',
        title: 'Fix Webhook Idempotency Race',
        description: 'Resolves duplicate callback invocations under distributed Redis lock contention.',
      },
    ],
    changedBehaviours: [],
    qaSummaries: [
      {
        id: 'QA1',
        category: 'QA',
        title: 'Payment Gateway Concurrency Test',
        description: 'Passed 10,000 TPS load test with 0 duplicate charge events in staging.',
      },
    ],
    knownLimitations: [],
    migrationNotes: [],
    affectedUserGroups: [
      {
        id: 'U1',
        category: 'USER_GROUP',
        title: 'European Retail Clients',
        description: 'Retail clients initiating SEPA transfer payments.',
      },
    ],
  };

  if (isTimeoutTest) {
    console.log('====================================================');
    console.log('    GEMINI API SMOKE TEST: TIMEOUT ABORT MODE      ');
    console.log('====================================================\n');
    console.log('Setting LLM_CALL_TIMEOUT_MS=1 to verify request abort enforcement...\n');

    process.env.LLM_CALL_TIMEOUT_MS = '1';

    try {
      await runStepA(tinySampleRelease);
      console.error('❌ FAILURE: Expected LLM call to abort with timeout, but call resolved successfully.');
      process.exit(1);
    } catch (err: unknown) {
      if (err instanceof LlmError) {
        const isExpectedCode = err.code === 'NETWORK_TIMEOUT' || err.code === 'DEADLINE_EXCEEDED';
        console.log(`Call Aborted:              YES`);
        console.log(`Caught Error Code:         ${err.code} ${isExpectedCode ? '✅' : '❌'}`);
        console.log(`Error Message:             ${err.message}`);
        console.log(`HTTP Status:               ${err.statusCode}`);
        console.log(`Retryable:                 ${err.retryable}`);
        console.log(`Attempts Made:             ${err.attempts}`);

        if (isExpectedCode) {
          console.log('\n✅ TIMEOUT ABORT VERIFICATION PASSED');
          process.exit(0);
        } else {
          console.error(`\n❌ UNEXPECTED ERROR CODE: Expected NETWORK_TIMEOUT or DEADLINE_EXCEEDED, got ${err.code}`);
          process.exit(1);
        }
      } else {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`\n❌ UNEXPECTED NON-LLM ERROR: ${message}`);
        process.exit(1);
      }
    }
  }

  console.log('====================================================');
  console.log('       REAL GEMINI API SMOKE TEST (1 CALL)          ');
  console.log('====================================================\n');

  try {
    const res = await runStepA(tinySampleRelease);

    // Validate structured JSON response against schema
    const parseResult = StepAOutputSchema.safeParse(res.data);
    const jsonStr = JSON.stringify(res.data);
    const first200 = jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;

    console.log(`Model Name:                ${res.model}`);
    console.log(`Attempts:                  ${res.attempts ?? 1}`);
    console.log(`Latency:                   ${res.latencyMs} ms`);
    console.log(`Prompt Tokens:             ${res.usage?.promptTokens ?? 'N/A'}`);
    console.log(`Candidates Tokens:         ${res.usage?.candidatesTokens ?? 'N/A'}`);
    console.log(`Thoughts Tokens:           ${res.usage?.thoughtsTokens ?? 0}`);
    console.log(`Total Tokens:              ${res.tokensUsed ?? res.usage?.totalTokens ?? 'N/A'}`);
    console.log(`Estimated Cost:            $${(res.estimatedCostUsd ?? 0).toFixed(6)} USD`);
    console.log(`JSON Parsed & Validated:   ${parseResult.success ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Output Snippet (first 200 chars):`);
    console.log(`  ${first200}\n`);

    if (!parseResult.success) {
      console.error('❌ Schema Validation Errors:', parseResult.error.format());
      process.exit(1);
    }

    console.log('====================================================');
    console.log('         SMOKE TEST VERIFICATION PASSED ✅         ');
    console.log('====================================================');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('\n❌ SMOKE TEST FAILED WITH ERROR:');
    console.error(errorMsg);
    process.exit(1);
  }
}

main();
