/**
 * 对话树：每个节点就是一个对话。
 * 分支节点的 id 与分支 id 相同（online.bubble-me），scope/group 节点通过子节点收集 branchIds。
 */

export const NODES = [
  { id: 'root', parentId: '', type: 'root', label: '美化', scope: '', order: 0 },
  { id: 'plan', parentId: 'root', type: 'plan', label: '风格规划', scope: '', order: 1 },

  /* ---------------- 线上 ---------------- */
  { id: 'online', parentId: 'root', type: 'scope', label: '线上', scope: 'online', order: 10 },

  { id: 'online.tokens', parentId: 'online', type: 'branch', label: '令牌', scope: 'online', order: 11 },
  { id: 'online.bg', parentId: 'online', type: 'branch', label: '聊天背景', scope: 'online', order: 12 },
  { id: 'online.header', parentId: 'online', type: 'branch', label: '顶栏', scope: 'online', order: 13 },

  { id: 'group.online.bubble', parentId: 'online', type: 'group', label: '气泡', scope: 'online', order: 14 },
  { id: 'online.bubble-me', parentId: 'group.online.bubble', type: 'branch', label: '我方气泡', scope: 'online', order: 1 },
  { id: 'online.bubble-you', parentId: 'group.online.bubble', type: 'branch', label: '对方气泡', scope: 'online', order: 2 },
  { id: 'online.bubble-tail', parentId: 'group.online.bubble', type: 'branch', label: '气泡尾巴', scope: 'online', order: 3 },

  { id: 'group.online.content', parentId: 'online', type: 'group', label: '内容', scope: 'online', order: 15 },
  { id: 'online.quote', parentId: 'group.online.content', type: 'branch', label: '引用 / 回复块', scope: 'online', order: 1 },
  { id: 'online.time', parentId: 'group.online.content', type: 'branch', label: '时间 / 发送者 / 灰字', scope: 'online', order: 2 },
  { id: 'online.translation', parentId: 'group.online.content', type: 'branch', label: '翻译', scope: 'online', order: 3 },
  { id: 'online.msgrow', parentId: 'group.online.content', type: 'branch', label: '消息行与头像（只读）', scope: 'online', order: 4 },

  { id: 'group.online.input', parentId: 'online', type: 'group', label: '输入', scope: 'online', order: 16 },
  { id: 'online.input', parentId: 'group.online.input', type: 'branch', label: '输入栏', scope: 'online', order: 1 },
  { id: 'online.plus', parentId: 'group.online.input', type: 'branch', label: '加号面板', scope: 'online', order: 2 },

  { id: 'group.online.card', parentId: 'online', type: 'group', label: '卡片', scope: 'online', order: 17 },
  { id: 'online.card-transfer', parentId: 'group.online.card', type: 'branch', label: '转账 / 收款', scope: 'online', order: 1 },
  { id: 'online.card-media', parentId: 'group.online.card', type: 'branch', label: '图片 / 位置', scope: 'online', order: 2 },
  { id: 'online.card-voice', parentId: 'group.online.card', type: 'branch', label: '语音', scope: 'online', order: 3 },
  { id: 'online.card-sticker', parentId: 'group.online.card', type: 'branch', label: '表情包 / 贴纸', scope: 'online', order: 4 },
  { id: 'online.card-forward', parentId: 'group.online.card', type: 'branch', label: '聊天记录', scope: 'online', order: 5 },
  { id: 'online.card-invite', parentId: 'group.online.card', type: 'branch', label: '邀请', scope: 'online', order: 6 },
  { id: 'online.card-notice', parentId: 'group.online.card', type: 'branch', label: '通知', scope: 'online', order: 7 },
  { id: 'online.card-money', parentId: 'group.online.card', type: 'branch', label: '赠送 / 代付 / 亲属卡', scope: 'online', order: 8 },
  { id: 'online.receipt', parentId: 'group.online.card', type: 'branch', label: '小票 / 弹窗', scope: 'online', order: 9 },

  { id: 'online.overlay', parentId: 'online', type: 'branch', label: '搜索 / 浮层 / 徽标', scope: 'online', order: 18 },

  /* ---------------- 线下 ---------------- */
  { id: 'offline', parentId: 'root', type: 'scope', label: '线下', scope: 'offline', order: 20 },
  { id: 'offline.tokens', parentId: 'offline', type: 'branch', label: '令牌', scope: 'offline', order: 1 },
  { id: 'offline.card-tokens', parentId: 'offline', type: 'branch', label: '档案卡令牌', scope: 'offline', order: 2 },
  { id: 'offline.card-chrome', parentId: 'offline', type: 'branch', label: '档案卡外观', scope: 'offline', order: 3 },
  { id: 'offline.card-body', parentId: 'offline', type: 'branch', label: '档案卡正文', scope: 'offline', order: 4 },
  { id: 'offline.sidebar', parentId: 'offline', type: 'branch', label: '侧栏目录', scope: 'offline', order: 5 },
  { id: 'offline.form', parentId: 'offline', type: 'branch', label: '子面板表单', scope: 'offline', order: 6 },

  /* ---------------- 全局 ---------------- */
  { id: 'global', parentId: 'root', type: 'scope', label: '全局', scope: 'global', order: 30 },
  { id: 'global.tokens', parentId: 'global', type: 'branch', label: '令牌', scope: 'global', order: 1 },
  { id: 'global.desktop', parentId: 'global', type: 'branch', label: '桌面 / Dock', scope: 'global', order: 2 },
  { id: 'global.feed', parentId: 'global', type: 'branch', label: '动态流', scope: 'global', order: 3 },
  { id: 'global.list', parentId: 'global', type: 'branch', label: '列表', scope: 'global', order: 4 },
  { id: 'global.nav', parentId: 'global', type: 'branch', label: '底部导航', scope: 'global', order: 5 },
  { id: 'global.dialog', parentId: 'global', type: 'branch', label: '弹窗 / 空状态', scope: 'global', order: 6 },
  { id: 'global.typo', parentId: 'global', type: 'branch', label: '字体 / 滚动条', scope: 'global', order: 7 }
];

const BY_ID = {};
NODES.forEach(function (n) { BY_ID[n.id] = n; });

const CHILDREN = {};
NODES.forEach(function (n) {
  const p = n.parentId || '';
  CHILDREN[p] = CHILDREN[p] || [];
  CHILDREN[p].push(n);
});
Object.keys(CHILDREN).forEach(function (k) {
  CHILDREN[k].sort(function (a, b) { return a.order - b.order; });
});

export function getNode(id) {
  return BY_ID[id] || null;
}

export function childrenOf(id) {
  return (CHILDREN[id || ''] || []).slice();
}

/** 根层级（美化、风格规划…）实际上只有 root 一个入口，这里返回 root 的子节点 */
export function topLevel() {
  return childrenOf('root');
}

/** 从根到该节点的路径 */
export function pathOf(id) {
  const out = [];
  let cur = getNode(id);
  let guard = 0;
  while (cur && guard < 20) {
    out.unshift(cur);
    cur = cur.parentId ? getNode(cur.parentId) : null;
    guard += 1;
  }
  return out;
}

/** 面包屑：线上 · 我方气泡 */
export function breadcrumb(id) {
  const path = pathOf(id).filter(function (n) { return n.type !== 'root'; });
  return path.map(function (n) { return n.label; }).join(' · ');
}

/** 该节点覆盖的所有分支 id（含后代） */
export function branchIdsOf(id) {
  const node = getNode(id);
  if (!node) return [];
  if (node.type === 'branch') return [node.id];
  if (node.type === 'root' || node.type === 'plan') return [];
  const out = [];
  (function walk(nid) {
    childrenOf(nid).forEach(function (child) {
      if (child.type === 'branch') out.push(child.id);
      else walk(child.id);
    });
  })(id);
  return out;
}

export function scopeOf(id) {
  const node = getNode(id);
  if (node && node.scope) return node.scope;
  if (id && id.indexOf('online') === 0) return 'online';
  if (id && id.indexOf('offline') === 0) return 'offline';
  if (id && id.indexOf('global') === 0) return 'global';
  return '';
}

export function allBranchNodes() {
  return NODES.filter(function (n) { return n.type === 'branch'; });
}

export function branchNodesOfScope(scope) {
  return NODES.filter(function (n) { return n.type === 'branch' && n.scope === scope; });
}

export function labelOf(id) {
  const n = getNode(id);
  return n ? n.label : id;
}

/** 节点处可写入的分支：分支节点=自己；组/作用域=子分支 */
export function writableBranchIds(id) {
  return branchIdsOf(id);
}

export const SCOPE_LABEL = { online: '线上', offline: '线下', global: '全局' };
