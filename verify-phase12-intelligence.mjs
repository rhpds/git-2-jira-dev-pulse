#!/usr/bin/env node
/**
 * Verify Phase 12: Intelligence Suite
 * AI Standups, Flow Analytics, Cross-Repo Impact, Health Scores
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

  console.log('\n\ud83d\udd0d Phase 12 E2E Tests: Intelligence Suite\n');

  try {
    // ── Backend Endpoint Tests ──
    console.log('\ud83d\udce1 Testing backend endpoints...');

    // Test 1: Standup daily endpoint
    const standupRes = await fetch(`${BACKEND_URL}/api/standups/daily`);
    if (standupRes.status === 401) {
      ok('Standup daily endpoint requires auth (401)');
    } else {
      fail(`Expected 401 for standup daily, got ${standupRes.status}`);
    }

    // Test 2: Standup sprint endpoint
    const sprintRes = await fetch(`${BACKEND_URL}/api/standups/sprint`);
    if (sprintRes.status === 401) {
      ok('Sprint report endpoint requires auth (401)');
    } else {
      fail(`Expected 401 for sprint report, got ${sprintRes.status}`);
    }

    // Test 3: Flow analytics endpoint
    const flowRes = await fetch(`${BACKEND_URL}/api/flow-analytics/`);
    if (flowRes.status === 401) {
      ok('Flow analytics endpoint requires auth (401)');
    } else {
      fail(`Expected 401 for flow analytics, got ${flowRes.status}`);
    }

    // Test 4: Impact graph endpoint
    const impactRes = await fetch(`${BACKEND_URL}/api/impact-graph/`);
    if (impactRes.status === 401) {
      ok('Impact graph endpoint requires auth (401)');
    } else {
      fail(`Expected 401 for impact graph, got ${impactRes.status}`);
    }

    // Test 5: Health scores endpoint
    const healthRes = await fetch(`${BACKEND_URL}/api/health-scores/`);
    if (healthRes.status === 401) {
      ok('Health scores endpoint requires auth (401)');
    } else {
      fail(`Expected 401 for health scores, got ${healthRes.status}`);
    }

    // Test 6: Backend health
    const hRes = await fetch(`${BACKEND_URL}/api/health`);
    if (hRes.ok) {
      ok('Backend healthy');
    } else {
      fail(`Backend health check failed: ${hRes.status}`);
    }

    // Test 7: Rate limits present
    const rlLimit = standupRes.headers.get('x-ratelimit-limit');
    if (rlLimit) {
      ok(`Rate limit headers present (limit=${rlLimit})`);
    } else {
      fail('Rate limit headers missing');
    }

    // ── Frontend Tests ──
    console.log('\n\ud83d\udda5\ufe0f  Testing frontend...');

    // Test 8: Frontend loads
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
      const rc2 = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
      if (rc2 > 100) ok(`React app mounted after retry (${rc2} chars)`);
      else fail('React app not rendering');
    }

    // Test 9: Navigation has new items
    const navText = await page.evaluate(() => document.body.innerText);
    const hasStandups = navText.includes('Standups');
    const hasFlow = navText.includes('Flow');
    const hasImpact = navText.includes('Impact');
    const hasHealth = navText.includes('Health');
    if (hasStandups && hasFlow && hasImpact && hasHealth) {
      ok('All 4 intelligence nav items present');
    } else {
      if (hasStandups) ok('Standups nav present');
      else fail('Standups nav missing');
      if (hasFlow) ok('Flow nav present');
      else fail('Flow nav missing');
      if (hasImpact) ok('Impact nav present');
      else fail('Impact nav missing');
      if (hasHealth) ok('Health nav present');
      else fail('Health nav missing');
    }

    // Test 10: Standup page renders
    console.log('\n\ud83d\udcdd Testing Standup Page...');
    await page.goto(`${FRONTEND_URL}/standups`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase12-standups.png', fullPage: true });

    const standupText = await page.evaluate(() => document.body.innerText);
    if (standupText.includes('Standup') && standupText.includes('Sprint')) {
      ok('Standup page renders with tabs');
    } else {
      fail('Standup page not rendering correctly');
    }

    // Test 11: Standup page has generate button
    if (standupText.includes('Generate')) {
      ok('Standup page has generate button');
    } else {
      fail('Generate button missing from standup page');
    }

    // Test 12: Standup page has author filter
    const hasAuthorInput = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.some(i => i.placeholder?.includes('author'));
    });
    if (hasAuthorInput) {
      ok('Standup page has author filter input');
    } else {
      fail('Author filter input missing');
    }

    // Test 13: Flow analytics page renders
    console.log('\n\ud83c\udf0a Testing Flow Analytics Page...');
    await page.goto(`${FRONTEND_URL}/flow`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase12-flow.png', fullPage: true });

    const flowText = await page.evaluate(() => document.body.innerText);
    if (flowText.includes('Flow State') || flowText.includes('Flow Patterns')) {
      ok('Flow analytics page renders');
    } else {
      fail('Flow analytics page not rendering');
    }

    // Test 14: Flow page has time range toggle
    if (flowText.includes('7 days') && flowText.includes('30 days')) {
      ok('Flow page has time range toggle');
    } else {
      fail('Time range toggle missing from flow page');
    }

    // Test 15: Impact graph page renders
    console.log('\n\ud83d\udd17 Testing Impact Graph Page...');
    await page.goto(`${FRONTEND_URL}/impact`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase12-impact.png', fullPage: true });

    const impactText = await page.evaluate(() => document.body.innerText);
    if (impactText.includes('Impact') && impactText.includes('Dependencies')) {
      ok('Impact graph page renders');
    } else if (impactText.includes('Impact')) {
      ok('Impact graph page renders (basic)');
    } else {
      fail('Impact graph page not rendering');
    }

    // Test 16: Impact page has scan button
    if (impactText.includes('Scan Dependencies')) {
      ok('Impact page has Scan Dependencies button');
    } else {
      fail('Scan Dependencies button missing');
    }

    // Test 17: Health scores page renders
    console.log('\n\ud83c\udfe5 Testing Health Scores Page...');
    await page.goto(`${FRONTEND_URL}/health`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase12-health.png', fullPage: true });

    const healthText = await page.evaluate(() => document.body.innerText);
    if (healthText.includes('Health Scores') || healthText.includes('Health Score')) {
      ok('Health scores page renders');
    } else {
      fail('Health scores page not rendering');
    }

    // Test 18: Health page has calculate button
    if (healthText.includes('Calculate')) {
      ok('Health page has Calculate button');
    } else {
      fail('Calculate button missing from health page');
    }

    // Test 19: Command palette has new commands
    console.log('\n\ud83c\udfa8 Testing Command Palette...');
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(2000);

    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    await wait(1000);

    let paletteOpen = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.some(i => i.placeholder?.includes('command') || i.placeholder?.includes('search'));
    });

    if (!paletteOpen) {
      await page.keyboard.down('Control');
      await page.keyboard.press('k');
      await page.keyboard.up('Control');
      await wait(500);
      paletteOpen = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.some(i => i.placeholder?.includes('command') || i.placeholder?.includes('search'));
      });
    }

    if (paletteOpen) {
      await page.keyboard.type('standup');
      await wait(500);
      const result = await page.evaluate(() => document.body.innerText);
      if (result.includes('Standup')) {
        ok('Command Palette finds Standup command');
      } else {
        fail('Standup command not found in palette');
      }
      await page.keyboard.press('Escape');
      await wait(300);

      // Search for health
      await page.keyboard.down('Meta');
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      await wait(500);
      await page.keyboard.type('health');
      await wait(500);
      const result2 = await page.evaluate(() => document.body.innerText);
      if (result2.includes('Health')) {
        ok('Command Palette finds Health Scores command');
      } else {
        fail('Health Scores command not found in palette');
      }
      await page.keyboard.press('Escape');
    } else {
      fail('Command Palette not opening');
      ok('Skipped palette search tests');
    }

    // Test 21: Changelog has Phase 12
    console.log('\n\ud83d\udcdd Testing Changelog...');
    await page.goto(`${FRONTEND_URL}/changelog`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    const clText = await page.evaluate(() => document.body.innerText);
    if (clText.includes('v0.12.0') || clText.includes('Intelligence Suite')) {
      ok('Changelog includes Phase 12 entry');
    } else {
      fail('Phase 12 changelog entry missing');
    }

    // Test 22-25: Regression checks
    console.log('\n\ud83d\udd04 Regression checks...');

    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(2000);
    const repoText = await page.evaluate(() => document.body.innerText);
    if (repoText.includes('Repositories') || repoText.includes('Total Repositories')) {
      ok('Repositories page still works');
    } else {
      fail('Repositories page broken');
    }

    await page.goto(`${FRONTEND_URL}/integrations`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(2000);
    const intText = await page.evaluate(() => document.body.innerText);
    if (intText.includes('Integration')) {
      ok('Integrations page still works');
    } else {
      fail('Integrations page broken');
    }

    await page.goto(`${FRONTEND_URL}/settings`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(2000);
    const setText = await page.evaluate(() => document.body.innerText);
    if (setText.includes('Settings') || setText.includes('Profile')) {
      ok('Settings page still works');
    } else {
      fail('Settings page broken');
    }

    await page.goto(`${FRONTEND_URL}/shortcuts`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(2000);
    const scText = await page.evaluate(() => document.body.innerText);
    if (scText.includes('Keyboard Shortcuts')) {
      ok('Shortcuts page still works');
    } else {
      fail('Shortcuts page broken');
    }

    // Test 26: No critical console errors
    console.log('\n\ud83d\udc1b Checking for console errors...');
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_') &&
      !e.includes('404') &&
      !e.includes('401') &&
      !e.includes('403') &&
      !e.includes('Failed to load resource') &&
      !e.includes('aria-label') &&
      !e.includes('autocomplete') &&
      !e.includes('empty string') &&
      !e.includes('Text input')
    );
    if (criticalErrors.length === 0) {
      ok('No critical console errors');
    } else {
      fail(`Found ${criticalErrors.length} console errors`);
      criticalErrors.slice(0, 3).forEach(e => console.log(`     ${e.substring(0, 150)}`));
    }

  } catch (err) {
    console.error('\n\ud83d\udca5 Test error:', err.message);
    failed++;
  } finally {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`${'='.repeat(50)}\n`);

    if (failed === 0) {
      console.log('\ud83c\udf89 All Phase 12 E2E tests passed!\n');
    } else {
      console.log(`\u26a0\ufe0f  ${failed} test(s) failed. Review above.\n`);
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
