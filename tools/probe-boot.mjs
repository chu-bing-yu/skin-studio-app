/**
 * 探针：直接打开真实应用，测量它到底要多久才渲染出聊天页。
 *   node tools/probe-boot.mjs [毫秒上限]
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const TARGET = process.argv[2] && /\.html?$/i.test(process.argv[2]) ? resolve(process.argv[2]) : '';
const DIST = TARGET ? resolve(TARGET, '..') : resolve('web/dist');
const ENTRY = TARGET ? '/' + TARGET.split(/[\\/]/).pop() : '/assets/roche/index.html';
const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const LIMIT = Number(process.argv[3] || (TARGET ? 60000 : 120000));
const HTTP_PORT = 8500 + Math.floor(Math.random() * 200);
const CDP_PORT = 9500 + Math.floor(Math.random() * 200);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.gz': 'application/gzip' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const file = resolve(DIST, '.' + (url === '/' ? '/index.html' : url));
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not file');
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch (err) {
    res.writeHead(404).end('nf');
  }
});
await new Promise((ok) => server.listen(HTTP_PORT, '127.0.0.1', ok));

const profile = mkdtempSync(join(tmpdir(), 'ss-probe-'));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile,
  '--window-size=420,900',
  'http://127.0.0.1:' + HTTP_PORT + ENTRY
], { stdio: 'ignore' });

async function ws() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list')).json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (err) { /* 等 */ }
    await sleep(200);
  }
  throw new Error('调试端口未就绪');
}

const socket = new WebSocket(await ws());
await new Promise((ok, bad) => {
  socket.addEventListener('open', () => ok());
  socket.addEventListener('error', (e) => bad(e));
});
let seq = 0;
const pending = new Map();
socket.addEventListener('message', (ev) => {
  let m;
  try { m = JSON.parse(ev.data); } catch (e) { return; }
  if (!m.id || !pending.has(m.id)) return;
  const t = pending.get(m.id);
  pending.delete(m.id);
  m.error ? t.bad(new Error(m.error.message)) : t.ok(m.result);
});
function send(method, params) {
  const id = ++seq;
  return new Promise((ok, bad) => {
    pending.set(id, { ok, bad });
    socket.send(JSON.stringify({ id, method, params: params || {} }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) return 'EX:' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  return r.result ? r.result.value : undefined;
}

await send('Runtime.enable');
const started = Date.now();
let last = '';
try {
  for (let i = 0; i < LIMIT / 500; i++) {
    const state = await evaluate('(function(){' +
      'var d=document;return JSON.stringify({' +
      'ready:d.readyState,' +
      'len:(d.body&&d.body.innerHTML||"").length,' +
      'chat:!!d.querySelector(".chat-viewport-root"),' +
      'dock:d.querySelectorAll(".dock-icon-btn").length,' +
      'app:!!d.querySelector("#app")});})()');
    if (state !== last) {
      console.log(((Date.now() - started) / 1000).toFixed(1) + 's', state);
      last = state;
    }
    /* 首次会停在免责声明：自动点同意 */
    if (String(state).indexOf('"chat":false') > -1) {
      const clicked = await evaluate('(function(){' +
        'var t=document.body&&document.body.innerText||"";' +
        'if(!/免责|使用须知|同意|接受/.test(t))return "";' +
        'var btns=Array.prototype.slice.call(document.querySelectorAll("button,[role=button],a"));' +
        'for(var i=0;i<btns.length;i++){var s=(btns[i].innerText||"").trim();' +
        'if(/^(同意|接受|我已阅读|我同意|继续|开始使用|进入)$/.test(s)){btns[i].click();return "clicked:"+s;}}' +
        'return "no-btn:"+ (btns.map(function(b){return (b.innerText||"").trim();}).filter(Boolean).slice(0,8).join("|"));})()');
      if (clicked) console.log('   consent ->', clicked);
      /* 免责声明真正的开关是 localStorage['noir_disclaimer_agreed']，直接置上再重载 */
      const seeded = await evaluate('(function(){' +
        'if(localStorage.getItem("noir_disclaimer_agreed")==="true")return "";' +
        'localStorage.setItem("noir_disclaimer_agreed","true");' +
        'setTimeout(function(){location.reload();},50);return "seeded+reload";})()');
      if (seeded) console.log('   seed ->', seeded);

      /* 通行密钥页：填 key 再点进入 */
      const filled = await evaluate('(function(){' +
        'var t=document.body&&document.body.innerText||"";' +
        'if(!/通行密钥|KEY/.test(t))return "";' +
        'var inp=document.querySelector("input");' +
        'if(!inp)return "no-input";' +
        'var key=(window.__PROBE_KEY||"");if(!key)return "no-key";' +
        'var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;' +
        'setter.call(inp,key);' +
        'inp.dispatchEvent(new Event("input",{bubbles:true}));' +
        'inp.dispatchEvent(new Event("change",{bubbles:true}));' +
        'var btns=Array.prototype.slice.call(document.querySelectorAll("button,[role=button],a"));' +
        'for(var i=0;i<btns.length;i++){if(/进入|登录|解锁/.test((btns[i].innerText||"").trim())){btns[i].click();return "clicked";}}' +
        'return "no-btn";})()');
      if (filled) console.log('   key ->', filled);
      if (!globalThis.__dumped) {
        globalThis.__dumped = true;
        const info = await evaluate('(function(){' +
          'var btns=Array.prototype.slice.call(document.querySelectorAll("button")).map(function(b){' +
          'return (b.innerText||"").trim().slice(0,10)+"|disabled="+b.disabled+"|"+b.className.slice(0,40);});' +
          'var boxes=document.querySelectorAll("input[type=checkbox]").length;' +
          'var body=document.body;' +
          'return JSON.stringify({btns:btns.slice(0,10),boxes:boxes,' +
          'scroll:body.scrollHeight,client:body.clientHeight,top:body.scrollTop});})()');
        console.log('   DISCLAIMER DOM ->', info);
      }
    }
    if (String(state).indexOf('"chat":true') > -1) {
      console.log('BOOT OK in ' + ((Date.now() - started) / 1000).toFixed(1) + 's');
      break;
    }
    /* 已经在首页（有 dock）但还没进会话：点第一条会话 */
    if (String(state).indexOf('"dock":4') > -1) {
      const opened = await evaluate('(function(){' +
        'var sels=["[class*=conversation-item]","[class*=conversation]","[class*=chat-item]","[data-conversation-id]"];' +
        'for(var i=0;i<sels.length;i++){var el=document.querySelector(sels[i]);' +
        'if(el){el.click();return "click:"+sels[i];}}' +
        'return "no-row";})()');
      if (opened) console.log('   open ->', opened);
      if (!globalThis.__homeDumped) {
        globalThis.__homeDumped = true;
        const rows = await evaluate('(function(){' +
          'var out=[];var all=document.querySelectorAll("div,li,a");' +
          'for(var i=0;i<all.length&&out.length<14;i++){var e=all[i];' +
          'var c=(e.className&&e.className.toString())||"";' +
          'if(/cursor-pointer|conversation|chat-|list-|rounded-\\[18px\\]/.test(c)&&(e.innerText||"").length>4){' +
          'out.push(c.slice(0,90));}}return JSON.stringify(out);})()');
        console.log('   HOME CLASSES ->', rows);
      }
    }
    await sleep(500);
  }
  const shot = await evaluate('(function(){var b=document.body;return (b&&b.innerText||"").slice(0,200);})()');
  console.log('body text:', shot);
} finally {
  socket.close();
  edge.kill();
  server.close();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch (err) { /* 忽略 */ }
}
