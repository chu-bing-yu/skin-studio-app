/**
 * 构建期快照：把真实 Roche 的「可美化页面」抓成静态 HTML + CSS。
 *
 *   node tools/snapshot-roche.mjs [roche.html 路径]
 *
 * 产物：web/assets/scenes/{chat,inbox,feed,offline}.html + roche.css
 * 抓不到就退出码 2，前端会自动退回手写场景（不会假装成功）。
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../web/assets/scenes');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SRC = process.argv[2] || 'C:\\Users\\admin\\Desktop\\roche-新\\所有文件---创作者\\roche.html';
const PORT = 8400 + Math.floor(Math.random() * 200);
const CDP = 9700 + Math.floor(Math.random() * 200);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await stat(SRC);
} catch (err) {
  console.error('找不到 roche.html：' + SRC);
  process.exit(2);
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const file = resolve(dirname(SRC), '.' + url);
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(404).end('not found');
  }
});
await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok));

const profile = mkdtempSync(join(tmpdir(), 'roche-snap-'));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + CDP, '--user-data-dir=' + profile,
  '--window-size=420,900',
  'http://127.0.0.1:' + PORT + '/roche.html'
], { stdio: 'ignore' });

async function cdpUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + CDP + '/json/list')).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (err) { /* 等待 */ }
    await sleep(200);
  }
  throw new Error('调试端口未就绪');
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  const ready = new Promise((ok, bad) => {
    ws.addEventListener('open', () => ok());
    ws.addEventListener('error', (e) => bad(e));
  });
  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (!msg.id || !pending.has(msg.id)) return;
    const t = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? t.bad(new Error(msg.error.message)) : t.ok(msg.result);
  });
  const send = (method, params) => {
    const id = ++seq;
    return ready.then(() => new Promise((ok, bad) => {
      pending.set(id, { ok, bad });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    }));
  };
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('页面异常：' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    return r.result ? r.result.value : undefined;
  };
  return { send, evaluate, close: () => ws.close() };
}

let c = null;
let code = 0;
try {
  c = client(await cdpUrl());
  await c.send('Runtime.enable');

  /* 等真实界面出现（最多 25 秒） */
  let ready = false;
  for (let i = 0; i < 50; i++) {
    const state = await c.evaluate('(function(){return JSON.stringify({' +
      'chat: !!document.querySelector(".chat-viewport-root"),' +
      'offline: !!document.querySelector(".offline-mode"),' +
      'root: !!document.querySelector("#app, #boot, body > div"),' +
      'boot: !!document.querySelector("#boot-splash"),' +
      'len: document.body ? document.body.innerHTML.length : 0});})()');
    const s = JSON.parse(state);
    if (s.chat || s.offline) { ready = true; break; }
    await sleep(500);
  }

  if (!ready) {
    console.error('真实应用没有渲染出可美化页面（可能需要登录/后端）。');
    console.error('→ 跳过快照，前端会退回手写场景。');
    code = 2;
  } else {
    await sleep(800);
    const shots = await c.evaluate('(function(){' +
      'function grab(sel){var e=document.querySelector(sel);return e?e.outerHTML:"";}' +
      'var html=document.documentElement.outerHTML;' +
      'var css=[];' +
      'for(var i=0;i<document.styleSheets.length;i++){var s=document.styleSheets[i];' +
      'try{var rules=s.cssRules;for(var j=0;j<rules.length;j++){css.push(rules[j].cssText);}}catch(e){}}' +
      'return JSON.stringify({' +
      'chat: grab(".chat-viewport-root"),' +
      'offline: grab(".offline-mode"),' +
      'inbox: grab("[class*=inbox]") || grab("main"),' +
      'feed: grab("[class*=feed]") || grab("[class*=post]"),' +
      'css: css.join("\\n")});})()');

    const data = JSON.parse(shots);
    await mkdir(OUT, { recursive: true });

    const written = [];
    for (const key of ['chat', 'offline', 'inbox', 'feed']) {
      if (!data[key]) continue;
      await writeFile(join(OUT, key + '.html'), data[key]);
      written.push(key + '(' + Math.round(data[key].length / 1024) + 'KB)');
    }
    await writeFile(join(OUT, 'roche.css'), data.css || '');
    console.log('快照完成：' + written.join(', ') + ' · roche.css ' + Math.round((data.css || '').length / 1024) + 'KB');
    console.log('输出目录：' + OUT);
  }
} catch (err) {
  console.error('快照失败：' + (err && err.message));
  code = 2;
} finally {
  if (c) c.close();
  edge.kill();
  server.close();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch (err) { /* 忽略 */ }
}

process.exit(code);
