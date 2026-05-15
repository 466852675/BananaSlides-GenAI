const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login page
  await page.goto('http://localhost:1000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/html-demo/screenshots/01-login.png', fullPage: true });
  console.log('1/8 Login page');

  // 2. Fill login
  await page.locator('input[placeholder*="用户名"]').fill('admin');
  await page.locator('input[placeholder*="密码"]').fill('admin12345678');

  // Force click the login button (bypass overlay interception)
  await page.locator('button:has-text("立即登录")').click({ force: true });
  await page.waitForTimeout(5000);
  console.log('Current URL:', page.url());

  // Try again with JS click
  if (page.url().includes('login')) {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('立即登录')) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          break;
        }
      }
    });
    await page.waitForTimeout(3000);
    console.log('After JS click URL:', page.url());
  }

  await page.screenshot({ path: 'docs/html-demo/screenshots/02-after-login.png', fullPage: true });
  console.log('2/8 After login');

  // Try navigating to home
  await page.goto('http://localhost:1000/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'docs/html-demo/screenshots/03-home.png', fullPage: true });
  console.log('3/8 Home');

  // Check what we see
  const text = await page.locator('body').innerText().catch(() => 'no text');
  console.log('Page text (first 300):', text.substring(0, 300));

  await browser.close();
  console.log('Done!');
})();