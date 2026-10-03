import { computeCitedSourceHash } from './crypto';
import { StatementData, ReleasePackageItem } from './types/release';

export interface StaleEvaluationResult {
  statementId: string;
  isStale: boolean;
  staleReason?: string;
  currentHash: string;
  previousHash: string;
}

/**
 * Evaluates whether a statement has become stale by comparing its stored sourceHash
 * against the SHA-256 hash of its cited items in the active package.
 */
export function evaluateStatementStaleStatus(
  statement: Pick<StatementData, 'id' | 'citations' | 'sourceHash'>,
  currentPackageItems: ReleasePackageItem[]
): StaleEvaluationResult {
  const currentHash = computeCitedSourceHash(statement.citations, currentPackageItems);
  const previousHash = statement.sourceHash;

  const isStale = currentHash !== previousHash;
  let staleReason: string | undefined = undefined;

  if (isStale) {
    const citedIds = statement.citations;
    const itemsMap = new Map(currentPackageItems.map((item) => [item.id, item]));

    const missingIds = citedIds.filter((id) => !itemsMap.has(id));
    if (missingIds.length > 0) {
      staleReason = `Cited item(s) [${missingIds.join(', ')}] were removed from release package. Re-review required.`;
    } else {
      staleReason = `Cited item(s) [${citedIds.join(', ')}] were modified in a newer release version. Re-review required.`;
    }
  }

  return {
    statementId: statement.id,
    isStale,
    staleReason,
    currentHash,
    previousHash,
  };
}
