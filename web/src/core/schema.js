/**
 * 分支 schema —— 整个插件的数据骨架
 * 作用域：online（线上聊天）/ global（主页全局）/ offline（线下模式）
 * 分支：35 个部位，每个部位独立存 CSS、独立开关、独立状态
 */

export const SCOPES = [
  { id: 'online', name: '线上', desc: '聊天页：气泡、引用、卡片、输入栏' },
  { id: 'global', name: '全局', desc: '主页、桌面、动态、列表、导航' },
  { id: 'offline', name: '线下', desc: '线下模式的档案卡与侧栏' }
];

/** 导出顺序：全局 → 线上 → 线下（全局变量先行） */
export const EXPORT_ORDER = ['global', 'online', 'offline'];

export const BRANCHES = [
  /* ---------------- 线上 22 ---------------- */
  {
    id: 'online.tokens', scope: 'online', name: '令牌（日夜双色）',
    hint: '定义整套 --ss-* 变量，其余分支只引用；含 prefers-color-scheme: dark 覆盖',
    forbid: [],
    skeleton: `/* 令牌：先定这里，别的分支只写 var(--ss-*) */
:root{
  --ss-paper:#f5f4f0;
  --ss-ink:#1a1e21;
  --ss-me-bg:#232a2e;
  --ss-me-ink:#f3f2ed;
  --ss-you-bg:#fbfbf8;
}
@media (prefers-color-scheme: dark){
  :root{ --ss-paper:#12151a; --ss-ink:#e8e6e1; }
}
`
  },
  {
    id: 'online.bg', scope: 'online', name: '聊天背景（默认关闭）',
    hint: '只能改背景图与遮罩，会覆盖宿主原生聊天背景',
    forbid: ['width', 'height', 'padding', 'margin', 'filter'],
    enabled: false,
    skeleton: `/* 默认关闭：宿主原生背景优先，打开前先确认没传过背景图 */
.chat-scroll-area{
  background-image: var(--ss-img-chat-bg, none);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
`
  },
  {
    id: 'online.header', scope: 'online', name: '顶栏', hint: '顶栏底色、细线、标题字排、头像描边',
    skeleton: `header:has(.chat-header-title){
  background-color: var(--ss-paper);
  border-bottom: 1px solid rgba(0,0,0,.08);
}
.chat-header-title{ font-size:17px; font-weight:600; color: var(--ss-ink); }
`
  },
  {
    id: 'online.msgrow', scope: 'online', name: '消息行 / 头像 / 间距（只读说明）',
    hint: '部位说明：头像尺寸、头像↔气泡间距、消息外距由「聊天外观」设置控制，不要写死',
    locked: true,
    forbid: ['border-radius', 'width', 'height', 'padding', 'margin', 'gap'],
    skeleton: `/* 只读说明位：此处故意留空
   头像尺寸、头像与气泡间距、消息行外距都是聊天外观设置里的内联值，
   写死会让用户的快捷修改永久失效。需要微调请去聊天外观里改。 */
`
  },
  {
    id: 'online.bubble-me', scope: 'online', name: '我方气泡',
    hint: '只改底色/文字色/描边/字号行高；改底色必须同步 online.bubble-tail 的三角色',
    forbid: ['border-radius', 'width', 'max-width', 'padding', 'margin', 'gap'],
    skeleton: `/* 该底色必须同步 online.bubble-tail 的三角色，否则尾巴脱色 */
.bubble-sent[class]{
  background-color: var(--ss-me-bg,#232a2e);
  color: var(--ss-me-ink,#f3f2ed);
}
`
  },
  {
    id: 'online.bubble-you', scope: 'online', name: '对方气泡',
    hint: '只改底色/文字色/描边/字号行高',
    forbid: ['border-radius', 'width', 'max-width', 'padding', 'margin', 'gap'],
    skeleton: `.bubble-received[class]{
  background-color: var(--ss-you-bg,#fbfbf8);
  color: var(--ss-ink,#1a1e21);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
}
`
  },
  {
    id: 'online.bubble-tail', scope: 'online', name: '气泡尾巴',
    hint: '只能改三角颜色（形状/尺寸/位置归宿主）',
    forbid: ['border-radius', 'width', 'height', 'bottom', 'left', 'right'],
    skeleton: `/* 只接颜色：iOS 尾巴是 ::before 三角，宿主写死了 #F1F1F1 / #000 */
.bubble-tail-ios.bubble-sent[class]::before{ border-left-color: var(--ss-me-bg,#232a2e); }
.bubble-tail-ios.bubble-received[class]::before{ border-right-color: var(--ss-you-bg,#fbfbf8); }
`
  },
  {
    id: 'online.quote', scope: 'online', name: '引用 / 回复块',
    hint: '引用块的底色、左侧竖线、字号',
    skeleton: `.bubble-sent :is(.border-l-2,.border-l){ border-color: rgba(255,255,255,.45); }
.translation-block{ background-color: rgba(0,0,0,.04); }
`
  },
  {
    id: 'online.time', scope: 'online', name: '时间戳 / 发送者名 / 系统灰字',
    hint: '等宽小字、字距、灰色层级',
    skeleton: `:is(.chat-message-time,.chat-message-sender-name){
  font-family: ui-monospace,Menlo,monospace;
  font-size: 10px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(0,0,0,.42);
}
`
  },
  {
    id: 'online.input', scope: 'online', name: '输入栏',
    hint: '底栏底色、顶线、输入框、发送按钮',
    skeleton: `footer:has(.chat-input-bar){
  background-color: var(--ss-paper);
  border-top: 1px solid rgba(0,0,0,.08);
}
.chat-input-send{ border-radius: 8px; }
`
  },
  {
    id: 'online.plus', scope: 'online', name: '+ 面板',
    hint: '加号面板底色、格栅线、序号、标签字排',
    skeleton: `.chat-plus-panel{ counter-reset: ssplus; }
.chat-plus-action{ position: relative; counter-increment: ssplus; }
.chat-plus-action::before{
  content: counter(ssplus,decimal-leading-zero);
  position:absolute; top:4px; left:8px;
  font: 9px/1 ui-monospace,monospace; color: rgba(0,0,0,.35);
}
`
  },
  {
    id: 'online.card-transfer', scope: 'online', name: '卡片：转账/收款',
    hint: '金额字排、币种小字、状态词',
    skeleton: `:is(.chat-card--transfer,[data-card-type="transfer"]) .transfer-amount{
  font-family: Georgia,"Songti SC",serif;
  font-size: 28px;
  font-variant-numeric: tabular-nums;
}
`
  },
  {
    id: 'online.card-media', scope: 'online', name: '卡片：图片/位置',
    hint: '图片圆角与外描边、位置卡 caption',
    skeleton: `.image-card__image{ border-radius: 4px; }
`
  },
  {
    id: 'online.card-voice', scope: 'online', name: '卡片：语音',
    hint: '波形与时长配色',
    skeleton: `.chat-voice-wave--playing{ color: #4d6bfe; }
`
  },
  {
    id: 'online.card-sticker', scope: 'online', name: '卡片：表情包/贴纸',
    hint: '去框去影，不要卡片化',
    skeleton: `:is(.chat-card--sticker,[data-card-type="sticker"]){
  background: transparent; box-shadow: none; border-radius: 0;
}
`
  },
  {
    id: 'online.card-forward', scope: 'online', name: '卡片：聊天记录',
    hint: '目录式排版、条目分隔线',
    skeleton: `:is(.chat-card--forward-bundle,[data-card-type="forward_bundle"]){ border-radius: 4px; }
`
  },
  {
    id: 'online.card-invite', scope: 'online', name: '卡片：邀请类',
    hint: '羁绊/查手机/线下/一起听邀请，票券式竖栏与按钮',
    skeleton: `:is(.chat-card--drip-invite,.chat-card--phone-inspect-invite,.chat-card--listen-together){
  box-shadow: inset 3px 0 0 #4d6bfe;
}
`
  },
  {
    id: 'online.card-notice', scope: 'online', name: '卡片：通知类',
    hint: '视频通话/到账/羁绊通知，编者按式居中灰字',
    skeleton: `:is(.chat-card--video-call-notice,.chat-card--payment-notice,.chat-card--drip-notice){
  background: transparent; box-shadow: none;
}
`
  },
  {
    id: 'online.card-money', scope: 'online', name: '卡片：赠送/代付/亲属卡',
    hint: '结算卡与小票卡的状态色（只调灰与强调色）',
    skeleton: `.checkout-card{ border-radius: 4px; }
.checkout-card__money{ font-variant-numeric: tabular-nums; }
`
  },
  {
    id: 'online.receipt', scope: 'online', name: '小票 / 弹窗',
    hint: '小票、转账弹窗、翻译面板的纸面与按钮',
    skeleton: `.receipt-shell{ border-radius: 4px; }
.receipt-dash{ border-top: 1px dashed rgba(0,0,0,.18); }
`
  },
  {
    id: 'online.translation', scope: 'online', name: '翻译面板',
    hint: '翻译块底色与译文排版',
    skeleton: `.translation-toggle{ font-size: 10px; letter-spacing: .14em; }
`
  },
  {
    id: 'online.overlay', scope: 'online', name: '搜索 / 浮层 / 徽标',
    hint: '搜索面板、未读徽标、正在输入点',
    skeleton: `.chat-other-unread-badge{ border-radius: 2px; }
.typing-dot{ background-color: #4d6bfe; }
`
  },

  /* ---------------- 全局 7 ---------------- */
  {
    id: 'global.tokens', scope: 'global', name: '令牌（纸面与墨色）',
    hint: '定义全站纸面、墨色、细线与强调色，含夜间覆盖',
    skeleton: `:root{
  --ssg-paper:#ffffff;
  --ssg-ink:#1b1c1f;
  --ssg-line:#ecedef;
  --ssg-accent:#4d6bfe;
}
@media (prefers-color-scheme: dark){
  :root{ --ssg-paper:#12151a; --ssg-ink:#e8e6e1; --ssg-line:#2b3138; }
}
`
  },
  {
    id: 'global.desktop', scope: 'global', name: '桌面图标 / Dock',
    hint: '图标圆角、描边、标签字排（宿主用 --desktop-icon-* 变量）',
    skeleton: `:root{ --desktop-icon-radius: 8px; }
.app-label{ letter-spacing: .04em; }
.dock-icon-btn{ box-shadow: inset 0 0 0 1px var(--ssg-line); }
`
  },
  {
    id: 'global.feed', scope: 'global', name: '动态流 / 帖子',
    hint: '条目分隔、正文排版、操作条',
    skeleton: `.post-action-btn{ font-size: 11px; letter-spacing: .08em; }
.message-text{ line-height: 1.75; }
`
  },
  {
    id: 'global.list', scope: 'global', name: '列表（会话/收件箱/收藏）',
    hint: '条目分隔线、未读徽标、头像描边',
    skeleton: `.avatar-abstract{ box-shadow: inset 0 0 0 1px var(--ssg-line); }
`
  },
  {
    id: 'global.nav', scope: 'global', name: '底部导航',
    hint: '导航底色、选中态、文字',
    skeleton: `.bottom-nav{ border-top: 1px solid var(--ssg-line); }
`
  },
  {
    id: 'global.dialog', scope: 'global', name: '弹窗 / 空状态',
    hint: '弹窗纸面与按钮、空状态排版',
    skeleton: `/* 尽量用宿主已有类，别自己造结构 */
`
  },
  {
    id: 'global.typo', scope: 'global', name: '全站字体 / 滚动条',
    hint: '字体栈、等宽元信息、细滚动条、选中色',
    skeleton: `::-webkit-scrollbar{ width:4px; height:4px; }
::-webkit-scrollbar-thumb{ background: var(--ssg-line); border-radius: 999px; }
::selection{ background: rgba(77,107,254,.16); }
`
  },

  /* ---------------- 线下 6 ---------------- */
  {
    id: 'offline.tokens', scope: 'offline', name: '令牌（线下）',
    hint: '线下纸面与墨色，夜间覆盖',
    skeleton: `.offline-mode{
  --sso-paper:#ffffff;
  --sso-ink:#1b1c1f;
  --sso-line:#ecedef;
}
`
  },
  {
    id: 'offline.card-tokens', scope: 'offline', name: '档案卡令牌',
    hint: '直接改宿主 --card-* 令牌：字体/字号/颜色/边线',
    skeleton: `.offline-card[class]{
  --card-surface: var(--sso-paper,#fff);
  --card-title-font: Georgia,"Songti SC",serif;
  --card-title-color: var(--sso-ink,#1b1c1f);
  --card-meta-font: ui-monospace,Menlo,monospace;
  --card-body-line-height: 1.85;
}
`
  },
  {
    id: 'offline.card-chrome', scope: 'offline', name: '档案卡外观',
    hint: '圆角、边框、hover、卡头卡脚',
    skeleton: `.offline-card[class]{ border-radius: 4px; box-shadow: none; }
.offline-card-top{ border-bottom: 1px solid var(--sso-line); }
`
  },
  {
    id: 'offline.card-body', scope: 'offline', name: '档案卡正文',
    hint: '正文排版、首字下沉、引文、页脚指标',
    skeleton: `.offline-card__content-text{ line-height: 1.85; }
.offline-card__inline-quote{ border-left: 2px solid var(--sso-line); padding-left: 12px; }
`
  },
  {
    id: 'offline.sidebar', scope: 'offline', name: '侧栏目录',
    hint: '菜单外壳变量、开关、分组标题',
    skeleton: `.offline-mode{
  --offline-menu-bg: var(--sso-paper);
  --offline-menu-border: var(--sso-line);
}
`
  },
  {
    id: 'offline.form', scope: 'offline', name: '子面板表单',
    hint: '输入框、开关、按钮',
    skeleton: `.offline-mode :is(input,textarea,select){
  background-color: color-mix(in srgb, var(--sso-line) 30%, transparent);
  border-radius: 4px;
}
`
  }
];

export function getBranch(id) {
  for (let i = 0; i < BRANCHES.length; i++) {
    if (BRANCHES[i].id === id) return BRANCHES[i];
  }
  return null;
}

export function branchesOf(scope) {
  return BRANCHES.filter(function (b) { return b.scope === scope; });
}

/** 分支别名：AI 可能写中文名或短名，这里做映射 */
export const ALIASES = {
  '令牌': 'online.tokens',
  'tokens': 'online.tokens',
  'topbar': 'online.header',
  '顶栏': 'online.header',
  'header': 'online.header',
  'background': 'online.bg',
  '背景': 'online.bg',
  '我方气泡': 'online.bubble-me',
  'bubble-sent': 'online.bubble-me',
  'bubble-me': 'online.bubble-me',
  '对方气泡': 'online.bubble-you',
  'bubble-received': 'online.bubble-you',
  'bubble-you': 'online.bubble-you',
  '尾巴': 'online.bubble-tail',
  'tail': 'online.bubble-tail',
  '引用': 'online.quote',
  'quote': 'online.quote',
  '时间': 'online.time',
  'time': 'online.time',
  '输入栏': 'online.input',
  'input': 'online.input',
  '加号': 'online.plus',
  'plus': 'online.plus',
  '转账': 'online.card-transfer',
  'transfer': 'online.card-transfer',
  '图片': 'online.card-media',
  'image': 'online.card-media',
  '语音': 'online.card-voice',
  'voice': 'online.card-voice',
  '贴纸': 'online.card-sticker',
  'sticker': 'online.card-sticker',
  '聊天记录': 'online.card-forward',
  'forward': 'online.card-forward',
  '邀请': 'online.card-invite',
  'invite': 'online.card-invite',
  '通知': 'online.card-notice',
  'notice': 'online.card-notice',
  '代付': 'online.card-money',
  'money': 'online.card-money',
  '小票': 'online.receipt',
  'receipt': 'online.receipt',
  '翻译': 'online.translation',
  '浮层': 'online.overlay',
  'overlay': 'online.overlay',
  '桌面': 'global.desktop',
  'desktop': 'global.desktop',
  '动态': 'global.feed',
  'feed': 'global.feed',
  '列表': 'global.list',
  'list': 'global.list',
  '导航': 'global.nav',
  'nav': 'global.nav',
  '弹窗': 'global.dialog',
  '字体': 'global.typo',
  'typo': 'global.typo',
  '档案卡': 'offline.card-chrome',
  'card': 'offline.card-chrome',
  '侧栏': 'offline.sidebar',
  'sidebar': 'offline.sidebar',
  '表单': 'offline.form',
  'form': 'offline.form'
};
