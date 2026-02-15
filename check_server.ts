
import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        console.log('Navigating to http://localhost:1000...');
        await page.goto('http://localhost:1000', { timeout: 10000 });
        const title = await page.title();
        console.log(`Page title: ${title}`);

        const content = await page.content();
        if (content.includes('YH-AI PPT')) {
            console.log('Page content contains "YH-AI PPT"');
        } else {
            console.log('Page content DOES NOT contain "YH-AI PPT"');
        }

        const loginBtn = await page.getByRole('button', { name: '登录' }).count();
        console.log(`Found ${loginBtn} login buttons`);

    } catch (error: any) {
        console.error('Error connecting to localhost:1000:', error.message);
    } finally {
        await browser.close();
    }
})();
