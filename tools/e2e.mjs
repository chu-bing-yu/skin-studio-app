/**
 * 无头 Edge 冒烟（web/dist）：真实坐标点按 + 命中测试
 * 覆盖：抽屉=对话树 / 设置分组入口 / 右侧提示词抽屉 / 预览真实类名
 * 运行：cd web && node build.mjs，然后 node tools/e2e.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const DIST = resolve('web/dist');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const HTTP_PORT = 8100 + Math.floor(Math.random() * 300);
const CDP_PORT = 9400 + Math.floor(Math.random() * 300);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail === undefined ? '' : '  -> ' + detail));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent(String(req.url || '/').split('?')[0]);
      const file = resolve(DIST, '.' + (url === '/' ? '/index.html' : url));
      if (!file.startsWith(DIST)) { res.writeHead(403).end('forbidden'); return; }
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch (err) {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(HTTP_PORT, '127.0.0.1', () => ok(server)));
}

async function waitForCdp() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list')).json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (err) { /* 等待 */ }
    await sleep(200);
  }
  throw new Error('Edge 调试端口没有就绪');
}

function createClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  const ready = new Promise((ok, bad) => {
    ws.addEventListener('open', () => ok());
    ws.addEventListener('error', (e) => bad(e));
  });
  ws.addEventListener('message', (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch (err) { return; }
    if (!msg.id || !pending.has(msg.id)) return;
    const task = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? task.bad(new Error(msg.error.message)) : task.ok(msg.result);
  });
  function send(method, params) {
    const id = ++seq;
    return ready.then(() => new Promise((ok, bad) => {
      pending.set(id, { ok, bad });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    }));
  }
  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) {
      const e = res.exceptionDetails;
      throw new Error('页面脚本异常：' + ((e.exception && e.exception.description) || e.text));
    }
    return res.result ? res.result.value : undefined;
  }
  return { send, evaluate, close: () => ws.close() };
}

async function waitFor(client, expr, timeout) {
  const deadline = Date.now() + (timeout || 8000);
  while (Date.now() < deadline) {
    try {
      const v = await client.evaluate(expr);
      if (v) return v;
    } catch (err) { /* 加载中 */ }
    await sleep(150);
  }
  return null;
}

function centerExpr(selector) {
  return '(function(){var e=document.querySelector(' + JSON.stringify(selector) + ');' +
    'if(!e)return "";var r=e.getBoundingClientRect();' +
    'if(!r.width||!r.height)return "";' +
    'return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()';
}

async function tapAt(client, x, y) {
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function tap(client, selector) {
  const box = await client.evaluate(centerExpr(selector));
  if (!box) return false;
  const p = JSON.parse(box);
  await tapAt(client, p.x, p.y);
  return true;
}

async function tapByText(client, selector, text) {
  const box = await client.evaluate('(function(){var list=document.querySelectorAll(' + JSON.stringify(selector) + ');' +
    'for(var i=0;i<list.length;i++){if((list[i].textContent||"").trim()===' + JSON.stringify(text) + '){' +
    'var r=list[i].getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});}}' +
    'return "";})()');
  if (!box) return false;
  const p = JSON.parse(box);
  await tapAt(client, p.x, p.y);
  return true;
}

async function tapSettingsEntry(client, label) {
  const box = await client.evaluate('(function(){var list=document.querySelectorAll(".ss-entry");' +
    'for(var i=0;i<list.length;i++){var l=list[i].querySelector(".ss-entry__label");' +
    'if(l&&l.textContent===' + JSON.stringify(label) + '){var r=list[i].getBoundingClientRect();' +
    'return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});}}return "";})()');
  if (!box) return false;
  const p = JSON.parse(box);
  await tapAt(client, p.x, p.y);
  return true;
}

const server = await startServer();
const profile = mkdtempSync(join(tmpdir(), 'ss-app-e2e-'));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile,
  '--window-size=460,1000',
  'http://127.0.0.1:' + HTTP_PORT + '/index.html'
], { stdio: (process.env.E2E_DEBUG || process.argv.includes('--debug')) ? 'inherit' : 'ignore' });

let client = null;
let failed = 0;

try {
  client = createClient(await waitForCdp());
  await client.send('Runtime.enable');
  await client.evaluate('window.__errors=[];window.addEventListener("error",function(e){window.__errors.push(String(e.message))});window.addEventListener("unhandledrejection",function(e){window.__errors.push("rej:"+String(e.reason&&e.reason.message||e.reason))});true');

  const mounted = await waitFor(client, "!!document.querySelector('.ss-root')", 15000);
  check('应用挂载成功', mounted);
  if (!mounted) throw new Error('挂载失败');

  const crumb = await client.evaluate("(document.querySelector('.ss-crumb__main')||{}).textContent||''");
  check('默认进入「风格规划」', crumb === '风格规划', crumb);

  check('发送按钮可被点到', !!(await client.evaluate(centerExpr('.ss-send'))));
  check('输入框可被点到', !!(await client.evaluate(centerExpr('.ss-textarea'))));

  /* ---- 抽屉：对话树 ---- */
  await tap(client, '.ss-edge-btn');
  const drawerIn = await waitFor(client, "!!document.querySelector('.ss-side-drawer.ss-side-drawer--in')", 3000);
  check('左侧抽屉可打开', drawerIn);
  await sleep(280);

  const treeRows = await client.evaluate("document.querySelectorAll('.ss-side-drawer .ss-tree__row').length");
  check('抽屉里是对话树', treeRows >= 40, treeRows);

  const menuCards = await client.evaluate("document.querySelectorAll('.ss-menu-card').length");
  check('抽屉里不再有工具卡片', menuCards === 0, menuCards);

  const hasProj = await client.evaluate("!!document.querySelector('.ss-side-drawer .ss-proj-btn')");
  check('抽屉顶部有方案切换', hasProj);

  /* 点「线上」直接进对话 */
  const box1 = await client.evaluate('(function(){var rows=document.querySelectorAll(".ss-side-drawer .ss-tree__row");' +
    'for(var i=0;i<rows.length;i++){var l=rows[i].querySelector(".ss-tree__label");' +
    'if(l&&l.textContent==="线上"){var r=rows[i].getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});}}' +
    'return "";})()');
  if (box1) { const p = JSON.parse(box1); await tapAt(client, p.x, p.y); }
  const crumb2 = await waitFor(client, "(function(){var t=(document.querySelector('.ss-crumb__main')||{}).textContent||'';return t==='线上'?t:'';})()", 3000);
  check('点分支直接进对话', crumb2 === '线上', crumb2);
  const drawerClosed = await waitFor(client, "!document.querySelector('.ss-side-drawer.ss-side-drawer--in')", 2000);
  check('进对话后抽屉自动收起', drawerClosed);

  /* ---- 设置：分组入口 ---- */
  await sleep(260);
  await tap(client, '.ss-edge-btn');
  await sleep(280);
  await tapByText(client, '.ss-side-drawer__foot .ss-btn', '设置');
  const settingsReady = await waitFor(client, "!!document.querySelector('.ss-entry')", 4000);
  check('设置页打开', settingsReady);
  await sleep(280);
  const entries = await client.evaluate("document.querySelectorAll('.ss-entry').length");
  check('设置里有工具入口', entries >= 4, entries);

  /* 每次都要重新「抽屉 → 设置 → 点条目」，因为二级页是整屏替换 */
  /* 二级导航用 DOM click：这一层不是命中测试的目标（命中测试覆盖抽屉与提示词抽屉），
     用真实坐标点按在动画中容易偶发落空，反而掩盖真实问题 */
  async function openSettingsEntry(label) {
    await client.evaluate('(function(){var b=document.querySelector(".ss-edge-btn");if(b)b.click();return true;})()');
    await sleep(220);
    await client.evaluate('(function(){var l=document.querySelectorAll(".ss-side-drawer__foot .ss-btn");' +
      'for(var i=0;i<l.length;i++){if(l[i].textContent==="设置"){l[i].click();return true;}}return false;})()');
    await waitFor(client, "!!document.querySelector('.ss-entry')", 4000);
    await sleep(220);
    await client.evaluate('(function(){var list=document.querySelectorAll(".ss-entry");' +
      'for(var i=0;i<list.length;i++){var t=list[i].querySelector(".ss-entry__label");' +
      'if(t&&t.textContent===' + JSON.stringify(label) + '){list[i].click();return true;}}return false;})()');
    await sleep(320);
  }

  await openSettingsEntry('架构');
  const archReady = await waitFor(client, "!!document.querySelector('.ss-arch__row')", 4000);
  check('设置 → 架构可用', archReady);
  await sleep(260);
  const archRows = await client.evaluate("document.querySelectorAll('.ss-arch__row').length");
  check('架构树节点齐全', archRows >= 40, archRows);

  await openSettingsEntry('API 预设');
  const apiReady = await waitFor(client, "!!document.querySelector('.ss-channel')", 4000);
  check('设置 → API 预设可用', apiReady);
  await sleep(240);
  const chans = await client.evaluate("document.querySelectorAll('.ss-channel').length");
  check('内置渠道齐全', chans >= 4, chans);

  await openSettingsEntry('Token 账单');
  const billReady = await waitFor(client, "!!document.querySelector('.ss-sumcard')", 4000);
  check('设置 → Token 账单可用', billReady);
  await sleep(240);

  /* 回到对话 */
  await tap(client, '.ss-page .ss-icon-btn');
  await sleep(320);

  /* ---- 提示词：右侧窄抽屉 ---- */
  await tap(client, '.ss-top .ss-icon-btn:nth-of-type(2)');
  const promptIn = await waitFor(client, "!!document.querySelector('.ss-drawer-right.ss-drawer-right--in')", 4000);
  check('提示词从右侧滑出', promptIn);
  await sleep(300);

  const widthInfo = await client.evaluate('(function(){var d=document.querySelector(".ss-drawer-right");' +
    'if(!d)return "";var r=d.getBoundingClientRect();' +
    'return JSON.stringify({w:Math.round(r.width),vw:window.innerWidth});})()');
  let wi = {};
  try { wi = JSON.parse(String(widthInfo)); } catch (err) { wi = {}; }
  check('提示词抽屉不占满屏', Number(wi.w) > 200 && Number(wi.w) < Number(wi.vw) * 0.92, widthInfo);

  const segRows = await client.evaluate("document.querySelectorAll('.ss-drawer-right .ss-segrow').length");
  check('分段列表已渲染', segRows >= 8, segRows);

  const stat1 = await client.evaluate("(document.querySelector('.ss-drawer-right .ss-prompt__stat')||{}).textContent||''");
  await tap(client, '.ss-drawer-right .ss-segrow .ss-switch');
  await sleep(300);
  const stat2 = await client.evaluate("(document.querySelector('.ss-drawer-right .ss-prompt__stat')||{}).textContent||''");
  check('关一段后体积变化', stat1 !== stat2, stat1 + ' → ' + stat2);

  await tapAt(client, 20, 400);
  const promptClosed = await waitFor(client, "!document.querySelector('.ss-drawer-right.ss-drawer-right--in')", 3000);
  check('点遮罩可关提示词', promptClosed);
  await sleep(280);

  /* ---- 预览：真实类名 ---- */
  await tap(client, '.ss-composer .ss-icon-btn');
  const pvReady = await waitFor(client, "!!document.querySelector('.ss-pv__frame')", 9000);
  check('预览 iframe 渲染', pvReady);
  await sleep(600);

  /* 关键：srcdoc 里有 5.4MB CSS，绝不要把整串回传（跨 CDP 序列化会慢好几秒）。
     在页面里判断，只返回几个布尔值和小数字。 */
  const srcInfo = await client.evaluate('(function(){var f=document.querySelector(".ss-pv__frame");' +
    'if(!f)return "";var s=f.getAttribute("srcdoc")||"";' +
    'return JSON.stringify({len:s.length,' +
    'input:s.indexOf("chat-input-bar")>-1,' +
    'bubble:s.indexOf("bubble-sent")>-1,' +
    'header:s.indexOf("chat-header__inner")>-1});})()');
  let si = {};
  try { si = JSON.parse(String(srcInfo)); } catch (err) { si = {}; }
  check('预览用真实聊天类名', si.input === true && si.bubble === true && si.header === true, srcInfo);
  check('预览注入了全量真实样式', Number(si.len) > 3000000, Math.round(Number(si.len || 0) / 1024) + 'KB');

  const pvTabs = await client.evaluate("document.querySelectorAll('.ss-pv .ss-tab').length");
  check('预览四档', pvTabs === 4, pvTabs);

  const errs = await client.evaluate('window.__errors||[]');
  check('全程无 JS 报错', Array.isArray(errs) && errs.length === 0, (errs || []).join(' | '));
} catch (err) {
  check('冒烟测试未抛错', false, err && err.message);
} finally {
  if (client) client.close();
  edge.kill();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch (err) { /* 忽略 */ }
  failed = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - failed) + ' / ' + results.length + ' 通过');
  process.exit(failed ? 1 : 0);
}
