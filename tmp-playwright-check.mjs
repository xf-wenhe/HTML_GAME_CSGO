import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const messages = [];
const errors = [];

page.on('console', msg => {
  messages.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', err => {
  errors.push(String(err));
});
page.on('requestfailed', req => {
  errors.push(`REQUEST_FAILED ${req.url()} ${req.failure()?.errorText ?? ''}`);
});

try {
  const response = await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: '/Volumes/新/work/html/tmp-playwright-screenshot.png', fullPage: true });
  const appHTML = await page.locator('#app').evaluate(el => el.innerHTML);
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log(JSON.stringify({
    ok: true,
    status: response?.status(),
    title: await page.title(),
    appHTML,
    bodyText,
    messages,
    errors,
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: String(error), messages, errors }, null, 2));
}

await browser.close();
