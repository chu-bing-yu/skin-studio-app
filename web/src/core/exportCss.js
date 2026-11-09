/** 分作用域导出：线上 / 线下 / 全局 各一份 */
import { activeOfScope, lineCount } from './branches.js';
import { lint } from './lint.js';
import { SCOPE_LABEL, branchNodesOfScope } from './tree.js';

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

export function timestamp(d) {
  const t = d || new Date();
  return t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate())
    + '-' + pad(t.getHours()) + pad(t.getMinutes());
}

export function fileName(scope, d) {
  return (scope || 'online') + '-' + timestamp(d) + '.css';
}

/** 令牌分支永远排最前 */
function orderIndex(id) {
  if (/\.(tokens|card-tokens)$/.test(id)) return -1;
  return 0;
}

export function collectScope(scope, branches) {
  return activeOfScope(branches, scope)
    .filter(function (item) { return item.data.css && item.data.css.trim(); })
    .sort(function (a, b) {
      const ai = orderIndex(a.id);
      const bi = orderIndex(b.id);
      if (ai !== bi) return ai - bi;
      return a.node.order - b.node.order;
    });
}

export function usedAssets(branches, assets, scope) {
  const list = scope ? collectScope(scope, branches) : [];
  const all = list.map(function (i) { return i.data.css; }).join('\n');
  return (assets || []).filter(function (a) {
    const varName = '--ss-img-' + a.slug;
    return all.indexOf(varName) > -1 || (a.url && all.indexOf(a.url) > -1);
  });
}

/**
 * @param {'online'|'offline'|'global'} scope
 * @param {object} branches
 * @param {Array} assets
 */
export function buildScopeCss(scope, branches, assets) {
  const items = collectScope(scope, branches);
  const all = branchNodesOfScope(scope);
  const used = usedAssets(branches, assets, scope);

  const errors = [];
  const warnings = [];
  const stats = { rules: 0, important: 0, branches: items.length, empty: all.length - items.length };

  items.forEach(function (item) {
    const r = lint(item.data.css, {
      branchId: item.id,
      assetUrls: (assets || []).map(function (a) { return a.url; })
    });
    r.errors.forEach(function (e) { errors.push(item.node.label + '：' + e); });
    r.warnings.forEach(function (w) { warnings.push(item.node.label + '：' + w); });
    stats.rules += r.stats.rules;
    stats.important += r.stats.important;
  });

  const now = new Date();
  const lines = [];
  lines.push('/* ==========================================================');
  lines.push('   Roche 美化 · ' + SCOPE_LABEL[scope] + '皮肤');
  lines.push('   生成：' + now.toLocaleString('zh-CN') + ' · Skin Studio');
  lines.push('   分支：' + items.length + ' 个有内容' + (stats.empty ? '，' + stats.empty + ' 个为空已跳过' : ''));
  lines.push('   体检：' + errors.length + ' 个错误 / ' + warnings.length + ' 个提醒 / ' + stats.rules + ' 条规则');
  if (errors.length) {
    lines.push('');
    lines.push('   ⚠ 错误（可能导致整段失效）');
    errors.slice(0, 10).forEach(function (e) { lines.push('     · ' + e); });
  }
  if (warnings.length) {
    lines.push('');
    lines.push('   · 提醒');
    warnings.slice(0, 10).forEach(function (w) { lines.push('     · ' + w); });
  }
  lines.push('   ========================================================== */');
  lines.push('');

  items.forEach(function (item) {
    lines.push('/* ---- ' + SCOPE_LABEL[scope] + ' / ' + item.node.label + ' · ' + item.id + ' ---- */');
    lines.push(item.data.css.trim());
    lines.push('');
  });

  if (used.length) {
    lines.push('/* ---- 资源清单 ----');
    used.forEach(function (a) { lines.push('   var(--ss-img-' + a.slug + ')  →  ' + a.url); });
    lines.push('   ---- */');
  }

  return {
    css: lines.join('\n'),
    name: fileName(scope, now),
    scope: scope,
    report: { errors: errors, warnings: warnings, stats: stats }
  };
}

export function buildAll(branches, assets) {
  return ['online', 'offline', 'global'].map(function (scope) {
    return buildScopeCss(scope, branches, assets);
  });
}

export function downloadCss(name, css) {
  const blob = new Blob([css], { type: 'text/css;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(url);
    if (a.parentNode) a.parentNode.removeChild(a);
  }, 3000);
}

/** 依次下载三份（间隔 300ms，避免被拦） */
export function downloadAll(branches, assets) {
  const list = buildAll(branches, assets);
  list.forEach(function (item, i) {
    setTimeout(function () { downloadCss(item.name, item.css); }, i * 320);
  });
  return list;
}

/** 某个节点可预览的 CSS（供预览与临时应用） */
export function buildLiveCss(scope, branches) {
  const items = collectScope(scope, branches);
  return items.map(function (item) {
    return '/* ' + item.node.label + ' */\n' + item.data.css.trim();
  }).join('\n\n');
}

/** 行数统计（列表用） */
export function totalLines(scope, branches) {
  return collectScope(scope, branches).reduce(function (n, item) {
    return n + lineCount(item.data.css);
  }, 0);
}
