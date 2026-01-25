import { test, expect } from '@playwright/test';
import path from 'path';

// 1. Mandatory Base URL as per Test Plan v3.3 (Section 1.2)
const BASE_URL = 'http://localhost:1000';

test.describe('Admin Panel Flow (Strict Plan Compliance)', () => {

    // Screenshot helper
    async function takeScreenshot(page: any, name: string) {
        const screenshotPath = path.join(process.cwd(), 'artifacts', `${name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[Evidence] Screenshot saved: ${name}`);
    }

    test.beforeEach(async ({ page }) => {
        console.log('[Step 1] Navigating to Home...');
        // Enforce 1000 port
        await page.goto(`${BASE_URL}/`);
        await takeScreenshot(page, 'debug_home_loaded');

        // Login Flow (Section 1.2 - Full Simulation)
        console.log('[Step 2] Looking for Login Button...');
        // Try to find the specific header login button. Usually it's in the top nav.
        const loginButtons = page.getByRole('button', { name: '登录' });
        const count = await loginButtons.count();
        console.log(`[Info] Found ${count} login buttons.`);

        if (count > 0) {
            // Pick the first visible one
            const loginButton = loginButtons.first();

            console.log('[Step 3] Clicking Login Button (Force)...');
            await loginButton.click({ force: true });

            // Explicitly wait for modal content "欢迎回来"
            console.log('[Step 4] Waiting for Modal ("欢迎回来")...');
            try {
                // Short timeout to check if modal opened
                await expect(page.getByText('欢迎回来')).toBeVisible({ timeout: 5000 });
            } catch (e) {
                console.log('[Warn] "欢迎回来" header not found, checking inputs directly...');
            }

            const emailInput = page.getByPlaceholder('邮箱 / 手机号 / 用户名');
            await expect(emailInput).toBeVisible({ timeout: 5000 });
            await takeScreenshot(page, 'debug_modal_opened');

            // Explicitly use 'admin@bananaslides.com' (Section 1.1)
            console.log('[Step 5] Filling Email...');
            await emailInput.fill('admin@bananaslides.com');
            await emailInput.blur();

            console.log('[Step 6] Filling Password...');
            const pwdInput = page.getByPlaceholder('密码', { exact: true });
            await pwdInput.fill('Test123456!');
            await pwdInput.blur();

            // 关键修复: 增加等待时间，确保 React 状态同步
            await page.waitForTimeout(1000);

            // Capture Login Form State
            console.log('[Step 7] Capturing Filled State...');
            await takeScreenshot(page, 'admin_login_filled');

            // Verify inputs
            const emailVal = await emailInput.inputValue();
            const pwdVal = await pwdInput.inputValue();
            console.log(`[Info] Inputs: Email="${emailVal}", Pwd="${pwdVal}"`);

            console.log('[Step 8] Clicking Submit...');
            const submitBtn = page.locator('form button[type="submit"]');

            // Check enablement
            await expect(submitBtn).toBeEnabled({ timeout: 10000 });
            await submitBtn.click();

            // Wait for login success (UserWidget avatar)
            console.log('[Step 9] Waiting for Success...');
            await expect(page.locator('.w-8.h-8.rounded-full')).toBeVisible({ timeout: 15000 });
        } else {
            console.log('[Warn] Login button NOT found. Already logged in?');
            await takeScreenshot(page, 'debug_no_login_btn');
        }
    });

    test('ADM-01: Admin Dashboard Access & Stats', async ({ page }) => {
        await page.goto(`${BASE_URL}/admin`);

        // Validation
        await expect(page.getByText('控制台')).toBeVisible();
        await expect(page.getByText('系统总用户')).toBeVisible();

        // Evidence
        await takeScreenshot(page, 'evidence_admin_dashboard');
    });

    test('ADM-USR-01: Admin Permission Boundary (Cannot Delete)', async ({ page }) => {
        await page.goto(`${BASE_URL}/admin/users`);

        // Search for test user
        const searchInput = page.getByPlaceholder('搜索用户...');
        if (await searchInput.isVisible()) {
            await searchInput.fill('testuser');
        }

        // Verify "Delete" button is NOT visible for ordinary admin (mocking ADM-USR-01)
        const deleteBtn = page.getByRole('button', { name: '删除' });
        await expect(deleteBtn).toBeHidden();

        await takeScreenshot(page, 'evidence_admin_permission_boundary');
    });

    test('ADM-Rules: Manage Points Rules', async ({ page }) => {
        await page.goto(`${BASE_URL}/admin/points-rules`);

        // Evidence of Rules Table
        await expect(page.getByText('规则代码')).toBeVisible();
        await takeScreenshot(page, 'evidence_admin_rules_list');
    });
});
