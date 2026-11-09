/** 段的 CRUD / 排序 / 分组（操作 project.segments，调用方负责落盘） */
import { LAYERS, mergeSegments } from './defaults.js';
import { uid } from '../core/workspaces.js';

/** 首次编辑时把默认库固化进项目，之后所有改动都在这个数组上 */
export function ensureSegments(project) {
  if (!project) return [];
  if (!Array.isArray(project.segments) || !project.segments.length) {
    project.segments = mergeSegments(null);
  }
  return project.segments;
}

export function resetSegments(project) {
  if (!project) return [];
  project.segments = mergeSegments(null);
  return project.segments;
}

export function findSegment(project, id) {
  return ensureSegments(project).find(function (s) { return s.id === id; }) || null;
}

export function setEnabled(project, id, enabled) {
  const seg = findSegment(project, id);
  if (!seg) return false;
  seg.enabled = !!enabled;
  return true;
}

export function setText(project, id, text) {
  const seg = findSegment(project, id);
  if (!seg) return false;
  seg.text = String(text == null ? '' : text);
  return true;
}

export function setTitle(project, id, title) {
  const seg = findSegment(project, id);
  if (!seg) return false;
  seg.title = String(title || '').trim() || seg.title;
  return true;
}

/** 同层内上移/下移 */
export function moveSegment(project, id, dir) {
  const list = ensureSegments(project);
  const seg = list.find(function (s) { return s.id === id; });
  if (!seg) return false;
  const sameLayer = list
    .filter(function (s) { return s.layer === seg.layer; })
    .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  const idx = sameLayer.findIndex(function (s) { return s.id === id; });
  const target = idx + (dir > 0 ? 1 : -1);
  if (target < 0 || target >= sameLayer.length) return false;
  const a = sameLayer[idx];
  const b = sameLayer[target];
  const tmp = a.order;
  a.order = b.order;
  b.order = tmp;
  return true;
}

export function addCustomSegment(project, opts) {
  const list = ensureSegments(project);
  const seg = {
    id: uid('seg'),
    layer: (opts && opts.layer) || 'style',
    title: (opts && opts.title) || '自定义段',
    text: (opts && opts.text) || '',
    scope: (opts && opts.scope) || '*',
    branchIds: (opts && opts.branchIds) || null,
    enabled: true,
    order: 90,
    custom: true
  };
  list.push(seg);
  return seg;
}

export function removeSegment(project, id) {
  const list = ensureSegments(project);
  const idx = list.findIndex(function (s) { return s.id === id; });
  if (idx < 0) return false;
  if (!list[idx].custom) {
    /* 默认段不删，只关掉 */
    list[idx].enabled = false;
    return true;
  }
  list.splice(idx, 1);
  return true;
}

/** 按五层分组，层内按 order 排序 */
export function groupByLayer(segments) {
  return LAYERS.map(function (layer) {
    return {
      id: layer.id,
      label: layer.label,
      order: layer.order,
      items: (segments || [])
        .filter(function (s) { return s.layer === layer.id; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
    };
  });
}
