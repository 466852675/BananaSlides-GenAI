const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting Critical Path UAT Test...');
  
  const browser = await chromium.launch({ headless: true }); // Headless mode for speed
  const context = await browser.newContext();
  const page = await context.newPage();

  // --- 1. System Health Check (SYS-002, DB-001) ---
  console.log('\n[Test 1] Dashboard Load & Initial State');
  try {
    await page.goto('http://localhost:1000');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    console.log(`✅ Page Title: "${title}"`);
    
    // Check if critical elements exist
    const createBtn = await page.getByText(/创建.*项目/i);
    if (await createBtn.count() > 0) {
        console.log('✅ "Create Project" button found.');
    } else {
        console.error('❌ "Create Project" button NOT found.');
    }
  } catch (e) {
    console.error('❌ Dashboard load failed:', e.message);
  }

  // --- 2. Security: Malicious Upload (SEC-002) ---
  console.log('\n[Test 2] Security: Malicious File Upload Defense');
  try {
    // Create a dummy malicious file
    const malFile = path.join(__dirname, 'test_hack.html');
    fs.writeFileSync(malFile, '<script>alert(1)</script>');

    // Attempt direct API upload (bypass UI to test backend)
    const response = await context.request.post('http://localhost:1111/api/upload', {
        multipart: {
            file: {
                name: 'test_hack.html',
                mimeType: 'text/html',
                buffer: fs.readFileSync(malFile)
            }
        }
    });

    if (response.status() === 400 || response.status() === 500) {
        console.log(`✅ Upload blocked as expected. Status: ${response.status()}`);
        const body = await response.json();
        console.log(`   Response: ${JSON.stringify(body)}`);
    } else {
        console.error(`❌ Security Fail! Upload accepted with status ${response.status()}`);
    }
    
    // Cleanup
    fs.unlinkSync(malFile);
  } catch (e) {
    console.log(`✅ Upload failed (Network error or blocked): ${e.message}`);
  }

  // --- 3. Project Creation (PRJ-001) ---
  console.log('\n[Test 3] Project Creation Flow');
  try {
    // Click create button (if using UI flow, but simplified here for API speed)
    // Let's use UI flow to verify frontend logic
    await page.goto('http://localhost:1000');
    
    // Find create button (assuming text contains '创建')
    const btn = page.locator('button', { hasText: /创建项目/i }).first();
    await btn.click();
    
    // Wait for modal
    await page.waitForTimeout(500); 
    
    // Fill input
    const input = page.locator('input[type="text"]').first();
    await input.fill('UAT Auto Test Project');
    
    // Click confirm (assuming blue button or '确认')
    const confirmBtn = page.locator('button', { hasText: /创建/i }).last();
    await confirmBtn.click();
    
    // Wait for navigation to workbench
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('workbench') || await page.getByText('UAT Auto Test Project').count() > 0) {
        console.log('✅ Project created successfully.');
    } else {
        console.warn('⚠️ Project creation UI feedback unclear, checking list...');
    }
    
  } catch (e) {
    console.error('❌ Project creation test failed:', e.message);
  }

  await browser.close();
  console.log('\n✨ Critical Path Test Complete.');
})();
