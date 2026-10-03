# AGENT_USAGE.md: Agent Collaboration & Execution Record

This document provides a transparent log of tools used, representative prompts, delegated tasks, mistakes made, corrections applied, and verification steps executed during the development of the **Release Communication and Readiness Brief Assistant**.

---

## 1. Tools & Environment Used

| Tool / Technology | Category | Usage Purpose |
| :--- | :--- | :--- |
| `write_to_file` | File System | Creating project files, modules, Prisma schemas, Next.js pages, and tests |
| `replace_file_content` | File System | Targeted code refactoring and bug fixing |
| `run_command` | System Execution | Executing `npm install`, `npx prisma generate`, `vitest`, `next build` |
| `manage_task` | Task Management | Monitoring asynchronous background builds and installations |
| `Vitest` | Test Framework | Unit and integration testing across 12 test suites (35 tests passing) |
| `Prisma ORM` | Database ORM | Schema management and type generation for PostgreSQL |
| `Pino` | Logging | Structured JSON logging for application events and LLM steps |

---

## 2. Representative User Prompts & Instructions

1. **Initial Requirement**:
   > *"Build a complete, deployable full-stack web application for a hiring assessment... Work in phases and confirm each phase works before moving on. Plan first (write PLAN.md), then implement."*

2. **Refined Technical Mandates**:
   > *"Use PostgreSQL (Neon) for both local dev and production. No SQLite... Run each AI step as its own API call... Use SHA-256, not MD5... Stale detection: each statement stores a hash of the content of only the items it cites... If MOCK_LLM=true and NODE_ENV=production, fail startup / the health check... Enforce 'AI cannot approve' server-side..."*

---

## 3. Important Mistakes, Corrections, & Rejected Suggestions

*(Logged during build in `AGENT_LOG.md`)*

1. **Prisma Provider Assumption**:
   - *Initial Mistake*: Proposed SQLite for local development and PostgreSQL for production.
   - *Correction*: User correctly noted that switching database providers between environments in Prisma causes deployment liabilities and schema drift. Updated schema to use PostgreSQL (`provider = "postgresql"`) across all environments.

2. **ReleaseItem Primary Key Scope**:
   - *Initial Mistake*: Defined `id` on `ReleaseItem` as `@id` alone, causing primary key unique constraint collisions when creating multiple release packages with stable IDs (`F1`, `B1`, `QA1`).
   - *Correction*: Updated Prisma schema and PostgreSQL database table constraint to use a composite primary key `@@id([releaseVersionId, id])`, cleanly isolating stable item IDs per version.

3. **Vercel Timeout Limits for Long LLM Chains**:
   - *Initial Mistake*: Planned a single monolithic LLM call for all 4 analysis steps.
   - *Correction*: Refactored AI workflow into 4 distinct per-step API endpoints (`step-a`, `step-b`, `step-c`, `step-d`) with `maxDuration = 60` and UI progress tracking to prevent serverless function execution timeouts.

4. **Hashing Algorithm Choice**:
   - *Initial Mistake*: Proposed MD5 for hashing package snapshots.
   - *Correction*: Switched to SHA-256 for cryptographic integrity across statement source hash tracking and snapshot versioning.

---

## 4. Verification Methods & Quality Controls

- **Unit Test Suite**: 35 focused unit tests executed via Vitest across 12 test suites covering deterministic checks, SHA-256 crypto hashing, citation sanitization, stale statement detection, version diffing, server-side approval enforcement, final brief compilation, pino logger redaction, and health check production guards. All 35 tests passed cleanly (`npm test`).
- **Production Build Validation**: Next.js production build (`npm run build`) compiled successfully with zero type or lint errors across static and dynamic routes.
- **Health Check Guard Verification**: Verified `/api/health` returns HTTP 500 when `MOCK_LLM=true` in `NODE_ENV=production`.
