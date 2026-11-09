/**
 * 图床上传：对齐 Roche 的 imageHost 结构
 * provider: imgbb | catbox | custom
 * authMode: header | query | field；responseUrlPath 形如 data.url
 */

export const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';
export const CATBOX_ENDPOINT = 'https://catbox.moe/user/api.php';

export function defaultImageHost() {
  return {
    enabled: false,
    provider: 'imgbb',
    imgbbApiKey: '',
    catboxUserhash: '',
    customApiKey: '',
    endpoint: '',
    fileField: 'fileToUpload',
    authMode: 'header',
    authField: 'Authorization',
    responseUrlPath: 'data.url'
  };
}

export function normalizeConfig(cfg) {
  return Object.assign(defaultImageHost(), cfg || {});
}

export function providerLabel(provider) {
  if (provider === 'catbox') return 'Catbox';
  if (provider === 'custom') return '自定义';
  return 'ImgBB';
}

export function getByPath(obj, path) {
  if (!path) return undefined;
  return String(path).split('.').reduce(function (acc, key) {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
}

function authHeaderValue(cfg) {
  const key = cfg.provider === 'catbox' ? cfg.customApiKey : (cfg.provider === 'custom' ? cfg.customApiKey : cfg.imgbbApiKey);
  if (!key) return '';
  if (/^bearer\s/i.test(key) || /^basic\s/i.test(key)) return key;
  return key;
}

/** 构造请求（拆出来便于单测，不真的发请求） */
export function buildRequest(cfgRaw, file) {
  const cfg = normalizeConfig(cfgRaw);
  const headers = {};
  let url = '';
  const form = new FormData();

  if (cfg.provider === 'imgbb') {
    url = IMGBB_ENDPOINT + '?key=' + encodeURIComponent(cfg.imgbbApiKey || '');
    form.append('image', file);
  } else if (cfg.provider === 'catbox') {
    url = CATBOX_ENDPOINT;
    form.append('reqtype', 'fileupload');
    if (cfg.catboxUserhash) form.append('userhash', cfg.catboxUserhash);
    form.append('fileToUpload', file);
  } else {
    url = String(cfg.endpoint || '').trim();
    const field = cfg.fileField || 'fileToUpload';
    if (cfg.authMode === 'header' && cfg.authField) {
      headers[cfg.authField] = authHeaderValue(cfg);
    } else if (cfg.authMode === 'query' && cfg.authField) {
      const sep = url.indexOf('?') > -1 ? '&' : '?';
      url = url + sep + encodeURIComponent(cfg.authField) + '=' + encodeURIComponent(cfg.customApiKey || '');
    } else if (cfg.authMode === 'field' && cfg.authField) {
      form.append(cfg.authField, cfg.customApiKey || '');
    }
    form.append(field, file);
  }

  return { url: url, headers: headers, form: form, cfg: cfg };
}

export function extractUrl(cfg, data, text) {
  const path = cfg.responseUrlPath || 'data.url';
  if (cfg.provider === 'catbox') {
    /* catbox 直接返回纯文本 URL */
    const t = String(text || '').trim();
    if (/^https?:\/\//.test(t)) return t;
  }
  const byPath = getByPath(data, path);
  if (typeof byPath === 'string' && /^https?:\/\//.test(byPath)) return byPath;
  if (typeof data === 'string' && /^https?:\/\//.test(data.trim())) return data.trim();
  const t = String(text || '').trim();
  if (/^https?:\/\//.test(t)) return t;
  return '';
}

function snippet(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > 200 ? s.slice(0, 200) + '…' : s;
}

/** 上传并返回 URL；失败返回可诊断原因 */
export async function upload(file, cfgRaw) {
  const cfg = normalizeConfig(cfgRaw);
  if (!cfg.enabled) return { ok: false, reason: '图床未启用（去设置里开启并填好配置）' };
  if (!file) return { ok: false, reason: '没有文件' };

  const built = buildRequest(cfg, file);
  if (!built.url) return { ok: false, reason: '没有填写上传地址' };

  try {
    const res = await fetch(built.url, {
      method: 'POST',
      headers: built.headers,
      body: built.form
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, reason: 'HTTP ' + res.status + '：' + snippet(text) };
    }
    let data = null;
    try { data = JSON.parse(text); } catch (err) { data = null; }
    const url = extractUrl(cfg, data, text);
    if (!url) return { ok: false, reason: '上传成功但没找到图片地址（检查 responseUrlPath=' + (cfg.responseUrlPath || 'data.url') + '）：' + snippet(text) };
    return { ok: true, url: url, provider: cfg.provider };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || '网络错误' };
  }
}

/** 走原生桥上传（WebView 里能绕开 CORS） */
export async function uploadViaNative(file, cfgRaw) {
  const bridge = typeof window !== 'undefined' ? window.SkinFile : null;
  if (!bridge || typeof bridge.upload !== 'function') return null;
  const cfg = normalizeConfig(cfgRaw);
  const base64 = await new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result || '')); };
    reader.onerror = function () { reject(new Error('读取文件失败')); };
    reader.readAsDataURL(file);
  });
  try {
    const raw = await bridge.upload(JSON.stringify({
      dataUrl: base64,
      name: file.name || 'image.jpg',
      mime: file.type || 'image/jpeg',
      config: cfg
    }));
    const r = JSON.parse(raw);
    return r && r.ok ? { ok: true, url: r.url, provider: cfg.provider } : { ok: false, reason: r.reason || '原生上传失败' };
  } catch (err) {
    return { ok: false, reason: (err && err.message) || '原生上传异常' };
  }
}
