# Agent Log

This log records agent actions, corrections, mistakes, decisions, and verification steps throughout the project lifecycle.

## Entry 1: Project Initialization & Planning Phase
- **Action**: Analyzed requirements for the "Release Communication and Readiness Brief Assistant".
- **Outcome**: Created `PLAN.md` specifying data schema, 6 deterministic readiness checks, 4-step structured LLM analysis pipeline, Zod validation & citation sanitization, human governance ("AI cannot approve"), immutable versioning, stale statement detection engine, and side-by-side version diffing.
- **Notes / Observations**:
  - Ensured clear separation between non-AI deterministic code rules and LLM-based analysis.
  - Specified `MOCK_LLM=true` fixture mode for deterministic tests alongside Gemini API configuration.
  - Set up `AGENT_LOG.md` to track development events and corrections for inclusion in `AGENT_USAGE.md`.

## Entry 2: User Approval & Refined Technical Mandates
- **Action**: User approved PLAN.md with 8 explicit technical adjustments:
  1. PostgreSQL (Neon) for both local dev and production (strictly no SQLite).
  2. Independent API routes per AI step with front-end progress indicators to prevent Vercel execution timeouts.
  3. SHA-256 algorithm for all hashing (package snapshots & cited source items).
  4. Per-statement cited item hash tracking for precise stale detection.
  5. Automatic startup / health check failure if `MOCK_LLM=true` in `NODE_ENV=production`.
  6. Server-side "AI cannot approve" enforcement: `APPROVED` status can only be set via explicit human API endpoints, backed by unit tests.
  7. Comprehensive test coverage requirements (deterministic checks, citation validation, stale detection, version diff, server-side approval lock, final brief filter, malformed LLM retry).
  8. Detailed documentation deliverables (`README.md`, `AGENT_USAGE.md`, `AGENT_LOG.md`, `.env.example`).
- **Phase Execution Plan**:
  - Phase 1: Scaffold & DB Setup (Next.js, Prisma, PostgreSQL, Tailwind, Pino, Vitest).
  - Phase 2: Deterministic Checks & Package Form UI.
  - Phase 3: LLM Service & Multi-step API Pipeline.
  - Phase 4: Human Review UI & Stale Statement Engine.
  - Phase 5: Versioning, Side-by-Side Compare & Final Brief.
  - Phase 6: Polish, Tests, Health Check & Documentation.

## Entry 3: Phase 1 Completed - Scaffold & DB Setup
- **Action**: Scaffolded Next.js App Router project with TypeScript, Tailwind CSS, Prisma (PostgreSQL), Pino logger, and Vitest.
- **Verification**:
  - Prisma client generated successfully (`v5.22.0`).
  - Pino logger (`lib/logger.ts`) configured with JSON formatters and credential sanitization.
  - `lib/crypto.ts` built providing SHA-256 hashing for item contents & source citations.
  - `npm test` executed and passed 3 unit tests for crypto utility.

## Entry 4: Phase 2 Completed - Deterministic Checks & Package Form API
- **Action**: Implemented pure-code deterministic checks engine (`lib/checks.ts`), realistic sample release package fixture (`lib/fixtures/sample-release.ts`), and API routes for release creation, retrieval, immutable version creation, and check execution.
- **Verification**:
  - `lib/checks.ts` executes 6 deterministic rules (QA summary check, limitations check, user groups check, bugfix QA match check, behaviour migration alignment check, stable ID format check).
  - `SAMPLE_RELEASE_PACKAGE` verified with intentional gaps (C1 behaviour change without migration notes, F1 biometric feature claim not backed by web-only QA evidence).
  - `tests/checks.test.ts` passed all 6 test cases for deterministic rules.
  - All 9 unit tests passed across test suite.

## Entry 5: Phase 3 Completed - LLM Service & Multi-step Pipeline
- **Action**: Implemented Gemini API wrapper service (`lib/llm/index.ts`), Zod schemas (`lib/llm/schemas.ts`), citation sanitizer (`lib/llm/sanitizer.ts`), mock fixtures (`lib/llm/fixtures.ts`), and 4 independent per-step API endpoints (`step-a`, `step-b`, `step-c`, `step-d`) with `maxDuration = 60` for Vercel compliance.
- **Verification**:
  - Step A: Change impact classification (`BREAKING`, `USER_VISIBLE`, etc.).
  - Step B: Missing release information & operational gap detection.
  - Step C: Audit claims against QA evidence (`SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`).
  - Step D: Draft audience-specific summaries (internal technical & client) with citation sanitization and server-side enforced `DRAFT` status.
  - `tests/citation.test.ts` passed (sanitizes hallucinated non-existent IDs).
  - `tests/approval.test.ts` passed (enforces "AI cannot approve" hard rule and production guard).
  - `tests/llm.test.ts` passed (schema validation).
  - 18 total unit tests passing.

## Entry 6: Phase 4 Completed - Human Review API & Stale Engine
- **Action**: Implemented human review endpoint `PATCH /api/statements/[id]` for updating text or setting status (`EDITED`, `APPROVED`, `REJECTED`) while preserving `originalText`, SHA-256 stale detector `lib/stale.ts`, and unit test suite `tests/stale.test.ts`.
- **Verification**:
  - `PATCH /api/statements/[id]` validates allowed human review statuses, updates text, and clears stale flag upon explicit approval.
  - `evaluateStatementStaleStatus` detects cited item modification or deletion using SHA-256 content hashes.
  - `tests/stale.test.ts` passed 3 test cases for stale statement evaluation.
  - All 21 unit tests passed across test suite.

## Entry 7: Phase 5 Completed - Versioning, Side-by-Side Compare & Final Brief
- **Action**: Implemented version diffing module (`lib/diff.ts`), compare API route (`GET /api/releases/[id]/compare`), reviewed final brief compiler (`lib/brief.ts`), final brief API route (`POST /api/releases/[id]/versions/[versionId]/final-brief`), and unit tests (`tests/diff.test.ts`, `tests/brief.test.ts`).
- **Verification**:
  - `lib/diff.ts` accurately computes package additions, modifications, removals, and statement text/citation diffs between any two release versions.
  - `lib/brief.ts` enforces that final briefs contain ONLY approved statements, blocking compilation when unreviewed draft statements or failed checks exist, with an explicit `allowPartial` override disclaimer option.
  - `tests/diff.test.ts` passed 2 version comparison test cases.
  - `tests/brief.test.ts` passed 4 test cases for approved-only compilation, check blocking, and disclaimer dispatches.
  - All 27 unit tests passed across test suite.

## Entry 8: Phase 6 Completed - Frontend UI, Health Check & Documentation
- **Action**: Implemented health check endpoint (`/api/health`), 6-tab frontend UI (Package Editor, Checks, Analysis, Summaries, Compare, Final Brief), `README.md`, `AGENT_USAGE.md`, `.env.example`, and `app/layout.tsx`.
- **Verification**:
  - `/api/health` returns HTTP 500 when `MOCK_LLM=true` in `NODE_ENV=production` and validates DB connectivity.
  - `npm test` executed with 27 passed tests across 8 test suites.
  - `npm run build` executed and compiled successfully (`✓ Compiled successfully`, static pages 7/7).
  - All repo deliverables prepared and verified.

## Entry 9: Real Verification Pass & Security/Route Audit
- **Action**: Performed verification pass covering database scripts, server-side route approval locks, logger credential sanitization, and route handler integration testing.
- **Verification Details**:
  - `package.json` scripts updated to include `"postinstall": "prisma generate"`, `"db:migrate": "prisma db push"`, and `"build": "prisma generate && prisma db push --accept-data-loss && next build"`.
  - Created `tests/approval-route.test.ts` to test the actual Next.js route handler (`POST /api/releases/[id]/versions/[versionId]/analyze/step-d`). Confirmed that every statement created by the AI analysis route handler is strictly `status: "DRAFT"` with no code path allowing `APPROVED`.
  - Created `tests/logger.test.ts` to verify Pino logger sanitizes `LLM_API_KEY`, `apiKey`, `authorization`, and secret properties before logging.
  - Vitest test suite expanded to 30 unit/integration tests across 11 test files, all passing (`npm test`).
  - `.env` in workspace currently has placeholder `DATABASE_URL` (`localhost:5432`) and empty `LLM_API_KEY`. Live Neon DB migration and live Gemini API call require active credentials populated in `.env`.

## Entry 10: Verification Pass Refinements, Schema Migrations & Security Audits
- **Mistakes Corrected**:
  1. *Unclear Mock vs Real Output Labeling*: Previously presented analysis output without explicitly labeling that it originated from `MOCK_LLM` fixtures rather than live Gemini API execution. Corrected and logged.
  2. *Unverified Latency Estimate*: Previously included an unmeasured latency estimate ("2.2-3.8s"). Removed unmeasured estimates and implemented wall-clock latency timers (`latencyMs = Date.now() - startTime`) per step in `lib/llm/index.ts` and `scripts/smoke-llm.ts`.
  3. *Destructive Build Script*: Previously used `prisma db push --accept-data-loss` in `build`. Removed `db push` and generated `prisma/migrations/20261002000000_init/migration.sql` for PostgreSQL, switching build script to `"build": "prisma generate && prisma migrate deploy && next build"`.
- **Security & Redaction Audits**:
  - Configured global Pino redaction paths (`redact.paths`) in `lib/logger.ts` targeting `LLM_API_KEY`, `apiKey`, `authorization`, `DATABASE_URL`, and wildcard secret patterns. Verified via `tests/logger.test.ts`.
  - Audited all 30 occurrences of status `"APPROVED"` across the codebase. Confirmed `"APPROVED"` can ONLY be set via human interaction in `app/api/statements/[id]/route.ts`. Created `tests/approval-route.test.ts` to verify analysis routes (`step-d`) and `final-brief` routes never assign `APPROVED`.
- **Smoke Test & Execution Results**:
  - Created `scripts/smoke-llm.ts` (`npm run smoke:llm`) for offline and live Gemini API testing.
  - Ran `npm run build`: `prisma generate` succeeded, `prisma migrate deploy` checked connection to `localhost:5432` (returning `P1001: Can't reach database server at localhost:5432` since local Postgres daemon is offline). `npx next build` compiled successfully (`✓ Compiled successfully`, static pages 7/7).
  - All 32 unit/integration tests passed across 11 test suites (`npm test`).

## Entry 11: Direct Database Connections, Stale Approval Reset & Pino Serialization Audit
- **Action**: Applied 5 structural refinements based on explicit user feedback:
  1. Updated `prisma/schema.prisma` with `directUrl = env("DIRECT_URL")` for Neon pooled runtime vs direct migration connections. Updated `.env.example`, `.env`, and `README.md`.
  2. Created `prisma/migrations/migration_lock.toml` specifying `provider = "postgresql"`.
     - *NOTE*: `prisma/migrations/20261002000000_init/migration.sql` was hand-written and MUST be validated with `prisma migrate dev` / `prisma migrate diff` against a live database instance.
  3. Fixed Pino redaction paths in `lib/logger.ts` to explicit property paths (`apiKey`, `LLM_API_KEY`, `authorization`, `DATABASE_URL`, `DIRECT_URL`, `headers.authorization`, `*.apiKey`, `*.LLM_API_KEY`, `*.authorization`, `*.DATABASE_URL`, `*.DIRECT_URL`, `*.headers.authorization`). Added `tests/logger.test.ts` testing serialized JSON string output to confirm `[REDACTED]` is output and secret values never leak.
  4. Updated version creation route (`app/api/releases/[id]/versions/route.ts`) to reset statements from `APPROVED` to `EDITED` (needs re-review) if cited items were modified/removed (`isStale === true`). Updated `lib/brief.ts` to strictly exclude any stale statements from approved final brief lists. Added unit tests in `tests/version-stale-approval.test.ts` and `tests/brief.test.ts`.
- **Verification**:
  - `npm test` executed and passed **35 out of 35 tests** across 12 test suites.
  - `npx next build` compiled successfully (`✓ Compiled successfully`, static pages 7/7).

## Entry 12: Distinct NEEDS_REVIEW State & Environment Verification
- **Action**: Applied governance status refinement and environment file verification:
  1. Added `NEEDS_REVIEW` to `StatementStatus` type in `lib/types/release.ts`.
  2. Updated version creation route (`app/api/releases/[id]/versions/route.ts`) to set `status = 'NEEDS_REVIEW'` when statement cited items change or are deleted (`isStale === true`).
  3. Updated UI badge rendering in `components/SummariesTab.tsx` to render `"STALE - NEEDS RE-REVIEW"` for `NEEDS_REVIEW` status, ensuring stale statements are never labeled `"EDITED"`.
  4. Updated `tests/version-stale-approval.test.ts` to assert `newStatus === 'NEEDS_REVIEW'` and `newStatus !== 'EDITED'`.
  5. Verified `.env` is in `.gitignore` (line 27) and confirmed existing `.env` values were preserved.
- **Verification**:
  - `npm test` executed and passed **35 out of 35 tests** across 12 test suites.
  - `npx next build` compiled successfully (`✓ Compiled successfully`, static pages 7/7).
