/**
 * 无头 Edge 冒烟测试（web/dist）：真实坐标点按 + 命中测试
 * 运行：node tools/e2e.mjs（先 cd web && node build.mjs）
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve('.');
const DIST = resolve('web/dist');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const HTTP_PORT = 8100 + Math.floor(Math.random() * 300);
const CDP_PORT = 9400 + Math.floor(Math.random() * 300);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

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
      const res = await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list');
      const list = await res.json();
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
    if (msg.error) task.bad(new Error(msg.error.message));
    else task.ok(msg.result);
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

async function hitOk(client, selector) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const box = await client.evaluate(centerExpr(selector));
    if (box) {
      const p = JSON.parse(box);
      const ok = await client.evaluate('(function(){var e=document.querySelector(' + JSON.stringify(selector) + ');' +
        'var t=document.elementFromPoint(' + p.x + ',' + p.y + ');' +
        'return !!(t&&(t===e||e.contains(t)));})()');
      if (ok) return true;
    }
    await sleep(120);
  }
  return false;
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

const server = await startServer();
const profile = mkdtempSync(join(tmpdir(), 'skin-studio-app-e2e-'));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + CDP_PORT,
  '--user-data-dir=' + profile,
  '--window-size=460,1000',
  'http://127.0.0.1:' + HTTP_PORT + '/index.html'
], { stdio: process.env.E2E_DEBUG ? 'inherit' : 'ignore' });

let client = null;
let failed = 0;

try {
  const wsUrl = await waitForCdp();
  client = createClient(wsUrl);
  await client.send('Runtime.enable');
  await client.evaluate('window.__errors=[];window.addEventListener("error",function(e){window.__errors.push(String(e.message))});window.addEventListener("unhandledrejection",function(e){window.__errors.push("rej:"+String(e.reason&&e.reason.message||e.reason))});true');

  const mounted = await waitFor(client, "!!document.querySelector('.ss-root')", 15000);
  check('应用挂载成功', mounted);
  if (!mounted) {
    const diag = await client.evaluate('(function(){' +
      'var boot=document.getElementById("boot");' +
      'return JSON.stringify({boot: boot?boot.textContent:"-", errs: window.__errors||[],' +
      'appHtml:(document.getElementById("app")||{}).innerHTML ? String((document.getElementById("app")||{}).innerHTML).slice(0,200) : ""});})()');
    check('挂载诊断', false, diag);
    throw new Error('挂载失败');
  }

  const crumb = await client.evaluate("(document.querySelector('.ss-crumb__main')||{}).textContent||''");
  check('默认进入「风格规划」', crumb === '风格规划', crumb);

  check('发送按钮可被点到', await hitOk(client, '.ss-send'));
  check('输入框可被点到', await hitOk(client, '.ss-textarea'));

  /* 抽屉 */
  await tap(client, '.ss-edge-btn');
  const drawerIn = await waitFor(client, "!!document.querySelector('.ss-side-drawer.ss-side-drawer--in')", 3000);
  check('左滑抽屉可打开', drawerIn);
  await sleep(240);
  const cards = await client.evaluate("document.querySelectorAll('.ss-menu-card').length");
  check('抽屉有五张卡片', cards === 5, cards);
  const cardText = await client.evaluate("Array.prototype.map.call(document.querySelectorAll('.ss-menu-card__title'),function(e){return e.textContent}).join('|')");
  check('卡片内容正确', /架构/.test(cardText) && /API 预设/.test(cardText) && /Token 账单/.test(cardText) && /提示词/.test(cardText) && /设置/.test(cardText), cardText);

  /* 提示词页（第 4 张卡） */
  const box1 = await client.evaluate('(function(){var t=document.querySelectorAll(".ss-menu-card");if(!t[3])return "";' +
    'var r=t[3].getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()');
  if (box1) { const p = JSON.parse(box1); await tapAt(client, p.x, p.y); }
  const promptPage = await waitFor(client, "!!document.querySelector('.ss-segrow')", 4000);
  check('提示词页打开', promptPage);
  await sleep(320);
  const segRows = await client.evaluate("document.querySelectorAll('.ss-segrow').length");
  check('段列表按五层列出', segRows >= 8, segRows);
  const stat1 = await client.evaluate("(document.querySelector('.ss-prompt__stat')||{}).textContent||''");
  await tap(client, '.ss-segrow .ss-switch');
  await sleep(260);
  const stat2 = await client.evaluate("(document.querySelector('.ss-prompt__stat')||{}).textContent||''");
  check('关闭一段后体积变化', stat1 !== stat2, stat1 + ' → ' + stat2);

  await tap(client, '.ss-page .ss-icon-btn');
  await sleep(300);

  /* 架构页 */
  await tap(client, '.ss-edge-btn');
  await sleep(260);
  const box2 = await client.evaluate('(function(){var t=document.querySelectorAll(".ss-menu-card");if(!t[0])return "";' +
    'var r=t[0].getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()');
  if (box2) { const p = JSON.parse(box2); await tapAt(client, p.x, p.y); }
  const archPage = await waitFor(client, "!!document.querySelector('.ss-arch__row')", 4000);
  check('架构页打开', archPage);
  await sleep(320);
  const archRows = await client.evaluate("document.querySelectorAll('.ss-arch__row').length");
  check('架构树节点数正确', archRows >= 40, archRows);

  /* 点「线上」进对话 */
  const box3 = await client.evaluate('(function(){var rows=document.querySelectorAll(".ss-arch__row");' +
    'for(var i=0;i<rows.length;i++){var l=rows[i].querySelector(".ss-tree__label");' +
    'if(l&&l.textContent==="线上"){var r=rows[i].getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});}}' +
    'return "";})()');
  if (box3) { const p = JSON.parse(box3); await tapAt(client, p.x, p.y); }
  const crumb2 = await waitFor(client, "(function(){var t=(document.querySelector('.ss-crumb__main')||{}).textContent||'';return t==='线上'?t:'';})()", 3000);
  check('点架构行切换到对应对话', crumb2 === '线上', crumb2);

  /* API 页 */
  await tap(client, '.ss-edge-btn');
  await sleep(240);
  await client.evaluate('(function(){var t=document.querySelectorAll(".ss-menu-card");if(t[1]){var r=t[1].getBoundingClientRect();return true;}return false;})()');
  const box4 = await client.evaluate('(function(){var t=document.querySelectorAll(".ss-menu-card");if(!t[1])return "";' +
    'var r=t[1].getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()');
  if (box4) { const p = JSON.parse(box4); await tapAt(client, p.x, p.y); }
  const apiPage = await waitFor(client, "!!document.querySelector('.ss-channel')", 4000);
  check('API 页打开', apiPage);
  await sleep(280);
  const chans = await client.evaluate("document.querySelectorAll('.ss-channel').length");
  check('内置渠道齐全', chans >= 4, chans);

  await tap(client, '.ss-page .ss-icon-btn');
  await sleep(260);

  /* 账单页 */
  await tap(client, '.ss-edge-btn');
  await sleep(240);
  const box5 = await client.evaluate('(function(){var t=document.querySelectorAll(".ss-menu-card");if(!t[2])return "";' +
    'var r=t[2].getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()');
  if (box5) { const p = JSON.parse(box5); await tapAt(client, p.x, p.y); }
  const billPage = await waitFor(client, "!!document.querySelector('.ss-sumcard')", 4000);
  check('账单页打开', billPage);
  await sleep(280);
  const sums = await client.evaluate("document.querySelectorAll('.ss-sumcard').length");
  check('账单三张汇总卡', sums === 3, sums);

  await tap(client, '.ss-page .ss-icon-btn');
  await sleep(260);

  /* 预览 */
  await tap(client, '.ss-composer .ss-icon-btn');
  const pv = await waitFor(client, "!!document.querySelector('.ss-pv__frame')", 5000);
  check('预览 iframe 渲染', pv);
  await sleep(320);
  const src = await client.evaluate("(function(){var f=document.querySelector('.ss-pv__frame');return f?f.getAttribute('srcdoc')||'':'';})()");
  check('预览含聊天场景', /chat-viewport-root/.test(src) && /bubble-sent/.test(src));
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
