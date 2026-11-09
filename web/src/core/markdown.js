/**
 * 轻量 Markdown → DocumentFragment（不用 innerHTML，先转义再解析）
 * 支持：标题、粗体、斜体、行内代码、围栏代码块、有序/无序列表、引用、分隔线、链接
 */
function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const INLINE_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;

function inlineNodes(text) {
  const frag = document.createDocumentFragment();
  const src = String(text || '');
  let last = 0;
  let m;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(src))) {
    if (m.index > last) frag.appendChild(document.createTextNode(src.slice(last, m.index)));
    const token = m[0];
    if (token.indexOf('**') === 0) {
      const b = document.createElement('strong');
      b.textContent = token.slice(2, -2);
      frag.appendChild(b);
    } else if (token.indexOf('`') === 0) {
      const c = document.createElement('code');
      c.className = 'ss-md__inline';
      c.textContent = token.slice(1, -1);
      frag.appendChild(c);
    } else if (token.indexOf('[') === 0) {
      const mm = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
      const a = document.createElement('span');
      a.className = 'ss-md__link';
      a.textContent = mm ? mm[1] : token;
      a.title = mm ? mm[2] : '';
      frag.appendChild(a);
    } else {
      const i = document.createElement('em');
      i.textContent = token.slice(1, -1);
      frag.appendChild(i);
    }
    last = m.index + token.length;
  }
  if (last < src.length) frag.appendChild(document.createTextNode(src.slice(last)));
  return frag;
}

export function renderMarkdown(raw) {
  const frag = document.createDocumentFragment();
  const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    /* 围栏代码块 */
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/^\s*```/, '').trim();
      const buf = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      const pre = document.createElement('pre');
      pre.className = 'ss-md__code';
      if (lang) pre.dataset.lang = lang;
      pre.textContent = buf.join('\n');
      frag.appendChild(pre);
      continue;
    }

    /* 分隔线 */
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      const hr = document.createElement('div');
      hr.className = 'ss-md__hr';
      frag.appendChild(hr);
      i += 1;
      continue;
    }

    /* 标题 */
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(4, h[1].length + 1);
      const node = document.createElement('h' + level);
      node.className = 'ss-md__h';
      node.appendChild(inlineNodes(escapeHtml(h[2])));
      frag.appendChild(node);
      i += 1;
      continue;
    }

    /* 引用 */
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(escapeHtml(lines[i].replace(/^\s*>\s?/, '')));
        i += 1;
      }
      const quote = document.createElement('blockquote');
      quote.className = 'ss-md__quote';
      quote.appendChild(inlineNodes(buf.join('\n')));
      frag.appendChild(quote);
      continue;
    }

    /* 列表（支持两级缩进） */
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      list.className = 'ss-md__list';
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const indent = /^\s*/.exec(lines[i])[0].replace(/\t/g, '  ').length;
        const content = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '');
        const li = document.createElement('li');
        if (indent >= 2) li.className = 'ss-md__li--sub';
        li.appendChild(inlineNodes(escapeHtml(content)));
        list.appendChild(li);
        i += 1;
      }
      frag.appendChild(list);
      continue;
    }

    /* 空行 */
    if (!line.trim()) {
      i += 1;
      continue;
    }

    /* 段落（连续非空行合并） */
    const buf = [];
    while (i < lines.length
      && lines[i].trim()
      && !/^\s*```/.test(lines[i])
      && !/^(#{1,4})\s+/.test(lines[i])
      && !/^\s*>\s?/.test(lines[i])
      && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])
      && !/^\s*(---+)+\s*$/.test(lines[i])) {
      buf.push(escapeHtml(lines[i]));
      i += 1;
    }
    const p = document.createElement('p');
    p.className = 'ss-md__p';
    p.appendChild(inlineNodes(buf.join('\n')));
    frag.appendChild(p);
  }

  return frag;
}

export function plainText(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*`>#]/g, '')
    .trim();
}
