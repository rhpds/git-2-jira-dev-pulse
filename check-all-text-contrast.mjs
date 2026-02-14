import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();

// Switch to standard (light) theme first
await page.goto('http://localhost:9000/api/config/ui-preferences', { method: 'PUT' });

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5000));

const textIssues = await page.evaluate(() => {
  // Get all text-containing elements
  const allElements = Array.from(document.querySelectorAll('*'));
  const issues = [];

  allElements.forEach((el, index) => {
    // Skip if no text content or only whitespace
    const text = el.textContent?.trim();
    if (!text || text.length === 0 || el.children.length > 0) return;

    const styles = window.getComputedStyle(el);
    const color = styles.color;
    const bg = styles.backgroundColor;

    // Parse RGB values
    const colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    const bgMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

    if (!colorMatch || !bgMatch) return;

    const [, r1, g1, b1] = colorMatch.map(Number);
    const [, r2, g2, b2] = bgMatch.map(Number);

    // Calculate luminance (simplified)
    const textLum = (r1 * 0.299 + g1 * 0.587 + b1 * 0.114);
    const bgLum = (r2 * 0.299 + g2 * 0.587 + b2 * 0.114);

    // Check if both are very light (potential white-on-white)
    const bothLight = textLum > 200 && bgLum > 200;
    // Check if both are very dark (potential black-on-black)
    const bothDark = textLum < 50 && bgLum < 50;

    if (bothLight || bothDark) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        issues.push({
          text: text.substring(0, 50),
          color,
          bg,
          element: el.tagName,
          className: el.className,
          problem: bothLight ? 'light-on-light' : 'dark-on-dark'
        });
      }
    }
  });

  return issues.slice(0, 20); // Return first 20 issues
});

console.log('=== TEXT CONTRAST ISSUES ===\n');
if (textIssues.length === 0) {
  console.log('✅ No contrast issues found!');
} else {
  console.log(`Found ${textIssues.length} potential issues:\n`);
  textIssues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue.problem.toUpperCase()}`);
    console.log(`   Element: <${issue.element.toLowerCase()}> class="${issue.className}"`);
    console.log(`   Text: "${issue.text}"`);
    console.log(`   Color: ${issue.color} on Background: ${issue.bg}`);
    console.log('');
  });
}

await page.screenshot({ path: 'contrast-check.png', fullPage: true });
console.log('📸 Screenshot: contrast-check.png');

await new Promise(r => setTimeout(r, 10000));
await browser.close();
