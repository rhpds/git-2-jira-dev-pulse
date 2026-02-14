import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

const errors = [];
const logs = [];

page.on('console', msg => {
  const text = msg.text();
  if (msg.type() === 'error') {
    errors.push(text);
    console.log('❌ ERROR:', text);
  } else if (msg.type() === 'warn') {
    console.log('⚠️  WARN:', text);
  }
});

page.on('pageerror', error => {
  errors.push(error.message);
  console.log('💥 PAGE ERROR:', error.message);
});

page.on('requestfailed', request => {
  console.log('🚫 REQUEST FAILED:', request.url(), request.failure().errorText);
});

console.log('→ Loading http://localhost:6100...');
await page.goto('http://localhost:6100', { waitUntil: 'networkidle0', timeout: 30000 });

console.log('→ Waiting 5 seconds...');
await new Promise(r => setTimeout(r, 5000));

console.log(`\n📋 Total errors: ${errors.length}`);

await page.screenshot({ path: 'console-check.png' });
console.log('📸 Screenshot saved');

await new Promise(r => setTimeout(r, 15000));
await browser.close();
