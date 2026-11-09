/** CSS 体检：禁用属性 / 尾巴联动 / 白名单命中 / 变量缺失 / 体积预算 */
import { closestHook, isKnownHook } from './hooks.js';
import { getBranch } from './schema.js';

const BUBBLE_RE = /\.bubble-(sent|received)/;
const BANNED_ON_BUBBLE = ['border-radius', 'width', 'max-width', 'padding', 'margin', 'gap'];
const LAYOUT_PROPS = ['width', 'height', 'padding', 'margin', 'gap', 'position', 'top', 'left', 'right', 'bottom'];

function stripComments(css) {
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 极简规则拆分：{selector, body, raw} */
export function splitRules(css) {
  const clean = stripComments(css);
  const rules = [];
  let i = 0;
  let depth = 0;
  let start = 0;
  let selectorStart = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (ch === '{') {
      if (depth === 0) {
        const selector = clean.slice(selectorStart, i).trim();
        const bodyStart = i + 1;
        // 找到配对的 }
        let d = 1;
        let j = bodyStart;
        while (j < clean.length && d > 0) {
          if (clean[j] === '{') d += 1;
          else if (clean[j] === '}') d -= 1;
          j += 1;
        }
        const body = clean.slice(bodyStart, j - 1);
        rules.push({ selector: selector, body: body });
        i = j;
        selectorStart = i;
        continue;
      }
    }
    i += 1;
  }
  return rules;
}

function declsOf(body) {
  return String(body || '')
    .split(';')
    .map(function (d) { return d.trim(); })
    .filter(Boolean)
    .map(function (d) {
      const idx = d.indexOf(':');
      if (idx < 0) return null;
      return {
        prop: d.slice(0, idx).trim().toLowerCase(),
        value: d.slice(idx + 1).replace(/!important/g, '').trim()
      };
    })
    .filter(Boolean);
}

function cssClasses(selector) {
  const out = [];
  const re = /\.([A-Za-z_][\w-]*)/g;
  let m;
  while ((m = re.exec(selector))) out.push(m[1]);
  return out;
}

/**
 * @param {string} css
 * @param {{branchId?:string, tokenCss?:string, assetUrls?:string[], varsDefined?:string[]}} opts
 */
export function lint(css, opts) {
  const options = opts || {};
  const text = stripComments(css);
  const errors = [];
  const warnings = [];
  const stats = { rules: 0, important: 0, urls: 0, classes: 0 };

  if (!text.trim()) {
    return { errors: errors, warnings: warnings, stats: stats, ok: true };
  }

  /* 括号配对 */
  const open = (text.match(/\{/g) || []).length;
  const close = (text.match(/\}/g) || []).length;
  if (open !== close) {
    errors.push('大括号不配对（' + open + ' 个 { / ' + close + ' 个 }），粘贴到美化面板会整段失效');
  }
  const dq = (text.match(/"/g) || []).length;
  if (dq % 2 !== 0) warnings.push('双引号数量为奇数，可能有未闭合的字符串');

  stats.important = (text.match(/!important/g) || []).length;
  if (stats.important > 40) warnings.push('!important 用了 ' + stats.important + ' 次，过多会拖累覆盖顺序');

  const rules = splitRules(text);
  stats.rules = rules.length;

  const def = options.branchId ? getBranch(options.branchId) : null;
  const bubbleHit = [];
  let touchedBubbleBg = false;

  rules.forEach(function (rule) {
    const sel = rule.selector;
    const decls = declsOf(rule.body);
    const classes = cssClasses(sel);
    stats.classes += classes.length;

    /* 1. 气泡禁改布局/圆角 */
    if (BUBBLE_RE.test(sel) || (def && def.id === 'online.bubble-me' && /\.bubble-sent/.test(sel))) {
      decls.forEach(function (d) {
        if (BANNED_ON_BUBBLE.indexOf(d.prop) > -1) {
          errors.push('气泡上禁止写 ' + d.prop + '（圆角/尺寸/间距归「聊天外观」设置）：' + sel);
        }
        if (d.prop === 'background' || d.prop === 'background-color') touchedBubbleBg = true;
      });
    }

    if (def && def.locked) {
      const hasDecl = decls.length > 0;
      if (hasDecl) errors.push('该分支是只读说明位，不能写规则');
    }

    /* 2. 图片与滤镜 */
    decls.forEach(function (d) {
      if (d.prop === 'backdrop-filter' || d.prop === '-webkit-backdrop-filter') {
        if (d.value !== 'none') errors.push('禁用 backdrop-filter（移动端掉帧）：' + sel);
      }
      if (d.prop === 'filter' && d.value !== 'none') {
        warnings.push('filter 在低端机可能掉帧：' + sel);
      }
      if (d.prop === 'background-image' || d.prop === 'background') {
        if (/data:image\//.test(d.value)) {
          errors.push('本版不内嵌 base64 图片，请改用素材库外链变量 --ss-img-*');
        }
        const urls = d.value.match(/url\(/g);
        if (urls) stats.urls += urls.length;
        if (/url\(\s*['"]?http:\/\//.test(d.value)) {
          warnings.push('http:// 外链可能被 iOS 拦截，建议用 https：' + sel);
        }
        const raw = d.value.match(/url\(\s*['"]?(https?:\/\/[^'")\s]+)/);
        if (raw && options.assetUrls && options.assetUrls.indexOf(raw[1]) < 0) {
          warnings.push('这个图片链接还没收录进素材库：' + raw[1].slice(0, 48) + '…');
        }
      }
    });

    /* 3. online.bg 额外限制 */
    if (def && def.id === 'online.bg') {
      decls.forEach(function (d) {
        if (LAYOUT_PROPS.indexOf(d.prop) > -1) {
          errors.push('聊天背景分支禁止改布局尺寸（' + d.prop + '）');
        }
      });
    }

    /* 4. 选择器白名单 */
    classes.forEach(function (cls) {
      if (!isKnownHook(cls)) {
        const near = closestHook(cls);
        bubbleHit.push('.' + cls + (near ? '（是不是 ' + near + '？）' : ''));
      }
    });
  });

  /* 5. 尾巴联动 */
  const tailRules = rules.filter(function (r) { return /\.bubble-tail-/.test(r.selector); });
  if (touchedBubbleBg && !tailRules.length) {
    warnings.push('改了气泡底色但没写 online.bubble-tail 的三角色，iOS 尾巴会「脱色」');
  }
  if (def && def.id === 'online.bubble-tail' && !tailRules.length) {
    warnings.push('这个分支只放尾巴三角颜色，当前没有 .bubble-tail-* 规则');
  }

  if (bubbleHit.length) {
    const uniq = bubbleHit.filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    warnings.push('未命中已知钩子：' + uniq.slice(0, 6).join('、') + (uniq.length > 6 ? ' 等 ' + uniq.length + ' 个' : ''));
  }

  if (def && def.id === 'online.bg') {
    warnings.push('聊天背景会覆盖 Roche 原生背景上传，确认没传过背景图再启用');
  }

  /* 6. 变量缺失 */
  const usedVars = [];
  const varRe = /var\(\s*(--[\w-]+)/g;
  let vm;
  while ((vm = varRe.exec(text))) usedVars.push(vm[1]);
  const defined = [];
  const defRe = /(--[\w-]+)\s*:/g;
  let dm;
  while ((dm = defRe.exec(text))) defined.push(dm[1]);
  const pool = defined.concat(options.varsDefined || []);
  const missing = usedVars.filter(function (v) {
    return v.indexOf('--ss') === 0 && pool.indexOf(v) < 0;
  });
  if (missing.length) {
    const uniqMissing = missing.filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    warnings.push('用到了未定义的变量：' + uniqMissing.slice(0, 5).join('、'));
  }

  return {
    errors: errors,
    warnings: warnings.filter(function (v, i, arr) { return arr.indexOf(v) === i; }),
    stats: stats,
    ok: errors.length === 0
  };
}

/** 汇总多个分支的体检结果（导出前用） */
export function lintProject(list) {
  const errors = [];
  const warnings = [];
  const stats = { rules: 0, important: 0, urls: 0, classes: 0, branches: list.length };
  list.forEach(function (item) {
    const r = lint(item.data.css, { branchId: item.def.id });
    r.errors.forEach(function (e) { errors.push(item.def.name + '：' + e); });
    r.warnings.forEach(function (w) { warnings.push(item.def.name + '：' + w); });
    stats.rules += r.stats.rules;
    stats.important += r.stats.important;
    stats.urls += r.stats.urls;
    stats.classes += r.stats.classes;
  });
  return { errors: errors, warnings: warnings, stats: stats, ok: errors.length === 0 };
}
