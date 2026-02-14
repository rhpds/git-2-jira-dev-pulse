#!/usr/bin/env node

/**
 * Browser Debug Script using Puppeteer
 * Opens the app, captures console errors, takes screenshots
 */

import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';

const FRONTEND_URL = 'http://localhost:5175';

async function debugBrowser() {
  console.log('🚀 Launching browser with Puppeteer...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser window
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push({ type, text });

    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${type}] ${text}`);
  });

  // Capture errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });

  // Capture failed requests
  const failedRequests = [];
  page.on('requestfailed', request => {
    const failure = {
      url: request.url(),
      failure: request.failure().errorText,
    };
    failedRequests.push(failure);
    console.log(`❌ Request Failed: ${request.url()} - ${request.failure().errorText}`);
  });

  console.log(`📡 Navigating to ${FRONTEND_URL}...\n`);

  try {
    // Navigate to the app
    const response = await page.goto(FRONTEND_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log(`✅ Page loaded with status: ${response.status()}\n`);

    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if root div has content
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        hasChildren: root?.children.length > 0,
        innerHTML: root?.innerHTML.substring(0, 200),
      };
    });

    console.log('🔍 Root Element Analysis:');
    console.log(`  - Root exists: ${rootContent.exists}`);
    console.log(`  - Has children: ${rootContent.hasChildren}`);
    console.log(`  - Content preview: ${rootContent.innerHTML}\n`);

    // Check if React app loaded
    const reactCheck = await page.evaluate(() => {
      return {
        reactFound: !!(window.React || document.querySelector('[data-reactroot]')),
        bodyClasses: document.body.className,
        scriptsLoaded: document.scripts.length,
      };
    });

    console.log('⚛️  React Check:');
    console.log(`  - React found: ${reactCheck.reactFound}`);
    console.log(`  - Body classes: ${reactCheck.bodyClasses}`);
    console.log(`  - Scripts loaded: ${reactCheck.scriptsLoaded}\n`);

    // Take screenshots
    console.log('📸 Taking screenshots...\n');

    await page.screenshot({
      path: 'screenshot-full.png',
      fullPage: true,
    });
    console.log('  ✓ Full page: screenshot-full.png');

    await page.screenshot({
      path: 'screenshot-viewport.png',
      fullPage: false,
    });
    console.log('  ✓ Viewport: screenshot-viewport.png\n');

    // Get network requests
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        duration: r.duration,
        size: r.transferSize,
      }));
    });

    // Save debug report
    const report = {
      url: FRONTEND_URL,
      timestamp: new Date().toISOString(),
      status: response.status(),
      rootContent,
      reactCheck,
      consoleMessages,
      errors,
      failedRequests,
      networkRequests: requests.slice(0, 20), // Top 20 requests
    };

    await writeFile('browser-debug-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Debug report saved: browser-debug-report.json\n');

    // Summary
    console.log('═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Page Status: ${response.status() === 200 ? '✅' : '❌'} ${response.status()}`);
    console.log(`Root Has Content: ${rootContent.hasChildren ? '✅' : '❌'} ${rootContent.hasChildren}`);
    console.log(`React Loaded: ${reactCheck.reactFound ? '✅' : '❌'} ${reactCheck.reactFound}`);
    console.log(`Console Errors: ${errors.length === 0 ? '✅' : '❌'} ${errors.length} errors`);
    console.log(`Failed Requests: ${failedRequests.length === 0 ? '✅' : '❌'} ${failedRequests.length} failed`);
    console.log('═'.repeat(60));

    if (errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (failedRequests.length > 0) {
      console.log('\n❌ FAILED REQUESTS:');
      failedRequests.forEach((req, i) => console.log(`  ${i + 1}. ${req.url} - ${req.failure}`));
    }

    // Keep browser open for manual inspection
    console.log('\n👀 Browser window will stay open for 10 seconds for manual inspection...');
    console.log('   Check the browser window to see the actual rendered page.\n');

    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);

    // Take error screenshot
    await page.screenshot({ path: 'screenshot-error.png' });
    console.log('📸 Error screenshot saved: screenshot-error.png');
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed. Check the screenshots and debug report.');
  }
}

debugBrowser().catch(console.error);
