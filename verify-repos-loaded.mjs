import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });

console.log('→ Loading http://localhost:6100...');
await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });

console.log('→ Waiting for repos to load...');
try {
  // Wait for gallery to appear and have children
  await page.waitForSelector('.pf-v6-c-gallery > *', { timeout: 15000 });
  
  // Wait a bit more for all repos to render
  await new Promise(r => setTimeout(r, 3000));
  
  // Count repos
  const repoCount = await page.evaluate(() => {
    return document.querySelectorAll('.pf-v6-c-gallery > *').length;
  });
  
  console.log(`✅ Found ${repoCount} repo cards`);
  
  // Scroll down a bit to show repos
  await page.evaluate(() => window.scrollTo(0, 400));
  await new Promise(r => setTimeout(r, 1000));
  
  // Take screenshot
  await page.screenshot({ path: 'repos-loaded.png', fullPage: false });
  console.log('📸 Screenshot: repos-loaded.png');
  
  // Get compact layout details
  const layout = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.pf-v6-c-gallery > *'));
    const first5 = cards.slice(0, 5);
    
    return first5.map(card => {
      const rect = card.getBoundingClientRect();
      const name = card.querySelector('.pf-v6-c-checkbox__label, strong')?.textContent?.trim();
      const pullBtn = !!card.querySelector('button');
      const status = card.querySelector('.pf-v6-c-label')?.textContent;
      
      return {
        name,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        hasPullBtn: pullBtn,
        status
      };
    });
  });
  
  console.log('\n📊 First 5 repos:');
  layout.forEach(repo => {
    console.log(`  ${repo.name}: ${repo.width}x${repo.height}px, Pull: ${repo.hasPullBtn ? 'YES' : 'NO'}, Status: ${repo.status}`);
  });
  
  console.log('\n⏳ Keeping browser open 20 seconds...');
  await new Promise(r => setTimeout(r, 20000));
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

await browser.close();
console.log('✅ Done');
