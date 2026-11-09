/** 轻量 DOM 封装（不引框架） */

export function el(tag, props, children) {
  const node = document.createElement(tag);
  if (props) {
    Object.keys(props).forEach(function (k) {
      const v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') {
        Object.keys(v).forEach(function (p) { node.style[p] = v[p]; });
      } else if (k.indexOf('on') === 0 && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'dataset' && typeof v === 'object') {
        Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      } else {
        node.setAttribute(k, v === true ? '' : v);
      }
    });
  }
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  return node;
}

export function on(node, evt, fn, opts) {
  node.addEventListener(evt, fn, opts);
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function debounce(fn, ms) {
  let timer = null;
  return function () {
    const args = arguments;
    const self = this;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; fn.apply(self, args); }, ms);
  };
}

const PATH = {
  menu: 'M3 6h18M3 12h18M3 18h18',
  plus: 'M12 5v14M5 12h14',
  send: 'M4.5 12.5 20 4l-5.5 16-3.2-6.3L4.5 12.5Z',
  eye: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z',
  close: 'M6 6l12 12M18 6L6 18',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  image: 'M4 5h16v14H4zM4 15l4-4 3 3 3-3 6 6',
  trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13',
  edit: 'M4 20h4L20 8l-4-4L4 16v4Z',
  copy: 'M9 9h10v12H9zM5 15V3h10',
  refresh: 'M20 12a8 8 0 1 1-3-6.2M20 4v5h-5',
  check: 'M4 12.5 9.5 18 20 6.5',
  chevron: 'M6 9l6 6 6-6',
  back: 'M15 5l-7 7 7 7',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 14l9 5 9-5',
  palette: 'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  undo: 'M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12H9',
  warn: 'M12 4 2.5 20h19L12 4Zm0 5v6m0 3h.01',
  down: 'M12 4v12m0 0 5-5m-5 5-5-5'
};

export function svgIcon(name, size) {
  const d = PATH[name] || PATH.dots;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size || 18));
  svg.setAttribute('height', String(size || 18));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', d);
  svg.appendChild(p);
  return svg;
}

export function fmtClock(ts) {
  const d = new Date(ts);
  const p = function (n) { return n < 10 ? '0' + n : String(n); };
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

export function fmtAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前';
  const d = new Date(ts);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

export function todayGroup(ts) {
  const now = new Date();
  const d = new Date(ts);
  const sameDay = now.toDateString() === d.toDateString();
  if (sameDay) return '今天';
  if (now - d < 7 * 24 * 3600 * 1000) return '近 7 天';
  return '更早';
}
