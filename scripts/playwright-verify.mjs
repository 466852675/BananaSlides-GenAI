import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, '..', 'test-results');
const BASE = 'http://localhost:1000';

async function run() {
  console.log('=== 图像生成全流程验证（重置+MOCK 模式）===\n');

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let successCount = 0, failCount = 0;
  page.on('response', resp => {
    if (resp.url().includes('/api/ai/generate-slide-variant')) {
      if (resp.status() === 200) successCount++;
      else failCount++;
    }
  });

  // 登录
  console.log('[1] 登录...');
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const token = await page.evaluate(async () => {
    const r = await fetch(window.location.origin + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'admin', password: 'admin12345678' })
    });
    const d = await r.json();
    return d && d.data && d.data.token ? d.data.token : '';
  });
  if (!token) { console.log('  登录失败'); await browser.close(); return; }
  console.log('  token: ✅');

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(function(t) { localStorage.setItem('bananaslides_token', t); }, token);

  // 找一个项目
  const projects = await page.evaluate(async function(tok) {
    var r = await fetch('/api/projects', { headers: { Authorization: 'Bearer ' + tok } });
    return await r.json();
  }, token);
  const target = projects.find(function(p) { return p.items && p.items.length >= 10; }) || projects[0];
  if (!target) { console.log('无项目'); await browser.close(); return; }
  console.log('  项目:', target.title, '(' + (target.items || []).length + '页)');

  // 封装：查状态
  async function getStatus(pid) {
    return await page.evaluate(async function(arg) {
      var r = await fetch('/api/projects/' + arg.pid, { headers: { Authorization: 'Bearer ' + arg.tok } });
      var d = await r.json();
      var items = d.items || [];
      return {
        total: items.length,
        success: items.filter(function(i) { return i.status === 'success'; }).length,
        idle: items.filter(function(i) { return i.status === 'idle'; }).length,
        error: items.filter(function(i) { return i.status === 'error'; }).length,
        generating: items.filter(function(i) { return i.status === 'generating'; }).length,
        swv: items.filter(function(i) { return i.status === 'success' && Array.isArray(i.variants) && i.variants.length > 0; }).length
      };
    }, { pid: pid, tok: token });
  }

  // ============================================================
  // 重置项目：所有页面 status='idle', variants=[]
  // ============================================================
  console.log('\n[2] 重置项目（所有页面 → idle）...');
  const resetResult = await page.evaluate(async function(arg) {
    var r = await fetch('/api/projects/' + arg.pid, { headers: { Authorization: 'Bearer ' + arg.tok } });
    var d = await r.json();
    var items = d.items || [];
    var reset = items.map(function(it) {
      return Object.assign({}, it, { status: 'idle', variants: [] });
    });
    var pr = await fetch('/api/projects/' + arg.pid + '/slides', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + arg.tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: reset })
    });
    return pr.ok;
  }, { pid: target.id, tok: token });
  console.log('  重置:', resetResult ? '✅' : '❌');

  // 进入工作台（从 DB 重新加载，全 idle）
  console.log('\n[3] 进入工作台（前端从 DB 加载）...');
  await page.goto(BASE + '/?project=' + target.id, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(resultsDir, 'final-01-workbench.png'), fullPage: true });

  const beforeStatus = await getStatus(target.id);
  console.log('  重置后 DB 状态:', JSON.stringify(beforeStatus));

  // ============================================================
  // 核心验证：批量生成 → DB 回写（竞态 bug 修复）
  // ============================================================
  console.log('\n[4] === 核心验证：批量生成 DB 回写 ===');
  successCount = 0; failCount = 0;

  const batchBtn = page.locator('button').filter({ hasText: /批量生成图片/ });
  const hasBatch = await batchBtn.isVisible({ timeout: 5000 }).catch(function() { return false; });
  console.log('  批量生成按钮:', hasBatch);

  if (hasBatch) {
    await batchBtn.click({ force: true });
    console.log('  已点击批量生成');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(resultsDir, 'final-02-batch-clicked.png'), fullPage: true });

    // 监控
    let prevSwv = beforeStatus.swv;
    for (var i = 1; i <= 6; i++) {
      await page.waitForTimeout(15000);
      const cur = await getStatus(target.id);
      const delta = cur.swv - prevSwv;
      console.log('  第' + (i * 15) + '秒: DB=' + JSON.stringify(cur) + ' 网络成功=' + successCount + (delta > 0 ? ' (+' + delta + ' 回写)' : ''));
      prevSwv = cur.swv;
      if (i % 2 === 0) await page.screenshot({ path: path.join(resultsDir, 'final-03-batch-' + i + '.png'), fullPage: true });

      // 如果全部完成（generating=0 且有变化），提前结束
      if (cur.generating === 0 && i >= 2) {
        break;
      }
    }

    const afterBatch = await getStatus(target.id);
    console.log('\n  批量生成结果:');
    console.log('    生成前 success+variants:', beforeStatus.swv);
    console.log('    生成后 success+variants:', afterBatch.swv);
    console.log('    网络成功:', successCount, '失败:', failCount);

    if (afterBatch.swv > beforeStatus.swv && successCount > 0) {
      console.log('  ✅✅ 核心 bug 已修复：批量生成正确回写 DB（+' + (afterBatch.swv - beforeStatus.swv) + ' 页）');
    } else if (successCount === 0) {
      console.log('  ⚠️ 无生成请求发出（可能前端 items 状态与 DB 不一致）');
    } else {
      console.log('  ❌ 批量生成回写异常');
    }
  }

  // ============================================================
  // 验证刷新后数据保持
  // ============================================================
  console.log('\n[5] === 验证刷新后数据保持 ===');
  const beforeReload = await getStatus(target.id);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.goto(BASE + '/?project=' + target.id, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const afterReload = await getStatus(target.id);
  console.log('  刷新前:', JSON.stringify(beforeReload));
  console.log('  刷新后:', JSON.stringify(afterReload));
  if (afterReload.swv === beforeReload.swv) {
    console.log('  ✅ 刷新后数据保持');
  } else {
    console.log('  ❌ 刷新后数据丢失: ' + beforeReload.swv + ' → ' + afterReload.swv);
  }
  await page.screenshot({ path: path.join(resultsDir, 'final-04-after-reload.png'), fullPage: true });

  // ============================================================
  // 验证不自动重新生成
  // ============================================================
  console.log('\n[6] === 验证不自动重新生成 ===');
  const g1 = await page.evaluate(async function(tok) {
    var r = await fetch('/api/projects', { headers: { Authorization: 'Bearer ' + tok } });
    var ps = await r.json();
    return ps.filter(function(p) { return p.status === 'generating'; }).length;
  }, token);
  await page.waitForTimeout(15000);
  const g2 = await page.evaluate(async function(tok) {
    var r = await fetch('/api/projects', { headers: { Authorization: 'Bearer ' + tok } });
    var ps = await r.json();
    return ps.filter(function(p) { return p.status === 'generating'; }).length;
  }, token);
  console.log('  generating 项目: ' + g1 + ' → ' + g2 + '(15秒)');
  console.log('  ' + (g2 <= g1 ? '✅ 不自动重新生成' : '❌ 自动重新生成'));

  // 汇总
  console.log('\n' + '='.repeat(55));
  console.log('验证完成');
  console.log('='.repeat(55));
  await browser.close();
}

run().catch(function(e) {
  console.error('错误:', e.message);
  console.error(e.stack);
  process.exit(1);
});
