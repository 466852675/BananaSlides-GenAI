const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:1000';
const PROJECT_NAME = `UAT_${Date.now()}`;

(async () => {
  console.log('🍌 Starting Robust UAT Suite (Landing Page Aware)...');
  
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
      // 1. Initial Load & Landing Page Bypass
      await step('DB-001: Load & Enter', async () => {
          await page.goto(BASE_URL);
          await page.waitForLoadState('networkidle');
          
          const title = await page.title();
          console.log(`   (Page Title: "${title}")`);

          // Check if we are on Landing Page
          const enterBtn = page.locator('button', { hasText: /进入创作室/i });
          if (await enterBtn.count() > 0) {
              console.log('   (Landing Page detected, entering Dashboard...)');
              await enterBtn.click();
              // Wait for Dashboard
              await page.waitForSelector('.lucide-plus', { timeout: 10000 });
          } else {
              console.log('   (Already on Dashboard)');
          }
      });

      // 2. Create Project (Using Icon Selector)
      await step('PRJ-001: Create New Project', async () => {
          // Look for the "Create Project" button (Plus icon)
          // Adjust selector to be more specific if multiple plus icons exist
          // Dashboard usually has a big "Create" button or card
          const createBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
          await createBtn.click();
          
          // Wait for modal input
          const input = page.locator('input[type="text"]').first(); 
          await input.waitFor({ state: 'visible' });
          await input.fill(PROJECT_NAME);
          
          // Submit
          const submitBtn = page.locator('div[role="dialog"] button.bg-blue-600'); 
          await submitBtn.click();
          
          // Wait for Workbench (Toolbar should appear)
          await page.waitForSelector('.lucide-wand2', { timeout: 10000 });
      });

      // 3. Workbench: Outline (Using Placeholder)
      await step('OUT-001: Generate Outline', async () => {
          const input = page.locator('textarea').first();
          await input.fill('AI Future');
          
          // Click Generate
          const genBtn = page.locator('button.bg-blue-600').first(); 
          await genBtn.click();
          
          // Wait for outline modal
          await page.waitForTimeout(3000);
      });

      // 4. Import Outline
      await step('OUT-002: Import Outline', async () => {
          // Click import button in modal (usually right-most button)
          const importBtn = page.locator('div[role="dialog"] button').last();
          if (await importBtn.isVisible()) {
              await importBtn.click();
          }
          // Wait for cards
          await page.waitForSelector('img', { timeout: 5000 }); 
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
      console.log('🏁 Suite Finished.');
  }
})();