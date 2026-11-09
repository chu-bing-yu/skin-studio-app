/**
 * 预览：直接跑真实 Roche 应用（免登录版），在它上面注入当前方案的 CSS。
 *
 * 启动链：免责声明（localStorage 开关）→ 通行密钥 → 应用首页 / 聊天页
 *   - 免责声明：同源，父页面先把 noir_disclaimer_agreed 置 true
 *   - 通行密钥：检测到输入框就自动填入（KEY 可在设置里改）
 *   - 皮肤：只维护一个 <style id="ss-preview">，每 1.5s 自检补插
 * 卡片墙：真实应用没有「所有卡片一页」的界面，固定用手写陈列页。
 */
import { el, svgIcon } from './dom.js';
import { htmlFor, TABS } from './scenes/index.js';
import baselineCss from './scenes/baseline.css';

const REAL_APP = './assets/roche/index.html';
const DISCLAIMER_KEY = 'noir_disclaimer_agreed';
const POLL = 400;
const ENTER_TIMEOUT = 60000;

let sceneBaseCache = null;

async function loadSceneBase() {
  if (sceneBaseCache !== null) return sceneBaseCache;
  let real = '';
  try {
    const res = await fetch('./assets/scenes/roche.css');
    real = res.ok ? await res.text() : '';
  } catch (err) {
    real = '';
  }
  sceneBaseCache = real ? (baselineCss + '\n' + real) : baselineCss;
  return sceneBaseCache;
}

function composeScene(html, baseCss, skinCss) {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<style>' + (baseCss || '') + '</style>'
    + '<style id="ss-preview">' + (skinCss || '') + '</style>'
    + '</head><body>' + html + '</body></html>';
}

const sleep = (ms) => new Promise(function (r) { setTimeout(r, ms); });

export function createPreview(store, actions) {
  let tab = 'chat';
  let source = '真实应用';
  let booted = false;
  let chatEntered = false;
  let chatInChat = false;
  let disposed = false;
  let skinTimer = null;
  let triedKey = false;

  const tabsEl = el('div', { class: 'ss-pv__tabs' });
  const stage = el('div', { class: 'ss-pv__stage' });
  const meta = el('div', { class: 'ss-pv__meta' });
  const hint = el('div', { class: 'ss-pv__hint', text: '在预览里可以自己点进会话；皮肤一直注入着' });

  /* 提前写好免责声明开关（与 iframe 同源） */
  try { localStorage.setItem(DISCLAIMER_KEY, 'true'); } catch (err) { /* 忽略 */ }

  const realFrame = el('iframe', {
    class: 'ss-pv__frame ss-pv__frame--real',
    src: REAL_APP,
    sandbox: 'allow-scripts allow-same-origin'
  });
  const sceneFrame = el('iframe', { class: 'ss-pv__frame ss-pv__frame--scene', sandbox: 'allow-scripts allow-same-origin' });

  /* 两个容器常驻、只切 display：
     iframe 一旦被重新挂到 DOM 就会重新加载，注入的样式和登录态都会丢 */
  const realWrap = el('div', { class: 'ss-device ss-device--real' });
  const sceneWrap = el('div', { class: 'ss-device ss-device--scene', style: { display: 'none' } }, [sceneFrame]);
  realWrap.appendChild(realFrame);

  const loading = el('div', { class: 'ss-pv__loading' }, [
    el('div', { text: '正在启动真实界面…' }),
    el('div', { class: 'ss-pv__loading-sub', text: '首次约 3–15 秒（要解析 11MB 脚本），不是卡死' })
  ]);

  function scopeOfTab() {
    const t = TABS.find(function (x) { return x.id === tab; });
    return t ? t.scope : 'online';
  }

  function skinCss() {
    return store.buildScope(scopeOfTab()).css;
  }

  function doc() {
    try { return realFrame.contentDocument; } catch (err) { return null; }
  }

  /** 只维护一个 ss-preview；应用重建 head 时补回来 */
  function inject(d) {
    try {
      const target = d || doc();
      if (!target || !target.head) {
        window.__ssInjectLog = (window.__ssInjectLog || []).concat('no-head:' + !!target);
        return false;
      }
      let style = target.getElementById('ss-preview');
      if (!style) {
        style = target.createElement('style');
        style.id = 'ss-preview';
        target.head.appendChild(style);
        window.__ssInjectLog = (window.__ssInjectLog || []).concat('created');
      }
      const css = skinCss();
      if (style.textContent !== css) style.textContent = css;
      return true;
    } catch (err) {
      window.__ssInjectLog = (window.__ssInjectLog || []).concat('ERR:' + (err && err.message));
      return false;
    }
  }

  function keyFromSettings() {
    const s = store.state.settings || {};
    return (s.rocheKey || '').trim();
  }

  /** 通行密钥页：填 key 并点进入 */
  function tryPassKey() {
    const d = doc();
    if (!d || !d.body) return false;
    const text = d.body.innerText || '';
    if (!/通行密钥|ROCHE ACCESS|KEY/.test(text)) return false;
    const key = keyFromSettings();
    const input = d.querySelector('input');
    if (!input) return false;
    if (!key) {
      /* 没配密钥：提示去设置里填，或直接在预览里输入 */
      const sub = loading.querySelector('.ss-pv__loading-sub');
      if (sub) sub.textContent = '需要通行密钥：可在「设置 → 预览」里填一次，或直接在这个页面输入';
      return false;
    }
    if (triedKey && input.value === key) return true;
    triedKey = true;
    try {
      const setter = Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype, 'value').set;
      setter.call(input, key);
      input.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
      input.dispatchEvent(new d.defaultView.Event('change', { bubbles: true }));
    } catch (err) {
      input.value = key;
    }
    const btns = d.querySelectorAll('button, [role=button], a');
    for (let i = 0; i < btns.length; i++) {
      if (/进入|登录|解锁/.test((btns[i].innerText || '').trim())) { btns[i].click(); return true; }
    }
    return true;
  }

  function appReady() {
    const d = doc();
    if (!d) return false;
    return !!(d.querySelector('.dock-icon-btn') || d.querySelector('.chat-viewport-root'));
  }

  /** 等某个选择器出现 */
  async function waitForSel(sel, ms) {
    const deadline = Date.now() + (ms || 5000);
    while (Date.now() < deadline && !disposed) {
      const d = doc();
      if (d && d.querySelector(sel)) return true;
      await sleep(250);
    }
    return false;
  }

  /**
   * 进入聊天应用：
   *   0=设置 1=世界书 2=聊天/会话 3=信息（实测 dock 顺序）
   * 点第 3 个（下标 2）进会话列表；列表里有会话就点第一条进聊天页。
   */
  async function enterChat() {
    const d = doc();
    if (!d) return false;
    if (d.querySelector('.chat-viewport-root')) return true;

    const dock = d.querySelectorAll('.dock-icon-btn');
    if (dock.length >= 3) {
      try { dock[2].click(); } catch (err) { /* 忽略 */ }
      await sleep(900);
    }

    if (doc() && doc().querySelector('.chat-viewport-root')) return true;

    /* 会话列表里点第一条 */
    try {
      const cd = doc();
      if (cd) {
        const rows = Array.prototype.slice.call(cd.querySelectorAll('div,li,a,button'));
        const vw = cd.defaultView.innerWidth;
        const vh = cd.defaultView.innerHeight;
        let best = null;
        let bestTop = 1e9;
        rows.forEach(function (el) {
          const r = el.getBoundingClientRect();
          if (r.height < 50 || r.height > 120) return;
          if (r.width < vw * 0.6) return;
          if (r.top < 70 || r.bottom > vh - 90) return;
          if (!(el.innerText || '').trim()) return;
          if (r.top < bestTop) { bestTop = r.top; best = el; }
        });
        if (best) {
          best.click();
          await sleep(900);
        }
      }
    } catch (err) {
      window.__ssInjectLog = (window.__ssInjectLog || []).concat('enterChat:' + (err && err.message));
    }

    return !!(doc() && doc().querySelector('.chat-viewport-root'));
  }

  async function boot() {
    const deadline = Date.now() + ENTER_TIMEOUT;
    while (Date.now() < deadline && !disposed) {
      if (appReady()) {
        booted = true;
        await sleep(400);
        inject();
        startSkinLoop();
        renderMeta();
        return true;
      }
      if (tryPassKey()) {
        const sub = loading.querySelector('.ss-pv__loading-sub');
        if (sub) sub.textContent = '正在用通行密钥进入应用…';
      }
      await sleep(POLL);
    }
    return false;
  }

  function startSkinLoop() {
    if (skinTimer) return;
    skinTimer = setInterval(function () {
      if (disposed) { clearInterval(skinTimer); skinTimer = null; return; }
      if (!doc()) return;
      inject();
    }, 1500);
  }

  function renderTabs() {
    tabsEl.replaceChildren();
    TABS.forEach(function (t) {
      const btn = el('button', { class: 'ss-tab' + (tab === t.id ? ' ss-tab--on' : ''), text: t.label });
      btn.addEventListener('click', function () {
        if (tab === t.id) return;
        tab = t.id;
        renderTabs();
        void renderFrame();
      });
      tabsEl.appendChild(btn);
    });
  }

  function showRealPane() {
    realWrap.style.display = '';
    sceneWrap.style.display = 'none';
  }

  function showScenePane() {
    realWrap.style.display = 'none';
    sceneWrap.style.display = '';
  }

  async function showScene(reason) {
    const base = await loadSceneBase();
    if (disposed) return;
    sceneFrame.setAttribute('srcdoc', composeScene(htmlFor(tab), base, skinCss()));
    showScenePane();
    source = reason;
    renderMeta();
  }

  async function renderFrame() {
    if (tab === 'cards') {
      await showScene('陈列页（手写）');
      return;
    }

    showRealPane();

    if (!booted) {
      if (!appReady()) {
        if (!realWrap.contains(loading)) realWrap.appendChild(loading);
        const ok = await boot();
        if (!ok) {
          await showScene('回退：场景（真实界面未就绪）');
          return;
        }
      }
      booted = true;
      if (loading.parentNode) loading.parentNode.removeChild(loading);
      if (!realWrap.contains(hint)) realWrap.appendChild(hint);
    }

    if (tab === 'chat' && !chatEntered) {
      chatEntered = true;
      const ok = await enterChat();
      chatInChat = ok;
      if (ok) await waitForSel('.chat-message', 4000);
    }

    inject();
    source = chatInChat ? '真实应用 · 聊天' : '真实应用（已打开会话列表，可自行点进会话）';
    renderMeta();
  }

  function renderMeta() {
    const built = store.buildScope(scopeOfTab());
    meta.textContent = '预览来源：' + source + ' · ' + store.SCOPE_LABEL[scopeOfTab()]
      + ' · ' + built.report.stats.branches + ' 个分支已注入';
    window.__ssPreviewSource = source;
    window.__ssPreviewBooted = booted;
  }

  const foot = el('div', { class: 'ss-pv__foot' }, [
    el('button', {
      class: 'ss-btn ss-btn--ghost',
      style: { flex: '1 1 0' },
      text: '重新注入皮肤',
      onclick: function () { inject(); renderMeta(); }
    }),
    el('button', {
      class: 'ss-btn ss-btn--ghost',
      style: { flex: '1 1 0' },
      text: '导出这份',
      onclick: function () { actions.openExport(scopeOfTab()); }
    }),
    el('button', {
      class: 'ss-btn ss-btn--ghost',
      text: '刷新',
      onclick: function () { location.reload(); }
    })
  ]);

  stage.appendChild(realWrap);
  stage.appendChild(sceneWrap);
  renderTabs();
  void renderFrame();
  renderMeta();

  return el('div', { class: 'ss-pv' }, [
    el('div', { class: 'ss-screen__bar' }, [
      el('button', { class: 'ss-icon-btn', onclick: actions.closeScreen }, [svgIcon('back', 18)]),
      el('div', { class: 'ss-crumb__main', style: { flex: '1 1 auto', textAlign: 'center' }, text: '预览' }),
      el('button', { class: 'ss-icon-btn', onclick: actions.closeScreen }, [svgIcon('close', 18)])
    ]),
    tabsEl,
    meta,
    stage,
    foot
  ]);
}
