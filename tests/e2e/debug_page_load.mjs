import { chromium } from 'playwright';

const TEST_URL = 'http://localhost:5175/';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--use-angle=gl', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    console.log('  [PAGE]', msg.text());
  });
  page.on('pageerror', err => {
    console.error('  [PAGE ERROR]', err.message);
    errors.push(err.message);
  });
  
  console.log('Loading game...');
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting 5 seconds for load...');
  await page.waitForTimeout(5000);
  
  // Check HTML content
  const html = await page.content();
  console.log('Page has app div:', html.includes('id="app"'));
  console.log('Page has canvas:', html.includes('<canvas'));
  
  // Check for menu buttons
  const buttons = await page.$$('button');
  console.log('Button count:', buttons.length);
  
  for (const btn of buttons) {
    const text = await btn.textContent();
    const action = await btn.getAttribute('data-action');
    const map = await btn.getAttribute('data-map');
    if (action || map) {
      console.log(`  Button: action=${action}, map=${map}, text=${text?.substring(0,30)}`);
    }
  }
  
  console.log('\nErrors:', errors);
  await browser.close();
}

main().catch(console.error);
