# AGENT_USAGE.md: Agent Collaboration & Execution Record

This document provides a transparent log of tools used, representative prompts, delegated tasks, mistakes made, corrections applied, and verification steps executed during the development of the **Release Communication and Readiness Brief Assistant**.

- **Live URL**: [https://release-brief-assistant.vercel.app](https://release-brief-assistant.vercel.app)
- **GitHub Repository**: [https://github.com/akshat1716/Release-Communication-and-Readiness-Brief-Assistant](https://github.com/akshat1716/Release-Communication-and-Readiness-Brief-Assistant)

---

## 1. Tools & Environment Used

| Tool / Technology | Category | Usage Purpose |
| :--- | :--- | :--- |
| `write_to_file` | File System | Creating project files, modules, Prisma schemas, Next.js pages, and tests |
| `replace_file_content` | File System | Targeted code refactoring and bug fixing |
| `run_command` | System Execution | Executing `npm install`, `npx prisma generate`, `vitest`, `playwright test`, `next build` |
| `manage_task` | Task Management | Monitoring asynchronous background builds and test runs |
| `Vitest` | Test Framework | Unit and integration testing across 19 test suites (72 tests passing) |
| `@playwright/test` | E2E Browser Testing | Real browser responsive testing across 3 viewports (360px, 768px, 1280px) and screenshot generation |
| `@testing-library/react` | Frontend Testing | Component test verification for loading, empty, error, and governance states |
| `happy-dom` | DOM Environment | High-performance DOM simulation for frontend component tests |
| `Prisma ORM` | Database ORM | Schema management and type generation for PostgreSQL |
| `Pino` | Logging | Structured JSON logging for application events and LLM steps |

---

## 2. Representative User Prompts & Instructions

1. **Initial Requirement**:
   > *"Build a complete, deployable full-stack web application for a hiring assessment... Work in phases and confirm each phase works before moving on. Plan first (write PLAN.md), then implement."*

2. **Refined Technical Mandates**:
   > *"Use PostgreSQL (Neon) for both local dev and production. No SQLite... Run each AI step as its own API call... Use SHA-256, not MD5... Stale detection: each statement stores a hash of the content of only the items it cites... If MOCK_LLM=true and NODE_ENV=production, fail startup / the health check... Enforce 'AI cannot approve' server-side..."*

3. **Hiring Reviewer Hardening Prompt**:
   > *"Strengthen AI engineering (visible defensive parsing and schema validation, bounded retry/repair, prompt-size and token-cost controls) and strengthen frontend/UX (visual discipline, safe rendering of AI content, loading/empty/error/responsive states with clear implementation evidence)... Keep all existing tests passing... Never commit to main..."*

4. **Verification & Hardening Gaps**:
   > *"Close test gaps in AI runner (timeouts, repair prompt contents, truncated JSON, multi-step backoff with max cap, thoughts token cost tracking). Real-browser responsive and state verification with Playwright (viewports 360, 768, 1280, no horizontal overflow, keyboard reachability, real screenshots saved to docs/screenshots). Standalone smoke script reading LLM_API_KEY only from env with timeout abort mode."*

---

## 3. Important Mistakes, Corrections, & Rejected Suggestions

1. **Prisma Provider Assumption**:
   - *Initial Mistake*: Proposed SQLite for local development and PostgreSQL for production.
   - *Correction*: User correctly noted that switching database providers between environments in Prisma causes deployment liabilities and schema drift. Updated schema to use PostgreSQL (`provider = "postgresql"`) across all environments.

2. **ReleaseItem Primary Key Scope**:
   - *Initial Mistake*: Defined `id` on `ReleaseItem` as `@id` alone, causing primary key unique constraint collisions when creating multiple release packages with stable IDs (`F1`, `B1`, `QA1`).
   - *Correction*: Updated Prisma schema and PostgreSQL database table constraint to use a composite primary key `@@id([releaseVersionId, id])`, cleanly isolating stable item IDs per version.

3. **Vercel Timeout Limits for Long LLM Chains**:
   - *Initial Mistake*: Planned a single monolithic LLM call for all 4 analysis steps.
   - *Correction*: Refactored AI workflow into 4 distinct per-step API endpoints (`step-a`, `step-b`, `step-c`, `step-d`) with `maxDuration = 60` and UI progress tracking to prevent serverless function execution timeouts.

4. **Defensive Parsing Strategy**:
   - *Considered Suggestion*: Regex-based bracket extraction or trailing comma regex cleaner.
   - *Correction*: Rejected regex bracket extraction and trailing comma "fixing" per explicit prompt directive; strictly implemented strict `JSON.parse` first, falling back only to stripping a single surrounding ```` / ````json code fence, routing any other syntax anomaly directly to the repair prompt path.

5. **Vitest React JSX Transform in DOM Environment**:
   - *Mistake*: Initially ran Testing Library tests under happy-dom without `@vitejs/plugin-react` configured in `vitest.config.ts`, triggering `ReferenceError: React is not defined`.
   - *Correction*: Added `@vitejs/plugin-react` to `vitest.config.ts` plugins to ensure automatic JSX transformation across all component test suites.

6. **Thinking Budget SDK Check**:
   - *Investigation*: Evaluated `@google/generative-ai` v0.21.0 for thinking budget configuration.
   - *Honest Reporting*: Verified that `GenerationConfig` in v0.21.0 lacks `thinkingConfig`. Explicitly documented that thinking budget is unsupported in the current SDK version rather than making unverified claims.

7. **StrictMode Double-Mount Aborted Fetch Race Condition**:
   - *Mistake*: In `app/releases/[id]/page.tsx`, `finally { setLoading(false); }` ran even when the initial effect mount was aborted by React StrictMode cleanup, prematurely setting `loading` to `false`.
   - *Correction*: Guarded `setLoading(false)` with `if (!signal?.aborted)` so unmount cleanup does not trigger premature completion of the loading skeleton.

8. **Auditing Audience Enum Values in E2E Mocks**:
   - *Mistake*: `mockFullRelease` in Playwright E2E tests used legacy strings `'CLIENT_FACING'` and `'INTERNAL_TECHNICAL'` instead of canonical `'CLIENT'` and `'INTERNAL'`, causing statements filter to omit items.
   - *Correction*: Aligned fixture with the canonical TypeScript `AudienceType` enum.

---

## 4. Verification Methods & Quality Controls

- **Unit & Integration Test Suite**: 72 tests executed via Vitest across 19 test suites covering deterministic checks, SHA-256 crypto hashing, citation sanitization, stale statement detection, version diffing, server-side approval enforcement, defensive parsing, exponential backoff with seeded random, deadline bounds, token limits, thoughts token usage telemetry, and full component rendering states. All 72 tests passed cleanly (`npm test`).
- **Real-Browser Responsive E2E Suite**: 6 Playwright tests executed across 3 responsive viewports (360px, 768px, 1280px) asserting zero horizontal overflow (`scrollWidth <= innerWidth`), element visibility, and tab-focus reachability (`npm run test:e2e`).
- **Real Screenshot Generation**: 14 real `.png` screenshots captured directly by Playwright and saved to `docs/screenshots/`.
- **Production Build Validation**: Next.js production build (`npm run build`) compiled successfully with zero type or lint errors across static and dynamic routes.
- **Health Check Guard Verification**: Verified `/api/health` returns HTTP 500 when `MOCK_LLM=true` in `NODE_ENV=production`.
- **Injection Safety Verification**: Verified via automated test `tests/ui-safe-rendering.test.tsx` that `<script>` and `<img>` payloads render strictly as inert plain text without executing.
