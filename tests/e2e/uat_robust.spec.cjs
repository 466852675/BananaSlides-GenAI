const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:1000';
const PROJECT_NAME = `UAT_${Date.now()}`;

(async () => {
  console.log('Starting Robust UAT Suite...');
  
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
      // 1. Initial Load & Landing Page Bypass
      await step('DB-001: Load & Enter', async () => {
          await page.goto(BASE_URL);
          await page.waitForLoadState('networkidle');
          
          const title = await page.title();
          console.log(`   (Page Title: "${title}")`);

          const enterBtn = page.locator('button', { hasText: /免费开始/i }).first();
          if (await enterBtn.isVisible()) {
              await enterBtn.click();
          }
          await page.locator('button', { hasText: /新建项目/i }).first().waitFor({ state: 'visible', timeout: 15000 });
      });

      // 2. Create Project (Using Icon Selector)
      await step('PRJ-001: Create New Project', async () => {
          const createBtn = page.locator('button', { hasText: /新建项目/i }).first();
          await createBtn.click();
          
          const input = page.locator('input[id="projectTitle"]');
          await input.waitFor({ state: 'visible', timeout: 5000 });
          await input.fill(PROJECT_NAME);
          
          await page.locator('button', { hasText: /立即创建/i }).first().click();
          
          await page.waitForURL(/[\?&]project=/i, { timeout: 15000 });
          await page.locator('text=页面任务列表').first().waitFor({ state: 'visible', timeout: 15000 });
      });

      // 3. Workbench: Outline (Using Placeholder)
      await step('OUT-001: Generate Outline', async () => {
          await page.locator('button', { hasText: /智能生成页面/i }).first().click();
          const topic = page.locator('textarea[placeholder*="PPT 主题"]').first();
          await topic.waitFor({ state: 'visible', timeout: 10000 });
          await topic.fill('AI Future');
          await page.locator('button', { hasText: /一键生成 PPT 大纲/i }).first().click();
          await page.locator('text=大纲预览').first().waitFor({ state: 'visible', timeout: 20000 });
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

      // 4. Import Outline
      await step('OUT-002: Import Outline', async () => {
          const badge = page.locator('text=页面任务列表').first();
          await badge.waitFor({ state: 'visible', timeout: 5000 });
      });

      // 5. Settings (Using Icon)
      await step('SET-001: Global Settings', async () => {
          const settingsBtn = page.locator('button').filter({ has: page.locator('svg.lucide-settings') }).first();
          await settingsBtn.click();
          
          const keyInput = page.locator('input[type="password"]').first();
          await keyInput.waitFor({ state: 'visible' });
          
          await page.keyboard.press('Escape');
      });

      // 6. History (Using Icon)
      await step('HIS-001: History Sidebar', async () => {
          const histBtn = page.locator('button').filter({ has: page.locator('svg.lucide-history') }).first();
          await histBtn.click();
          await page.waitForTimeout(500);
      });

  } catch (e) {
      console.error('Fatal:', e);
  } finally {
      await browser.close();
      console.log('Robust UAT Suite Finished.');
      if (failures > 0) process.exitCode = 1;
  }
})();
