/** 原生能力探测与降级（浏览器里也能跑） */

export function hasFileBridge() {
  return typeof window !== 'undefined' && !!(window.SkinFile && typeof window.SkinFile.saveFile === 'function');
}

export function hasAiBridge() {
  return typeof window !== 'undefined' && !!(window.SkinAI && typeof window.SkinAI.chat === 'function');
}

export function isNative() {
  return hasFileBridge() || hasAiBridge();
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch (err) { return null; }
}

/** 保存文件：原生写 Download/SkinStudio/，浏览器退化为下载 */
export async function saveFile(name, content, mime) {
  const fileName = String(name || 'skin.css').replace(/[\\/:*?"<>|\s]+/g, '-');
  if (hasFileBridge()) {
    try {
      const raw = await window.SkinFile.saveFile(fileName, String(content == null ? '' : content), mime || 'text/css');
      const res = safeParse(raw);
      if (res && res.ok) return { ok: true, path: res.path || '', mode: 'native' };
      return { ok: false, reason: (res && res.reason) || '原生保存失败' };
    } catch (err) {
      return { ok: false, reason: (err && err.message) || '原生保存异常' };
    }
  }
  try {
    const blob = new Blob([String(content == null ? '' : content)], { type: (mime || 'text/css') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (err) { /* 忽略 */ } }, 30000);
    return { ok: true, mode: 'download' };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || '下载失败' };
  }
}

/** 系统分享 */
export async function shareFile(name, content, mime) {
  const fileName = String(name || 'skin.css').replace(/[\\/:*?"<>|\s]+/g, '-');
  if (hasFileBridge() && typeof window.SkinFile.shareFile === 'function') {
    try {
      const raw = await window.SkinFile.shareFile(fileName, String(content == null ? '' : content), mime || 'text/css');
      const res = safeParse(raw);
      return res && res.ok ? { ok: true, mode: 'native' } : { ok: false, reason: (res && res.reason) || '原生分享失败' };
    } catch (err) {
      return { ok: false, reason: (err && err.message) || '原生分享异常' };
    }
  }
  try {
    if (!navigator.canShare || typeof File !== 'function') return { ok: false, reason: '当前环境不支持分享' };
    const file = new File([String(content || '')], fileName, { type: mime || 'text/css' });
    if (!navigator.canShare({ files: [file] })) return { ok: false, reason: '当前环境不支持分享文件' };
    await navigator.share({ files: [file], title: fileName });
    return { ok: true, mode: 'web-share' };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || '分享取消' };
  }
}

/** 选图：原生多选，浏览器用 input[type=file] */
export function pickImages(limit) {
  const max = limit || 2;
  if (hasFileBridge() && typeof window.SkinFile.pickImages === 'function') {
    return Promise.resolve(window.SkinFile.pickImages(max)).then(function (raw) {
      const res = safeParse(raw);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.files)) return res.files;
      return [];
    }).catch(function () { return []; });
  }

  return new Promise(function (resolve) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      const files = Array.prototype.slice.call(input.files || []).slice(0, max);
      const reads = files.map(function (file) {
        return new Promise(function (ok) {
          const reader = new FileReader();
          reader.onload = function () { ok({ name: file.name, mime: file.type, dataUrl: String(reader.result || '') }); };
          reader.onerror = function () { ok(null); };
          reader.readAsDataURL(file);
        });
      });
      Promise.all(reads).then(function (list) {
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(list.filter(Boolean));
      });
    });
    input.click();
  });
}

/** 后端键返回：返回 true 表示前端已消费 */
export function installBackHandler(handler) {
  window.__ssBack = function () {
    try { return !!handler(); } catch (err) { return false; }
  };
}
