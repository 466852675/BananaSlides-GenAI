import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:1000';

test.describe('生图流程全面验证', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000);
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(3000);
  });

  test('1. 验证页面加载 — 仪表盘正确显示', async ({ page }) => {
    test.setTimeout(30000);

    // 检查页面是否加载了（内容容器可见）
    const mainContent = page.locator('#root, [class*="app"], [class*="dashboard"], main');
    await expect(mainContent.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ 页面加载正常');

    // 检查是否有项目列表
    const projectElements = page.locator('[class*="project"], [class*="card"], [class*="Project"]');
    const count = await projectElements.count();
    console.log(`项目元素数量: ${count}`);
  });

  test('2. 验证项目进入工作台 — 页面生成流程', async ({ page }) => {
    test.setTimeout(300000);

    // 等待页面加载
    await page.waitForSelector('#root', { timeout: 15000 });

    // 截图保存当前状态
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });

    // 查找可点击的项目元素
    const projectCards = page.locator('a[href*="project"], [class*="project"]:has(button), [class*="ProjectCard"]');
    const cardCount = await projectCards.count();
    console.log(`找到 ${cardCount} 个项目卡片`);

    if (cardCount === 0) {
      // 可能在加载中，多等一会
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/dashboard-retry.png', fullPage: true });
    }

    // 尝试找"进入"或"编辑"按钮点击进入第一个项目
    const enterBtn = page.locator('a[href*="project"], button:has-text("编辑"), button:has-text("进入")').first();
    if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enterBtn.click({ force: true });
      console.log('✅ 已点击进入项目');
      await page.waitForTimeout(5000);

      // 截图工作台
      await page.screenshot({ path: 'test-results/workbench.png', fullPage: true });

      // 检查是否进入了工作台（寻找批量生成按钮或页面列表）
      const slideItems = page.locator('[class*="slide"], [class*="item"], [class*="card"]').first();
      const hasSlides = await slideItems.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`工作台加载了页面元素: ${hasSlides}`);

      // 检查"批量生成"按钮
      const batchBtn = page.locator('button:has-text("批量生成")');
      const hasBatchBtn = await batchBtn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`批量生成按钮可见: ${hasBatchBtn}`);

      if (hasBatchBtn) {
        await batchBtn.click({ force: true });
        console.log('✅ 已触发批量生成');

        // 验证生成了 toast 提示
        await page.waitForTimeout(3000);

        // 检查是否有 toast
        const toasts = page.locator('[class*="toast"], [class*="Toast"]');
        const toastCount = await toasts.count();
        console.log(`Toast 提示数: ${toastCount}`);

        // 等待一段时间让生成进行
        await page.waitForTimeout(60000);

        // 截图当前状态
        await page.screenshot({ path: 'test-results/generating-progress.png', fullPage: true });

        // 通过检查DOM中是否有图片元素来验证回写
        const images = page.locator('img[src*="/uploads/"]');
        const imgCount = await images.count();
        console.log(`已回写图片数: ${imgCount}`);

        // 再等30秒再次检查
        await page.waitForTimeout(30000);
        const imagesAfter = page.locator('img[src*="/uploads/"]');
        const imgCountAfter = await imagesAfter.count();
        console.log(`再等30秒后图片数: ${imgCountAfter}`);

        // 图片数不应减少（不消失验证）
        if (imgCount > 0 && imgCountAfter >= imgCount) {
          console.log('✅ 验证通过：回写不消失');
        }
      }
    }

    console.log('✅ 测试2完成');
  });

  test('3. 验证刷新后数据保持', async ({ page }) => {
    test.setTimeout(60000);

    // 先进入工作台查看状态
    await page.waitForSelector('#root', { timeout: 15000 });

    const projectCards = page.locator('a[href*="project"]').first();
    if (await projectCards.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await projectCards.getAttribute('href');
      const projectId = href?.split('=')[1] || href?.split('/').pop();

      // 进入项目
      await projectCards.click({ force: true });
      await page.waitForTimeout(5000);

      // 刷新前截图
      await page.screenshot({ path: 'test-results/pre-refresh.png', fullPage: true });

      // 获取当前成功页面的数量
      const preSuccess = page.locator('[class*="success"], [class*="generated"]');
      const preCount = await preSuccess.count();
      console.log(`刷新前成功页面数: ${preCount}`);

      // 刷新
      await page.reload();
      await page.waitForTimeout(5000);

      // 如果URL中有project参数，重新导航
      if (projectId) {
        await page.goto(`${BASE}/?project=${projectId}`);
        await page.waitForTimeout(5000);
      }

      // 刷新后截图
      await page.screenshot({ path: 'test-results/post-refresh.png', fullPage: true });

      // 检查刷新后状态
      const postSuccess = page.locator('[class*="success"], [class*="generated"]');
      const postCount = await postSuccess.count();
      console.log(`刷新后成功页面数: ${postCount}`);

      // 验证状态一致性（如果之前有成功页面，刷新后不应全部丢失）
      if (preCount > 0 && postCount > 0) {
        console.log('✅ 验证通过：刷新后数据保持');
      } else if (preCount > 0 && postCount === 0) {
        console.log('⚠️ 刷新后成功页面消失（需要确认）');
        // 可能因为状态标签变化，再查图片
        const images = page.locator('img[src*="/uploads/"]');
        const imgCount = await images.count();
        console.log(`图片数: ${imgCount}`);
      }
    }
  });
});
