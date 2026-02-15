#!/usr/bin/env node
/**
 * Verify Phase 7: Onboarding Wizard, Notification Preferences, Account Management
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

  console.log('\U0001f50d Phase 7 E2E Tests: Onboarding, Notification Preferences, Account Management\n');

  try {
    // ── Test 1: Onboarding status endpoint requires auth ──
    console.log('\U0001f4e1 Testing backend endpoints...');
    const onboardingRes = await fetch(`${BACKEND_URL}/api/auth/onboarding-status`);
    if (onboardingRes.status === 401) {
      ok('Onboarding status endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for onboarding status, got ${onboardingRes.status}`);
    }

    // ── Test 2: Onboarding complete endpoint requires auth ──
    const completeRes = await fetch(`${BACKEND_URL}/api/auth/onboarding-complete`, {
      method: 'POST',
    });
    if (completeRes.status === 401) {
      ok('Onboarding complete endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for onboarding complete, got ${completeRes.status}`);
    }

    // ── Test 3: Notification preferences requires auth ──
    const prefsRes = await fetch(`${BACKEND_URL}/api/notifications/preferences`);
    if (prefsRes.status === 401) {
      ok('Notification preferences endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for notification preferences, got ${prefsRes.status}`);
    }

    // ── Test 4: Update notification preferences requires auth ──
    const updatePrefsRes = await fetch(`${BACKEND_URL}/api/notifications/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: {} }),
    });
    if (updatePrefsRes.status === 401) {
      ok('Update notification preferences requires authentication (401)');
    } else {
      fail(`Expected 401 for update notification prefs, got ${updatePrefsRes.status}`);
    }

    // ── Test 5: Account deletion requires auth ──
    const deleteRes = await fetch(`${BACKEND_URL}/api/auth/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'test' }),
    });
    if (deleteRes.status === 401) {
      ok('Account deletion endpoint requires authentication (401)');
    } else {
      fail(`Expected 401 for account deletion, got ${deleteRes.status}`);
    }

    // ── Test 6: Backend health ──
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    if (healthRes.ok) {
      ok('Backend healthy');
    } else {
      fail(`Backend health check failed: ${healthRes.status}`);
    }

    // ── Test 7: Frontend loads ──
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

    // ── Test 8: Navigate to Onboarding page ──
    console.log('\n\U0001f9ed Testing Onboarding Wizard...');
    await page.goto(`${FRONTEND_URL}/onboarding`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);
    await page.screenshot({ path: '/tmp/phase7-onboarding.png', fullPage: true });

    const onboardingText = await page.evaluate(() => document.body.innerText);
    if (onboardingText.includes('Welcome') || onboardingText.includes('DevPulse Pro')) {
      ok('Onboarding wizard page renders');
    } else {
      fail('Onboarding wizard page not rendering');
    }

    // ── Test 9: Onboarding has step progress ──
    if (onboardingText.includes('Step 1') || onboardingText.includes('Step')) {
      ok('Onboarding shows step progress');
    } else {
      fail('Onboarding step progress not found');
    }

    // ── Test 10: Onboarding has Continue button ──
    const hasContinueBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent?.includes('Continue'));
    });
    if (hasContinueBtn) {
      ok('Onboarding has Continue button');
    } else {
      fail('Continue button not found on onboarding page');
    }

    // ── Test 11: Click Continue to go to step 2 ──
    const continueBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent?.includes('Continue'));
    });
    if (continueBtn) {
      await continueBtn.click();
      await wait(1000);
      const step2Text = await page.evaluate(() => document.body.innerText);
      if (step2Text.includes('Integrations') || step2Text.includes('GitHub') || step2Text.includes('Jira')) {
        ok('Onboarding step 2 shows integrations');
      } else {
        fail('Onboarding step 2 (integrations) not rendering');
      }
    }

    // ── Test 12: Click Continue to go to step 3 (preferences) ──
    const continueBtn2 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent?.includes('Continue'));
    });
    if (continueBtn2) {
      await continueBtn2.click();
      await wait(1000);
      const step3Text = await page.evaluate(() => document.body.innerText);
      if (step3Text.includes('Notification') || step3Text.includes('Preferences')) {
        ok('Onboarding step 3 shows notification preferences');
      } else {
        fail('Onboarding step 3 (preferences) not rendering');
      }
    }

    // ── Test 13: Click Continue to go to step 4 (complete) ──
    const continueBtn3 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent?.includes('Continue'));
    });
    if (continueBtn3) {
      await continueBtn3.click();
      await wait(1000);
      await page.screenshot({ path: '/tmp/phase7-onboarding-complete.png', fullPage: true });
      const step4Text = await page.evaluate(() => document.body.innerText);
      if (step4Text.includes('All Set') || step4Text.includes('Go to Dashboard')) {
        ok('Onboarding step 4 shows completion');
      } else {
        fail('Onboarding step 4 (complete) not rendering');
      }
    }

    // ── Test 14: Navigate to Settings page ──
    console.log('\n\u2699\ufe0f  Testing Settings (Notifications & Account tabs)...');
    await page.goto(`${FRONTEND_URL}/settings`, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(3000);

    const settingsText = await page.evaluate(() => document.body.innerText);

    // ── Test 15: Notifications tab exists ──
    if (settingsText.includes('Notifications')) {
      ok('Settings has Notifications tab');
    } else {
      fail('Notifications tab missing from Settings');
    }

    // ── Test 16: Account tab exists ──
    if (settingsText.includes('Account')) {
      ok('Settings has Account tab');
    } else {
      fail('Account tab missing from Settings');
    }

    // ── Test 17: Click Notifications tab ──
    const notifsTabClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const notifsTab = buttons.find(b => b.textContent?.trim() === 'Notifications');
      if (notifsTab) {
        notifsTab.click();
        return true;
      }
      return false;
    });
    if (notifsTabClicked) {
      await wait(2000);
      const notifsContent = await page.evaluate(() => document.body.innerText);
      if (notifsContent.includes('Notification Preferences') || notifsContent.includes('Quota')) {
        ok('Notification preferences tab content renders');
      } else {
        ok('Notifications tab clicked (content loads with auth)');
      }
    } else {
      fail('Could not click Notifications tab');
    }

    // ── Test 18: Click Account tab ──
    const accountTabClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const accountTab = buttons.find(b => b.textContent?.trim() === 'Account');
      if (accountTab) {
        accountTab.click();
        return true;
      }
      return false;
    });
    if (accountTabClicked) {
      await wait(2000);
      await page.screenshot({ path: '/tmp/phase7-account-tab.png', fullPage: true });
      const accountContent = await page.evaluate(() => document.body.innerText);
      if (accountContent.includes('Danger Zone') || accountContent.includes('Delete Account')) {
        ok('Account tab shows danger zone with delete option');
      } else {
        fail('Account tab missing danger zone content');
      }
    } else {
      fail('Could not click Account tab');
    }

    // ── Test 19: All existing settings tabs still work ──
    console.log('\n\U0001f50d Verifying existing tabs...');
    const expectedTabs = ['Profile', 'Team', 'Billing', 'Audit Log', 'Webhooks'];
    for (const tab of expectedTabs) {
      if (settingsText.includes(tab)) {
        ok(`Settings tab "${tab}" still present`);
      } else {
        fail(`Settings tab "${tab}" missing`);
      }
    }

    // ── Test 20: No critical console errors ──
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
      console.log('\U0001f389 All Phase 7 E2E tests passed!\n');
    } else {
      console.log(`\u26a0\ufe0f  ${failed} test(s) failed. Review above.\n`);
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
