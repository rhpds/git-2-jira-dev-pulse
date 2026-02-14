import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('→ Loading http://localhost:6100...');
  await page.goto('http://localhost:6100', { waitUntil: 'networkidle0', timeout: 10000 });
  console.log('✅ Page loaded!');
  
  const title = await page.title();
  console.log(`Title: ${title}`);
  
  await page.screenshot({ path: 'port-6100-working.png' });
  console.log('📸 Screenshot saved');
  
  console.log('\n🔍 Waiting 15 seconds...');
  await new Promise(r => setTimeout(r, 15000));
} catch (error) {
  console.error('❌ Error:', error.message);
}

await browser.close();
console.log('✅ Done');
