import { z } from 'zod';

// Step A: Impact Classifications
export const AIClassificationSchema = z.object({
  itemId: z.string(),
  impact: z.enum(['BREAKING', 'USER_VISIBLE', 'INTERNAL_ONLY', 'SECURITY', 'PERFORMANCE']),
  rationale: z.string(),
});

export const StepAOutputSchema = z.object({
  classifications: z.array(AIClassificationSchema),
});

export type StepAOutput = z.infer<typeof StepAOutputSchema>;

// Step B: Missing Information
export const AIMissingInfoSchema = z.object({
  category: z.enum(['QA', 'DEPLOYMENT', 'MIGRATION', 'SECURITY', 'PERFORMANCE', 'OTHER']),
  description: z.string(),
  suggestion: z.string(),
});

export const StepBOutputSchema = z.object({
  missingInfos: z.array(AIMissingInfoSchema),
});

export type StepBOutput = z.infer<typeof StepBOutputSchema>;

// Step C: QA Claim Verification
export const AIClaimVerificationSchema = z.object({
  itemId: z.string(),
  claimText: z.string(),
  status: z.enum(['SUPPORTED', 'PARTIALLY_SUPPORTED', 'UNSUPPORTED']),
  reason: z.string(),
  qaCitations: z.array(z.string()),
});

export const StepCOutputSchema = z.object({
  verifications: z.array(AIClaimVerificationSchema),
});

export type StepCOutput = z.infer<typeof StepCOutputSchema>;

// Step D: Statements & Risks
export const AIStatementSchema = z.object({
  id: z.string().optional(),
  audience: z.enum(['INTERNAL', 'CLIENT']),
  text: z.string(),
  citations: z.array(z.string()),
});

export const AIRiskLimitationSchema = z.object({
  text: z.string(),
  source: z.enum(['PACKAGE', 'AI_IDENTIFIED']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  citations: z.array(z.string()),
});

export const StepDOutputSchema = z.object({
  internalStatements: z.array(AIStatementSchema),
  clientStatements: z.array(AIStatementSchema),
  risksAndLimitations: z.array(AIRiskLimitationSchema),
});

export type StepDOutput = z.infer<typeof StepDOutputSchema>;
