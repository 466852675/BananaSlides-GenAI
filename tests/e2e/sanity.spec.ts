import { test, expect } from '@playwright/test';
import path from 'path';

test('Sanity Check: Screenshot', async ({ page }) => {
    await page.goto('http://localhost:1000/');
    const screenshotPath = path.join(process.cwd(), 'artifacts', 'sanity_check.png');
    console.log(`Saving to: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    // Also check login button visibility
    const loginButton = page.getByRole('button', { name: '登录' }).first();
    await expect(loginButton).toBeVisible();
});
