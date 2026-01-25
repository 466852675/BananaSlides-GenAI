const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:1000';
const PROJECT_NAME = `UAT_${Date.now()}`;

(async () => {
  console.log('Starting UAT Suite (Final)...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let failures = 0;

  const bootstrapAuth = async () => {
      const email = `uat_${Date.now()}@test.local`;
      const password = 'Passw0rd!123';
      const resp = await fetch('http://127.0.0.1:1111/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
      });
      const json = await resp.json();
      if (!resp.ok || !json.token) {
          throw new Error(`Auth bootstrap failed: ${JSON.stringify(json)}`);
      }
      await context.addInitScript(({ token }) => {
          localStorage.setItem('bananaslides_token_v1', token);
          localStorage.setItem('bananaslides_onboarding_v1', 'completed');
          sessionStorage.setItem('hasVisitedLanding', 'true');
      }, { token: json.token });
  };

  const step = async (name, fn) => {
      process.stdout.write(`[TEST] ${name}... `);
      try {
          await fn();
          console.log('✅ PASS');
      } catch (e) {
          console.log('❌ FAIL');
          console.error(`   Error: ${e.message}`);
          failures += 1;
      }
  };

  try {
      await bootstrapAuth();
      // 1. Initial Load (Relaxed Wait)
      await step('DB-001: Load & Enter', async () => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }); // Don't wait for network idle
          
          const enterBtn = page.locator('button', { hasText: /免费开始/i }).first();
          if (await enterBtn.isVisible()) await enterBtn.click();
          
          await page.locator('button', { hasText: /新建项目/i }).first().waitFor({ state: 'visible', timeout: 15000 });
      });

      // 2. Create Project
      await step('PRJ-001: Create New Project', async () => {
          await page.locator('button', { hasText: /新建项目/i }).first().click();
          const input = page.locator('input[id="projectTitle"]');
          await input.waitFor({ state: 'visible', timeout: 5000 });
          await input.fill(PROJECT_NAME);
          await page.locator('button', { hasText: /立即创建/i }).first().click();
          await page.waitForURL(/[\?&]project=/i, { timeout: 15000 });
          await page.locator('text=页面任务列表').first().waitFor({ state: 'visible', timeout: 15000 });
      });

      // 3. Workbench: Outline
      await step('OUT-001: Generate Outline', async () => {
          await page.locator('button', { hasText: /智能生成页面/i }).first().click();
          const topic = page.locator('textarea[placeholder*="PPT 主题"]').first();
          await topic.waitFor({ state: 'visible', timeout: 10000 });
          await topic.fill('AI Future');
          await page.locator('button', { hasText: /一键生成 PPT 大纲/i }).first().click();
          await page.locator('text=大纲预览').first().waitFor({ state: 'visible', timeout: 20000 });
      });

      await step('OUT-002: Import Outline', async () => {
          await page.locator('button', { hasText: /下一步: 生成详细内容/i }).first().click();
          const confirmBtn = page.locator('button', { hasText: /确认/i }).first();
          await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
          await confirmBtn.click();
          await page.locator('text=详细内容生成').first().waitFor({ state: 'visible', timeout: 15000 });
          await page.locator('button', { hasText: /完成并导入工作台/i }).first().click();
          const importConfirmBtn = page.locator('button', { hasText: /确认/i }).first();
          await importConfirmBtn.waitFor({ state: 'visible', timeout: 10000 });
          await importConfirmBtn.click();
          await page.locator('text=页面任务列表').first().waitFor({ state: 'visible', timeout: 15000 });
      });

      // 5. Settings
      await step('SET-001: Global Settings', async () => {
          const settingsBtn = page.locator('button').filter({ has: page.locator('svg.lucide-settings') }).first();
          await settingsBtn.click();
          await page.waitForSelector('input[type="password"]');
          await page.keyboard.press('Escape');
      });

      await step('HIS-001: History Sidebar', async () => {
          const histBtn = page.locator('button[title="历史版本"]').first();
          if (await histBtn.isVisible()) {
              await histBtn.click();
              await page.waitForTimeout(500);
          }
      });

  } catch (e) {
      console.error('Fatal:', e);
      failures += 1;
  } finally {
      await browser.close();
      console.log('Suite Finished.');
      if (failures > 0) process.exitCode = 1;
  }
})();
