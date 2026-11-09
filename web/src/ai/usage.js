/** token 记账与金额计算（单价表按每 1M tokens，美元） */
import { uid } from '../core/workspaces.js';

export const DEFAULT_PRICES = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gemini-2.0-flash': { in: 0.1, out: 0.4 },
  'deepseek-chat': { in: 0.27, out: 1.1 },
  'deepseek-reasoner': { in: 0.55, out: 2.19 },
  default: { in: 0.5, out: 1.5 }
};

export function priceOf(prices, model) {
  const table = Object.assign({}, DEFAULT_PRICES, prices || {});
  return table[model] || table.default;
}

/** usage 可能是 {prompt_tokens, completion_tokens} 或 {promptTokens...} */
export function normalizeUsage(raw) {
  if (!raw) return null;
  const p = raw.prompt_tokens !== undefined ? raw.prompt_tokens : raw.promptTokens;
  const c = raw.completion_tokens !== undefined ? raw.completion_tokens : raw.completionTokens;
  if (p === undefined && c === undefined) return null;
  const prompt = Number(p) || 0;
  const completion = Number(c) || 0;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion };
}

/** 没有 usage 时按字符估算（中文 1 字≈1 token，ASCII 4 字符≈1） */
export function estimateUsage(promptText, replyText) {
  function est(s) {
    const text = String(s || '');
    let cjk = 0;
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > 255) cjk += 1;
    return Math.round(cjk + (text.length - cjk) / 4);
  }
  const promptTokens = est(promptText);
  const completionTokens = est(replyText);
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, estimated: true };
}

export function costOf(usage, prices, model) {
  if (!usage) return 0;
  const p = priceOf(prices, model);
  return (usage.promptTokens / 1e6) * p.in + (usage.completionTokens / 1e6) * p.out;
}

export function makeRecord(ctx) {
  const usage = ctx.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  return {
    id: uid('u'),
    at: Date.now(),
    projectId: ctx.projectId || '',
    projectName: ctx.projectName || '',
    channelId: ctx.channelId || '',
    channelName: ctx.channelName || '',
    model: ctx.model || '',
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    cost: costOf(usage, ctx.prices, ctx.model),
    ms: ctx.ms || 0,
    ok: ctx.ok !== false,
    error: ctx.error || '',
    estimated: !!usage.estimated
  };
}

function startOfDay(d) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

export function summarize(records, range) {
  const now = Date.now();
  const dayStart = startOfDay(now);
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const from = range === 'today' ? dayStart : (range === 'month' ? monthStart : 0);
  const list = (records || []).filter(function (r) { return r.at >= from; });
  const sum = list.reduce(function (acc, r) {
    acc.promptTokens += r.promptTokens || 0;
    acc.completionTokens += r.completionTokens || 0;
    acc.totalTokens += r.totalTokens || 0;
    acc.cost += r.cost || 0;
    acc.count += 1;
    if (r.estimated) acc.estimated += 1;
    if (!r.ok) acc.failed += 1;
    return acc;
  }, { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0, count: 0, estimated: 0, failed: 0 });
  return sum;
}

export function groupBy(records, key) {
  const map = new Map();
  (records || []).forEach(function (r) {
    const k = key === 'day'
      ? new Date(r.at).toLocaleDateString('zh-CN')
      : (key === 'project' ? (r.projectName || r.projectId || '未命名') : (r.channelName || r.channelId || '未知渠道'));
    const cur = map.get(k) || { key: k, tokens: 0, cost: 0, count: 0 };
    cur.tokens += r.totalTokens || 0;
    cur.cost += r.cost || 0;
    cur.count += 1;
    map.set(k, cur);
  });
  return Array.from(map.values());
}

export function lastDays(records, days) {
  const out = [];
  const today = startOfDay(Date.now());
  for (let i = days - 1; i >= 0; i--) {
    const start = today - i * 86400000;
    const end = start + 86400000;
    const list = (records || []).filter(function (r) { return r.at >= start && r.at < end; });
    const tokens = list.reduce(function (n, r) { return n + (r.totalTokens || 0); }, 0);
    const cost = list.reduce(function (n, r) { return n + (r.cost || 0); }, 0);
    out.push({
      key: new Date(start).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      tokens: tokens,
      cost: cost,
      count: list.length
    });
  }
  return out;
}

export function money(v, symbol) {
  const n = Number(v) || 0;
  const s = symbol || '$';
  if (n === 0) return s + '0.00';
  if (n < 0.01) return s + n.toFixed(4);
  return s + n.toFixed(2);
}
