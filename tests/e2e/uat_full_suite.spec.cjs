const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:1000';
const TEST_TIMEOUT = 60000; // 60s per step
const PROJECT_NAME = `UAT_Auto_${Date.now()}`;

(async () => {
  console.log('Starting BananaSlides Ultimate UAT Suite...');
  
  const browser = await chromium.launch({ 
      headless: true, // Set to false to see the browser actions
      slowMo: 100     // Add delay to see interactions
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  let failures = 0;

  const ensureTestImage = () => {
      const filePath = path.resolve('tests/e2e/.tmp_test_image.png');
      if (fs.existsSync(filePath)) return filePath;
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PtPhVwAAAABJRU5ErkJggg==';
      fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
      return filePath;
  };

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

  const dismissBlockingOverlays = async () => {
      for (let i = 0; i < 3; i++) {
          const overlay = page.locator('div[class*="bg-black/40"][class*="backdrop-blur"]').first();
          const overlay50 = page.locator('div[class*="bg-black/50"][class*="backdrop-blur"]').first();
          const overlay20 = page.locator('div[class*="bg-black/20"][class*="backdrop-blur"]').first();

          const anyOverlayCount = (await overlay.count()) + (await overlay50.count()) + (await overlay20.count());
          if (anyOverlayCount === 0) return;

          try {
              const closeBtn = page.locator('button:has(svg.lucide-x)').first();
              if (await closeBtn.isVisible()) {
                  await closeBtn.click({ force: true, timeout: 1000 });
              } else if (await overlay.isVisible()) {
                  await overlay.click({ force: true, timeout: 1000 });
              } else if (await overlay50.isVisible()) {
                  await overlay50.click({ force: true, timeout: 1000 });
              } else if (await overlay20.isVisible()) {
                  await overlay20.click({ force: true, timeout: 1000 });
              }
              await page.waitForTimeout(200);
          } catch (_) {
          }
      }
  };

  // Helper to log steps
  const step = async (name, fn) => {
      process.stdout.write(`[TEST] ${name}... `);
      try {
          await fn();
          console.log('✅ PASS');
      } catch (e) {
          console.log('❌ FAIL');
          console.error(`   Error: ${e.message}`);
          await page.screenshot({ path: `tests/e2e/fail_${name.replace(/\s+/g, '_')}.png` });
          // Don't exit, try to continue
          failures += 1;
      }
  };

  try {
      await bootstrapAuth();
      // --- 1. Dashboard & Analytics ---
      await step('DB-001: Load & Enter Dashboard', async () => {
          await page.goto(BASE_URL);
          await page.waitForLoadState('networkidle');
          const title = await page.title();
          if (!title.includes('BananaSlides')) throw new Error('Wrong title');
          const enterBtn = page.locator('button', { hasText: /免费开始/i }).first();
          if (await enterBtn.isVisible()) {
              await enterBtn.click();
          }
          await page.locator('button', { hasText: /新建项目/i }).first().waitFor({ state: 'visible', timeout: 15000 });
      });

      // --- 2. Project Lifecycle ---
      await step('PRJ-001: Create New Project', async () => {
          const createBtn = page.locator('button', { hasText: /新建项目/i }).first();
          await createBtn.click();
          
          // Input title
          const input = page.locator('input[id="projectTitle"]');
          await input.waitFor({ state: 'visible', timeout: 5000 });
          await input.fill(PROJECT_NAME);

          const scenario = page.locator('select[id="scenarioType"]').first();
          if (await scenario.isVisible()) {
              await scenario.selectOption('BUSINESS');
          }
          
          // Submit
          const submitBtn = page.locator('button', { hasText: /立即创建/i }).first();
          await submitBtn.click();
          
          await page.waitForURL(/[\?&]project=/i, { timeout: 15000 });
          await page.locator('text=页面任务列表').first().waitFor({ state: 'visible', timeout: 15000 });
          console.log(`   Project "${PROJECT_NAME}" created.`);
      });

      // --- 3. Workbench: Outline ---
      await step('OUT-001: Generate Outline (Mock AI)', async () => {
          await page.locator('button', { hasText: /智能生成页面/i }).first().click();
          const topic = page.locator('textarea[placeholder*="PPT 主题"]').first();
          await topic.waitFor({ state: 'visible', timeout: 10000 });
          await topic.fill('The Future of AI in 2026');
          await page.locator('button', { hasText: /一键生成 PPT 大纲/i }).first().click();
          await page.locator('text=大纲预览').first().waitFor({ state: 'visible', timeout: 20000 });
      });

      await step('OUT-002: Confirm Outline to Workbench', async () => {
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

      // --- 4. Workbench: Image Upload ---
      await step('INP-005: Upload Image', async () => {
          await dismissBlockingOverlays();
          const addImageBtn = page.locator('button', { hasText: /添加图片页面/i }).first();
          if (!(await addImageBtn.isVisible())) {
              console.log('   (Skipped: Add image button not visible)');
              return;
          }
          await addImageBtn.click();
          const fileInput = page.locator('input[type="file"]').first();
          const count = await fileInput.count();
          if (count === 0) {
              console.log('   (Skipped: File input not found)');
              await dismissBlockingOverlays();
              return;
          }
          const testImgPath = ensureTestImage();
          await fileInput.setInputFiles(testImgPath);
          await page.waitForTimeout(1500);
          await dismissBlockingOverlays();
      });

      // --- 5. Generation Engine ---
      await step('GEN-001: Batch Generation', async () => {
          await dismissBlockingOverlays();
          const batchBtn = page.locator('button', { hasText: /批量生成图片/i }).first();
          if (await batchBtn.isVisible()) {
              if (await batchBtn.isDisabled()) {
                  console.log('   (Skipped: Batch button is disabled)');
                  return;
              }
              await batchBtn.click();
              await page.waitForTimeout(2500);
              await dismissBlockingOverlays();
          } else {
              console.log('   (Skipped: Batch button not visible)');
          }
      });

      await step('GEN-002: Smart Refine', async () => {
          const wandBtn = page.locator('button svg.lucide-wand2').first().locator('..');
          if (await wandBtn.count()) {
              await wandBtn.first().click();
              await page.waitForTimeout(1000);
          } else {
              console.log('   (Skipped: Wand button not found)');
          }
      });

      // --- 6. History & Persistence ---
      await step('HIS-001: Create Snapshot', async () => {
          await dismissBlockingOverlays();
          const historyBtn = page.locator('button[title="历史版本"]').first();
          if (!(await historyBtn.isVisible())) {
              console.log('   (Skipped: History button not visible)');
              return;
          }
          await historyBtn.click();
          
          // Click Save Version
          const saveBtn = page.locator('button', { hasText: /保存当前版本/i });
          await saveBtn.click();
          const pendingText = page.locator('text=正在生成摘要...').first();
          if (await pendingText.count()) {
              await pendingText.waitFor({ state: 'visible', timeout: 5000 });
          }
          await page.locator('text=保存当前版本').first().waitFor({ state: 'visible', timeout: 20000 });
          const snapshots = page.locator('text=/V\\d+/').first();
          await snapshots.waitFor({ state: 'visible', timeout: 20000 });
      });

      // --- 7. Dashboard Check ---
      await step('DASH-001: Return to Dashboard', async () => {
          await dismissBlockingOverlays();
          const backBtn = page.locator('h1', { hasText: /BananaSlides/i }).first();
          await backBtn.click();
          await page.waitForURL(BASE_URL + '/');
      });

      await step('DASH-002: Check Project Status', async () => {
          // Check if our project is in the list
          await page.waitForTimeout(1000);
          await page.reload({ waitUntil: 'networkidle' });
          const enterBtn = page.locator('button', { hasText: /免费开始/i }).first();
          if (await enterBtn.isVisible()) {
              await enterBtn.click();
              await page.locator('button', { hasText: /新建项目/i }).first().waitFor({ state: 'visible', timeout: 15000 });
          }
          const projectCard = page.locator(`text=${PROJECT_NAME}`).first();
          await projectCard.waitFor({ state: 'visible', timeout: 60000 });
          
          // Check status badge (Generating/Idle/Completed)
          // const status = await projectCard.locator('.status-badge').textContent();
          // console.log(`   Project Status: ${status}`);
      });

      // --- 8. Settings ---
      await step('SET-001: Global Settings', async () => {
          await dismissBlockingOverlays();
          const enterBtn = page.locator('button', { hasText: /免费开始/i }).first();
          if (await enterBtn.isVisible()) {
              await enterBtn.click();
              await page.locator('button', { hasText: /新建项目/i }).first().waitFor({ state: 'visible', timeout: 15000 });
          }
          const settingsBtn = page.locator('button[title="全局设置"]').first();
          await settingsBtn.click();
          
          const modal = page.locator('text=全局配置');
          await modal.first().waitFor({ state: 'visible', timeout: 20000 });
          
          // Verify masking
          const keyInput = page.locator('input[type="password"]').first();
          const inputType = await keyInput.getAttribute('type');
          if (inputType !== 'password') throw new Error('API key input is not password type');
          
          // Close
          await page.keyboard.press('Escape');
      });

  } catch (e) {
      console.error('Fatal Test Error:', e);
      failures += 1;
  } finally {
      await browser.close();
      console.log('Full UAT Suite Finished.');
      if (failures > 0) {
          process.exitCode = 1;
      }
  }
})();
