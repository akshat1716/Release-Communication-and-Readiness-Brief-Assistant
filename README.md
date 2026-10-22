# Release Communication and Readiness Brief Assistant

A production-grade, full-stack Next.js web application designed to analyze developer release packages, run 6 non-AI deterministic readiness checks, execute a multi-step structured LLM analysis workflow, track human edits/approvals per statement, maintain immutable release version snapshots with SHA-256 stale statement detection, and compile reviewed final release briefs strictly from approved content.

---

## Live Deployment & Architecture Overview

- **Live URL**: [https://release-brief-assistant.vercel.app](https://release-brief-assistant.vercel.app)
- **GitHub Repository**: [https://github.com/akshat1716/Release-Communication-and-Readiness-Brief-Assistant](https://github.com/akshat1716/Release-Communication-and-Readiness-Brief-Assistant)
- **Framework**: Next.js 14+ (App Router, TypeScript 5.6)
- **Styling**: Tailwind CSS + Lucide Icons + Glassmorphism UI
- **Database**: PostgreSQL (Neon / Supabase) with Prisma ORM
- **LLM Integration**: Google Gemini API (`gemini-2.5-flash` with structured outputs via `responseMimeType: "application/json"`)
- **Logging**: Pino structured JSON logger with credential redaction
- **Testing**: Vitest test runner (65 tests passing across 18 test suites)

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

## LLM Reliability, Resilience & Cost Controls

The AI engineering layer ([`lib/llm/`](file:///Users/akshat/Desktop/projects/Release%20Communication%20and%20Readiness%20Brief%20Assistant/lib/llm)) features defense-in-depth reliability and cost control systems:

1. **Defensive Parsing**:
   - Executes strict `JSON.parse` first.
   - Fallback only strips a single surrounding ```` / ````json code fence.
   - Rejects unescaped trailing commas or conversational preamble directly into the repair path.
2. **Bounded Retry & Self-Healing Repair Loop**:
   - **Transient Errors** (HTTP 429, 5xx, timeouts): Retries with exponential backoff plus random jitter (`delay = Math.min(maxDelay, baseDelay * 2 ** attempt) + jitter`).
   - **Parse / Schema Failures** (`SyntaxError`, `ZodError`): Triggers a self-healing repair prompt embedding the specific validation error diff, giving the LLM up to 2 repair attempts.
   - **Non-Retryable Failures** (Auth, invalid request, safety blocks): Fails fast immediately with typed `LlmError`.
3. **Execution Deadlines & Timeouts**:
   - Enforces a per-step total deadline via `LLM_STEP_DEADLINE_MS` (default 45s, staying under serverless 60s maxDuration).
   - **Never sleeps past the deadline**: If the computed backoff delay exceeds remaining deadline budget, the runner immediately terminates with `DEADLINE_EXCEEDED` (HTTP 504).
   - Per-call timeout bounded via `AbortController`.
4. **Token Budgeting & Pre-Flight Controls**:
   - `serializePackageForPrompt()`: Formats compact JSON (no indentation), saving ~20-25% tokens per prompt compared to pretty-printing.
   - Pre-flight token estimation (`characters / 4`) enforces `LLM_MAX_INPUT_TOKENS` (default 50,000), rejecting oversized payloads with HTTP 413.
   - Limits response length via `LLM_MAX_OUTPUT_TOKENS` (default 8,192).
   - *Note on Thinking Budget*: Tested against `@google/generative-ai` v0.21.0. This SDK version does not expose `thinkingConfig` in `GenerationConfig`; thinking budget is disabled and reported as unsupported in this SDK version.
5. **Usage Telemetry & Cost Telemetry**:
   - Reads `result.response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, `thoughtsTokenCount`).
   - Persists actual token count into Prisma `AnalysisRun.tokensUsed`.
   - Computes estimated USD cost using environment rates (`LLM_PRICE_INPUT_PER_M` and `LLM_PRICE_OUTPUT_PER_M`) and returns it in the API response.
6. **Production Mock Guard**:
   - Strict runtime check in `lib/llm/index.ts`: If `MOCK_LLM=true` or `LLM_API_KEY` is missing in `NODE_ENV=production`, startup and health checks immediately fail with HTTP 500.

---

## Frontend States, Per-Step Recovery & Accessibility

1. **Per-Step Pipeline Recovery**:
   - Tracks granular state per step: `idle | running | completed | failed`, with duration timers and token telemetry.
   - On step failure, displays the specific failure message with a **"Retry Step X"** button (retries only that step) and a **"Resume from Step X"** button (skips previously completed steps).
   - Prevents double submits by disabling trigger buttons while analysis is active.
   - Cleans up in-flight fetch requests via `AbortController` on component unmount.
2. **Explicit Component States**:
   - **Loading**: Skeletons across ChecksTab, SummariesTab, FinalBriefTab, and AnalysisTab.
   - **Empty**: User guidance illustrations and trigger actions when no items, checks, or statements exist.
   - **Error**: Actionable error banners with dedicated retry buttons.
3. **Safe Rendering**:
   - Renders all AI-generated statement text as escaped plain text without raw HTML execution.
   - Proven by automated tests: `<script>alert(1)</script>` and `<img src=x onerror=alert(1)>` render strictly as inert text.
4. **Accessibility (a11y)**:
   - Visible focus rings (`focus-visible:ring-2 focus-visible:ring-sky-500`).
   - `aria-live="polite"` on updating status regions.
   - `aria-busy="true"` on loading containers.
   - Descriptive accessible names on all icon buttons (`aria-label`, `title`).
5. **Responsive Collapse**:
   - Statement governance cards, diff comparison tables, and progress badges collapse cleanly under 640px mobile viewports (tested at 360px, 768px, and 1280px).

---

## Environment Variables Reference

| Variable | Default | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | *Required* | Neon / PostgreSQL pooled connection string (`?sslmode=require&pgbouncer=true`). |
| `DIRECT_URL` | *Required* | Neon direct connection string for Prisma migrations. |
| `LLM_PROVIDER` | `gemini` | LLM provider identifier. |
| `LLM_API_KEY` | *Required for live* | Google AI Studio Gemini API key. |
| `LLM_MODEL` | `gemini-1.5-flash` | Gemini model name. |
| `MOCK_LLM` | `false` | When `true`, uses offline fixtures for tests and offline development. |
| `LLM_MAX_INPUT_TOKENS` | `50000` | Pre-flight input ceiling before rejecting with HTTP 413. |
| `LLM_MAX_OUTPUT_TOKENS` | `8192` | Max completion tokens requested from model. |
| `LLM_STEP_DEADLINE_MS` | `45000` | Hard deadline for any single step API route (must be < 60s). |
| `LLM_CALL_TIMEOUT_MS` | `15000` | Timeout per individual network call to Gemini. |
| `LLM_RETRY_BASE_MS` | `500` | Base delay for exponential backoff. |
| `LLM_RETRY_MAX_MS` | `5000` | Maximum cap on exponential backoff delay. |
| `LLM_MAX_ATTEMPTS` | `3` | Total attempt limit per step (1 initial + 2 retries/repairs). |
| `LLM_PRICE_INPUT_PER_M` | `0.30` | Estimated USD price per 1M input tokens. |
| `LLM_PRICE_OUTPUT_PER_M` | `2.50` | Estimated USD price per 1M output tokens (including thinking tokens). |

---

## Local Development & Setup Instructions

### Prerequisites
- Node.js 18+ and npm 10+
- PostgreSQL database instance (Neon, Supabase, or local Postgres)

### Environment Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/akshat1716/Release-Communication-and-Readiness-Brief-Assistant.git
   cd Release-Communication-and-Readiness-Brief-Assistant
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
   LLM_MODEL="gemini-1.5-flash"
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

Run the Vitest test suite covering deterministic checks, SHA-256 crypto hashing, citation sanitization, stale statement detection, version diffing, governance approval rules, defensive JSON parsing, backoff/repair, deadlines, token budgeting, and React Testing Library frontend UI states:

```bash
npm test
```

Expected Output:
```
Test Files  18 passed (18)
     Tests  65 passed (65)
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
   - `LLM_MODEL`: `gemini-1.5-flash`
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
