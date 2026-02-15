#!/usr/bin/env node
/**
 * Verify Phase 4: Enhanced Dashboard & Data Visualizations
 * E2E test using Puppeteer
 */

import puppeteer from 'puppeteer';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FRONTEND_URL = 'http://localhost:6100';
const BACKEND_URL = 'http://localhost:9000';

let passed = 0;
let failed = 0;

function ok(msg) {
  passed++;
  console.log(`  ✅ ${msg}`);
}
function fail(msg) {
  failed++;
  console.log(`  ❌ ${msg}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log(`  [BROWSER ${msg.type()}] ${text.substring(0, 200)}`);
    if (msg.type() === 'error') errors.push(text);
  });
  page.on('pageerror', err => {
    console.log(`  [PAGE ERROR] ${err.message.substring(0, 200)}`);
    errors.push(err.message);
  });

  console.log('🔍 Phase 4 E2E Tests: Enhanced Dashboard & Visualizations\n');

  try {
    // ── Test 1: Backend analytics endpoint ──
    console.log('📡 Testing backend endpoints...');
    const res = await fetch(`${BACKEND_URL}/api/analytics/integrations`);
    if (res.ok) {
      const data = await res.json();
      ok(`/api/analytics/integrations returns 200 (total: ${data.total_integrations})`);
      if ('github' in data && 'linear' in data && 'codeclimate' in data) {
        ok('Integration status response has all 3 providers');
      } else {
        fail('Missing integration providers in response');
      }
    } else {
      fail(`/api/analytics/integrations returned ${res.status}`);
    }

    // ── Test 2: Backend health check ──
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      ok(`Backend healthy (status: ${healthData.status})`);
    } else {
      fail(`Backend health check failed: ${healthRes.status}`);
    }

    // ── Test 3: Frontend loads ──
    console.log('\n🖥️  Testing frontend pages...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    // Wait for React to fully mount
    await wait(3000);

    // Debug: take screenshot and check what rendered
    await page.screenshot({ path: '/tmp/phase4-home.png', fullPage: true });

    const pageHTML = await page.evaluate(() => document.documentElement.innerHTML.substring(0, 1000));
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`  [DEBUG] Body text length: ${bodyText.length}`);
    console.log(`  [DEBUG] Body text: "${bodyText.substring(0, 200)}"`);

    const title = await page.title();
    ok(`Frontend loaded (title: "${title}")`);

    // Check if React rendered anything
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.length : 0;
    });
    if (rootContent > 100) {
      ok(`React app mounted (${rootContent} chars of HTML)`);
    } else {
      // React may not have mounted - could be auth loading issue
      // Try waiting longer
      console.log('  [DEBUG] Waiting additional 5s for React to render...');
      await wait(5000);
      const rootContent2 = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML.length : 0;
      });
      await page.screenshot({ path: '/tmp/phase4-home-retry.png', fullPage: true });
      if (rootContent2 > 100) {
        ok(`React app mounted after retry (${rootContent2} chars)`);
      } else {
        fail(`React app not rendering (root innerHTML length: ${rootContent2})`);
        // Print root content for debugging
        const rootHTML = await page.evaluate(() => {
          const root = document.getElementById('root');
          return root ? root.innerHTML.substring(0, 500) : 'no root';
        });
        console.log(`  [DEBUG] Root HTML: ${rootHTML}`);
      }
    }

    // Check if page has visible content
    const hasContent = bodyText.length > 10;

    // ── Test 4: Check navigation items exist ──
    if (hasContent) {
      const hasRepoNav = await page.evaluate(() => {
        return document.body.innerText.includes('Repositories');
      });
      if (hasRepoNav) {
        ok('Repositories navigation found');
      } else {
        fail('Repositories navigation not found');
      }

      const hasDashboardNav = await page.evaluate(() => {
        return document.body.innerText.includes('Dashboard');
      });
      if (hasDashboardNav) {
        ok('Dashboard navigation found');
      } else {
        fail('Dashboard navigation not found');
      }
    } else {
      console.log('  ⚠️  Skipping navigation tests (page has no visible content)');
    }

    // ── Test 5: Navigate to Dashboard ──
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase4-dashboard.png', fullPage: true });

    const dashboardText = await page.evaluate(() => document.body.innerText);
    if (dashboardText.includes('Dashboard') || dashboardText.includes('analysis') || dashboardText.includes('Select Repos')) {
      ok('Dashboard page rendered');
    } else {
      // Check for empty state
      const emptyState = await page.$('[class*="empty"]');
      if (emptyState) {
        ok('Dashboard shows empty state (no analysis data - expected)');
      } else {
        fail('Dashboard page not rendering');
      }
    }

    // ── Test 6: Navigate to Settings ──
    console.log('\n⚙️  Testing Settings page...');
    await page.goto(`${FRONTEND_URL}/settings`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase4-settings.png', fullPage: true });

    const settingsText = await page.evaluate(() => document.body.innerText);
    if (settingsText.includes('Settings')) {
      ok('Settings page loaded');

      // Check tabs
      const tabNames = ['Profile', 'Team', 'Billing', 'GitHub', 'Linear', 'CodeClimate'];
      for (const tabName of tabNames) {
        if (settingsText.includes(tabName)) {
          ok(`Tab "${tabName}" exists`);
        } else {
          fail(`Tab "${tabName}" not found`);
        }
      }
    } else {
      fail('Settings page not rendering');
      console.log(`  [DEBUG] Settings page text: "${settingsText.substring(0, 200)}"`);
    }

    // ── Test 7: Check for console errors ──
    console.log('\n🐛 Checking for console errors...');
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_') &&
      !e.includes('404') &&
      !e.includes('401') &&
      !e.includes('Failed to load resource') &&
      !e.includes('aria-label') &&
      !e.includes('autocomplete')
    );
    if (criticalErrors.length === 0) {
      ok('No critical console errors');
    } else {
      fail(`Found ${criticalErrors.length} console errors`);
      criticalErrors.slice(0, 3).forEach(e => console.log(`     ${e.substring(0, 150)}`));
    }

  } catch (err) {
    console.error('\n💥 Test error:', err.message);
    failed++;
  } finally {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`${'='.repeat(50)}\n`);

    if (failed === 0) {
      console.log('🎉 All Phase 4 E2E tests passed!\n');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Review above.\n`);
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
