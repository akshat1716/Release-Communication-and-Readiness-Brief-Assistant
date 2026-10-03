export type ItemCategory =
  | 'FEATURE'
  | 'BUGFIX'
  | 'BEHAVIOUR'
  | 'QA'
  | 'LIMITATION'
  | 'MIGRATION'
  | 'USER_GROUP';

export interface ReleasePackageItem {
  id: string; // e.g. F1, B1, C1, QA1, L1, M1, U1
  category: ItemCategory;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ReleasePackageData {
  releaseName: string;
  versionLabel: string;
  features: ReleasePackageItem[];
  bugFixes: ReleasePackageItem[];
  changedBehaviours: ReleasePackageItem[];
  qaSummaries: ReleasePackageItem[];
  knownLimitations: ReleasePackageItem[];
  migrationNotes: ReleasePackageItem[];
  affectedUserGroups: ReleasePackageItem[];
}

export type CheckStatus = 'PASS' | 'FAIL' | 'WARN';

export interface DeterministicCheckResult {
  ruleId: string;
  name: string;
  status: CheckStatus;
  message: string;
  details?: string;
}

export type StatementStatus = 'DRAFT' | 'EDITED' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';

export type AudienceType = 'INTERNAL' | 'CLIENT';

export interface StatementData {
  id: string;
  audience: AudienceType;
  text: string;
  originalText: string;
  citations: string[]; // List of cited item IDs e.g. ["F1", "QA1"]
  status: StatementStatus;
  sourceHash: string; // SHA-256 hash of cited items' content
  isStale: boolean;
  staleReason?: string;
  orderIndex: number;
}

export interface AIClassificationData {
  itemId: string;
  impact: 'BREAKING' | 'USER_VISIBLE' | 'INTERNAL_ONLY' | 'SECURITY' | 'PERFORMANCE';
  rationale: string;
}

export interface AIMissingInfoData {
  category: 'QA' | 'DEPLOYMENT' | 'MIGRATION' | 'SECURITY' | 'PERFORMANCE' | 'OTHER';
  description: string;
  suggestion: string;
}

export interface AIClaimVerificationData {
  itemId: string;
  claimText: string;
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED';
  reason: string;
  qaCitations: string[];
}

export interface AIRiskLimitationData {
  text: string;
  source: 'PACKAGE' | 'AI_IDENTIFIED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  citations: string[];
}
