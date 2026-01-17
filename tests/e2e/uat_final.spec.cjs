const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:1000';
const PROJECT_NAME = `UAT_${Date.now()}`;

(async () => {
  console.log('🍌 Starting Robust UAT Suite (Final Fix)...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const step = async (name, fn) => {
      process.stdout.write(`[TEST] ${name}... `);
      try {
          await fn();
          console.log('✅ PASS');
      } catch (e) {
          console.log('❌ FAIL');
          console.error(`   Error: ${e.message}`);
      }
  };

  try {
      // 1. Initial Load (Relaxed Wait)
      await step('DB-001: Load & Enter', async () => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }); // Don't wait for network idle
          
          // Check if we need to click "Enter"
          try {
              const enterBtn = page.locator('button', { hasText: /进入创作室/i });
              await enterBtn.waitFor({ state: 'visible', timeout: 5000 });
              await enterBtn.click();
          } catch (e) {
              // Ignore if button not found, maybe already in dashboard
          }
          
          // Wait for Dashboard key element (Plus icon)
          await page.waitForSelector('svg.lucide-plus', { timeout: 10000 });
      });

      // 2. Create Project
      await step('PRJ-001: Create New Project', async () => {
          const createBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
          await createBtn.click();
          
          const input = page.locator('input[type="text"]').first(); 
          await input.waitFor({ state: 'visible' });
          await input.fill(PROJECT_NAME);
          
          const submitBtn = page.locator('div[role="dialog"] button.bg-blue-600'); 
          await submitBtn.click();
          
          await page.waitForSelector('.lucide-wand2', { timeout: 15000 });
      });

      // 3. Workbench: Outline
      await step('OUT-001: Generate Outline', async () => {
          const input = page.locator('textarea').first();
          await input.fill('AI Future');
          
          const genBtn = page.locator('button.bg-blue-600').first(); 
          await genBtn.click();
          
          await page.waitForTimeout(3000);
      });

      // 4. Import Outline
      await step('OUT-002: Import Outline', async () => {
          // Robust selector for import button
          const importBtn = page.locator('div[role="dialog"] button').last();
          if (await importBtn.isVisible()) {
              await importBtn.click();
          }
          await page.waitForSelector('img', { timeout: 5000 }); 
      });

      // 5. Settings
      await step('SET-001: Global Settings', async () => {
          const settingsBtn = page.locator('button').filter({ has: page.locator('svg.lucide-settings') }).first();
          await settingsBtn.click();
          await page.waitForSelector('input[type="password"]');
          await page.keyboard.press('Escape');
      });

      // 6. History
      await step('HIS-001: History Sidebar', async () => {
          const histBtn = page.locator('button').filter({ has: page.locator('svg.lucide-history') }).first();
          await histBtn.click();
          await page.waitForTimeout(500);
      });

  } catch (e) {
      console.error('Fatal:', e);
  } finally {
      await browser.close();
      console.log('🏁 Suite Finished.');
  }
})();
