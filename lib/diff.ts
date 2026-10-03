import { ReleasePackageData, ReleasePackageItem, StatementData } from './types/release';
import { hashItemContent } from './crypto';

export interface ItemDiffResult {
  added: ReleasePackageItem[];
  modified: Array<{
    id: string;
    category: string;
    titleV1: string;
    titleV2: string;
    descV1: string;
    descV2: string;
  }>;
  removed: ReleasePackageItem[];
  unchanged: ReleasePackageItem[];
}

export interface StatementDiffResult {
  added: StatementData[];
  modified: Array<{
    id: string;
    textV1: string;
    textV2: string;
    citationsV1: string[];
    citationsV2: string[];
    statusV1: string;
    statusV2: string;
  }>;
  removed: StatementData[];
  unchanged: StatementData[];
}

export interface VersionComparison {
  versionNum1: number;
  versionNum2: number;
  packageDiff: ItemDiffResult;
  statementDiff: StatementDiffResult;
}

export function comparePackageData(
  packageV1: ReleasePackageData,
  packageV2: ReleasePackageData
): ItemDiffResult {
  const getAllItems = (pkg: ReleasePackageData): ReleasePackageItem[] => [
    ...pkg.features,
    ...pkg.bugFixes,
    ...pkg.changedBehaviours,
    ...pkg.qaSummaries,
    ...pkg.knownLimitations,
    ...pkg.migrationNotes,
    ...pkg.affectedUserGroups,
  ];

  const itemsV1 = getAllItems(packageV1);
  const itemsV2 = getAllItems(packageV2);

  const mapV1 = new Map(itemsV1.map((i) => [i.id, i]));
  const mapV2 = new Map(itemsV2.map((i) => [i.id, i]));

  const added: ReleasePackageItem[] = [];
  const modified: ItemDiffResult['modified'] = [];
  const removed: ReleasePackageItem[] = [];
  const unchanged: ReleasePackageItem[] = [];

  for (const [id, item2] of mapV2.entries()) {
    const item1 = mapV1.get(id);
    if (!item1) {
      added.push(item2);
    } else if (hashItemContent(item1) !== hashItemContent(item2)) {
      modified.push({
        id,
        category: item2.category,
        titleV1: item1.title,
        titleV2: item2.title,
        descV1: item1.description,
        descV2: item2.description,
      });
    } else {
      unchanged.push(item2);
    }
  }

  for (const [id, item1] of mapV1.entries()) {
    if (!mapV2.has(id)) {
      removed.push(item1);
    }
  }

  return { added, modified, removed, unchanged };
}

export function compareStatements(
  stmtsV1: StatementData[],
  stmtsV2: StatementData[]
): StatementDiffResult {
  const mapV1 = new Map(stmtsV1.map((s) => [s.orderIndex + ':' + s.audience, s]));
  const mapV2 = new Map(stmtsV2.map((s) => [s.orderIndex + ':' + s.audience, s]));

  const added: StatementData[] = [];
  const modified: StatementDiffResult['modified'] = [];
  const removed: StatementData[] = [];
  const unchanged: StatementData[] = [];

  for (const [key, s2] of mapV2.entries()) {
    const s1 = mapV1.get(key);
    if (!s1) {
      added.push(s2);
    } else if (
      s1.text !== s2.text ||
      s1.status !== s2.status ||
      JSON.stringify(s1.citations) !== JSON.stringify(s2.citations)
    ) {
      modified.push({
        id: s2.id,
        textV1: s1.text,
        textV2: s2.text,
        citationsV1: s1.citations,
        citationsV2: s2.citations,
        statusV1: s1.status,
        statusV2: s2.status,
      });
    } else {
      unchanged.push(s2);
    }
  }

  for (const [key, s1] of mapV1.entries()) {
    if (!mapV2.has(key)) {
      removed.push(s1);
    }
  }

  return { added, modified, removed, unchanged };
}
