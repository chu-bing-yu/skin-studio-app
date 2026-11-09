/** 渠道预设：OpenAI / Gemini(OpenAI 兼容) / DeepSeek / 自定义 */
import { uid } from '../core/workspaces.js';

export const BUILTIN_CHANNELS = [
  {
    id: 'ch_openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    builtin: true
  },
  {
    id: 'ch_gemini',
    name: 'Gemini（OpenAI 兼容）',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    builtin: true
  },
  {
    id: 'ch_deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    builtin: true
  },
  {
    id: 'ch_custom',
    name: '自定义',
    baseURL: '',
    model: '',
    builtin: true
  }
];

export function defaultChannel() {
  return {
    id: 'ch_local',
    name: '我的渠道',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.4,
    maxTokens: 4000,
    stream: true,
    builtin: false
  };
}

export function allChannels(custom) {
  const list = (custom || []).map(function (c) { return Object.assign({ stream: true, temperature: 0.4, maxTokens: 4000 }, c); });
  BUILTIN_CHANNELS.forEach(function (b) {
    if (!list.some(function (c) { return c.id === b.id; })) {
      list.push(Object.assign({ apiKey: '', temperature: 0.4, maxTokens: 4000, stream: true }, b));
    }
  });
  return list;
}

export function findChannel(custom, id) {
  if (!id) return null;
  return allChannels(custom).find(function (c) { return c.id === id; }) || null;
}

export function createChannel(patch) {
  return Object.assign(defaultChannel(), { id: uid('ch') }, patch || {});
}

export function upsertChannel(custom, channel) {
  const list = custom || [];
  const idx = list.findIndex(function (c) { return c.id === channel.id; });
  if (idx > -1) list[idx] = Object.assign({}, list[idx], channel);
  else list.push(Object.assign({ builtin: false }, channel));
  return list;
}

export function removeChannel(custom, id) {
  const list = custom || [];
  const idx = list.findIndex(function (c) { return c.id === id; });
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

/** 规范化 baseURL：允许用户只填到域名 */
export function endpointOf(baseURL) {
  const base = String(baseURL || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  if (/\/chat\/completions$/.test(base)) return base;
  if (/\/v\d+$/.test(base) || /\/openai$/.test(base)) return base + '/chat/completions';
  return base + '/v1/chat/completions';
}
