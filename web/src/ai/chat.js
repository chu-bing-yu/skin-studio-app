/** 请求派发：APK 内优先原生 OkHttp 桥，浏览器走 fetch；两者都返回统一结构 */
import { endpointOf } from './channels.js';
import { readStream } from './stream.js';

/* 原生桥是异步回调式的：注册全局收口，Promise 化 */
const aiResolvers = {};
if (typeof window !== 'undefined') {
  window.__ssAiResolvers = aiResolvers;
  window.__ssAIResult = function (json) {
    let res = null;
    try { res = JSON.parse(json); } catch (err) { res = null; }
    const token = res && res.token;
    const resolve = token ? aiResolvers[token] : null;
    if (!resolve) return;
    delete aiResolvers[token];
    resolve(json);
  };
}

function nativeChat(request) {
  return new Promise(function (resolve) {
    const bridge = window.SkinAI;
    if (!bridge || typeof bridge.chatAsync !== 'function') {
      resolve(JSON.stringify({ ok: false, error: '原生桥不可用' }));
      return;
    }
    const token = 'ai' + Date.now() + Math.random().toString(36).slice(2, 8);
    aiResolvers[token] = resolve;
    try {
      bridge.chatAsync(JSON.stringify(Object.assign({ token: token }, request)));
    } catch (err) {
      delete aiResolvers[token];
      resolve(JSON.stringify({ ok: false, error: (err && err.message) || '桥调用失败' }));
    }
    setTimeout(function () {
      if (aiResolvers[token]) {
        delete aiResolvers[token];
        resolve(JSON.stringify({ ok: false, error: '请求超时（120s）' }));
      }
    }, 120000);
  });
}

function authHeader(channel) {
  const key = String(channel.apiKey || '').trim();
  if (!key) return {};
  return { Authorization: /^bearer\s/i.test(key) ? key : 'Bearer ' + key };
}

export function buildPayload(channel, messages) {
  const payload = {
    model: channel.model,
    messages: messages,
    temperature: typeof channel.temperature === 'number' ? channel.temperature : 0.4
  };
  if (channel.maxTokens) payload.max_tokens = channel.maxTokens;
  if (channel.stream) {
    payload.stream = true;
    payload.stream_options = { include_usage: true };
  }
  return payload;
}

function extractText(json) {
  const choice = json && json.choices && json.choices[0];
  if (!choice) return '';
  if (choice.message && typeof choice.message.content === 'string') return choice.message.content;
  if (typeof choice.text === 'string') return choice.text;
  return '';
}

/**
 * @param {{channel:object, messages:Array, onDelta?:Function}} opts
 * @returns {Promise<{ok:boolean, text?:string, usage?:object, ms:number, error?:string, raw?:any}>}
 */
export async function chat(opts) {
  const channel = opts.channel;
  const messages = opts.messages || [];
  const onDelta = opts.onDelta || function () {};
  const started = Date.now();

  if (!channel || !channel.baseURL) {
    return { ok: false, error: '没有可用渠道：先去 API 预设里填 baseURL / Key / 模型', ms: 0 };
  }
  if (!channel.model) {
    return { ok: false, error: '渠道缺少模型名', ms: 0 };
  }

  const payload = buildPayload(channel, messages);

  /* 原生桥（APK）：规避 CORS 与明文限制 */
  const bridge = typeof window !== 'undefined' ? window.SkinAI : null;
  if (bridge && typeof bridge.chatAsync === 'function') {
    const raw = await nativeChat({
      url: endpointOf(channel.baseURL),
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader(channel)),
      payload: payload
    });
    let res = null;
    try { res = JSON.parse(raw); } catch (err) { res = null; }
    if (!res || res.ok === false) {
      return { ok: false, error: (res && res.error) || '原生请求失败', ms: Date.now() - started };
    }
    if (res.text && onDelta) onDelta(res.text);
    return { ok: true, text: res.text || '', usage: res.usage || null, ms: res.ms || (Date.now() - started), raw: res };
  }

  const url = endpointOf(channel.baseURL);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader(channel)),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch (err) { detail = ''; }
      return {
        ok: false,
        error: 'HTTP ' + res.status + (detail ? '：' + detail : ''),
        ms: Date.now() - started
      };
    }

    if (channel.stream) {
      const out = await readStream(res, onDelta);
      return { ok: true, text: out.text, usage: out.usage, ms: Date.now() - started };
    }

    const json = await res.json();
    return {
      ok: true,
      text: extractText(json),
      usage: json.usage || null,
      ms: Date.now() - started,
      raw: json
    };
  } catch (err) {
    return {
      ok: false,
      error: '网络错误：' + ((err && err.message) || '未知') + '（浏览器里可能是 CORS，APK 内会走原生请求）',
      ms: Date.now() - started
    };
  }
}

/** 测试连接：发一条最小请求 */
export async function testConnection(channel) {
  const r = await chat({
    channel: Object.assign({}, channel, { stream: false, maxTokens: 32 }),
    messages: [
      { role: 'system', content: '只回复 ok' },
      { role: 'user', content: 'ping' }
    ]
  });
  return {
    ok: r.ok,
    ms: r.ms,
    text: (r.text || '').slice(0, 80),
    usage: r.usage || null,
    error: r.error || ''
  };
}
