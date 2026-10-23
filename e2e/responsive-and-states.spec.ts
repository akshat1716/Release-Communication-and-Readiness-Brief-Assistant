import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'docs', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { width: 360, height: 740, name: '360' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 800, name: '1280' },
];

async function assertNoHorizontalOverflow(page: Page) {
  const isOverflowing = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(isOverflowing).toBe(false);
}

const mockFullRelease = {
  success: true,
  release: {
    id: 'rel-e2e',
    name: 'Payment Processing Service v2.4.0',
    versionLabel: 'v1',
    currentVersionNum: 1,
    versions: [
      {
        id: 'ver-e2e-1',
        versionNumber: 1,
        versionLabel: 'v1',
        packageSnapshot: JSON.stringify({
          releaseName: 'Payment Processing Service v2.4.0',
          versionLabel: 'v1',
          features: [{ id: 'F1', title: 'Instant SEPA transfer support', description: 'Instant SEPA transfers' }],
          bugFixes: [{ id: 'B1', title: 'Fix duplicate payment webhook on timeout', description: 'Duplicate payment fix' }],
          changedBehaviours: [],
          qaSummaries: [{ id: 'QA1', title: 'Payment Gateway Load Tests', description: '10,000 TPS verified' }],
          knownLimitations: [],
          migrationNotes: [],
          affectedUserGroups: ['European Retail Clients'],
          operationalDependencies: ['Redis 7.2', 'PostgreSQL 16'],
          knownRisks: ['Requires database connection pool warmup'],
        }),
        checks: [
          { ruleId: 'C1', name: 'Schema Migration Compatibility', status: 'PASS', message: 'No backward-incompatible column drops detected.' },
          { ruleId: 'C2', name: 'Rollback Procedure Definition', status: 'PASS', message: 'Rollback script verified in release bundle.' },
          { ruleId: 'C3', name: 'Dependency Compatibility', status: 'WARNING', message: 'Redis 7.2 upgrade pending staging sign-off.' },
        ],
        classifications: [
          { itemId: 'F1', impact: 'HIGH', rationale: 'Introduces new payment rail for European customers' },
          { itemId: 'B1', impact: 'MEDIUM', rationale: 'Prevents customer duplicate charge anomalies' },
        ],
        missingInfos: [],
        claimVerifications: [
          { itemId: 'F1', claimText: 'Instant transfers settle in < 10 seconds', status: 'VERIFIED', reason: 'Verified in benchmark report', qaCitations: '["QA1"]' },
        ],
        statements: [
          {
            id: 'stmt-1',
            audience: 'CLIENT',
            text: 'European clients can now execute Instant SEPA transfers with settlement in under 10 seconds.',
            originalText: 'European clients can now execute Instant SEPA transfers with settlement in under 10 seconds.',
            citations: '["F1"]',
            status: 'DRAFT',
            sourceHash: 'hash-1',
            isStale: false,
            orderIndex: 0,
          },
          {
            id: 'stmt-2',
            audience: 'INTERNAL',
            text: 'Duplicate payment processing webhooks on network retry are resolved via Redis idempotency keys.',
            originalText: 'Duplicate payment processing webhooks on network retry are resolved via Redis idempotency keys.',
            citations: '["B1"]',
            status: 'DRAFT',
            sourceHash: 'hash-2',
            isStale: false,
            orderIndex: 1,
          },
        ],
      },
    ],
  },
};

const mockEmptyRelease = {
  success: true,
  release: {
    id: 'rel-empty',
    name: 'Empty Release Package v1.0.0',
    versionLabel: 'v1',
    currentVersionNum: 1,
    versions: [
      {
        id: 'ver-empty-1',
        versionNumber: 1,
        versionLabel: 'v1',
        packageSnapshot: JSON.stringify({
          releaseName: 'Empty Release Package v1.0.0',
          versionLabel: 'v1',
          features: [],
          bugFixes: [],
          changedBehaviours: [],
          qaSummaries: [],
          knownLimitations: [],
          migrationNotes: [],
          affectedUserGroups: [],
          operationalDependencies: [],
          knownRisks: [],
        }),
        checks: [],
        classifications: [],
        missingInfos: [],
        claimVerifications: [],
        statements: [],
      },
    ],
  },
};

test.describe('Responsive Layout & State Verification (Playwright Mocked Network)', () => {
  test('1. Loading State: displays animated skeleton without horizontal overflow', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      let fulfillResponse: () => void = () => {};
      const pausePromise = new Promise<void>((resolve) => {
        fulfillResponse = resolve;
      });

      await page.route('**/api/releases/rel-loading*', async (route) => {
        await pausePromise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockFullRelease),
        });
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/releases/rel-loading');

      // The loading skeleton / spinner is visible while route is paused
      const loadingContainer = page.locator('[aria-busy="true"]');
      await expect(loadingContainer).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading release details...')).toBeVisible();

      await assertNoHorizontalOverflow(page);

      if (vp.name === '360' || vp.name === '1280') {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `loading-${vp.name}.png`),
          fullPage: false,
        });
      }

      // Unpause and finish navigation cleanly
      fulfillResponse();
      await expect(page.locator('text=Payment Processing Service v2.4.0')).toBeVisible({ timeout: 10000 });
      await page.unroute('**/api/releases/rel-loading*');
    }
  });

  test('2. Empty State: renders contextual empty guidance without horizontal overflow', async ({ page }) => {
    await page.route('**/api/releases/rel-empty*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEmptyRelease),
      });
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/releases/rel-empty');

      await expect(page.locator('text=Empty Release Package v1.0.0')).toBeVisible({ timeout: 10000 });

      // Check Checks Tab empty guidance
      await page.click('button[role="tab"]:has-text("Checks")');
      await expect(page.locator('text=No Deterministic Checks Found')).toBeVisible({ timeout: 5000 });

      // Check Summaries Tab empty guidance
      await page.click('button[role="tab"]:has-text("Summaries")');
      await expect(page.locator('text=No internal statements generated yet')).toBeVisible({ timeout: 5000 });

      await assertNoHorizontalOverflow(page);

      if (vp.name === '360' || vp.name === '1280') {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `empty-${vp.name}.png`),
          fullPage: false,
        });
      }
    }
  });

  test('3. Error State: renders structured error banner without horizontal overflow', async ({ page }) => {
    await page.route('**/api/releases/rel-err*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database connection failed: Neon connection pool timeout',
            retryable: true,
          },
        }),
      });
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/releases/rel-err');

      const errorText = page.locator('text=Database connection failed: Neon connection pool timeout');
      await expect(errorText).toBeVisible({ timeout: 10000 });

      await assertNoHorizontalOverflow(page);

      if (vp.name === '360' || vp.name === '1280') {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `error-${vp.name}.png`),
          fullPage: false,
        });
      }
    }
  });

  test('4. Success State: displays populated tabs, badges, and keyboard reachable controls', async ({ page }) => {
    await page.route('**/api/releases/rel-success*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFullRelease),
      });
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/releases/rel-success');

      await expect(page.locator('text=Payment Processing Service v2.4.0')).toBeVisible({ timeout: 10000 });

      // Mobile layout specific assertions at 360px
      if (vp.name === '360') {
        // (d) Header height at 360px is at most 30% of viewport height (740 * 0.3 = 222px)
        const header = page.locator('header');
        const headerBox = await header.boundingBox();
        expect(headerBox).not.toBeNull();
        expect(headerBox!.height).toBeLessThanOrEqual(vp.height * 0.3);

        // (e) Governance banner expand/collapse toggling with aria-expanded
        const governanceBtn = page.locator('header button[aria-expanded]');
        await expect(governanceBtn).toBeVisible();
        await expect(governanceBtn).toHaveAttribute('aria-expanded', 'false');
        await governanceBtn.click();
        await expect(governanceBtn).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#mobile-governance-details')).toBeVisible();
        await governanceBtn.click();
        await expect(governanceBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#mobile-governance-details')).not.toBeVisible();

        // (b) Tab strip either has no inner overflow or shows the edge-fade indicator element
        const hasInnerOverflow = await page.evaluate(() => {
          const tablist = document.querySelector('[role="tablist"]');
          return tablist ? tablist.scrollWidth > tablist.clientWidth : false;
        });
        if (hasInnerOverflow) {
          const edgeFade = page.locator('[data-testid="tab-fade-right"], [data-testid="tab-edge-fade"]').first();
          await expect(edgeFade).toBeVisible();
        }

        // (c) Arrow-key navigation moves selection between tabs and updates aria-selected
        const packageTab = page.locator('button[role="tab"]:has-text("Package Form")');
        await packageTab.focus();
        await expect(packageTab).toBeFocused();
        await page.keyboard.press('ArrowRight');
        const checksTab = page.locator('button[role="tab"]:has-text("Checks")');
        await expect(checksTab).toHaveAttribute('aria-selected', 'true');
        await expect(packageTab).toHaveAttribute('aria-selected', 'false');
        await page.keyboard.press('ArrowLeft');
        await expect(packageTab).toHaveAttribute('aria-selected', 'true');

        // (a) Active tab is fully inside the viewport after selecting each tab
        const tabNames = ['Package Form', 'Checks', 'AI Analysis', 'Summaries', 'Versions', 'Final Brief'];
        for (const name of tabNames) {
          const tabBtn = page.locator(`button[role="tab"]:has-text("${name}")`);
          await tabBtn.click();
          await expect(tabBtn).toHaveAttribute('aria-selected', 'true');
          await page.waitForTimeout(300);
          const box = await tabBtn.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.x).toBeGreaterThanOrEqual(-2);
          expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 2);
        }
      }

      // Verify Readiness Checks tab
      await page.click('button[role="tab"]:has-text("Checks")');
      await expect(page.locator('text=Schema Migration Compatibility')).toBeVisible();
      await expect(page.locator('text=PASS').first()).toBeVisible();

      // Verify Audience Summaries tab (default view is Internal Technical)
      await page.click('button[role="tab"]:has-text("Summaries")');
      await expect(page.locator('text=Duplicate payment processing webhooks').first()).toBeVisible();
      await expect(page.locator('[role="status"]:has-text("DRAFT")').first()).toBeVisible();

      // Switch to Client tab and verify client-facing statement
      await page.click('button[role="tab"]:has-text("Client / Non-Tech")');
      await expect(page.locator('text=European clients').first()).toBeVisible();

      // Assert keyboard reachability on Summaries tab
      const approveBtn = page.locator('button:has-text("Approve")').first();
      await expect(approveBtn).toBeVisible();

      // Tab key navigation verification
      await approveBtn.focus();
      await expect(approveBtn).toBeFocused();

      await assertNoHorizontalOverflow(page);

      if (vp.name === '360' || vp.name === '1280') {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `success-${vp.name}.png`),
          fullPage: false,
        });
      }
    }
  });

  test('5. Step Failure & Recovery: displays Retry Step X and Resume from Step X buttons', async ({ page }) => {
    await page.route('**/api/releases/rel-retry*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFullRelease),
      });
    });

    // Mock Step A success
    await page.route('**/api/releases/rel-retry/versions/ver-e2e-1/analyze/step-a', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, step: 'step-a', classifications: [], tokensUsed: 250, estimatedCostUsd: 0.0002 }),
      });
    });

    // Mock Step B success
    await page.route('**/api/releases/rel-retry/versions/ver-e2e-1/analyze/step-b', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, step: 'step-b', missingInfos: [], tokensUsed: 310, estimatedCostUsd: 0.0003 }),
      });
    });

    // Mock Step C transient failure with documented error shape
    await page.route('**/api/releases/rel-retry/versions/ver-e2e-1/analyze/step-c', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Step C: QA Claim Verification timed out on upstream model',
            retryable: true,
          },
        }),
      });
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/releases/rel-retry');

      await expect(page.locator('text=Payment Processing Service v2.4.0')).toBeVisible({ timeout: 10000 });

      // Navigate to Analysis Tab
      await page.click('button[role="tab"]:has-text("AI Analysis")');

      // Click "Run Full AI Analysis"
      const runBtn = page.locator('button:has-text("Run Full AI Analysis")');
      await runBtn.click();

      // Expect failure message on Step C
      const retryBtn = page.locator('button:has-text("Retry Step C")');
      await expect(retryBtn).toBeVisible({ timeout: 15000 });

      const resumeBtn = page.locator('button:has-text("Resume from Step C")');
      await expect(resumeBtn).toBeVisible();

      // Verify keyboard reachability
      await retryBtn.focus();
      await expect(retryBtn).toBeFocused();

      await assertNoHorizontalOverflow(page);

      if (vp.name === '360' || vp.name === '1280') {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `step-failure-${vp.name}.png`),
          fullPage: false,
        });
      }
    }
  });

  test('6. Final Brief Tab: verifies governance blocked and unblocked states', async ({ page }) => {
    await page.route('**/api/releases/rel-brief*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFullRelease),
      });
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/releases/rel-brief');

      await expect(page.locator('text=Payment Processing Service v2.4.0')).toBeVisible({ timeout: 10000 });

      // Navigate to Final Brief Tab
      await page.click('button[role="tab"]:has-text("Final Brief")');

      // Blocked state: 2 unreviewed draft statements remain
      await expect(page.locator('text=Governance Readiness Safeguard Alert')).toBeVisible({ timeout: 5000 });
      const compileBtn = page.locator('button:has-text("Compile Final Brief")');
      await expect(compileBtn).toBeDisabled();

      await assertNoHorizontalOverflow(page);

      if (vp.name === '360' || vp.name === '1280') {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `final-brief-blocked-${vp.name}.png`),
          fullPage: false,
        });
      }

      // Unblock via Partial Brief Override
      const partialCheckbox = page.locator('#allowPartialBriefCheckbox');
      await partialCheckbox.check();

      await expect(compileBtn).toBeEnabled();

      // Verify keyboard reachability
      await compileBtn.focus();
      await expect(compileBtn).toBeFocused();

      await assertNoHorizontalOverflow(page);

      if (vp.name === '360' || vp.name === '1280') {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `final-brief-unblocked-${vp.name}.png`),
          fullPage: false,
        });
      }
    }
  });
});
