/**
 * 唯一组装入口：composePrompt()
 * 只做四件事：作用域/节点类型/分支命中过滤 → enabled 过滤 → 排序 → 占位符替换与拼接。
 * 这里不允许出现任何写死的提示词段落。
 */
import { getNode, branchIdsOf, breadcrumb, scopeOf, SCOPE_LABEL, labelOf } from '../core/tree.js';
import { hooksForScope, HOST_VARS } from '../core/hooks.js';
import { getBranch } from '../core/schema.js';
import { CONDENSED, SECTIONS, SECTION_BRANCHES } from '../core/reference.generated.js';
import { LAYERS, mergeSegments } from './defaults.js';
import { estimateTokens } from './stats.js';

const FULL_FALLBACK = '(该部位暂无对应参考小节，请只依据硬规则作答)';

function lineCount(css) {
  if (!css || !css.trim()) return 0;
  return css.split('\n').filter(function (l) { return l.trim(); }).length;
}

function condensedOf(branchId, limit) {
  const item = CONDENSED[branchId];
  if (!item || !item.sample) return '';
  const max = limit || 900;
  return item.sample.length > max ? item.sample.slice(0, max) + '\n/* …省略… */' : item.sample;
}

function fullReference(branchIds) {
  const hit = Object.keys(SECTION_BRANCHES).filter(function (sec) {
    return SECTION_BRANCHES[sec].some(function (id) { return branchIds.indexOf(id) > -1; });
  });
  if (!hit.length) return FULL_FALLBACK;
  hit.sort();
  const parts = [];
  let budget = 26000;
  hit.forEach(function (sec) {
    const s = SECTIONS[sec];
    if (!s) return;
    const chunk = '/* ── 整理版 ' + sec + ' ' + s.title + ' ── */\n' + s.text;
    if (budget - chunk.length < 0) return;
    budget -= chunk.length;
    parts.push(chunk);
  });
  return parts.join('\n\n') || FULL_FALLBACK;
}

function referenceText(branchIds, mode) {
  if (mode === 'off' || !mode) return '';
  if (mode === 'full') {
    return '【参考 · 完整小节（来自《全部 css 整理版》，可对照写法，但要按硬规则筛掉旧版/高风险选择器）】\n'
      + fullReference(branchIds);
  }
  const out = ['【参考 · 各部位典型写法（摘自《全部 css 整理版》，仅作风格参照，不要照抄旧版结构）】'];
  branchIds.forEach(function (id) {
    const sample = condensedOf(id, branchIds.length > 6 ? 600 : 1100);
    if (!sample) return;
    out.push('/* ' + id + ' · ' + labelOf(id) + ' */');
    out.push(sample);
  });
  return out.length > 1 ? out.join('\n') : '';
}

function targetsText(branchIds, branches) {
  return branchIds.map(function (id) {
    const def = getBranch(id) || {};
    const data = branches[id] || {};
    const lines = lineCount(data.css);
    return '- ' + id + '（' + labelOf(id) + '，' + (lines ? lines + ' 行' : '空') + '）'
      + (def.locked ? '［只读，不要输出此分支］' : '')
      + (data.enabled === false ? '［当前已关闭］' : '');
  }).join('\n');
}

function existingText(branchIds, branches) {
  const list = branchIds.filter(function (id) {
    const b = branches[id];
    return b && b.css && b.css.trim();
  });
  if (!list.length) return '';
  const blocks = list.slice(0, 4).map(function (id) {
    return '/* ' + id + ' */\n' + branches[id].css.trim();
  });
  let text = blocks.join('\n\n');
  if (list.length > 4) text += '\n（其余 ' + (list.length - 4) + ' 个分支已有内容，未全部展开）';
  return text;
}

/** 组装的上下文变量（供段里的 {{占位符}} 使用） */
export function buildVars(nodeId, project, presetText) {
  const node = getNode(nodeId) || getNode('plan');
  const branches = (project && project.branches) || {};
  const cfg = (project && project.promptCfg) || {};
  const scope = scopeOf(node.id);
  const ids = branchIdsOf(node.id);
  const isPlan = node.type === 'plan';

  return {
    context: breadcrumb(node.id) + (scope ? '（' + SCOPE_LABEL[scope] + '）' : '') + '\n'
      + (isPlan
        ? '这是「风格规划」对话，不直接产出部位 CSS。'
        : (node.type === 'branch'
          ? '这是一个「单个部位」对话：只改这一个分支。'
          : '这是一个「' + node.label + '」对话，覆盖 ' + ids.length + ' 个分支，可以一次写多个部位。')),
    targets: targetsText(ids, branches),
    hooks: hooksForScope(scope || 'online'),
    hostVars: HOST_VARS.join(', '),
    scopeName: SCOPE_LABEL[scope] || '全局',
    reference: isPlan ? '' : referenceText(ids, cfg.refMode || 'condensed'),
    existing: isPlan ? '' : existingText(ids, branches),
    preset: presetText || ''
  };
}

function layerOrder(layer) {
  const hit = LAYERS.find(function (l) { return l.id === layer; });
  return hit ? hit.order : 99;
}

function renderText(template, vars) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, function (_, key) {
    return vars[key] === undefined || vars[key] === null ? '' : String(vars[key]);
  }).trim();
}

/**
 * @param {string} nodeId
 * @param {{project:object, presets?:Array, segments?:Array}} options
 * @returns {{text:string, used:Array, bytes:number, tokens:number}}
 */
export function composePrompt(nodeId, options) {
  const project = options.project || {};
  const node = getNode(nodeId) || getNode('plan');
  const scope = scopeOf(node.id);
  const ids = branchIdsOf(node.id);
  const isPlan = node.type === 'plan';

  const presetId = (project.promptCfg && project.promptCfg.presetId) || '';
  const preset = (options.presets || []).find(function (p) { return p.id === presetId; });
  const presetEntries = preset && Array.isArray(preset.entries) ? preset.entries : [];

  const list = mergeSegments(project.segments)
    .concat(presetEntries.map(function (e) {
      return Object.assign({ preset: preset.name }, e, { enabled: e.enabled !== false });
    }));

  const vars = buildVars(node.id, project, preset ? preset.name : '');

  const used = [];
  const texts = [];

  list
    .filter(function (seg) {
      if (!seg || typeof seg.text !== 'string') return false;
      if (seg.enabled === false) return false;
      if (seg.scope && seg.scope !== '*' && seg.scope !== scope) return false;
      if (seg.nodeTypes && seg.nodeTypes.indexOf(node.type) < 0) return false;
      if (seg.cssOnly && isPlan) return false;
      if (seg.branchIds && seg.branchIds.length) {
        const hit = seg.branchIds.some(function (id) { return ids.indexOf(id) > -1; });
        if (!hit) return false;
      }
      return true;
    })
    .sort(function (a, b) {
      const d = layerOrder(a.layer) - layerOrder(b.layer);
      if (d !== 0) return d;
      return (a.order || 0) - (b.order || 0);
    })
    .forEach(function (seg) {
      const text = renderText(seg.text, vars);
      if (!text) return; /* 占位符替换后为空 → 视为没有内容，直接跳过 */
      used.push({
        id: seg.id,
        layer: seg.layer,
        title: seg.title,
        preset: seg.preset || '',
        bytes: text.length
      });
      texts.push(text);
    });

  const text = texts.join('\n\n');
  return {
    text: text,
    used: used,
    bytes: text.length,
    tokens: estimateTokens(text)
  };
}
