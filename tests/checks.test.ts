import { describe, it, expect } from 'vitest';
import { runDeterministicChecks } from '../lib/checks';
import { SAMPLE_RELEASE_PACKAGE } from '../lib/fixtures/sample-release';
import { ReleasePackageData } from '../lib/types/release';

describe('Deterministic Readiness Checks Engine', () => {
  it('should flag missing migration notes when behavior changes (CHECK_BEHAVIOUR_MIGRATION)', () => {
    // SAMPLE_RELEASE_PACKAGE has C1 but migrationNotes is empty
    const results = runDeterministicChecks(SAMPLE_RELEASE_PACKAGE);
    const check = results.find((r) => r.ruleId === 'CHECK_BEHAVIOUR_MIGRATION');

    expect(check).toBeDefined();
    expect(check?.status).toBe('FAIL');
    expect(check?.message).toContain('missing migration/configuration notes');
  });

  it('should pass CHECK_BEHAVIOUR_MIGRATION when migration notes are present', () => {
    const validPkg: ReleasePackageData = {
      ...SAMPLE_RELEASE_PACKAGE,
      migrationNotes: [
        {
          id: 'M1',
          category: 'MIGRATION',
          title: 'Update RateLimit Header Parser',
          description: 'Update client HTTP interceptors to read RateLimit-Remaining headers.',
        },
      ],
    };
    const results = runDeterministicChecks(validPkg);
    const check = results.find((r) => r.ruleId === 'CHECK_BEHAVIOUR_MIGRATION');

    expect(check?.status).toBe('PASS');
  });

  it('should fail CHECK_QA_EMPTY when QA summaries are empty', () => {
    const pkg: ReleasePackageData = {
      ...SAMPLE_RELEASE_PACKAGE,
      qaSummaries: [],
    };
    const results = runDeterministicChecks(pkg);
    const check = results.find((r) => r.ruleId === 'CHECK_QA_EMPTY');

    expect(check?.status).toBe('FAIL');
  });

  it('should fail CHECK_LIMITATIONS_EMPTY when known limitations are empty', () => {
    const pkg: ReleasePackageData = {
      ...SAMPLE_RELEASE_PACKAGE,
      knownLimitations: [],
    };
    const results = runDeterministicChecks(pkg);
    const check = results.find((r) => r.ruleId === 'CHECK_LIMITATIONS_EMPTY');

    expect(check?.status).toBe('FAIL');
  });

  it('should fail CHECK_USER_GROUPS_EMPTY when affected user groups are empty', () => {
    const pkg: ReleasePackageData = {
      ...SAMPLE_RELEASE_PACKAGE,
      affectedUserGroups: [],
    };
    const results = runDeterministicChecks(pkg);
    const check = results.find((r) => r.ruleId === 'CHECK_USER_GROUPS_EMPTY');

    expect(check?.status).toBe('FAIL');
  });

  it('should fail CHECK_STABLE_IDS when an item has an invalid stable ID format', () => {
    const pkg: ReleasePackageData = {
      ...SAMPLE_RELEASE_PACKAGE,
      features: [
        {
          id: 'INVALID_ID_99',
          category: 'FEATURE',
          title: 'Feature with bad ID',
          description: 'Should fail stable ID check',
        },
      ],
    };
    const results = runDeterministicChecks(pkg);
    const check = results.find((r) => r.ruleId === 'CHECK_STABLE_IDS');

    expect(check?.status).toBe('FAIL');
  });
});
