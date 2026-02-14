#!/usr/bin/env node
/**
 * Verify UI Changes:
 * 1. Header text contrast (Git→Jira should be white)
 * 2. Pull button only shows on repos with changes
 * 3. Compact layout with more repos visible
 */

import puppeteer from 'puppeteer';

async function verifyUIChanges() {
  console.log('🔍 Verifying UI changes...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();

  // Listen for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error]`, msg.text());
    }
  });

  try {
    console.log('📍 Navigating to http://localhost:6100...');
    await page.goto('http://localhost:6100', { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('⏳ Waiting for app to load...');
    await page.waitForSelector('.pf-v6-c-page', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 1: Check header text color
    console.log('\n━━━ Test 1: Header Text Contrast ━━━');
    const headerColor = await page.evaluate(() => {
      const masthead = document.querySelector('.pf-v6-c-masthead__brand span');
      if (!masthead) return null;
      const color = window.getComputedStyle(masthead).color;
      const text = masthead.textContent;
      return { color, text };
    });

    if (headerColor) {
      console.log(`  Text: "${headerColor.text}"`);
      console.log(`  Color: ${headerColor.color}`);

      // Check if it's white or very light (rgb(255, 255, 255) or close)
      const isWhite = headerColor.color.includes('rgb(255, 255, 255)') ||
                      headerColor.color.includes('rgba(255, 255, 255');
      console.log(`  ✅ Is white/bright: ${isWhite ? 'YES' : 'NO'}`);
    } else {
      console.log('  ❌ Could not find header text');
    }

    // Test 2: Check repo card sizes and count visible
    console.log('\n━━━ Test 2: Compact Repo Layout ━━━');
    const repoCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.pf-v6-l-gallery > *'));
      return {
        count: cards.length,
        widths: cards.slice(0, 5).map(card => {
          const rect = card.getBoundingClientRect();
          return Math.round(rect.width);
        }),
        heights: cards.slice(0, 5).map(card => {
          const rect = card.getBoundingClientRect();
          return Math.round(rect.height);
        })
      };
    });

    console.log(`  Total repos found: ${repoCards.count}`);
    console.log(`  Sample card widths: ${repoCards.widths.join('px, ')}px`);
    console.log(`  Sample card heights: ${repoCards.heights.join('px, ')}px`);

    const avgWidth = repoCards.widths.reduce((a, b) => a + b, 0) / repoCards.widths.length;
    console.log(`  Average width: ${Math.round(avgWidth)}px (target: 260-320px)`);
    console.log(`  ✅ Compact: ${avgWidth < 330 ? 'YES' : 'NO'}`);

    // Test 3: Check Pull buttons
    console.log('\n━━━ Test 3: Pull Buttons ━━━');
    const pullButtons = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.pf-v6-l-gallery > *'));
      const results = [];

      cards.forEach((card, index) => {
        const nameEl = card.querySelector('.pf-v6-c-checkbox__label, strong');
        const name = nameEl ? nameEl.textContent.trim() : `Repo ${index}`;

        const statusLabel = Array.from(card.querySelectorAll('.pf-v6-c-label'))
          .find(label => label.textContent.includes('Clean') || label.textContent.includes('ch'));
        const status = statusLabel ? statusLabel.textContent.trim() : 'unknown';

        const pullBtn = card.querySelector('button');
        const hasPullBtn = pullBtn && pullBtn.textContent.includes('Pull');

        results.push({ name, status, hasPullBtn });
      });

      return results;
    });

    console.log(`  Analyzed ${pullButtons.length} repos:\n`);

    let correctBehavior = 0;
    pullButtons.forEach((repo, i) => {
      const hasChanges = !repo.status.includes('Clean');
      const shouldHavePull = hasChanges;
      const isCorrect = repo.hasPullBtn === shouldHavePull;

      if (i < 10) { // Show first 10
        const icon = isCorrect ? '✅' : '❌';
        console.log(`  ${icon} ${repo.name}: ${repo.status} → Pull button: ${repo.hasPullBtn ? 'YES' : 'NO'}`);
      }

      if (isCorrect) correctBehavior++;
    });

    const accuracy = Math.round((correctBehavior / pullButtons.length) * 100);
    console.log(`\n  Correct behavior: ${correctBehavior}/${pullButtons.length} (${accuracy}%)`);

    // Test 4: Take screenshots
    console.log('\n━━━ Test 4: Screenshots ━━━');

    // Full page
    await page.screenshot({ path: 'verify-full-page.png', fullPage: true });
    console.log('  📸 Full page: verify-full-page.png');

    // Just the repos section
    const reposSection = await page.$('.pf-v6-l-gallery');
    if (reposSection) {
      await reposSection.screenshot({ path: 'verify-repos-grid.png' });
      console.log('  📸 Repos grid: verify-repos-grid.png');
    }

    // Header close-up
    const header = await page.$('.pf-v6-c-masthead');
    if (header) {
      await header.screenshot({ path: 'verify-header.png' });
      console.log('  📸 Header: verify-header.png');
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 VERIFICATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Header text: ${headerColor ? 'Found' : 'Missing'}`);
    console.log(`✅ Compact layout: ${avgWidth < 330 ? 'YES' : 'NO'} (${Math.round(avgWidth)}px avg)`);
    console.log(`✅ Pull button logic: ${accuracy}% correct`);
    console.log(`✅ Total repos visible: ${repoCards.count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 Browser will stay open for 30 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'verify-error.png' });
    console.log('📸 Error screenshot saved: verify-error.png');
  } finally {
    await browser.close();
    console.log('✅ Verification complete');
  }
}

verifyUIChanges();
