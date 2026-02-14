#!/usr/bin/env node
import puppeteer from 'puppeteer';

async function testViz() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('http://localhost:5175/design-test', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    if (errors.length > 0) {
      console.log('❌ Errors:', errors);
    } else {
      console.log('✅ No errors');
    }

    const content = await page.evaluate(() => document.body.innerText);
    console.log('\nHas "Data Visualizations":', content.includes('Data Visualizations'));
    console.log('Has "Most Active Repositories":', content.includes('Most Active Repositories'));
    console.log('Has "Repository Status":', content.includes('Repository Status'));

    await page.screenshot({ path: 'viz-test.png', fullPage: true });
    console.log('\n📸 Screenshot: viz-test.png');
  } finally {
    await browser.close();
  }
}

testViz();
