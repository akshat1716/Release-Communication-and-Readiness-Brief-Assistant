import { runStepA, runStepB, runStepC, runStepD } from '../lib/llm';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';
import { StepAOutputSchema, StepBOutputSchema, StepCOutputSchema, StepDOutputSchema } from '../lib/llm/schemas';
import { sanitizeCitations } from '../lib/llm/sanitizer';

async function runSmokeTest() {
  console.log('====================================================');
  console.log('       REAL GEMINI API SMOKE TEST RUNNER           ');
  console.log('====================================================\n');

  // Explicitly force MOCK_LLM=false for real LLM API call
  process.env.MOCK_LLM = 'false';

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ ERROR: LLM_API_KEY is not set or contains placeholder value in .env.');
    console.error('   Please set your real Gemini API key in .env (LLM_API_KEY="AIzaSy...") before running this script.');
    process.exit(1);
  }

  console.log(`Model Configured: ${process.env.LLM_MODEL || 'gemini-2.5-flash'}`);
  console.log(`Target Package: ${SAMPLE_RELEASE_PACKAGE.releaseName} (${SAMPLE_RELEASE_PACKAGE.versionLabel})\n`);

  try {
    // Step A
    console.log('--> Executing Step A: Change Impact Classifications...');
    const startA = Date.now();
    const resA = await runStepA(SAMPLE_RELEASE_PACKAGE);
    const latencyA = Date.now() - startA;
    StepAOutputSchema.parse(resA.data);
    console.log(`    ✅ Step A Succeeded in ${latencyA}ms (Model: ${resA.model})`);
    console.log(`       Classified Items: ${resA.data.classifications.length}`);
    for (const cls of resA.data.classifications) {
      console.log(`       - [${cls.itemId}] ${cls.impact}: ${cls.rationale}`);
    }
    console.log('');

    // Step B
    console.log('--> Executing Step B: Missing Information & Operational Gaps...');
    const startB = Date.now();
    const resB = await runStepB(SAMPLE_RELEASE_PACKAGE);
    const latencyB = Date.now() - startB;
    StepBOutputSchema.parse(resB.data);
    console.log(`    ✅ Step B Succeeded in ${latencyB}ms (Model: ${resB.model})`);
    console.log(`       Gaps Identified: ${resB.data.missingInfos.length}`);
    for (const gap of resB.data.missingInfos) {
      console.log(`       - [${gap.category}] ${gap.description}`);
    }
    console.log('');

    // Step C
    console.log('--> Executing Step C: QA Claim Support Verification...');
    const startC = Date.now();
    const resC = await runStepC(SAMPLE_RELEASE_PACKAGE);
    const latencyC = Date.now() - startC;
    StepCOutputSchema.parse(resC.data);
    console.log(`    ✅ Step C Succeeded in ${latencyC}ms (Model: ${resC.model})`);
    console.log(`       Claims Verified: ${resC.data.verifications.length}`);
    for (const ver of resC.data.verifications) {
      console.log(`       - [${ver.itemId}] Status: ${ver.status} | Reason: ${ver.reason}`);
    }
    console.log('');

    // Step D
    console.log('--> Executing Step D: Audience Summaries & Risk Matrix...');
    const startD = Date.now();
    const resD = await runStepD(SAMPLE_RELEASE_PACKAGE);
    const latencyD = Date.now() - startD;
    StepDOutputSchema.parse(resD.data);
    console.log(`    ✅ Step D Succeeded in ${latencyD}ms (Model: ${resD.model})`);
    console.log(`       Internal Statements: ${resD.data.internalStatements.length}`);
    console.log(`       Client Statements: ${resD.data.clientStatements.length}`);
    console.log(`       Risks Flagged: ${resD.data.risksAndLimitations.length}`);

    // Citation Sanitizer Inspection
    console.log('\n--> Citation Sanitizer Audit on Step D Output:');
    const allItems = [
      ...SAMPLE_RELEASE_PACKAGE.features,
      ...SAMPLE_RELEASE_PACKAGE.bugFixes,
      ...SAMPLE_RELEASE_PACKAGE.changedBehaviours,
      ...SAMPLE_RELEASE_PACKAGE.qaSummaries,
      ...SAMPLE_RELEASE_PACKAGE.knownLimitations,
      ...SAMPLE_RELEASE_PACKAGE.migrationNotes,
      ...SAMPLE_RELEASE_PACKAGE.affectedUserGroups,
    ];

    let totalStrippedCount = 0;
    const checkStmts = [...resD.data.internalStatements, ...resD.data.clientStatements];
    for (const stmt of checkStmts) {
      const sanitized = sanitizeCitations(stmt.citations, allItems);
      if (sanitized.sanitized) {
        totalStrippedCount += sanitized.invalidCitations.length;
        console.log(`    ⚠️ Sanitized statement: "${stmt.text.substring(0, 40)}..."`);
        console.log(`       Stripped Invalid Citation IDs: ${sanitized.invalidCitations.join(', ')}`);
        console.log(`       Preserved Valid Citation IDs: ${sanitized.validCitations.join(', ')}`);
      }
    }

    if (totalStrippedCount === 0) {
      console.log('    ✅ All statement citations were 100% valid. Zero hallucinated IDs stripped.');
    }

    console.log('\n====================================================');
    console.log('               LATENCY SUMMARY                      ');
    console.log('====================================================');
    console.log(`Step A (Classifications): ${latencyA} ms`);
    console.log(`Step B (Missing Info):    ${latencyB} ms`);
    console.log(`Step C (QA Claims):       ${latencyC} ms`);
    console.log(`Step D (Summaries):       ${latencyD} ms`);
    console.log(`Total Pipeline Latency:   ${latencyA + latencyB + latencyC + latencyD} ms`);
    console.log('====================================================\n');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('\n❌ SMOKE TEST FAILED WITH ERROR:');
    console.error(errorMsg);
    process.exit(1);
  }
}

runSmokeTest();
