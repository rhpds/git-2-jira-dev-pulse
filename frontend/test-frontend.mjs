#!/usr/bin/env node
import puppeteer from 'puppeteer';

async function testFrontend() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capture console messages and errors
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Navigate to the frontend
    console.log('🔍 Testing frontend at http://localhost:5175...\n');
    await page.goto('http://localhost:5175', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for errors
    if (errors.length > 0) {
      console.log('❌ JavaScript Errors Found:\n');
      errors.forEach((error, i) => {
        console.log(`Error ${i + 1}:`);
        console.log(`  Message: ${error.message}`);
        if (error.stack) {
          console.log(`  Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No JavaScript errors found!\n');
    }

    // Check for specific PatternFly import errors
    const importErrors = consoleMessages.filter(msg =>
      msg.type === 'error' &&
      msg.text.includes('does not provide an export named')
    );

    if (importErrors.length > 0) {
      console.log('❌ PatternFly Import Errors:\n');
      importErrors.forEach(err => console.log(`  ${err.text}\n`));
    }

    // Check if the page rendered successfully
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log(`📄 Page Title: ${title}`);
    console.log(`📝 Page has content: ${bodyText.length > 0 ? 'Yes' : 'No'}`);

    // Check for specific elements
    const hasSelectRepos = bodyText.includes('Select Repositories');
    const hasError = bodyText.includes('Something went wrong');

    if (hasError) {
      console.log('\n⚠️  Error boundary was triggered - the page shows "Something went wrong"');
    } else if (hasSelectRepos) {
      console.log('\n✅ Page loaded successfully - "Select Repositories" found');
    } else {
      console.log('\n⚠️  Page loaded but expected content not found');
    }

    // Take a screenshot
    await page.screenshot({ path: 'frontend-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved to frontend-screenshot.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testFrontend();
