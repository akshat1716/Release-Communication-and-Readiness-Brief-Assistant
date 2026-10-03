# Release Communication and Readiness Brief Assistant

A full-stack Next.js web application designed to analyze developer release packages, run 6 non-AI deterministic readiness checks, execute a multi-step structured LLM analysis workflow, track human edits/approvals per statement, maintain immutable release version snapshots with SHA-256 stale statement detection, and compile reviewed final release briefs strictly from approved content.

---

## Live Deployment & Architecture Overview

- **Live URL**: `https://release-brief-assistant.vercel.app` (Placeholder for Vercel deployment)
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS + Lucide Icons + Glassmorphism UI
- **Database**: PostgreSQL (Neon / Supabase) with Prisma ORM
- **LLM Integration**: Google Gemini API (`gemini-2.5-flash` with structured outputs via `responseMimeType: "application/json"`)
- **Logging**: Pino structured JSON logger
- **Testing**: Vitest test runner (35 tests passing across 12 test suites)

---

## Key Features & Workflow

### 1. Release Package Form & Stable Identifiers
- Every package item receives a stable prefixed ID (`F1`, `B1`, `C1`, `QA1`, `L1`, `M1`, `U1`) for precise citation tracing across summaries.
- Includes a **"Load Sample Release Package"** button that populates a realistic release payload containing intentional gaps (C1 changed behaviour without migration notes) and an unsupported claim (F1 mobile biometric auth tested only on desktop browsers).

### 2. Deterministic Readiness Checks (Pure Code Engine)
Executed before and independently of any AI LLM calls:
1. `CHECK_QA_EMPTY`: Verifies QA evidence entries exist.
2. `CHECK_LIMITATIONS_EMPTY`: Verifies known limitations section is populated.
3. `CHECK_USER_GROUPS_EMPTY`: Verifies affected user groups are specified.
4. `CHECK_BUGFIX_QA_MATCH`: Warns if bug fixes exist (`B1+`) without explicit QA regression records.
5. `CHECK_BEHAVIOUR_MIGRATION`: Fails if changed behavior items (`C1+`) exist without migration notes (`M1+`).
6. `CHECK_STABLE_IDS`: Validates format of all stable item identifiers.

### 3. Multi-Step LLM Analysis Pipeline (Vercel Timeout Safe)
Runs as independent API routes (`maxDuration = 60`) with UI progress tracking:
- **Step A (`/api/releases/.../analyze/step-a`)**: Classifies features, bug fixes, and behavior changes into user impact categories (`BREAKING`, `USER_VISIBLE`, `INTERNAL_ONLY`, `SECURITY`, `PERFORMANCE`) with rationales.
- **Step B (`/api/releases/.../analyze/step-b`)**: Identifies missing release information and gap suggestions.
- **Step C (`/api/releases/.../analyze/step-c`)**: Audits claims against QA evidence (`SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`).
- **Step D (`/api/releases/.../analyze/step-d`)**: Drafts Internal Technical & Client summaries with item citations (`[F1, QA1]`), and risk matrices. Includes automatic **Citation Sanitizer** to strip hallucinated non-existent IDs.

### 4. Human Governance Policy ("AI Cannot Approve")
- **Hard Rule**: AI outputs default strictly to `status: "DRAFT"`. No code path in the LLM pipeline has permission to mark any statement `APPROVED`.
- Statements are mutated to `APPROVED` or `REJECTED` strictly via human action (`PATCH /api/statements/[id]`).

### 5. Versioning, SHA-256 Hashing & Stale Statement Detection
- Updating package items creates a new immutable version (`v1`, `v2`, ...).
- Each statement calculates `sourceHash = SHA256(concat(cited_items))`.
- When cited items change or are removed in newer versions, statements are flagged as `STALE - RE-REVIEW REQUIRED`.
- **Side-by-Side Compare**: Visual diff of package items and statements between any two versions (`vA` vs `vB`).

### 6. Reviewed Final Release Brief Generation
- Compiles Markdown release briefs strictly from `APPROVED` statements.
- Blocks generation if unreviewed `DRAFT` statements, `REJECTED` items, or failing checks exist.
- Supports optional **"Allow Partial Brief Generation"** override with explicit disclaimer warnings.

---

## Local Development & Setup Instructions

### Prerequisites
- Node.js 18+ and npm 10+
- PostgreSQL database instance (Neon, Supabase, or local Postgres)

### Environment Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/release-brief-assistant.git
   cd release-brief-assistant
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:
   ```ini
   DATABASE_URL="postgresql://user:pass@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
   DIRECT_URL="postgresql://user:pass@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
   LLM_PROVIDER="gemini"
   LLM_API_KEY="your-gemini-api-key"
   LLM_MODEL="gemini-2.5-flash"
   MOCK_LLM="true" # Set "true" for offline testing, "false" for live Gemini calls
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Run database migrations:
   ```bash
   npm run db:migrate
   ```

6. Start local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Running the Test Suite

Run the Vitest test suite covering deterministic checks, SHA-256 crypto hashing, citation sanitization, stale statement detection, version diffing, governance approval rules, and final brief compilation:

```bash
npm test
```

Expected Output:
```
Test Files  12 passed (12)
     Tests  35 passed (35)
```

---

## Production Deployment (Vercel + Neon PostgreSQL)

### Step 1: Database Setup on Neon
1. Create a PostgreSQL project on [Neon](https://neon.tech).
2. Copy the **Pooled Connection String** as `DATABASE_URL` (`postgresql://...pgbouncer=true`).
3. Copy the **Direct Connection String** as `DIRECT_URL` (`postgresql://...sslmode=require`).

### Step 2: Deploy to Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Set Environment Variables in Vercel project settings:
   - `DATABASE_URL`: Your Neon Pooled connection string.
   - `DIRECT_URL`: Your Neon Direct connection string.
   - `LLM_PROVIDER`: `gemini`
   - `LLM_API_KEY`: Your Google Gemini API Key.
   - `LLM_MODEL`: `gemini-2.5-flash`
   - `MOCK_LLM`: `false` (*IMPORTANT: Setting MOCK_LLM=true in production will fail startup & /api/health*).
3. Set Build Command: `npm run build`
4. Deploy application.
5. Verify health check endpoint: `https://<your-app>.vercel.app/api/health`.


---

## Intentionally Excluded Scope

As specified in project requirements:
- Git provider integrations (GitHub / GitLab Webhooks).
- Automated deployment triggers or rollback handlers.
- Public changelog publishing portals.
