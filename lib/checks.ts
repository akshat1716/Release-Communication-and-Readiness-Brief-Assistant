import { ReleasePackageData, DeterministicCheckResult } from './types/release';

export function runDeterministicChecks(packageData: ReleasePackageData): DeterministicCheckResult[] {
  const results: DeterministicCheckResult[] = [];

  // Rule 1: QA Summary Check
  const hasQA = packageData.qaSummaries.length > 0 && packageData.qaSummaries.some(item => item.title.trim() || item.description.trim());
  results.push({
    ruleId: 'CHECK_QA_EMPTY',
    name: 'QA Evidence Verification',
    status: hasQA ? 'PASS' : 'FAIL',
    message: hasQA
      ? `QA evidence provided (${packageData.qaSummaries.length} item(s)).`
      : 'CRITICAL: QA Summary is empty. Every release requires verified QA evidence.',
    details: hasQA ? undefined : 'No QA evidence entries found in release package.',
  });

  // Rule 2: Known Limitations Check
  const hasLimitations = packageData.knownLimitations.length > 0 && packageData.knownLimitations.some(item => item.title.trim() || item.description.trim());
  results.push({
    ruleId: 'CHECK_LIMITATIONS_EMPTY',
    name: 'Known Limitations Section',
    status: hasLimitations ? 'PASS' : 'FAIL',
    message: hasLimitations
      ? `Known limitations documented (${packageData.knownLimitations.length} item(s)).`
      : 'CRITICAL: Known Limitations section is empty.',
    details: hasLimitations ? undefined : 'Document any operational constraints or unresolved minor issues.',
  });

  // Rule 3: Affected User Groups Check
  const hasUserGroups = packageData.affectedUserGroups.length > 0 && packageData.affectedUserGroups.some(item => item.title.trim() || item.description.trim());
  results.push({
    ruleId: 'CHECK_USER_GROUPS_EMPTY',
    name: 'Affected User Groups',
    status: hasUserGroups ? 'PASS' : 'FAIL',
    message: hasUserGroups
      ? `Affected user groups specified (${packageData.affectedUserGroups.length} item(s)).`
      : 'CRITICAL: No affected user groups specified.',
    details: hasUserGroups ? undefined : 'Specify target user cohorts, internal roles, or customer segments affected.',
  });

  // Rule 4: Bug Fixes QA Evidence Match Check
  const hasBugFixes = packageData.bugFixes.length > 0;
  if (hasBugFixes) {
    const bugFixIds = packageData.bugFixes.map(b => b.id);
    const qaTextCombined = packageData.qaSummaries
      .map(qa => `${qa.id} ${qa.title} ${qa.description}`)
      .join(' ')
      .toLowerCase();

    const unverifiedBugs = bugFixIds.filter(id => !qaTextCombined.includes(id.toLowerCase()) && !qaTextCombined.includes('bug') && !qaTextCombined.includes('fix'));

    if (unverifiedBugs.length > 0 && !qaTextCombined.includes('bug')) {
      results.push({
        ruleId: 'CHECK_BUGFIX_QA_MATCH',
        name: 'Bug Fixes QA Coverage',
        status: 'WARN',
        message: `Bug fixes listed (${packageData.bugFixes.length}), but QA evidence lacks explicit bug fix regression test records.`,
        details: `Bug fix IDs: ${bugFixIds.join(', ')}. Ensure QA entries explicitly mention regression testing for these fixes.`,
      });
    } else {
      results.push({
        ruleId: 'CHECK_BUGFIX_QA_MATCH',
        name: 'Bug Fixes QA Coverage',
        status: 'PASS',
        message: `Bug fixes verified against QA evidence records.`,
      });
    }
  } else {
    results.push({
      ruleId: 'CHECK_BUGFIX_QA_MATCH',
      name: 'Bug Fixes QA Coverage',
      status: 'PASS',
      message: 'No bug fixes in this release.',
    });
  }

  // Rule 5: Changed Behaviour Migration Notes Check
  const hasChangedBehaviour = packageData.changedBehaviours.length > 0;
  const hasMigrationNotes = packageData.migrationNotes.length > 0 && packageData.migrationNotes.some(m => m.title.trim() || m.description.trim());

  if (hasChangedBehaviour && !hasMigrationNotes) {
    results.push({
      ruleId: 'CHECK_BEHAVIOUR_MIGRATION',
      name: 'Behaviour Change & Migration Alignment',
      status: 'FAIL',
      message: 'CRITICAL: Release includes changed behavior but missing migration/configuration notes.',
      details: `Found ${packageData.changedBehaviours.length} changed behavior item(s) without corresponding migration notes (M1+).`,
    });
  } else {
    results.push({
      ruleId: 'CHECK_BEHAVIOUR_MIGRATION',
      name: 'Behaviour Change & Migration Alignment',
      status: 'PASS',
      message: hasChangedBehaviour
        ? 'Migration notes provided for changed behavior.'
        : 'No behavior changes requiring migration notes.',
    });
  }

  // Rule 6: Stable ID Validation Check
  const allItems = [
    ...packageData.features,
    ...packageData.bugFixes,
    ...packageData.changedBehaviours,
    ...packageData.qaSummaries,
    ...packageData.knownLimitations,
    ...packageData.migrationNotes,
    ...packageData.affectedUserGroups,
  ];

  const invalidIdItems = allItems.filter(item => !item.id || !/^(F|B|C|QA|L|M|U)\d+$/i.test(item.id));

  if (invalidIdItems.length > 0) {
    results.push({
      ruleId: 'CHECK_STABLE_IDS',
      name: 'Stable Identifier Formatting',
      status: 'FAIL',
      message: `Invalid stable ID format detected in ${invalidIdItems.length} item(s).`,
      details: `Items with invalid IDs: ${invalidIdItems.map(i => `${i.id || 'NO_ID'}: ${i.title}`).join(', ')}. Expected prefixes: F, B, C, QA, L, M, U followed by numbers.`,
    });
  } else {
    results.push({
      ruleId: 'CHECK_STABLE_IDS',
      name: 'Stable Identifier Formatting',
      status: 'PASS',
      message: 'All package items have valid stable identifiers.',
    });
  }

  return results;
}
