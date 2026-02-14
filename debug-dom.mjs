import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

const debug = await page.evaluate(() => {
  const gallery = document.querySelector('.pf-v6-c-gallery');
  const cards = document.querySelectorAll('.pf-v6-c-card');
  const allDivs = document.querySelectorAll('div');

  return {
    hasGallery: !!gallery,
    galleryHTML: gallery ? gallery.outerHTML.substring(0, 500) : 'NOT FOUND',
    cardCount: cards.length,
    totalDivs: allDivs.length,
    bodyHTML: document.body.innerHTML.substring(0, 2000)
  };
});

console.log('=== DOM DEBUG ===');
console.log('Has Gallery:', debug.hasGallery);
console.log('Gallery HTML:', debug.galleryHTML);
console.log('Card Count:', debug.cardCount);
console.log('Total Divs:', debug.totalDivs);
console.log('\nBody preview:', debug.bodyHTML);

await new Promise(r => setTimeout(r, 10000));
await browser.close();
