/**
 * 条目化预设：预设 = 一组「预设条目」，每条对应一个 CSS 部位/作用域，可单独开关。
 * 用户强调过：预设不能再是一整段话，必须按部位拆开。
 */
import { uid } from '../core/workspaces.js';

const BUBBLE_IDS = ['online.bubble-me', 'online.bubble-you', 'online.bubble-tail'];
const CARD_IDS = [
  'online.card-transfer', 'online.card-media', 'online.card-voice', 'online.card-sticker',
  'online.card-forward', 'online.card-invite', 'online.card-notice', 'online.card-money',
  'online.receipt'
];

function entry(id, title, layer, scope, text, branchIds) {
  return { id: id, title: title, layer: layer, scope: scope, text: text, branchIds: branchIds || null, enabled: true };
}

const BUILTIN = [
  {
    id: 'preset_magazine',
    name: '杂志风（细线衬线）',
    scope: '*',
    builtin: true,
    desc: '版面感：细线分层、衬线标题、等宽元信息',
    entries: [
      entry('pm.style', '全局语气', 'style', '*',
        '整体取向：杂志版面，靠排版与留白，不靠装饰。只用 1px 细线分区；禁止阴影堆叠、渐变、玻璃模糊；圆角 ≤ 4px（气泡形状归宿主设置，不碰）。'),
      entry('pm.bubble', '线上 · 气泡', 'branch', 'online',
        '气泡只改配色与字排：我方墨块浅字、对方纸面深字；改底色必须同时给尾巴三角同色；字号 15px / 行高 1.7。',
        BUBBLE_IDS),
      entry('pm.header', '线上 · 顶栏', 'branch', 'online',
        '顶栏纸底 + 底部 1px 细线，标题衬线 17px，副标题等宽小字大写 + 字距 0.14em；按钮不加胶囊底。',
        ['online.header']),
      entry('pm.input', '线上 · 输入栏', 'branch', 'online',
        '输入栏顶部 1px 细线，textarea 无边框，发送键墨色实心小方块（≤4px 圆角），禁用态降为灰线框。',
        ['online.input']),
      entry('pm.cards', '线上 · 卡片', 'branch', 'online',
        '卡片一律去掉投影，用 1px 线框；金额用大号衬线 + 等宽币种；邀请类做成票券（左侧细竖栏 + 大写类别标签）；小票用等宽 + 虚线分隔。',
        CARD_IDS),
      entry('pm.offline', '线下 · 档案卡', 'branch', 'offline',
        '档案卡：作者行等宽大写 + 时间右对齐 → 细线 → 衬线标题 → 正文首字下沉 → 页脚细线 + 等宽指标；圆角 ≤ 4px。',
        ['offline.card-chrome', 'offline.card-body']),
      entry('pm.nav', '全局 · 导航', 'branch', 'global',
        '底部导航做报纸页脚：顶部 1px 线，选中项上方 2px 强调短线，未选中灰；不用悬浮胶囊。',
        ['global.nav'])
    ]
  },
  {
    id: 'preset_paper',
    name: '纸感低饱和',
    scope: '*',
    builtin: true,
    desc: '米灰纸面 + 冷调墨色，靠灰阶层次',
    entries: [
      entry('pp.style', '全局语气', 'style', '*',
        '整体取向：米灰纸面 + 冷调墨色。底色偏暖灰、卡片面比底纸略亮一档，不要纯白刺眼；分区只用 1px 线，不用卡片投影；正文 15px / 行高 1.75。'),
      entry('pp.tokens', '线上 · 令牌', 'branch', 'online',
        '令牌给日夜两套：纸面 / 卡面 / 次级面 / 墨 / 次墨 / 灰 / 线 / 强调（只保留一个低饱和强调色）。夜间是「纸变墨、墨变纸」，不是简单反色。',
        ['online.tokens']),
      entry('pp.bubble', '线上 · 气泡', 'branch', 'online',
        '对方气泡纸面 + 1px 线，我方气泡墨块；尾巴三角跟同色。不要改圆角与内边距。',
        BUBBLE_IDS),
      entry('pp.offline', '线下 · 档案卡', 'branch', 'offline',
        '档案卡纸感：卡面比页面底纸亮一档，边框 1px 暖灰，页脚指标等宽小字；引用块用左侧 3px 细线。',
        ['offline.card-chrome', 'offline.card-body'])
    ]
  },
  {
    id: 'preset_night',
    name: '暗夜静默',
    scope: '*',
    builtin: true,
    desc: '低亮度、低对比、不刺眼',
    entries: [
      entry('pn.style', '全局语气', 'style', '*',
        '整体取向：夜间阅读。底色深墨、卡片略亮一档、正文浅灰；禁止纯黑纯白对撞、禁止发光描边、禁止大面积高饱和色块；强调色只出现在选中态与状态点。'),
      entry('pn.tokens', '线上 · 令牌', 'branch', 'online',
        '深色令牌：底 #12151A、卡 #181C22、次级 #1F242B、墨 #E8E6E1、次墨 #C3C7CB、线 #2B3138；强调色压到最低饱和度。',
        ['online.tokens']),
      entry('pn.cards', '线上 · 卡片', 'branch', 'online',
        '深色卡片用 1px 线而非阴影区分层级；金额与按钮用同一强调色；状态标签只调灰度，不加彩色底。',
        CARD_IDS)
    ]
  },
  {
    id: 'preset_minimal',
    name: '极简克制',
    scope: '*',
    builtin: true,
    desc: '只留文字与 1px 线',
    entries: [
      entry('pi.style', '全局语气', 'style', '*',
        '整体取向：能删就删。只保留文字与 1px 线；图标尺寸与点击区一律不动；颜色只允许黑白灰 + 一个低饱和强调；不要给按钮加底色、不要给卡片加边框，靠留白分组。'),
      entry('pi.bubble', '线上 · 气泡', 'branch', 'online',
        '气泡只区分深浅两档，不要描边、不要阴影；尾巴同色。',
        BUBBLE_IDS),
      entry('pi.nav', '全局 · 导航', 'branch', 'global',
        '导航只留文字与选中短线，去掉背景块与角标底色。',
        ['global.nav'])
    ]
  }
];

export function builtinPresets() {
  return BUILTIN.map(function (p) {
    return {
      id: p.id,
      name: p.name,
      scope: p.scope,
      desc: p.desc,
      builtin: true,
      entries: p.entries.map(function (e) { return Object.assign({}, e, { branchIds: e.branchIds ? e.branchIds.slice() : null }); })
    };
  });
}

export function allPresets(custom) {
  const list = builtinPresets();
  (custom || []).forEach(function (p) {
    if (!p || !p.id) return;
    list.push({
      id: p.id,
      name: p.name || '未命名预设',
      scope: p.scope || '*',
      desc: p.desc || '',
      builtin: false,
      entries: Array.isArray(p.entries) ? p.entries.map(function (e) { return Object.assign({}, e); }) : []
    });
  });
  return list;
}

export function findPreset(custom, id) {
  if (!id) return null;
  return allPresets(custom).find(function (p) { return p.id === id; }) || null;
}

export function presetsForScope(custom, scope) {
  return allPresets(custom).filter(function (p) {
    return !p.scope || p.scope === '*' || p.scope === scope;
  });
}

export function createPreset(name, desc) {
  return {
    id: uid('preset'),
    name: String(name || '未命名预设').trim() || '未命名预设',
    desc: desc || '',
    scope: '*',
    builtin: false,
    entries: [],
    createdAt: Date.now()
  };
}

export function clonePreset(preset) {
  return {
    id: uid('preset'),
    name: (preset.name || '预设') + ' 副本',
    desc: preset.desc || '',
    scope: preset.scope || '*',
    builtin: false,
    entries: (preset.entries || []).map(function (e) {
      return Object.assign({}, e, { id: uid('pe'), branchIds: e.branchIds ? e.branchIds.slice() : null });
    }),
    createdAt: Date.now()
  };
}

export function updatePreset(custom, id, patch) {
  const list = custom || [];
  const idx = list.findIndex(function (p) { return p.id === id; });
  if (idx < 0) return false;
  list[idx] = Object.assign({}, list[idx], patch || {}, { builtin: false });
  return true;
}

export function removePreset(custom, id) {
  const list = custom || [];
  const idx = list.findIndex(function (p) { return p.id === id; });
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

export function isBuiltin(id) {
  return BUILTIN.some(function (p) { return p.id === id; });
}

/** 把某个段/条目并入现有预设（同 id 覆盖） */
export function upsertEntry(presets, presetId, entryToAdd) {
  const preset = (presets || []).find(function (p) { return p.id === presetId; });
  if (!preset) return false;
  const idx = preset.entries.findIndex(function (e) { return e.id === entryToAdd.id; });
  if (idx > -1) preset.entries[idx] = Object.assign({}, preset.entries[idx], entryToAdd);
  else preset.entries.push(Object.assign({ id: uid('pe') }, entryToAdd));
  return true;
}
