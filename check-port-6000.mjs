#!/usr/bin/env node
/**
 * Check if port 6000 is accessible and working
 */

import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkPort6000() {
  console.log('🔍 Checking port 6000...\n');

  // Check if port is listening
  try {
    const { stdout } = await execAsync('lsof -i :6000');
    console.log('✅ Port 6000 is in use:');
    console.log(stdout);
  } catch (error) {
    console.log('❌ Port 6000 is NOT listening');
    console.log('Error:', error.message);
  }

  // Try curl
  console.log('\n📡 Testing with curl...');
  try {
    const { stdout } = await execAsync('curl -s -I http://localhost:6000 | head -5');
    console.log('✅ Curl response:');
    console.log(stdout);
  } catch (error) {
    console.log('❌ Curl failed:', error.message);
  }

  // Try with Puppeteer
  console.log('\n🌐 Testing with Puppeteer...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // Listen for errors
  page.on('console', msg => console.log(`[Browser ${msg.type()}]`, msg.text()));
  page.on('pageerror', error => console.error('❌ Page error:', error.message));
  page.on('requestfailed', request => {
    console.error('❌ Request failed:', request.url(), request.failure().errorText);
  });

  try {
    console.log('→ Navigating to http://localhost:6000...');
    await page.goto('http://localhost:6000', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    console.log('✅ Page loaded successfully!');

    // Take screenshot
    await page.screenshot({ path: 'port-6000-screenshot.png' });
    console.log('📸 Screenshot saved: port-6000-screenshot.png');

    // Check if React root exists
    const hasRoot = await page.evaluate(() => {
      return !!document.getElementById('root');
    });
    console.log(`React root exists: ${hasRoot ? '✅' : '❌'}`);

    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

  } catch (error) {
    console.error('❌ Failed to load page:', error.message);
    await page.screenshot({ path: 'port-6000-error.png' });
    console.log('📸 Error screenshot saved: port-6000-error.png');
  }

  console.log('\n🔍 Browser will stay open for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();
  console.log('✅ Test complete');
}

checkPort6000().catch(console.error);
