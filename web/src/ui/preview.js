/**
 * 预览：优先用构建期快照（assets/scenes/*.html + roche.css），没有则用手写场景。
 * 只注入一个 <style id="ss-preview">。
 */
import { el, svgIcon } from './dom.js';
import { htmlFor, TABS } from './scenes/index.js';
import baselineCss from './scenes/baseline.css';

const SNAPSHOT_TABS = {
  chat: 'chat',
  cards: '',
  interface: 'inbox',
  offline: 'offline'
};

let rocheCssCache = null;

/** 真实页面的样式基线（构建期从 roche.html 抽出并裁剪），没有就只用兜底基线 */
async function loadRocheCss() {
  if (rocheCssCache !== null) return rocheCssCache;
  try {
    const res = await fetch('./assets/scenes/roche.css');
    rocheCssCache = res.ok ? await res.text() : '';
  } catch (err) {
    rocheCssCache = '';
  }
  return rocheCssCache;
}

async function loadSnapshot(name) {
  if (name === 'chat') {
    const [html, css] = await Promise.all([
      fetch('./assets/scenes/chat.html').then(function (r) { return r.ok ? r.text() : ''; }),
      fetch('./assets/scenes/roche.css').then(function (r) { return r.ok ? r.text() : ''; })
    ]);
    if (!html) return null;
    return { html: html, css: css };
  }
  const [html, css] = await Promise.all([
    fetch('./assets/scenes/' + name + '.html').then(function (r) { return r.ok ? r.text() : ''; }),
    fetch('./assets/scenes/roche.css').then(function (r) { return r.ok ? r.text() : ''; })
  ]);
  if (!html) return null;
  return { html: html, css: css };
}

function composeHtml(html, baseCss, skinCss) {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<style>' + (baseCss || '') + '</style>'
    + '<style id="ss-preview">' + (skinCss || '') + '</style>'
    + '</head><body>' + html + '</body></html>';
}

export function createPreview(store, actions) {
  let tab = 'chat';
  let source = '场景';
  const tabsEl = el('div', { class: 'ss-pv__tabs' });
  const stage = el('div', { class: 'ss-pv__stage' });
  const meta = el('div', { class: 'ss-pv__meta' });
  const foot = el('div', { class: 'ss-pv__foot' });

  function scopeOfTab() {
    const t = TABS.find(function (x) { return x.id === tab; });
    return t ? t.scope : 'online';
  }

  function skinCss() {
    return store.buildScope(scopeOfTab()).css;
  }

  function renderTabs() {
    tabsEl.replaceChildren();
    TABS.forEach(function (t) {
      const btn = el('button', {
        class: 'ss-tab' + (tab === t.id ? ' ss-tab--on' : ''),
        text: t.label
      });
      btn.addEventListener('click', function () {
        if (tab === t.id) return;
        tab = t.id;
        renderTabs();
        renderFrame();
      });
      tabsEl.appendChild(btn);
    });
  }

  async function renderFrame() {
    const name = SNAPSHOT_TABS[tab];
    let html = '';
    let base = baselineCss;
    source = '场景';

    const roche = await loadRocheCss();
    if (roche) {
      /* 先兜底基线，再真实样式：真实样式优先 */
      base = baselineCss + '\n' + roche;
      source = '场景 + 真实样式';
    }

    if (name) {
      const snap = await loadSnapshot(name);
      if (snap) {
        html = snap.html;
        base = baselineCss + '\n' + (snap.css || roche || '');
        source = '快照';
      }
    }
    if (!html) html = htmlFor(tab);

    const frame = el('iframe', {
      class: 'ss-pv__frame',
      srcdoc: composeHtml(html, base, skinCss()),
      sandbox: 'allow-same-origin'
    });
    stage.replaceChildren(el('div', { class: 'ss-device' }, [frame]));
    meta.textContent = '预览来源：' + source + ' · ' + store.SCOPE_LABEL[scopeOfTab()]
      + ' · ' + store.buildScope(scopeOfTab()).report.stats.branches + ' 个分支已注入';
  }

  function renderFoot() {
    foot.replaceChildren(
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        style: { flex: '1 1 0' },
        text: '导出这份',
        onclick: function () { actions.openExport(scopeOfTab()); }
      }),
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '刷新',
        onclick: function () { renderFrame(); }
      })
    );
  }

  renderTabs();
  renderFrame();
  renderFoot();

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
