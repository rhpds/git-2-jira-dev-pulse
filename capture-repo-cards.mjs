import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

// Scroll down to make sure repo cards are visible
await page.evaluate(() => {
  const gallery = document.querySelector('.pf-v6-l-gallery');
  if (gallery) {
    gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
await new Promise(r => setTimeout(r, 1500));

// Take screenshot of just the gallery area
const gallery = await page.$('.pf-v6-l-gallery');
if (gallery) {
  await gallery.screenshot({ path: 'repo-cards-only.png' });
  console.log('📸 Repo cards: repo-cards-only.png');
}

// Full page screenshot
await page.screenshot({ path: 'full-page-with-cards.png', fullPage: true });
console.log('📸 Full page: full-page-with-cards.png');

await new Promise(r => setTimeout(r, 10000));
await browser.close();
