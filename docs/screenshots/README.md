# Visual Evidence & Screenshot Documentation

This directory documents visual states for loading, empty guidance, per-step failure recovery, and responsive collapse.

Per project guidelines: **Images are never fabricated.** Real screenshots should be captured against a running local development server (`MOCK_LLM=true npm run dev`).

---

## Screenshot Capture Guide

1. Start development server in mock fixture mode:
   ```bash
   MOCK_LLM=true npm run dev
   ```
2. Navigate to `http://localhost:3000`.

### Required Capture Targets

| Target State | Description & Route | Viewport Width | Status |
| :--- | :--- | :---: | :---: |
| **Loading State** | Multi-step analysis pipeline active with pulse bar & step telemetry (`/releases/[id]`). | 1280px | `[TODO: Capture loading-state.png]` |
| **Empty State** | Fresh release with 0 statements / 0 checks showing guidance illustration (`/releases/[id]`). | 1280px | `[TODO: Capture empty-state.png]` |
| **Error Recovery State** | Step C simulated failure displaying "Retry Step C" & "Resume From Here" (`/releases/[id]`). | 1280px | `[TODO: Capture error-recovery-state.png]` |
| **Mobile Collapse (360px)** | Statement governance and audit cards collapsed cleanly on small mobile screen (`/releases/[id]`). | 360px | `[TODO: Capture mobile-responsive-360px.png]` |
| **Tablet View (768px)** | Checks grid and version compare diff view on medium screens (`/releases/[id]`). | 768px | `[TODO: Capture tablet-responsive-768px.png]` |

---

## Automated Verification Alternatives

All state behaviors represented by these visual targets are programmatically verified in CI via Vitest and Testing Library:
- **Loading & Skeleton States**: [`tests/ui-summaries.test.tsx`](../../tests/ui-summaries.test.tsx), [`tests/ui-checks.test.tsx`](../../tests/ui-checks.test.tsx), [`tests/ui-analysis.test.tsx`](../../tests/ui-analysis.test.tsx)
- **Empty States**: [`tests/ui-summaries.test.tsx`](../../tests/ui-summaries.test.tsx), [`tests/ui-checks.test.tsx`](../../tests/ui-checks.test.tsx)
- **Error & Recovery Actions**: [`tests/ui-analysis.test.tsx`](../../tests/ui-analysis.test.tsx) (verifies `Retry Step C` and `Resume From Here`)
- **Safe Rendering**: [`tests/ui-safe-rendering.test.tsx`](../../tests/ui-safe-rendering.test.tsx)
