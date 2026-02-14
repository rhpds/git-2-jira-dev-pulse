import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

const vizText = await page.evaluate(() => {
  const vizHeadings = Array.from(document.querySelectorAll('h3')).filter(h =>
    h.textContent.includes('Repository Status') || h.textContent.includes('Most Active')
  );

  return vizHeadings.map(h => ({
    text: h.textContent,
    color: window.getComputedStyle(h).color,
    bg: window.getComputedStyle(h.closest('.glass-card') || h).backgroundColor
  }));
});

console.log('=== VISUALIZATION TEXT ===\n');
vizText.forEach(v => {
  console.log(`Text: "${v.text}"`);
  console.log(`Color: ${v.color}`);
  console.log(`Background: ${v.bg}`);
  console.log('');
});

await page.screenshot({ path: 'viz-text-check.png' });
console.log('📸 Screenshot: viz-text-check.png');

await new Promise(r => setTimeout(r, 10000));
await browser.close();
