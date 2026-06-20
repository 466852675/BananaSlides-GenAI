import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, '..', 'test-results');
const BASE = 'http://localhost:1000';

async function run() {
  console.log('=== 真实生成验证（gpt-image-2，无 MOCK）===\n');
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 登录
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
  if (!token) { console.log('登录失败'); await browser.close(); return; }
  console.log('[1] 登录: ✅');

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(function(t) { localStorage.setItem('bananaslides_token', t); }, token);

  // 找测试项目
  const projects = await page.evaluate(async function(tok) {
    var r = await fetch('/api/projects', { headers: { Authorization: 'Bearer ' + tok } });
    return await r.json();
  }, token);
  const target = projects.find(function(p) { return p.items && p.items.length >= 10; }) || projects[0];
  console.log('[2] 项目:', target.title);

  // 重置第1页为 idle（只重置1页做最小验证）
  console.log('[3] 重置第1页为 idle...');
  const resetOk = await page.evaluate(async function(arg) {
    var r = await fetch('/api/projects/' + arg.pid, { headers: { Authorization: 'Bearer ' + arg.tok } });
    var d = await r.json();
    var items = d.items || [];
    // 只把第1页(index 0)重置为 idle
    var reset = items.map(function(it, idx) {
      if (idx === 0) return Object.assign({}, it, { status: 'idle', variants: [] });
      return it;
    });
    var pr = await fetch('/api/projects/' + arg.pid + '/slides', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + arg.tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: reset })
    });
    return pr.ok;
  }, { pid: target.id, tok: token });
  console.log('  重置:', resetOk ? '✅' : '❌');

  // 进入工作台
  await page.goto(BASE + '/?project=' + target.id, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(resultsDir, 'real-01-workbench.png'), fullPage: true });

  // 捕获 generate-slide-variant 响应
  let apiStatus = null;
  let apiResponsePreview = '';
  page.on('response', async resp => {
    if (resp.url().includes('/api/ai/generate-slide-variant')) {
      apiStatus = resp.status();
      console.log('  [网络] generate-slide-variant 响应:', apiStatus);
    }
  });

  // 点击批量生成（会处理那1个 idle 页）
  console.log('[4] 点击批量生成（触发真实 gpt-image-2）...');
  const batchBtn = page.locator('button').filter({ hasText: /批量生成图片/ });
  const hasBatch = await batchBtn.isVisible({ timeout: 5000 }).catch(function() { return false; });
  console.log('  批量生成按钮:', hasBatch);

  if (hasBatch) {
    await batchBtn.click({ force: true });
    console.log('  已点击，等待真实生成（gpt-image-2 约 30-90 秒）...');

    // 等待生成（最多3分钟）
    for (var i = 1; i <= 6; i++) {
      await page.waitForTimeout(30000);
      const cur = await page.evaluate(async function(arg) {
        var r = await fetch('/api/projects/' + arg.pid, { headers: { Authorization: 'Bearer ' + arg.tok } });
        var d = await r.json();
        var items = d.items || [];
        var first = items[0] || {};
        return {
          firstStatus: first.status,
          firstVariant: (first.variants && first.variants[0]) ? first.variants[0].substring(0, 50) : '(无)',
          isMock: (first.variants && first.variants[0] && first.variants[0].startsWith('data:image/png;base64,iVBORw0KGgoAAA')) ? true : false
        };
      }, { pid: target.id, tok: token });
      console.log('  第' + (i * 0.5) + '分钟: status=' + cur.firstStatus + ' variant=' + cur.firstVariant + (cur.isMock ? ' ⚠️ MOCK像素' : ' ✅ 真实图片'));

      if (cur.firstStatus === 'success' && !cur.isMock && cur.firstVariant !== '(无)') {
        console.log('\n✅✅ 真实生成成功！gpt-image-2 正常工作，返回真实图片');
        await page.screenshot({ path: path.join(resultsDir, 'real-02-success.png'), fullPage: true });
        break;
      }
      if (cur.firstStatus === 'error') {
        console.log('\n❌ 生成失败（status=error），检查后端日志');
        break;
      }
    }
  }

  console.log('\n=== 完成 ===');
  await browser.close();
}

run().catch(function(e) {
  console.error('错误:', e.message);
  process.exit(1);
});
