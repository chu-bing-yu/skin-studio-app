import themeCss from './ui/theme.css';
import baseCss from './ui/base.css';
import viewsCss from './ui/views.css';
import appCss from './ui/app.css';
import { createStore } from './app/store.js';
import { mountApp } from './ui/app.js';
import { installBackHandler, isNative } from './bridge/native.js';

const STYLE_ID = 'ss-app-style';
const CSS = [themeCss, baseCss, viewsCss, appCss].join('\n');

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function hideBoot() {
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('gone');
    setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 260);
  }
}

async function start() {
  ensureStyle();
  window.__SS_VERSION__ = __VERSION__;
  window.__SS_NATIVE__ = isNative();

  const container = document.getElementById('app');
  if (!container) throw new Error('找不到 #app');

  const store = await createStore();
  /* 先读完数据再挂载：否则首帧 project 为空会渲染崩溃 */
  await store.boot();

  const app = mountApp(container, store);
  window.__SS_APP__ = app;
  installBackHandler(function () { return app.goBack(); });
  hideBoot();

  /* 切后台时落盘，避免丢对话 */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') store.flush();
  });
  window.addEventListener('pagehide', function () { store.flush(); });

  window.addEventListener('error', function (ev) {
    console.error('[skin-studio] 运行错误', ev.message);
  });
  window.addEventListener('unhandledrejection', function (ev) {
    console.error('[skin-studio] 未处理的 rejection', ev.reason && ev.reason.message);
  });
}

start().catch(function (err) {
  console.error('[skin-studio] 启动失败', err);
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.remove('gone');
    boot.textContent = '启动失败：' + ((err && err.message) || '未知错误');
    boot.style.color = '#c0392b';
  }
});
