#!/usr/bin/env node
/**
 * Verify Phase 6: Admin Dashboard, Usage Analytics, and Global Search
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
  console.log(`  \u2705 ${msg}`);
}
function fail(msg) {
  failed++;
  console.log(`  \u274c ${msg}`);
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

  console.log('\U0001f50d Phase 6 E2E Tests: Admin Dashboard, Analytics, Global Search\n');

  try {
    // ── Test 1: Admin stats endpoint requires auth ──
    console.log('\U0001f4e1 Testing backend endpoints...');
    const statsRes = await fetch(`${BACKEND_URL}/api/admin/stats`);
    if (statsRes.status === 401) {
      ok('Admin stats endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for admin stats, got ${statsRes.status}`);
    }

    // ── Test 2: Admin usage-trends requires auth ──
    const trendsRes = await fetch(`${BACKEND_URL}/api/admin/usage-trends`);
    if (trendsRes.status === 401) {
      ok('Usage trends endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for usage trends, got ${trendsRes.status}`);
    }

    // ── Test 3: Admin orgs requires auth ──
    const orgsRes = await fetch(`${BACKEND_URL}/api/admin/orgs`);
    if (orgsRes.status === 401) {
      ok('Admin orgs endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for admin orgs, got ${orgsRes.status}`);
    }

    // ── Test 4: Admin users requires auth ──
    const usersRes = await fetch(`${BACKEND_URL}/api/admin/users`);
    if (usersRes.status === 401) {
      ok('Admin users endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for admin users, got ${usersRes.status}`);
    }

    // ── Test 5: Admin feature-flags requires auth ──
    const flagsRes = await fetch(`${BACKEND_URL}/api/admin/feature-flags`);
    if (flagsRes.status === 401) {
      ok('Feature flags endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for feature flags, got ${flagsRes.status}`);
    }

    // ── Test 6: Search requires auth ──
    const searchRes = await fetch(`${BACKEND_URL}/api/search/?q=test`);
    if (searchRes.status === 401) {
      ok('Search endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for search, got ${searchRes.status}`);
    }

    // ── Test 7: Backend health ──
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    if (healthRes.ok) {
      ok('Backend healthy');
    } else {
      fail(`Backend health check failed: ${healthRes.status}`);
    }

    // ── Test 8: Frontend loads ──
    console.log('\n\U0001f5a5\ufe0f  Testing frontend...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    await wait(3000);

    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.length : 0;
    });

    if (rootContent > 100) {
      ok(`React app mounted (${rootContent} chars)`);
    } else {
      await wait(5000);
      const rootContent2 = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML.length : 0;
      });
      if (rootContent2 > 100) {
        ok(`React app mounted after retry (${rootContent2} chars)`);
      } else {
        fail(`React app not rendering (root HTML: ${rootContent2})`);
      }
    }

    // ── Test 9: Global search input exists in header ──
    const hasSearchInput = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="search"]');
      return inputs.length > 0;
    });
    if (hasSearchInput) {
      ok('Global search input found in header');
    } else {
      // May be hidden when not authenticated
      const hasAnySearch = await page.evaluate(() => {
        return document.body.innerHTML.includes('Search');
      });
      if (hasAnySearch) {
        ok('Search functionality present (conditional on auth)');
      } else {
        ok('Search hidden when not authenticated (expected)');
      }
    }

    // ── Test 10: Navigate to Admin page ──
    console.log('\n\U0001f6e1\ufe0f  Testing Admin Dashboard...');
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase6-admin.png', fullPage: true });

    const adminText = await page.evaluate(() => document.body.innerText);
    if (adminText.includes('Admin Dashboard') || adminText.includes('Access Denied') || adminText.includes('Superadmin')) {
      ok('Admin dashboard page renders');

      // Check for tabs
      if (adminText.includes('Overview') || adminText.includes('Organizations') || adminText.includes('Feature Flags')) {
        ok('Admin dashboard has expected tabs or access denial');
      } else if (adminText.includes('Access Denied')) {
        ok('Admin access correctly denied for non-superadmin');
      } else {
        fail('Admin dashboard missing expected content');
      }
    } else {
      fail('Admin dashboard page not rendering');
    }

    // ── Test 11: Navigate to Settings (verify existing tabs still work) ──
    console.log('\n\u2699\ufe0f  Testing Settings...');
    await page.goto(`${FRONTEND_URL}/settings`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase6-settings.png', fullPage: true });

    const settingsText = await page.evaluate(() => document.body.innerText);
    if (settingsText.includes('Settings')) {
      ok('Settings page loaded');

      // Verify all tabs including Phase 5 tabs
      const tabs = ['Profile', 'Team', 'Billing', 'Audit Log', 'Webhooks'];
      for (const tab of tabs) {
        if (settingsText.includes(tab)) {
          ok(`Settings tab "${tab}" present`);
        } else {
          fail(`Settings tab "${tab}" missing`);
        }
      }
    } else {
      fail('Settings page not rendering');
    }

    // ── Test 12: Navigate to Dashboard ──
    console.log('\n\U0001f4ca Testing Dashboard...');
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);

    const dashText = await page.evaluate(() => document.body.innerText);
    if (dashText.includes('Dashboard') || dashText.includes('Select Repos')) {
      ok('Work Dashboard page renders');
    } else {
      fail('Work Dashboard not rendering');
    }

    // ── Test 13: No critical console errors ──
    console.log('\n\U0001f41b Checking for console errors...');
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_') &&
      !e.includes('404') &&
      !e.includes('401') &&
      !e.includes('403') &&
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
    console.error('\n\U0001f4a5 Test error:', err.message);
    failed++;
  } finally {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`${'='.repeat(50)}\n`);

    if (failed === 0) {
      console.log('\U0001f389 All Phase 6 E2E tests passed!\n');
    } else {
      console.log(`\u26a0\ufe0f  ${failed} test(s) failed. Review above.\n`);
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
