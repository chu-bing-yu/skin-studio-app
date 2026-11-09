/**
 * 默认段库：提示词 = 若干「段」按顺序拼接，段是纯数据，可编辑/关闭/排序。
 * 占位符由 compose 在组装时替换；替换后为空的段会自动跳过。
 */
import { HARD_PROTOCOL } from './protocol.js';

export const LAYERS = [
  { id: 'style', label: '全局风格', order: 10 },
  { id: 'plan', label: '风格规划', order: 20 },
  { id: 'scope', label: '作用域规则', order: 30 },
  { id: 'branch', label: '分支规则', order: 40 },
  { id: 'task', label: '本次任务', order: 50 }
];

export const HARD_RULES = [
  '只改视觉，不改 DOM 结构与交互；不新增 class，只覆盖宿主已有选择器。',
  '气泡（.bubble-sent / .bubble-received）禁止写 border-radius / width / max-width / padding / margin / gap —— 这些是「聊天外观」设置里的内联值。',
  '尾巴只能改三角颜色（.bubble-tail-ios 的 ::before 的 border-*-color），形状、尺寸、位置不动。',
  '改了气泡底色，必须同时给出尾巴三角颜色，否则 iOS 尾巴会脱色。',
  '图片只能用素材库登记的外链，写成 var(--ss-img-<名字>)；禁止 base64 内嵌。',
  '禁止 backdrop-filter；filter 尽量不用；禁止 * 通配选择器、nth-child、[class*=]。',
  '变量统一 --ss- 前缀；引用前必须在同一作用域的令牌分支里定义。'
];

/** 默认段：id 稳定，用户改动按 id 覆盖 text/enabled/order */
export function defaultSegments() {
  return [
    {
      id: 'style.role',
      layer: 'style',
      title: '角色与产物',
      scope: '*',
      enabled: true,
      order: 1,
      text: '你是 Roche（小手机）的外观皮肤工程师。Roche 是纯前端移动应用，用户把 CSS 粘贴进「美化」面板生效。只输出 CSS，不写 JS / HTML。'
    },
    {
      id: 'style.rules',
      layer: 'style',
      title: '硬规则（7 条）',
      scope: '*',
      enabled: true,
      order: 2,
      text: '【硬规则】\n' + HARD_RULES.map(function (r, i) { return (i + 1) + '. ' + r; }).join('\n')
    },
    {
      id: 'plan.brief',
      layer: 'plan',
      title: '规划对话任务',
      scope: '*',
      nodeTypes: ['plan'],
      enabled: true,
      order: 1,
      text: [
        '这是「风格规划」对话，不直接产出部位 CSS。和用户把整套美化的设计语言定下来，输出可执行规范：',
        '1. 设计语言三句话：材质、排版、留白。',
        '2. 令牌规范：建议的 --ss-* 变量（纸面 / 墨色 / 强调 / 线 / 圆角），日夜两套值。',
        '3. 命名与边界：哪些部位归线上 / 线下 / 全局，哪些碰不得。',
        '4. 验收清单：3–6 条能一眼判断对错的检查项。',
        '5. 落地顺序：先令牌，再气泡与顶栏，最后卡片与线下。'
      ].join('\n')
    },
    {
      id: 'scope.context',
      layer: 'scope',
      title: '当前对话与作用域',
      scope: '*',
      cssOnly: true,
      enabled: true,
      order: 1,
      text: '【当前对话】{{context}}'
    },
    {
      id: 'scope.targets',
      layer: 'scope',
      title: '目标分支清单',
      scope: '*',
      cssOnly: true,
      enabled: true,
      order: 2,
      text: '【目标分支】\n{{targets}}'
    },
    {
      id: 'scope.hooks',
      layer: 'scope',
      title: '钩子白名单（默认关）',
      scope: '*',
      cssOnly: true,
      enabled: false,
      order: 3,
      text: '【可用钩子 · {{scopeName}}】\n{{hooks}}\n\n【宿主 CSS 变量（可直接赋值）】\n{{hostVars}}'
    },
    {
      id: 'branch.reference',
      layer: 'branch',
      title: '参考片段（默认精炼）',
      scope: '*',
      cssOnly: true,
      enabled: true,
      order: 1,
      text: '{{reference}}'
    },
    {
      id: 'branch.existing',
      layer: 'branch',
      title: '该部位已有 CSS（默认关）',
      scope: '*',
      cssOnly: true,
      enabled: false,
      order: 2,
      text: '【目标分支现有 CSS（在此基础上改）】\n{{existing}}'
    },
    {
      id: 'task.protocol',
      layer: 'task',
      title: '输出协议',
      scope: '*',
      enabled: true,
      order: 1,
      text: HARD_PROTOCOL
    },
    {
      id: 'task.reminder',
      layer: 'task',
      title: '交付提醒',
      scope: '*',
      cssOnly: true,
      enabled: true,
      order: 2,
      text: '要求：每个【分支】后紧跟且只跟一个 ```css 代码块；【分支】只能填上面列出的目标分支 id；不需要改的分支不要输出；纯聊天时不要输出 CSS 代码块。'
    }
  ];
}

/** 把用户改动合并到默认段库（按 id 覆盖，允许新增自定义段） */
export function mergeSegments(custom) {
  const base = defaultSegments();
  const list = custom && Array.isArray(custom) ? custom : [];
  const byId = {};
  list.forEach(function (s) { if (s && s.id) byId[s.id] = s; });

  const out = base.map(function (d) {
    const c = byId[d.id];
    if (!c) return Object.assign({}, d);
    return Object.assign({}, d, {
      text: typeof c.text === 'string' ? c.text : d.text,
      enabled: typeof c.enabled === 'boolean' ? c.enabled : d.enabled,
      order: typeof c.order === 'number' ? c.order : d.order,
      title: c.title || d.title
    });
  });

  /* 用户新增的段（id 不在默认库里） */
  list.forEach(function (c) {
    if (!c || !c.id) return;
    if (base.some(function (d) { return d.id === c.id; })) return;
    out.push({
      id: c.id,
      layer: c.layer || 'style',
      title: c.title || '自定义段',
      text: c.text || '',
      scope: c.scope || '*',
      branchIds: c.branchIds || null,
      nodeTypes: c.nodeTypes || null,
      cssOnly: !!c.cssOnly,
      enabled: c.enabled !== false,
      order: typeof c.order === 'number' ? c.order : 99,
      custom: true
    });
  });

  return out;
}
