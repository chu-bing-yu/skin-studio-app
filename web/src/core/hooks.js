/**
 * 真实钩子白名单（从宿主 dist 的 CSS/JS 里核实过的类名）
 * 用途：1) 注入系统提示词 2) lint 校验选择器是否命中
 * 末段 LEGACY 是「旧版/部分构建才有」的兼容项，只提示不阻断
 */

export const HOOKS = {
  online: [
    '.chat-viewport-root', '.chat-scroll-area', '.chat-glass-surface',
    '.chat-header', '.chat-header-title', '.chat-header-avatar', '.chat-header-subtitle',
    '.chat-header-online', '.chat-header-life-status', '.chat-header-status-dot',
    '.chat-header-button', '.chat-header-button__icon', '.chat-header-inspection-badge',
    '.chat-message', '.chat-message-row', '.chat-message-avatar', '.chat-message-body',
    '.chat-message-content', '.chat-message-sender-name', '.chat-message-time',
    '.message-text', '.bubble-sent', '.bubble-received',
    '.bubble-tail-ios', '.bubble-tail-none', '.bubble-tail-rounded',
    '.chat-input-bar', '.chat-input-field', '.chat-input-textarea', '.chat-input-plus',
    '.chat-input-heart', '.chat-input-send', '.chat-input-send-icon',
    '.chat-input-inner-voice-button',
    '.chat-plus-panel', '.chat-plus-action', '.chat-plus-action__icon',
    '.chat-plus-action__label', '.chat-plus-action__symbol',
    '.chat-card', '.chat-card--transfer', '.chat-card--image', '.chat-card--sticker',
    '.chat-card--voice', '.chat-card--location', '.chat-card--forward-bundle',
    '.chat-card--video-call-notice', '.chat-card--payment-notice',
    '.chat-card--drip-invite', '.chat-card--drip-notice',
    '.chat-card--phone-inspect-invite', '.chat-card--phone-inspect-notice',
    '.chat-card--offline-invite', '.chat-card--listen-together',
    '.chat-card--poll', '.chat-card--vote', '.chat-card--html', '.chat-card--regex',
    '.chat-card--spoiler', '.chat-card--family-card', '.chat-card--checkout',
    '.chat-card--peer-pay-notice',
    '.checkout-card', '.checkout-card__icon', '.checkout-card__title',
    '.checkout-card__subtitle', '.checkout-card__money', '.checkout-card__link',
    '.checkout-card__action-button--pay', '.checkout-card__action-button--reject',
    '.peer-pay-notice', '.peer-pay-notice__icon', '.peer-pay-notice__money',
    '.receipt-shell', '.receipt-kicker', '.receipt-title', '.receipt-money',
    '.receipt-total', '.receipt-dash', '.receipt-stamp', '.receipt-code-text',
    '.receipt-items', '.receipt-totals', '.receipt-grand-total',
    '.chat-panel-frosted', '.chat-search-panel', '.chat-search-field',
    '.chat-search-header-row', '.chat-search-icon-button',
    '.chat-other-unread-badge', '.typing-dot', '.chat-voice-wave--playing',
    '.image-card__image', '.image-card--ready',
    '.translation-panel', '.translation-card', '.translation-block',
    '.translation-toggle', '.bubble-translation',
    '.transfer-amount', '.transfer-currency', '.transfer-note', '.transfer-message',
    '.transfer-confirm', '.transfer-cancel', '.transfer-modal', '.transfer-sheet',
    '.offline-invite__button', '.offline-invite__button--accept', '.offline-invite__button--reject'
  ],
  global: [
    '.app-icon-bg', '.app-icon-bg--material', '.app-label',
    '.dock-icon-btn', '.dock-icon-btn--material', '.square-app-btn',
    '.post-action-btn', '.thread-line', '.pinned-indicator', '.avatar-abstract',
    '.bokeh-effect', '.no-scrollbar', '.custom-scrollbar', '.message-text',
    '.native-feed-spoiler-card', '.native-feed-spoiler-stack',
    '.native-feed-spoiler-icon', '.native-feed-spoiler-photo'
  ],
  offline: [
    '.offline-mode', '.offline-mode__scroll',
    '.offline-card', '.offline-card-layer', '.offline-card-top',
    '.offline-card-body', '.offline-card-bottom',
    '.offline-card__header', '.offline-card__header-main', '.offline-card__avatar-shell',
    '.offline-card__avatar-frame', '.offline-card__avatar-image',
    '.offline-card__avatar-fallback', '.offline-card__title-row',
    '.offline-card__sender', '.offline-card__meta-row', '.offline-card__time',
    '.offline-card__meta-dot', '.offline-card__floor', '.offline-card__body',
    '.offline-card__content', '.offline-card__content-text', '.offline-card__thought',
    '.offline-card__text-flow', '.offline-card__text-divider',
    '.offline-card__inline-code', '.offline-card__inline-quote',
    '.offline-card__inline-emphasis', '.offline-card__inline-delete',
    '.offline-card__html-card', '.offline-card__regex-fragment',
    '.offline-card__footer', '.offline-card__footer-left', '.offline-card__footer-right',
    '.offline-card__footer-line', '.offline-card__footer-label',
    '.offline-card__footer-metric', '.offline-card__footer-status-dot',
    '.offline-card__continue-btn', '.offline-card__actions',
    '.offline-card__action-btn', '.offline-card__action-btn--edit',
    '.offline-card__action-btn--delete', '.offline-card__action-icon',
    '.offline-card__textarea', '.offline-card__editor-actions',
    '.offline-card__editor-btn', '.offline-card__editor-btn--cancel',
    '.offline-card__editor-btn--save',
    '.noir-toggle', '.noir-toggle-bg', '.parsed-content', '.html-content-wrapper'
  ]
};

/** 旧版/部分构建才有：命中算加分，没命中也不报错 */
export const LEGACY = [
  '.profile-header', '.profile-section', '.profile-handle', '.profile-avatar',
  '.profile-nav', '.profile-action-btn', '.post-item', '.post-container',
  '.post-author-name', '.post-timestamp', '.post-body', '.post-actions',
  '.post-action-unit', '.post-avatar-small', '.conversation-item',
  '.conversation-avatar', '.inbox-header', '.inbox-title', '.contact-item',
  '.contact-avatar', '.favorite-card', '.bottom-nav', '.tab-item',
  '.create-group-entry', '.empty-state'
];

/** 宿主变量：不是选择器，但允许出现在 CSS 里 */
export const HOST_VARS = [
  '--desktop-icon-size', '--desktop-icon-radius', '--desktop-icon-opacity',
  '--card-surface', '--card-border', '--card-shadow', '--card-shadow-hover',
  '--card-title-font', '--card-title-size', '--card-title-weight', '--card-title-color',
  '--card-meta-font', '--card-meta-size', '--card-meta-weight', '--card-meta-color',
  '--card-body-font', '--card-body-size', '--card-body-weight', '--card-body-line-height',
  '--card-body-letter-spacing', '--card-body-color',
  '--card-floor-font', '--card-floor-size', '--card-floor-color',
  '--card-footer-font', '--card-footer-size', '--card-footer-color', '--card-footer-metric-size',
  '--card-action-icon-size', '--card-action-color', '--card-action-hover', '--card-danger-hover',
  '--card-quote-font', '--card-quote-color',
  '--offline-menu-width', '--offline-menu-bg', '--offline-menu-border',
  '--offline-menu-shadow', '--offline-menu-title-color'
];

export function allHooks() {
  return HOOKS.online.concat(HOOKS.global, HOOKS.offline);
}

function distance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = [];
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/** 给一个疑似写错的类名，返回最接近的已知钩子 */
export function closestHook(name) {
  const clean = String(name || '').replace(/^\./, '');
  if (!clean) return '';
  const pool = allHooks().map(function (h) { return h.slice(1); });
  let best = '';
  let bestScore = 0;
  for (let i = 0; i < pool.length; i++) {
    const d = distance(clean, pool[i]);
    const score = 1 - d / Math.max(clean.length, pool[i].length);
    if (score > bestScore) {
      bestScore = score;
      best = pool[i];
    }
  }
  return bestScore >= 0.45 ? '.' + best : '';
}

export function isKnownHook(name) {
  const dot = '.' + String(name || '').replace(/^\./, '');
  return allHooks().indexOf(dot) > -1
    || LEGACY.indexOf(dot) > -1
    || HOST_VARS.indexOf(dot) > -1;
}

export function hooksForScope(scope) {
  return (HOOKS[scope] || HOOKS.online).join(', ');
}
