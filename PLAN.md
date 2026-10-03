# Implementation Plan: Release Communication and Readiness Brief Assistant

## System Overview
The **Release Communication and Readiness Brief Assistant** is a full-stack Next.js web application designed to help engineering teams analyze, refine, and produce audience-specific release communication briefs. A developer inputs a structured release package (Features, Bug Fixes, Behaviour Changes, QA Evidence, Known Limitations, Migration Notes, Affected User Groups) with stable citations. The system executes deterministic validation checks, runs an LLM-powered multi-step analysis pipeline, tracks human edits/approvals per statement, maintains immutable version history with stale-citation tracking, and generates a final brief from approved content only.

---

## Architecture & Technology Stack

| Layer | Technology | Purpose / Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router, TypeScript) | Unified API routes & React Server/Client Components |
| **Styling & UI** | Tailwind CSS + Lucide Icons + Modern Glassmorphism | Clean, accessible, high-contrast responsive dashboard UI |
| **Database & ORM** | PostgreSQL (Neon / Supabase) with Prisma ORM | Exclusively PostgreSQL for local dev and production. No SQLite. |
| **Validation** | Zod | Runtime schema validation for forms, API payloads, and LLM structured outputs |
| **LLM Integration** | Google Gemini API (`@google/genai` or standard REST API) | JSON-schema structured output for classification, gap analysis, QA validation & summaries |
| **LLM Resilience** | Custom Service Wrapper | Configurable via `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, plus `MOCK_LLM=true` fixture mode. Retries on malformed JSON and sanitizes citations. If `MOCK_LLM=true` in `NODE_ENV=production`, server startup & `/api/health` fail immediately |
| **Per-Step Execution** | Independent API Routes | Each AI analysis step runs as an independent route to ensure operations complete well within Vercel's function timeout limits (with `maxDuration` set). Real-time progress is shown in the UI |
| **Hashing & Integrity** | Crypto SHA-256 | SHA-256 hashing for package content snapshots and statement source-item content hashes |
| **Logging** | Pino | Structured JSON logging (Request IDs, Release IDs, Version, Step name, model, latency, tokens, success/failure, validation errors without credentials) |
| **Testing** | Vitest | Focused unit/integration tests for deterministic checks, citation validation, stale detection, version diffing, server-side AI-cannot-approve rule, final brief approved-only constraint, and LLM schema validation with malformed output |

---

## Data Model Architecture (Prisma Schema)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Release {
  id                String           @id @default(uuid())
  name              String
  versionLabel      String
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  currentVersionNum Int              @default(1)
  versions          ReleaseVersion[]
}

model ReleaseVersion {
  id                 String                @id @default(uuid())
  releaseId          String
  release            Release               @relation(fields: [releaseId], references: [id], onDelete: Cascade)
  versionNum         Int
  packageSnapshot    String                @db.Text // Full JSON snapshot of release package
  packageHash        String                // SHA-256 hash of package data
  createdAt          DateTime              @default(now())
  items              ReleaseItem[]
  checks             CheckResult[]
  analysisRuns       AnalysisRun[]
  statements         Statement[]
  classifications    AIClassification[]
  riskLimitations    AIRiskLimitation[]
  missingInfos       AIMissingInfo[]
  claimVerifications AIClaimVerification[]
  finalBriefs        FinalBrief[]

  @@unique([releaseId, versionNum])
}

model ReleaseItem {
  id               String         @id // Stable ID e.g. F1, B2, C1, QA1, L1, M1, U1
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  category         String         // FEATURE, BUGFIX, BEHAVIOUR, QA, LIMITATION, MIGRATION, USER_GROUP
  title            String
  description      String         @db.Text
  metadataJson     String?        @db.Text
}

model CheckResult {
  id               String         @id @default(uuid())
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  ruleId           String         // e.g. CHECK_QA_EMPTY, CHECK_NO_LIMITATIONS
  name             String
  status           String         // PASS, FAIL, WARN
  message          String
  details          String?        @db.Text
}

model AnalysisRun {
  id               String         @id @default(uuid())
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  stepName         String         // STEP_A_CLASSIFY, STEP_B_MISSING_INFO, STEP_C_QA_CLAIMS, STEP_D_SUMMARIES
  promptVersion    String         @default("v1.0")
  model            String
  tokensUsed       Int            @default(0)
  latencyMs        Int            @default(0)
  status           String         // PENDING, COMPLETED, FAILED
  error            String?        @db.Text
  createdAt        DateTime       @default(now())
}

model Statement {
  id               String         @id @default(uuid())
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  analysisRunId    String?
  audience         String         // INTERNAL, CLIENT
  text             String         @db.Text // Current text (editable)
  originalText     String         @db.Text // Preserved original AI text
  citations        String         // JSON array of item IDs e.g. ["F1", "QA1"]
  status           String         @default("DRAFT") // DRAFT, EDITED, APPROVED, REJECTED
  sourceHash       String         // SHA-256 hash of ONLY the cited items' content
  isStale          Boolean        @default(false)
  staleReason      String?
  orderIndex       Int            @default(0)
}

model AIClassification {
  id               String         @id @default(uuid())
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  itemId           String         // ID of feature/bugfix/behaviour item
  impact           String         // BREAKING, USER_VISIBLE, INTERNAL_ONLY, SECURITY, PERFORMANCE
  rationale        String         @db.Text
}

model AIRiskLimitation {
  id               String         @id @default(uuid())
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  text             String         @db.Text
  source           String         // PACKAGE, AI_IDENTIFIED
  severity         String         // LOW, MEDIUM, HIGH
  citations        String         // JSON array of cited IDs
}

model AIMissingInfo {
  id               String         @id @default(uuid())
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  category         String         // QA, DEPLOYMENT, MIGRATION, SECURITY, PERFORMANCE
  description      String         @db.Text
  suggestion       String         @db.Text
}

model AIClaimVerification {
  id               String         @id @default(uuid())
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  itemId           String         // Item ID making claim (e.g. F1)
  claimText        String         @db.Text
  status           String         // SUPPORTED, PARTIALLY_SUPPORTED, UNSUPPORTED
  reason           String         @db.Text
  qaCitations      String         // JSON array of QA IDs matching claim
}

model FinalBrief {
  id               String         @id @default(uuid())
  releaseId        String
  releaseVersionId String
  releaseVersion   ReleaseVersion @relation(fields: [releaseVersionId], references: [id], onDelete: Cascade)
  contentJson      String         @db.Text // Final formatted markdown/JSON brief payload
  generatedAt      DateTime       @default(now())
}
```

---

## Deterministic Readiness Checks Engine (Non-AI, Pure Code)

The system executes 6 deterministic checks before triggering any LLM requests. These pass/fail indicators give immediate developer feedback:

1. **`CHECK_QA_EMPTY`**: Fails if the QA summary evidence list is empty or whitespace only.
2. **`CHECK_LIMITATIONS_EMPTY`**: Fails if Known Limitations list is empty.
3. **`CHECK_USER_GROUPS_EMPTY`**: Fails if Affected User Groups list is empty.
4. **`CHECK_BUGFIX_QA_MATCH`**: Warns/Fails if bug fixes exist (`B1+`) but no QA evidence items reference bug testing or bug IDs.
5. **`CHECK_BEHAVIOUR_MIGRATION`**: Fails if Changed Behaviour items exist (`C1+`) but no Migration/Configuration notes (`M1+`) are documented.
6. **`CHECK_STABLE_IDS`**: Fails if any package item lacks a valid prefixed stable ID (`F*`, `B*`, `C*`, `QA*`, `L*`, `M*`, `U*`).

---

## AI Workflow & Prompt Engineering Pipeline (Per-Step Endpoints)

To adhere to Vercel execution duration limits, each step runs as a distinct API invocation with front-end progress tracking:

- **Step A (`/api/releases/.../analyze/step-a`)**: Classify each feature, bugfix, and behaviour item by user impact (`BREAKING`, `USER_VISIBLE`, `INTERNAL_ONLY`, `SECURITY`, `PERFORMANCE`) with rationale.
- **Step B (`/api/releases/.../analyze/step-b`)**: Identify missing release information & gap suggestions.
- **Step C (`/api/releases/.../analyze/step-c`)**: Audit claims against supplied QA evidence (`SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`).
- **Step D (`/api/releases/.../analyze/step-d`)**: Draft Internal Technical & Non-Technical Client summaries with statement-level citations (`[F1, QA1]`) and risks/limitations.

### Deterministic Output Validation, Sanitization & Retries
- All LLM responses are validated via Zod schemas.
- If JSON parsing or validation fails, retries up to 2 times automatically.
- **Citation Sanitizer**: Post-processes statement citations to strip or flag any ID not in the version package snapshot.
- **Server-Side Approval Enforcement**: Analysis pipeline strictly creates statements with `status: "DRAFT"`. There is NO code path in the AI service that sets `APPROVED`.

---

## Governance & Approval Policy: "AI Cannot Approve"

1. **Hard Constraint**: AI only generates `status: "DRAFT"` statements and recommendations.
2. **Server-Side Enforcement**: Only explicit `PATCH /api/statements/[id]` calls by human users can mutate a statement's status to `APPROVED` or `REJECTED`. The AI pipeline has no permission or code path to set `APPROVED`.
3. **UI Governance Copy**: Prominent UI banner stating: *"AI generates drafts and flags risks. Only human reviewers can approve release statements or mark a release brief as approved."*
4. **Final Brief Generator Rules**:
   - Compiles ONLY `APPROVED` or user-edited & `APPROVED` statements.
   - If unreviewed `DRAFT` or `REJECTED` statements exist, brief generation is blocked with an explicit error list, unless overridden by explicit human request (with disclaimers of omitted items).

---

## Versioning, SHA-256 Hashing & Stale Statement Engine

1. **Immutable Snapshots**: Each release update creates a `ReleaseVersion` record (`v1`, `v2`, ...).
2. **SHA-256 Hash Computation**:
   - `packageHash = SHA256(JSON.stringify(sorted_package_items))`
   - `statement.sourceHash = SHA256(concat(sorted_cited_items_content))` (computed ONLY on the items cited by that specific statement).
3. **Stale Statement Detection**:
   - When viewing or comparing a release version, each statement checks the current SHA-256 content hash of its cited items. If a cited item was modified or removed in a newer version, `isStale = true` with a clear message (`"Cited item QA1 was modified/removed in v2"`).
4. **Side-by-Side Version Diffing**:
   - Visual comparison of package fields and generated statements between any two versions (`vA` vs `vB`).

---

## Health Check & Production Safeguard (`/api/health`)

- Endpoint `/api/health` checks:
  1. Database connectivity (executes `SELECT 1`).
  2. `MOCK_LLM` flag check: If `MOCK_LLM=true` AND `NODE_ENV=production`, the health check returns HTTP 500 with `status: "UNHEALTHY", error: "MOCK_LLM=true is strictly prohibited in production environment"`.
  3. LLM Provider configuration check.

---

## API Routes & Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/releases` | List all releases with version counts & status |
| `POST` | `/api/releases` | Create a new release package |
| `GET` | `/api/releases/[id]` | Fetch release detail with active version & snapshot |
| `POST` | `/api/releases/[id]/versions` | Create a new release version snapshot |
| `POST` | `/api/releases/[id]/versions/[versionId]/checks` | Run pure-code deterministic checks |
| `POST` | `/api/releases/[id]/versions/[versionId]/analyze/step-a` | Run Step A: Impact Classification |
| `POST` | `/api/releases/[id]/versions/[versionId]/analyze/step-b` | Run Step B: Missing Info Analysis |
| `POST` | `/api/releases/[id]/versions/[versionId]/analyze/step-c` | Run Step C: QA Claim Verification |
| `POST` | `/api/releases/[id]/versions/[versionId]/analyze/step-d` | Run Step D: Audience Summaries & Risks |
| `PATCH` | `/api/statements/[id]` | Human-only endpoint to update text or set status (`EDITED`, `APPROVED`, `REJECTED`) |
| `GET` | `/api/releases/[id]/compare?v1=1&v2=2` | Compute side-by-side package & statement diff |
| `POST` | `/api/releases/[id]/versions/[versionId]/final-brief` | Generate reviewed final brief (approved statements only) |
| `GET` | `/api/releases/sample` | Return realistic sample package with deliberate gaps & unsupported claim |
| `GET` | `/api/health` | Healthcheck (verifies DB, LLM status, and blocks `MOCK_LLM` in prod) |

---

## UI / UX Layout & Component Navigation

Navigation with 6 tabs on Release Detail page:
1. **Package**: Form with stable IDs (`F1`, `B1`, `C1`, `QA1`, `L1`, `M1`, `U1`), item CRUD, "Load sample release" button, save version.
2. **Checks**: Deterministic pass/fail checklist cards.
3. **Analysis**: AI-generated classifications, missing info suggestions, and unsupported QA claim audit cards with per-step progress bar/spinners.
4. **Summaries**: Internal Technical Summary & Client Summary, inline statement editing, citation badges, stale indicators, and human Approve/Reject buttons.
5. **Versions & Compare**: Side-by-side diff viewer for package items & statements across immutable versions.
6. **Final Brief**: Exportable final brief compiled strictly from approved statements.

---

## Deliverables & Documentation Checklist

- **`README.md`**: Overview, setup/run steps, architecture, completed scope, intentionally excluded scope, test instructions, limitations, Vercel + Neon deployment guide & live URL placeholder.
- **`AGENT_USAGE.md`**: Tools used, representative prompts, delegated work, rejected suggestions, verification methods.
- **`AGENT_LOG.md`**: Running transcript of actions, mistakes, corrections, and decisions.
- **`.env.example`**: Clean template with placeholder variable names only (no secrets). `.env` added to `.gitignore`.
- **Vitest Test Suite**:
  - Deterministic checks execution
  - Citation validator (invalid IDs stripped/flagged)
  - Stale statement detection (SHA-256 hash match/mismatch)
  - Version diffing logic
  - Server-side "AI cannot approve" enforcement
  - Final brief approved-only compiler constraint
  - LLM schema validation with malformed output retry handler

---

## Phased Implementation Roadmap

1. **Phase 1: Scaffold & DB Setup** (Next.js App Router, Tailwind/shadcn UI, Neon PostgreSQL Prisma setup, Pino logger, Vitest config).
2. **Phase 2: Deterministic Checks & Package Form** (Pure code checks, sample release fixture with gaps, package editor UI with stable IDs).
3. **Phase 3: LLM Service & Multi-Step Pipeline** (Zod schemas, step-a to step-d API endpoints, progress tracking, citation sanitizer, malformed output retry).
4. **Phase 4: Human Review UI & Stale Engine** (Statement review UI, original text preservation, SHA-256 stale statement detection).
5. **Phase 5: Versioning, Side-by-Side Compare & Final Brief** (Immutable snapshots, side-by-side diff component, approved-only final brief export).
6. **Phase 6: Polish, Tests, Health Check & Documentation** (Vitest test suite, `/api/health`, `README.md`, `AGENT_USAGE.md`, `AGENT_LOG.md`, `.env.example`, deployment steps).
PI will be verified for structured JSON compliance.
