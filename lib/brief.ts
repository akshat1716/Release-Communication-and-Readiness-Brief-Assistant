import {
  StatementData,
  DeterministicCheckResult,
  AIRiskLimitationData,
  ReleasePackageData,
} from './types/release';

export interface FinalBriefCompileOptions {
  allowPartial?: boolean; // If true, allows building even with unapproved or failed check items, adding disclaimers
}

export interface FinalBriefCompileResult {
  success: boolean;
  blockedReason?: string;
  unreviewedCount: number;
  rejectedCount: number;
  failedCheckCount: number;
  briefMarkdown?: string;
  briefJson?: {
    title: string;
    versionLabel: string;
    generatedAt: string;
    approvedInternalStatements: Array<{ text: string; citations: string[] }>;
    approvedClientStatements: Array<{ text: string; citations: string[] }>;
    risksAndLimitations: AIRiskLimitationData[];
    deterministicChecks: DeterministicCheckResult[];
    warnings: string[];
  };
}

export function compileFinalBrief(
  packageData: ReleasePackageData,
  statements: StatementData[],
  checks: DeterministicCheckResult[],
  risks: AIRiskLimitationData[],
  options: FinalBriefCompileOptions = {}
): FinalBriefCompileResult {
  const unreviewedStatements = statements.filter((s) => s.status === 'DRAFT');
  const rejectedStatements = statements.filter((s) => s.status === 'REJECTED');
  const staleStatements = statements.filter((s) => s.isStale);
  const approvedStatements = statements.filter(
    (s) => !s.isStale && (s.status === 'APPROVED' || s.status === 'EDITED')
  );
  const failedChecks = checks.filter((c) => c.status === 'FAIL');

  const unreviewedCount = unreviewedStatements.length;
  const rejectedCount = rejectedStatements.length;
  const staleCount = staleStatements.length;
  const failedCheckCount = failedChecks.length;

  const isBlocked =
    !options.allowPartial &&
    (unreviewedCount > 0 || rejectedCount > 0 || staleCount > 0 || failedCheckCount > 0);

  if (isBlocked) {
    const reasons: string[] = [];
    if (failedCheckCount > 0) {
      reasons.push(
        `${failedCheckCount} deterministic check(s) failed (${failedChecks.map((c) => c.ruleId).join(', ')})`
      );
    }
    if (unreviewedCount > 0) {
      reasons.push(`${unreviewedCount} statement(s) are still in DRAFT status and need human review`);
    }
    if (staleCount > 0) {
      reasons.push(`${staleCount} statement(s) are STALE (cited items modified/removed) and need re-review`);
    }
    if (rejectedCount > 0) {
      reasons.push(`${rejectedCount} statement(s) were REJECTED by human reviewers`);
    }

    return {
      success: false,
      blockedReason: `Final brief generation blocked: ${reasons.join('; ')}. Please approve all statements and resolve failing readiness checks, or check 'Allow Partial Brief Generation' to proceed with explicit disclaimers.`,
      unreviewedCount,
      rejectedCount,
      failedCheckCount,
    };
  }


  const approvedInternal = approvedStatements
    .filter((s) => s.audience === 'INTERNAL')
    .map((s) => ({ text: s.text, citations: s.citations }));

  const approvedClient = approvedStatements
    .filter((s) => s.audience === 'CLIENT')
    .map((s) => ({ text: s.text, citations: s.citations }));

  const warnings: string[] = [];
  if (unreviewedCount > 0) {
    warnings.push(`EXCLUDED: ${unreviewedCount} unreviewed draft statement(s) were omitted from this brief.`);
  }
  if (rejectedCount > 0) {
    warnings.push(`EXCLUDED: ${rejectedCount} human-rejected statement(s) were omitted from this brief.`);
  }
  if (failedCheckCount > 0) {
    warnings.push(
      `WARNING: ${failedCheckCount} readiness check(s) failed: ${failedChecks.map((c) => c.name).join(', ')}.`
    );
  }

  // Generate markdown output
  const nowStr = new Date().toISOString();
  let md = `# Release Communication & Readiness Brief: ${packageData.releaseName}\n`;
  md += `**Version Label:** ${packageData.versionLabel} | **Generated At:** ${nowStr}\n\n`;

  if (warnings.length > 0) {
    md += `> ⚠️ **DISCLAIMER & WARNINGS**\n`;
    for (const w of warnings) {
      md += `> - ${w}\n`;
    }
    md += `\n`;
  }

  md += `## 1. Deterministic Readiness Check Summary\n`;
  for (const c of checks) {
    const icon = c.status === 'PASS' ? '✅' : c.status === 'WARN' ? '⚠️' : '❌';
    md += `- ${icon} **${c.name}** [${c.status}]: ${c.message}\n`;
  }
  md += `\n`;

  md += `## 2. Internal Technical Release Summary (Reviewed & Approved)\n`;
  if (approvedInternal.length === 0) {
    md += `*No approved internal technical statements available.*\n`;
  } else {
    for (const s of approvedInternal) {
      const citeStr = s.citations.length > 0 ? ` **[${s.citations.join(', ')}]**` : '';
      md += `- ${s.text}${citeStr}\n`;
    }
  }
  md += `\n`;

  md += `## 3. Non-Technical Stakeholder & Client Summary (Reviewed & Approved)\n`;
  if (approvedClient.length === 0) {
    md += `*No approved client statements available.*\n`;
  } else {
    for (const s of approvedClient) {
      const citeStr = s.citations.length > 0 ? ` **[${s.citations.join(', ')}]**` : '';
      md += `- ${s.text}${citeStr}\n`;
    }
  }
  md += `\n`;

  md += `## 4. Known Risks, Operational Limitations & Gaps\n`;
  if (risks.length === 0) {
    md += `*No risks or limitations flagged.*\n`;
  } else {
    for (const r of risks) {
      const citeStr = r.citations.length > 0 ? ` **[${r.citations.join(', ')}]**` : '';
      md += `- **[${r.source}] (${r.severity} Severity)**: ${r.text}${citeStr}\n`;
    }
  }

  const briefJson = {
    title: packageData.releaseName,
    versionLabel: packageData.versionLabel,
    generatedAt: nowStr,
    approvedInternalStatements: approvedInternal,
    approvedClientStatements: approvedClient,
    risksAndLimitations: risks,
    deterministicChecks: checks,
    warnings,
  };

  return {
    success: true,
    unreviewedCount,
    rejectedCount,
    failedCheckCount,
    briefMarkdown: md,
    briefJson,
  };
}
