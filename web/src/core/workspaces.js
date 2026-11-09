/** 方案（工作区）：一个方案 = 一套 35 分支 + 一组对话 + 一份 promptCfg */
import { emptyBranches, normalize } from './branches.js';

export const DEFAULT_PROJECT_ID = 'p_default';
export const DEFAULT_PROJECT_NAME = '我的美化';

export function uid(prefix) {
  const rnd = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return (prefix || 'id') + '_' + rnd;
}

export function defaultPromptCfg() {
  return {
    injectHooks: false,
    injectExisting: false,
    refMode: 'condensed',
    presetId: ''
  };
}

export function normalizePromptCfg(cfg) {
  const base = defaultPromptCfg();
  const out = Object.assign({}, base, cfg || {});
  if (['off', 'condensed', 'full'].indexOf(out.refMode) < 0) out.refMode = 'condensed';
  out.injectHooks = !!out.injectHooks;
  out.injectExisting = !!out.injectExisting;
  out.presetId = typeof out.presetId === 'string' ? out.presetId : '';
  return out;
}

/** 方案元信息（列表里用） */
export function projectMeta(project) {
  const branches = project.branches || {};
  let written = 0;
  Object.keys(branches).forEach(function (id) {
    const b = branches[id];
    if (b && b.css && b.css.trim()) written += 1;
  });
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    written: written
  };
}

export function newProject(name, opts) {
  const now = Date.now();
  return {
    id: (opts && opts.id) || uid('p'),
    name: String(name || '未命名方案').trim() || '未命名方案',
    branches: emptyBranches(),
    nodes: {},
    promptCfg: {},
    activeNodeId: 'plan',
    createdAt: now,
    updatedAt: now
  };
}

/** 把磁盘上读到的方案补齐字段 */
export function normalizeProject(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const fallback = newProject(raw.name || DEFAULT_PROJECT_NAME, { id: raw.id });
  const project = Object.assign({}, fallback, raw);
  project.id = raw.id || fallback.id;
  project.name = raw.name || fallback.name;
  project.branches = normalize(raw.branches);
  project.nodes = raw.nodes && typeof raw.nodes === 'object' ? raw.nodes : {};
  project.promptCfg = raw.promptCfg && typeof raw.promptCfg === 'object' ? raw.promptCfg : {};
  project.activeNodeId = raw.activeNodeId || 'plan';
  project.createdAt = raw.createdAt || fallback.createdAt;
  project.updatedAt = raw.updatedAt || fallback.updatedAt;
  return project;
}

export function cfgOf(project, nodeId) {
  if (!project) return defaultPromptCfg();
  return normalizePromptCfg(project.promptCfg[nodeId]);
}

export function setCfg(project, nodeId, patch) {
  if (!project) return null;
  const next = normalizePromptCfg(Object.assign({}, cfgOf(project, nodeId), patch || {}));
  project.promptCfg[nodeId] = next;
  project.updatedAt = Date.now();
  return next;
}

/** 深拷贝一个方案（换新 id、名称加「副本」） */
export function duplicateProject(project, name) {
  const now = Date.now();
  return {
    id: uid('p'),
    name: (name || (project.name + ' 副本')),
    branches: JSON.parse(JSON.stringify(project.branches || {})),
    nodes: JSON.parse(JSON.stringify(project.nodes || {})),
    promptCfg: JSON.parse(JSON.stringify(project.promptCfg || {})),
    activeNodeId: project.activeNodeId || 'plan',
    createdAt: now,
    updatedAt: now
  };
}

/** 导出记录裁剪：条数 ≤10，单条 css 超 120KB 只留摘要 */
export const EXPORT_LIMIT = 10;
export const EXPORT_CSS_LIMIT = 120 * 1024;

export function pushExportRecord(list, record) {
  const item = Object.assign({}, record);
  if (item.css && item.css.length > EXPORT_CSS_LIMIT) {
    item.truncated = true;
    item.css = item.css.slice(0, EXPORT_CSS_LIMIT) + '\n\n/* …超出 120KB，已截断，请重新导出完整文件… */';
  }
  const next = [item].concat(list || []);
  return next.slice(0, EXPORT_LIMIT);
}
