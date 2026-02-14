import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

const result = await page.evaluate(() => {
  const gallery = document.querySelector('.pf-v6-l-gallery');
  if (!gallery) return { found: false };

  const children = gallery.children;
  const childCards = Array.from(children).slice(0, 5).map(child => ({
    className: child.className,
    innerHTML: child.innerHTML.substring(0, 200)
  }));

  return {
    found: true,
    childCount: children.length,
    galleryClasses: gallery.className,
    childCards
  };
});

console.log('=== GALLERY CHECK ===');
console.log('Found:', result.found);
console.log('Child Count:', result.childCount);
console.log('Gallery Classes:', result.galleryClasses);
console.log('\nFirst 5 cards:');
result.childCards?.forEach((card, i) => {
  console.log(`\n${i + 1}. ${card.className}`);
  console.log(`   ${card.innerHTML.substring(0, 100)}...`);
});

await new Promise(r => setTimeout(r, 5000));
await browser.close();
