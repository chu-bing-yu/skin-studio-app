/** 全局分支表：写入 / 撤销 / 重置 / 开关 / 统计 */
import { BRANCHES, getBranch } from './schema.js';
import { branchNodesOfScope } from './tree.js';

export function emptyBranches() {
  const out = {};
  BRANCHES.forEach(function (def) {
    out[def.id] = {
      css: '',
      mode: 'REPLACE',
      enabled: def.enabled !== false,
      locked: !!def.locked,
      updatedAt: 0,
      source: 'skeleton',
      history: []
    };
  });
  return out;
}

/** 补齐缺字段，兼容旧数据 */
export function normalize(branches) {
  const base = emptyBranches();
  const out = {};
  Object.keys(base).forEach(function (id) {
    const cur = branches && branches[id];
    out[id] = Object.assign({}, base[id], cur || {});
    if (!Array.isArray(out[id].history)) out[id].history = [];
  });
  return out;
}

export function lineCount(css) {
  if (!css || !css.trim()) return 0;
  return css.split('\n').filter(function (l) { return l.trim(); }).length;
}

export function branchOf(branches, id) {
  return branches[id] || null;
}

function pushHistory(branch, prevCss, prevMode) {
  branch.history = branch.history || [];
  branch.history.unshift({ css: prevCss, mode: prevMode, at: Date.now() });
  if (branch.history.length > 5) branch.history.length = 5;
}

export function write(branches, id, css, mode, source) {
  const branch = branches[id];
  if (!branch || branch.locked) return false;
  pushHistory(branch, branch.css, branch.mode);
  const next = (mode === 'APPEND' && branch.css.trim())
    ? branch.css.replace(/\s*$/, '\n\n') + css
    : css;
  branch.css = next;
  branch.mode = mode || 'REPLACE';
  branch.source = source || 'ai';
  branch.updatedAt = Date.now();
  return true;
}

export function undo(branches, id) {
  const branch = branches[id];
  if (!branch || !branch.history || !branch.history.length) return false;
  const prev = branch.history.shift();
  branch.css = prev.css;
  branch.mode = prev.mode || 'REPLACE';
  branch.updatedAt = Date.now();
  return true;
}

export function reset(branches, id) {
  const branch = branches[id];
  if (!branch || branch.locked) return false;
  pushHistory(branch, branch.css, branch.mode);
  branch.css = '';
  branch.source = 'skeleton';
  branch.updatedAt = Date.now();
  return true;
}

export function toggle(branches, id, enabled) {
  const branch = branches[id];
  if (!branch || branch.locked) return false;
  branch.enabled = !!enabled;
  branch.updatedAt = Date.now();
  return true;
}

/** 某作用域内启用的分支（含 css 与定义） */
export function activeOfScope(branches, scope) {
  return branchNodesOfScope(scope)
    .map(function (node) {
      const data = branches[node.id];
      if (!data || !data.enabled) return null;
      return { id: node.id, node: node, def: getBranch(node.id) || { id: node.id, name: node.label }, data: data };
    })
    .filter(Boolean);
}

/** 有内容的分支数 */
export function writtenCount(branches, scope) {
  const list = scope ? branchNodesOfScope(scope) : BRANCHES;
  let n = 0;
  list.forEach(function (def) {
    const b = branches[def.id];
    if (b && b.enabled && b.css && b.css.trim()) n += 1;
  });
  return n;
}

export function totalCount(scope) {
  return (scope ? branchNodesOfScope(scope) : BRANCHES).length;
}
