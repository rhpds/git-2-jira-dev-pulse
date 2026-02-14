import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 5000));

// Check header text color
const headerColors = await page.evaluate(() => {
  const brandText = document.querySelector('.pf-v6-c-masthead__brand span');
  const navLinks = Array.from(document.querySelectorAll('.pf-v6-c-nav__link-text'));

  return {
    brandText: {
      text: brandText?.textContent,
      color: brandText ? window.getComputedStyle(brandText).color : null,
      bg: brandText ? window.getComputedStyle(brandText.closest('.pf-v6-c-masthead')).backgroundColor : null
    },
    navLinks: navLinks.map(link => ({
      text: link.textContent,
      color: window.getComputedStyle(link).color
    }))
  };
});

console.log('=== LIGHT MODE TEXT COLORS ===\n');
console.log('Header "Git→Jira":');
console.log(`  Text: "${headerColors.brandText.text}"`);
console.log(`  Color: ${headerColors.brandText.color}`);
console.log(`  Background: ${headerColors.brandText.bg}`);

console.log('\nNav Links:');
headerColors.navLinks.forEach(link => {
  console.log(`  "${link.text}": ${link.color}`);
});

await page.screenshot({ path: 'light-mode-full.png', fullPage: false });
console.log('\n📸 Screenshot: light-mode-full.png');

await new Promise(r => setTimeout(r, 15000));
await browser.close();
