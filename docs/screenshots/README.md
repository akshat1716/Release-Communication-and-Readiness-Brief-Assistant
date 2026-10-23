# Visual Evidence & Screenshot Documentation

This directory contains real visual state screenshots captured using Playwright against an automated local Next.js dev server (`MOCK_LLM=true`) with mocked API network routes.

> **Integrity Guarantee**: All screenshots in this directory were generated programmatically by Playwright (`npm run test:e2e`). No screenshots are simulated, mocked, or fabricated.

---

## Generated Screenshot Artifacts

| State | 360px (Mobile Portrait) | 1280px (Desktop) | Description |
| :--- | :--- | :--- | :--- |
| **1. Loading State** | `loading-360.png` | `loading-1280.png` | Full-screen loading skeleton & spinner with `aria-busy="true"` and zero horizontal overflow (`scrollWidth <= innerWidth`). |
| **2. Empty State** | `empty-360.png` | `empty-1280.png` | Contextual empty guidance across tabs when no checks or statements exist. |
| **3. Error State** | `error-360.png` | `error-1280.png` | Structured error banner displaying backend error code, message, and retryable status. |
| **4. Success State** | `success-360.png` | `success-1280.png` | Fully populated release package with status badges, checks, summaries, and keyboard-reachable controls. |
| **5. Step Failure & Recovery** | `step-failure-360.png` | `step-failure-1280.png` | Step C failure displaying "Retry Step C" and "Resume from Step C" recovery buttons with active keyboard focus. |
| **6. Final Brief Blocked** | `final-brief-blocked-360.png` | `final-brief-blocked-1280.png` | Governance readiness safeguard alert blocking final brief compilation while draft statements remain unreviewed. |
| **7. Final Brief Unblocked** | `final-brief-unblocked-360.png` | `final-brief-unblocked-1280.png` | Partial brief override enabled, activating the "Compile Final Brief" button with accessible keyboard focus. |

---

## How to Regenerate Screenshots

To regenerate all screenshots from scratch:

```bash
npm run test:e2e
```

This command executes `e2e/responsive-and-states.spec.ts` using Playwright:
1. Spawns `next dev -p 3123` with `MOCK_LLM=true`.
2. Intercepts and mocks all `/api/*` network requests with structured JSON fixtures.
3. Tests responsive viewports at 360px, 768px, and 1280px.
4. Asserts no horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`).
5. Asserts keyboard accessibility (tab focus reachability on interactive controls).
6. Captures and saves real `.png` screenshots to this directory.
