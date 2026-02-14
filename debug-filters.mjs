import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

const debug = await page.evaluate(() => {
  const toolbar = document.querySelector('.pf-v6-c-toolbar');
  const toggleGroup = document.querySelector('.pf-v6-c-toggle-group');
  const gridButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Grid');
  const analyzeButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Analyze'));

  return {
    hasToolbar: !!toolbar,
    hasToggleGroup: !!toggleGroup,
    hasGridButton: !!gridButton,
    gridButtonText: gridButton?.textContent,
    hasAnalyzeButton: !!analyzeButton,
    analyzeText: analyzeButton?.textContent,
    analyzeDisabled: analyzeButton?.disabled,
  };
});

console.log('=== UI ELEMENTS ===');
console.log(JSON.stringify(debug, null, 2));

await new Promise(r => setTimeout(r, 5000));
await browser.close();
