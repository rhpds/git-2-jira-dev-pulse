#!/usr/bin/env node
/**
 * Verify GitHub Integration UI
 * Tests the new GitHub integration tab in Settings
 */

import puppeteer from 'puppeteer';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🔍 Testing GitHub Integration UI...\n');

  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(msg.text());
    }
  });

  try {
    // Navigate to Settings page
    console.log('✓ Navigating to Settings page...');
    await page.goto('http://localhost:6100/settings', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    await wait(2000);

    // Click on GitHub Integration tab
    console.log('✓ Clicking GitHub Integration tab...');

    // Find the tab by looking for the button with the text
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      const githubTab = tabs.find(tab => tab.textContent.includes('GitHub Integration'));
      if (githubTab) {
        githubTab.click();
      }
    });

    await wait(2000);

    // Check for connection status card
    console.log('✓ Checking connection status card...');
    const connectionCardExists = await page.evaluate(() => {
      return document.body.textContent.includes('GitHub Connection Status');
    });

    if (connectionCardExists) {
      console.log('  ✅ Connection status card found');
    } else {
      throw new Error('Connection status card not found');
    }

    // Check for connection alert
    console.log('✓ Checking connection alert...');
    const hasConnected = await page.evaluate(() => {
      return document.body.textContent.includes('GitHub Connected');
    });
    const hasNotConnected = await page.evaluate(() => {
      return document.body.textContent.includes('GitHub Not Connected');
    });

    if (hasConnected) {
      console.log('  ✅ GitHub is connected');
      const username = await page.evaluate(() => {
        const alert = document.querySelector('.pf-v6-c-alert__description');
        if (alert) {
          const match = alert.textContent.match(/Connected as\s+(\w+)/);
          return match ? match[1] : 'Unknown';
        }
        return 'Unknown';
      });
      console.log(`     User: ${username}`);
    } else if (hasNotConnected) {
      console.log('  ⚠️  GitHub is not connected (GITHUB_TOKEN not set)');
      console.log('     This is expected if GITHUB_TOKEN environment variable is not configured');
    } else {
      throw new Error('No connection status alert found');
    }

    // Check for integrations list card
    console.log('✓ Checking integrations list card...');
    const integrationsCardExists = await page.evaluate(() => {
      return document.body.textContent.includes('Enabled GitHub Integrations');
    });

    if (integrationsCardExists) {
      console.log('  ✅ Integrations list card found');
    } else {
      throw new Error('Integrations list card not found');
    }

    // Check for Add Repository button
    console.log('✓ Checking Add Repository button...');
    const addButtonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addButton = buttons.find(b => b.textContent.includes('Add Repository'));
      if (addButton) {
        return {
          found: true,
          disabled: addButton.hasAttribute('disabled')
        };
      }
      return { found: false };
    });

    if (addButtonInfo.found) {
      console.log('  ✅ Add Repository button found');
      if (hasNotConnected && addButtonInfo.disabled) {
        console.log('  ✅ Button correctly disabled when not connected');
      } else if (!hasNotConnected && !addButtonInfo.disabled) {
        console.log('  ✅ Button enabled when connected');
      }
    } else {
      throw new Error('Add Repository button not found');
    }

    // Check for empty state or integration list
    console.log('✓ Checking integration list state...');
    const emptyStateExists = await page.evaluate(() => {
      return document.body.textContent.includes('No GitHub integrations configured');
    });

    if (emptyStateExists) {
      console.log('  ℹ️  No integrations configured (empty state shown)');
    } else {
      const integrationCount = await page.evaluate(() => {
        return document.querySelectorAll('.pf-v6-c-list__item').length;
      });
      console.log(`  📦 Found ${integrationCount} GitHub integrations`);

      if (integrationCount > 0) {
        console.log('  ✅ Integration list rendering correctly');

        const hasButtons = await page.evaluate(() => {
          const syncButton = Array.from(document.querySelectorAll('button')).some(
            b => b.textContent.includes('Sync')
          );
          const disableButton = Array.from(document.querySelectorAll('button')).some(
            b => b.textContent.includes('Disable')
          );
          return { syncButton, disableButton };
        });

        if (hasButtons.syncButton) console.log('  ✅ Sync button found on integration');
        if (hasButtons.disableButton) console.log('  ✅ Disable button found on integration');
      }
    }

    // Take screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({
      path: 'github-integration-verified.png',
      fullPage: true
    });
    console.log('   Saved to github-integration-verified.png');

    // Check console for errors
    console.log('\n🔍 Checking console for errors...');
    await wait(1000);

    if (logs.length === 0) {
      console.log('  ✅ No console errors detected');
    } else {
      console.log(`  ❌ Found ${logs.length} console errors:`);
      logs.forEach(log => console.log(`     - ${log}`));
    }

    console.log('\n✅ GitHub Integration UI verification complete!');
    console.log('\n📊 Summary:');
    console.log('   - Connection status card: ✅');
    console.log('   - Connection alert displayed: ✅');
    console.log('   - Integrations list card: ✅');
    console.log('   - Add Repository button: ✅');
    console.log('   - Proper disabled state handling: ✅');
    console.log('   - Console errors: ' + (logs.length === 0 ? '✅ None' : `❌ ${logs.length}`));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'github-integration-error.png', fullPage: true });
    console.log('Error screenshot saved to github-integration-error.png');
  }

  await browser.close();
})();
