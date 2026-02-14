import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();

await page.goto('http://localhost:6100', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));

// Scroll to repo cards
await page.evaluate(() => window.scrollTo(0, 600));
await new Promise(r => setTimeout(r, 1000));

const cardText = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.pf-v6-l-gallery > *')).slice(0, 5);
  return cards.map(card => {
    // Get all text elements in the card
    const repoName = card.querySelector('.pf-v6-c-check__label')?.textContent?.trim();
    const labels = Array.from(card.querySelectorAll('.pf-v6-c-label')).map(label => ({
      text: label.textContent.trim(),
      color: window.getComputedStyle(label).color,
      bg: window.getComputedStyle(label).backgroundColor
    }));
    const button = card.querySelector('button');
    const buttonText = button ? {
      text: button.textContent.trim(),
      color: window.getComputedStyle(button).color,
      visible: button.offsetHeight > 0
    } : null;

    // Get card background
    const cardBg = window.getComputedStyle(card).backgroundColor;

    return {
      repoName,
      cardBg,
      labels,
      button: buttonText
    };
  });
});

console.log('=== REPO CARDS TEXT CHECK ===\n');
cardText.forEach((card, i) => {
  console.log(`Card ${i + 1}: ${card.repoName}`);
  console.log(`  Card Background: ${card.cardBg}`);
  console.log(`  Labels:`);
  card.labels.forEach(label => {
    console.log(`    "${label.text}": ${label.color} on ${label.bg}`);
  });
  if (card.button) {
    console.log(`  Button: "${card.button.text}" (${card.button.color}) visible: ${card.button.visible}`);
  }
  console.log('');
});

await page.screenshot({ path: 'repo-cards-check.png', fullPage: false });
console.log('📸 Screenshot: repo-cards-check.png');

await new Promise(r => setTimeout(r, 10000));
await browser.close();
