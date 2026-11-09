/**
 * 从真实 roche.html 里抽出 <style> 文本，并按「可美化页面用到的选择器」裁剪，
 * 作为预览的高保真样式基线（不执行页面 JS，所以只能拿样式、拿不到运行时 DOM）。
 *
 *   node tools/extract-css.mjs [roche.html 路径]
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || 'C:\\Users\\admin\\Desktop\\roche-新\\所有文件---创作者\\roche.html';
const OUT_DIR = resolve(here, '../web/assets/scenes');

const KEYWORDS = [
  'bubble', 'chat-', 'chat_', 'chat ', 'offline', 'post-', 'post ', 'inbox', 'conversation',
  'bottom-nav', 'tab-item', 'app-icon', 'app-label', 'square-app', 'receipt', 'checkout',
  'peer-pay', 'transfer', 'call-', 'voice', 'image-card', 'sticker', 'quote', 'avatar',
  'message', 'scrollbar', 'no-scrollbar', 'typing', 'unread', 'dock', 'thread-line',
  ':root', 'html', 'body', '*', 'font-family', 'font-size'
];

function keep(selector) {
  const s = selector.toLowerCase();
  if (/^(@font-face|@keyframes)/.test(s)) return true;
  return KEYWORDS.some(function (k) { return s.indexOf(k) > -1; });
}

/** 解析出顶层块，@media/@supports 递归处理 */
function prune(css) {
  const out = [];
  let i = 0;
  let depth = 0;
  let start = 0;
  let selEnd = -1;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      if (depth === 0 && selEnd < 0) selEnd = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && selEnd > -1) {
        const selector = css.slice(start, selEnd).trim();
        const body = css.slice(selEnd + 1, i);
        if (/^@(media|supports)/.test(selector)) {
          const inner = prune(body);
          if (inner.trim()) out.push(selector + '{' + inner + '}');
        } else if (keep(selector)) {
          out.push(selector + '{' + body + '}');
        }
        start = i + 1;
        selEnd = -1;
      }
    }
    i += 1;
  }
  return out.join('\n');
}

let html;
try {
  await stat(SRC);
  html = await readFile(SRC, 'utf8');
} catch (err) {
  console.error('找不到 roche.html：' + SRC);
  process.exit(2);
}

const blocks = [];
const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
let m;
while ((m = re.exec(html))) {
  if (m[1] && m[1].trim()) blocks.push(m[1]);
}
if (!blocks.length) {
  console.error('没有找到 <style> 块');
  process.exit(2);
}

const raw = blocks.join('\n\n');
const trimmed = prune(raw);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(join(OUT_DIR, 'roche.css'), trimmed);

console.log('源样式 ' + (Buffer.byteLength(raw) / 1024).toFixed(0) + ' KB → 裁剪后 '
  + (Buffer.byteLength(trimmed) / 1024).toFixed(0) + ' KB');
console.log('写入 ' + join(OUT_DIR, 'roche.css'));
