import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUsage, estimateUsage, priceOf, costOf, makeRecord, summarize, groupBy, lastDays, money
} from '../web/src/ai/usage.js';
import { endpointOf, allChannels, findChannel } from '../web/src/ai/channels.js';
import { buildRequest, extractUrl, defaultImageHost, normalizeConfig } from '../web/src/ai/imageHost.js';

/* ---------- usage ---------- */

test('usage 归一化：兼容 snake_case 与 camelCase', function () {
  assert.deepEqual(normalizeUsage({ prompt_tokens: 10, completion_tokens: 5 }), {
    promptTokens: 10, completionTokens: 5, totalTokens: 15
  });
  assert.deepEqual(normalizeUsage({ promptTokens: 3, completionTokens: 2 }), {
    promptTokens: 3, completionTokens: 2, totalTokens: 5
  });
  assert.equal(normalizeUsage(null), null);
});

test('无 usage 时按字符估算并标记 estimated', function () {
  const u = estimateUsage('中文四个字', 'abcd');
  assert.equal(u.estimated, true);
  assert.ok(u.promptTokens >= 5);
  assert.ok(u.totalTokens >= u.promptTokens);
});

test('单价与金额：按每 1M tokens 计算', function () {
  const prices = { 'test-model': { in: 1, out: 2 } };
  const usage = { promptTokens: 1000000, completionTokens: 500000 };
  assert.equal(costOf(usage, prices, 'test-model'), 1 + 1);
  assert.deepEqual(priceOf(prices, 'unknown'), priceOf({}, 'unknown'));
});

test('记账记录字段齐全', function () {
  const rec = makeRecord({
    projectId: 'p1', projectName: 'A', channelId: 'c1', channelName: 'DeepSeek',
    model: 'deepseek-chat', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    prices: { 'deepseek-chat': { in: 0.27, out: 1.1 } }, ms: 800, ok: true
  });
  assert.equal(rec.promptTokens, 100);
  assert.equal(rec.totalTokens, 150);
  assert.ok(rec.cost > 0);
  assert.equal(rec.ok, true);
  assert.ok(rec.id);
  assert.ok(rec.at > 0);
});

test('汇总：今日 / 总计', function () {
  const now = Date.now();
  const rows = [
    { at: now, totalTokens: 100, cost: 0.1, promptTokens: 60, completionTokens: 40, ok: true },
    { at: now - 86400000 * 3, totalTokens: 50, cost: 0.05, promptTokens: 30, completionTokens: 20, ok: true }
  ];
  const today = summarize(rows, 'today');
  assert.equal(today.totalTokens, 100);
  const all = summarize(rows, 'all');
  assert.equal(all.totalTokens, 150);
  assert.equal(all.count, 2);
});

test('按渠道 / 按天分组与最近 7 天', function () {
  const now = Date.now();
  const rows = [
    { at: now, totalTokens: 10, cost: 0.01, channelName: 'A', projectName: 'P1' },
    { at: now, totalTokens: 20, cost: 0.02, channelName: 'A', projectName: 'P2' }
  ];
  const byChannel = groupBy(rows, 'channel');
  assert.equal(byChannel[0].key, 'A');
  assert.equal(byChannel[0].tokens, 30);
  const byProject = groupBy(rows, 'project');
  assert.equal(byProject.length, 2);
  const days = lastDays(rows, 7);
  assert.equal(days.length, 7);
  assert.equal(days[6].tokens, 30);
});

test('金额格式化', function () {
  assert.equal(money(0, '$'), '$0.00');
  assert.equal(money(1.234, '$'), '$1.23');
  assert.ok(money(0.0012, '$').indexOf('0.0012') > -1);
});

/* ---------- channels ---------- */

test('端点规范化', function () {
  assert.equal(endpointOf('https://api.openai.com/v1'), 'https://api.openai.com/v1/chat/completions');
  assert.equal(endpointOf('https://x.com/v1/'), 'https://x.com/v1/chat/completions');
  assert.equal(endpointOf('https://x.com/v1/chat/completions'), 'https://x.com/v1/chat/completions');
  assert.equal(endpointOf('https://generativelanguage.googleapis.com/v1beta/openai'),
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
});

test('内置渠道包含 OpenAI / Gemini / DeepSeek / 自定义', function () {
  const list = allChannels([]);
  const names = list.map(function (c) { return c.name; }).join('|');
  assert.match(names, /OpenAI/);
  assert.match(names, /Gemini/);
  assert.match(names, /DeepSeek/);
  assert.match(names, /自定义/);
  assert.ok(findChannel([], 'ch_deepseek'));
});

/* ---------- 图床 ---------- */

function fakeFile() {
  return new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });
}

test('imgbb：地址带 key，文件字段是 image', function () {
  const built = buildRequest({ provider: 'imgbb', imgbbApiKey: 'KEY123' }, fakeFile());
  assert.match(built.url, /api\.imgbb\.com\/1\/upload\?key=KEY123/);
  assert.ok(built.form.get('image'));
});

test('catbox：固定 endpoint + reqtype + userhash', function () {
  const built = buildRequest({ provider: 'catbox', catboxUserhash: 'UH' }, fakeFile());
  assert.equal(built.url, 'https://catbox.moe/user/api.php');
  assert.equal(built.form.get('reqtype'), 'fileupload');
  assert.equal(built.form.get('userhash'), 'UH');
  assert.ok(built.form.get('fileToUpload'));
});

test('自定义：authMode=header 走请求头', function () {
  const built = buildRequest({
    provider: 'custom', endpoint: 'https://up.example.com/api', fileField: 'file',
    authMode: 'header', authField: 'Authorization', customApiKey: 'Bearer TOKEN'
  }, fakeFile());
  assert.equal(built.url, 'https://up.example.com/api');
  assert.equal(built.headers.Authorization, 'Bearer TOKEN');
  assert.ok(built.form.get('file'));
});

test('自定义：authMode=query 拼到 URL', function () {
  const built = buildRequest({
    provider: 'custom', endpoint: 'https://up.example.com/api', fileField: 'file',
    authMode: 'query', authField: 'token', customApiKey: 'abc'
  }, fakeFile());
  assert.match(built.url, /token=abc/);
});

test('自定义：authMode=field 放进表单', function () {
  const built = buildRequest({
    provider: 'custom', endpoint: 'https://up.example.com/api', fileField: 'file',
    authMode: 'field', authField: 'api_key', customApiKey: 'abc'
  }, fakeFile());
  assert.equal(built.form.get('api_key'), 'abc');
});

test('URL 提取：json 路径 / catbox 纯文本', function () {
  const cfg = normalizeConfig({ provider: 'imgbb', responseUrlPath: 'data.url' });
  assert.equal(extractUrl(cfg, { data: { url: 'https://i.ibb.co/x.png' } }, ''), 'https://i.ibb.co/x.png');
  const catbox = normalizeConfig({ provider: 'catbox' });
  assert.equal(extractUrl(catbox, null, 'https://files.catbox.moe/x.png'), 'https://files.catbox.moe/x.png');
  assert.equal(extractUrl(cfg, { data: {} }, 'no url'), '');
});

test('默认配置结构对齐 Roche', function () {
  const cfg = defaultImageHost();
  ['enabled', 'provider', 'imgbbApiKey', 'catboxUserhash', 'customApiKey', 'endpoint', 'fileField', 'authMode', 'authField', 'responseUrlPath']
    .forEach(function (k) { assert.ok(k in cfg, '缺字段 ' + k); });
});
