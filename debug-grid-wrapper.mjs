import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

const debug = await page.evaluate(() => {
  // Find all divs with framer-motion data attributes
  const motionDivs = Array.from(document.querySelectorAll('div[data-projection-id]'));

  // Look for stack items
  const stackItems = document.querySelectorAll('.pf-v6-c-stack__item');

  // Get the main content area structure
  const stack = document.querySelector('.pf-v6-c-stack');

  return {
    motionDivCount: motionDivs.length,
    stackItemCount: stackItems.length,
    stackHTML: stack ? stack.outerHTML.substring(0, 1000) : 'NO STACK',
    // Try to find the gallery
    foundGalleries: Array.from(document.querySelectorAll('*')).filter(el =>
      el.className && el.className.includes && el.className.includes('gallery')
    ).map(el => el.className)
  };
});

console.log('=== GRID WRAPPER DEBUG ===');
console.log('Motion Divs:', debug.motionDivCount);
console.log('Stack Items:', debug.stackItemCount);
console.log('Galleries found:', debug.foundGalleries);
console.log('\nStack HTML preview:\n', debug.stackHTML);

await new Promise(r => setTimeout(r, 5000));
await browser.close();
