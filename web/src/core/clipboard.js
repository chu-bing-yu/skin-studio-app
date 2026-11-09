/**
 * 复制：宿主没有 clipboard API（全量 dist 计数为 0），所以必须带 execCommand 兜底，
 * 并且把结果返回给调用方，避免「点了没反应」。
 */
export async function copyText(text) {
  const value = String(text == null ? '' : text);
  if (!value) return { ok: false, reason: 'empty' };

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(value);
      return { ok: true, mode: 'clipboard' };
    } catch (err) {
      // 继续走兜底
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', 'readonly');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    return ok ? { ok: true, mode: 'execCommand' } : { ok: false, reason: 'execCommand-failed' };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || 'unknown' };
  }
}

export function formatSize(chars) {
  if (chars < 1024) return chars + ' 字符';
  return (chars / 1024).toFixed(1) + ' KB';
}
