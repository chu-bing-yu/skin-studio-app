/**
 * 探针：能否从真实应用里抓到「聊天页」的 DOM（用于只打包 chat）
 *   node tools/snap-chat.mjs "<roche.html 路径>" [key]
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const FILE = process.argv[2] ? resolve(process.argv[2]) : resolve('web/dist/assets/roche/index.html');
const KEY = process.argv[3] || process.env.ROCHE_KEY || '';
const DIR = resolve(FILE, '..');
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const HTTP_PORT = 8600 + Math.floor(Math.random() * 200);
const CDP_PORT = 9600 + Math.floor(Math.random() * 200);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const f = resolve(DIR, '.' + (url === '/' ? '/' + FILE.split(/[\\/]/).pop() : url));
    const info = await stat(f);
    if (!info.isFile()) throw new Error('nf');
    res.writeHead(200, { 'content-type': extname(f) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream' });
    res.end(await readFile(f));
  } catch (e) { res.writeHead(404).end('nf'); }
});
await new Promise((ok) => server.listen(HTTP_PORT, '127.0.0.1', ok));

const profile = mkdtempSync(join(tmpdir(), 'ss-snap-'));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile,
  '--window-size=420,900',
  'http://127.0.0.1:' + HTTP_PORT + '/' + FILE.split(/[\\/]/).pop()
], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list')).json();
      const p = list.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) { /* 等 */ }
    await sleep(200);
  }
  throw new Error('CDP 未就绪');
}

const socket = new WebSocket(await wsUrl());
await new Promise((ok, bad) => { socket.addEventListener('open', () => ok()); socket.addEventListener('error', bad); });
let seq = 0;
const pending = new Map();
socket.addEventListener('message', (ev) => {
  let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
  if (!m.id || !pending.has(m.id)) return;
  const t = pending.get(m.id); pending.delete(m.id);
  m.error ? t.bad(new Error(m.error.message)) : t.ok(m.result);
});
const send = (method, params) => new Promise((ok, bad) => {
  const id = ++seq; pending.set(id, { ok, bad });
  socket.send(JSON.stringify({ id, method, params: params || {} }));
});
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) return 'EX:' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text);
  return r.result ? r.result.value : undefined;
}

await send('Runtime.enable');

try {
  /* 1) 进应用 */
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const st = await ev('JSON.stringify({dock:document.querySelectorAll(".dock-icon-btn").length,key:/通行密钥|ROCHE ACCESS/.test(document.body.innerText||"")})');
    const s = JSON.parse(String(st));
    if (s.key && KEY) {
      await ev('(function(){var i=document.querySelector("input");if(!i)return 0;' +
        'var set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;' +
        'set.call(i,' + JSON.stringify(KEY) + ');' +
        'i.dispatchEvent(new Event("input",{bubbles:true}));' +
        'var b=[].slice.call(document.querySelectorAll("button,a,[role=button]"));' +
        'for(var k=0;k<b.length;k++){if(/进入|解锁|登录/.test((b[k].innerText||"")))  {b[k].click();break;}}return 1;})()');
    }
    if (s.dock >= 3) break;
  }

  /* 2) 点聊天 dock */
  await ev('(function(){var d=document.querySelectorAll(".dock-icon-btn");if(d[2])d[2].click();})()');
  await sleep(1500);
  console.log('after dock[2]:', await ev('(function(){return JSON.stringify({chat:!!document.querySelector(".chat-viewport-root"),text:(document.body.innerText||"").slice(0,60)});})()'));

  /* 3) 点 + 新建会话，看弹出什么 */
  const plus = await ev('(function(){' +
    'var all=[].slice.call(document.querySelectorAll("button,a,[role=button],div"));' +
    'for(var i=0;i<all.length;i++){var e=all[i];' +
    'var t=(e.innerText||"").trim();' +
    'var aria=(e.getAttribute("aria-label")||"")+" "+(e.getAttribute("title")||"");' +
    'if(t==="+"||/add|new|创建|新建/i.test(aria)){var r=e.getBoundingClientRect();' +
    'if(r.width>0&&r.height>0){e.click();return "clicked:"+t.slice(0,10)+"|"+aria.slice(0,20);}}}' +
    'return "no-plus";})()');
  console.log('plus:', plus);
  await sleep(1500);
  console.log('after plus:', await ev('(function(){return JSON.stringify({chat:!!document.querySelector(".chat-viewport-root"),text:(document.body.innerText||"").replace(/\\s+/g," ").slice(0,90)});})()'));

  /* 4) 找列表行（若已生成会话） */
  const rows = await ev('(function(){var out=[];var all=document.querySelectorAll("div,li,a,button");' +
    'var vw=innerWidth,vh=innerHeight;' +
    'for(var i=0;i<all.length;i++){var e=all[i];var r=e.getBoundingClientRect();' +
    'if(r.height<50||r.height>120||r.width<vw*0.6||r.top<70||r.bottom>vh-90)continue;' +
    'var t=(e.innerText||"").trim().replace(/\\s+/g," ");if(!t)continue;' +
    'out.push(t.slice(0,24)+" y="+Math.round(r.top));' +
    'if(out.length>=6)break;}return JSON.stringify(out);})()');
  console.log('list rows:', rows);

  /* 4) 点第一行 */
  const clicked = await ev('(function(){var all=document.querySelectorAll("div,li,a,button");' +
    'var vw=innerWidth,vh=innerHeight;var best=null,bt=1e9;' +
    'for(var i=0;i<all.length;i++){var e=all[i];var r=e.getBoundingClientRect();' +
    'if(r.height<50||r.height>120||r.width<vw*0.6||r.top<70||r.bottom>vh-90)continue;' +
    'if(!(e.innerText||"").trim())continue;' +
    'if(r.top<bt){bt=r.top;best=e;}}' +
    'if(!best)return "no-row";best.click();return "clicked@"+Math.round(bt);})()');
  console.log('click row:', clicked);
  await sleep(1800);

  const state = await ev('(function(){return JSON.stringify({chat:!!document.querySelector(".chat-viewport-root"),' +
    'msgs:document.querySelectorAll(".chat-message").length,' +
    'input:!!document.querySelector(".chat-input-bar"),' +
    'text:(document.body.innerText||"").slice(0,60)});})()');
  console.log('after row:', state);

  /* 5) 若抓到聊天页，输出体积参考 */
  if (String(state).indexOf('"chat":true') > -1) {
    const dump = await ev('(function(){var e=document.querySelector(".chat-viewport-root");' +
      'var css=[];for(var i=0;i<document.styleSheets.length;i++){try{var rr=document.styleSheets[i].cssRules;' +
      'for(var j=0;j<rr.length;j++)css.push(rr[j].cssText);}catch(x){}}' +
      'return JSON.stringify({html:e?e.outerHTML.length:0,css:css.join("\\n").length});})()');
    console.log('capture sizes:', dump);
    const html = await ev('(function(){var e=document.querySelector(".chat-viewport-root");return e?e.outerHTML:"";})()');
    if (html) {
      await writeFile(join(DIR, '_chat-snapshot.html'), String(html));
      console.log('saved _chat-snapshot.html', String(html).length, 'chars');
    }
  }
} catch (err) {
  console.log('ERR', err && err.message);
} finally {
  socket.close();
  edge.kill();
  server.close();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* 忽略 */ }
}
