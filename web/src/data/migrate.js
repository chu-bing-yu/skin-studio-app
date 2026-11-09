/** 旧插件数据迁移：支持从 skin-studio 导出的 JSON 映射成新方案 */
import { emptyBranches, normalize as normalizeBranches } from '../core/branches.js';
import { uid } from '../core/workspaces.js';

function newProject(name, branches, nodes, promptCfg, activeNodeId) {
  const now = Date.now();
  return {
    id: uid('p'),
    name: name || '导入的美化',
    branches: normalizeBranches(branches || emptyBranches()),
    nodes: nodes || {},
    promptCfg: promptCfg || {},
    segments: null,
    activeNodeId: activeNodeId || 'plan',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * 解析旧数据。支持三种输入：
 * 1) 新备份：{ projects: [...], presets: [...], settings: {...} }
 * 2) 插件 storage 原始键值：{ 'ss.projects': [...], 'ss.project.<pid>': {...}, 'ss.presets': [...] }
 * 3) 单个 { name, branches } 对象
 */
export function parseImport(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || typeof data !== 'object') throw new Error('不是有效的 JSON 对象');

  const projects = [];
  const presets = [];
  let settings = null;

  if (Array.isArray(data.projects)) {
    data.projects.forEach(function (p) {
      projects.push(newProject(p.name, p.branches, p.nodes, p.promptCfg, p.activeNodeId));
    });
    if (Array.isArray(data.presets)) presets.push.apply(presets, data.presets);
    if (data.settings) settings = data.settings;
    return { projects: projects, presets: presets, settings: settings };
  }

  if (Array.isArray(data['ss.projects'])) {
    data['ss.projects'].forEach(function (meta) {
      const body = data['ss.project.' + meta.id];
      if (!body) return;
      projects.push(newProject(meta.name || body.name, body.branches, body.nodes, body.promptCfg, body.activeNodeId));
    });
    if (Array.isArray(data['ss.presets'])) presets.push.apply(presets, data['ss.presets']);
    if (data['ss.settings']) settings = data['ss.settings'];
    return { projects: projects, presets: presets, settings: settings };
  }

  if (data.branches) {
    projects.push(newProject(data.name || '导入的美化', data.branches, data.nodes, data.promptCfg, data.activeNodeId));
    return { projects: projects, presets: presets, settings: settings };
  }

  throw new Error('认不出这份数据：需要包含 projects / ss.projects / branches');
}
