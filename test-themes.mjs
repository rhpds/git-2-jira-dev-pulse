#!/usr/bin/env node
/**
 * Theme Switching Test
 * Tests all 10 themes by switching between them and taking screenshots
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const THEMES = [
  'standard',
  'glassmorphic',
  'standard-dark',
  'glassmorphic-dark',
  'high-contrast',
  'minimalist',
  'neon',
  'neumorphic',
  'material',
  'retro-terminal'
];

async function testThemes() {
  console.log('🎨 Starting theme switching test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}]`, msg.text());
  });

  // Track errors
  page.on('pageerror', error => {
    console.error('❌ Page error:', error.message);
  });

  try {
    console.log('📍 Navigating to http://localhost:5175...');
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('⏳ Waiting for app to load...');
    await page.waitForSelector('.pf-v6-c-page', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create screenshots directory
    const screenshotsDir = './theme-screenshots';
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    console.log('\n🎯 Testing theme switching...\n');

    for (const theme of THEMES) {
      console.log(`\n━━━ Testing: ${theme} ━━━`);

      // Navigate to Settings page
      console.log('  → Navigating to Settings...');
      const navItems = await page.$$('.pf-v6-c-nav__link');
      for (const item of navItems) {
        const text = await item.evaluate(el => el.textContent);
        if (text.includes('Settings')) {
          await item.click();
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Click Visual Preferences tab
      console.log('  → Opening Visual Preferences...');
      const tabs = await page.$$('[role="tab"]');
      for (const tab of tabs) {
        const text = await tab.evaluate(el => el.textContent);
        if (text.includes('Visual Preferences')) {
          await tab.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
        }
      }

      // Find and click the theme card
      console.log(`  → Selecting "${theme}" theme...`);
      const themeCards = await page.$$('.pf-v6-c-card');
      let foundTheme = false;

      for (const card of themeCards) {
        const cardText = await card.evaluate(el => el.textContent);
        if (cardText.toLowerCase().includes(theme)) {
          console.log(`  ✓ Found theme card`);
          await card.click();
          foundTheme = true;
          break;
        }
      }

      if (!foundTheme) {
        console.log(`  ⚠️  Could not find theme card for "${theme}"`);
        continue;
      }

      // Wait for theme to apply
      console.log('  → Waiting for theme to apply...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check data-theme attribute
      const currentTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme');
      });
      console.log(`  → data-theme attribute: ${currentTheme}`);

      // Check if theme CSS is injected
      const themeCSSExists = await page.evaluate((themeId) => {
        const style = document.getElementById(`theme-${themeId}`);
        return {
          exists: !!style,
          length: style ? style.textContent.length : 0
        };
      }, theme);
      console.log(`  → Theme CSS injected: ${themeCSSExists.exists ? 'Yes' : 'No'} (${themeCSSExists.length} chars)`);

      // Go to Repositories page to see theme applied
      console.log('  → Navigating to Repositories page...');
      const repoNavItems = await page.$$('.pf-v6-c-nav__link');
      for (const item of repoNavItems) {
        const text = await item.evaluate(el => el.textContent);
        if (text.includes('Repositories')) {
          await item.click();
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot
      const screenshotPath = path.join(screenshotsDir, `${theme}.png`);
      console.log(`  → Taking screenshot: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      console.log(`  ✓ Screenshot saved\n`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Theme testing complete!');
    console.log(`📸 Screenshots saved in: ${screenshotsDir}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      themes_tested: THEMES,
      screenshots_dir: screenshotsDir,
      summary: `Tested ${THEMES.length} themes`
    };

    fs.writeFileSync('./theme-test-report.json', JSON.stringify(report, null, 2));
    console.log('📋 Report saved: theme-test-report.json\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🔍 Keeping browser open for inspection...');
    console.log('Press Ctrl+C to close\n');

    // Keep browser open for manual inspection
    await new Promise(resolve => setTimeout(resolve, 60000));
    await browser.close();
  }
}

testThemes();
