import test from 'node:test';
import assert from 'node:assert/strict';
import { composePrompt } from '../web/src/prompt/compose.js';
import { defaultSegments, mergeSegments } from '../web/src/prompt/defaults.js';
import { allPresets, builtinPresets } from '../web/src/prompt/presets.js';
import { emptyBranches, write } from '../web/src/core/branches.js';

function project(overrides) {
  const p = {
    id: 'p1',
    name: '测试方案',
    branches: emptyBranches(),
    nodes: {},
    promptCfg: { refMode: 'condensed', presetId: '' },
    segments: null
  };
  write(p.branches, 'online.tokens', ':root{--ss-ink:#111}', 'REPLACE', 'manual');
  write(p.branches, 'online.bubble-me', '.bubble-sent[class]{background:#111}', 'REPLACE', 'manual');
  return Object.assign(p, overrides || {});
}

test('默认段库覆盖五层', function () {
  const layers = new Set(defaultSegments().map(function (s) { return s.layer; }));
  ['style', 'plan', 'scope', 'branch', 'task'].forEach(function (l) {
    assert.ok(layers.has(l), '缺少层 ' + l);
  });
});

test('默认提示词包含角色/硬规则/协议，但不含钩子白名单', function () {
  const r = composePrompt('online', { project: project(), presets: [] });
  assert.match(r.text, /外观皮肤工程师/);
  assert.match(r.text, /【硬规则】/);
  assert.match(r.text, /【输出协议/);
  assert.doesNotMatch(r.text, /【可用钩子/);
  assert.ok(r.bytes > 0);
});

test('打开钩子段后注入白名单', function () {
  const p = project();
  p.segments = mergeSegments(null).map(function (s) {
    return s.id === 'scope.hooks' ? Object.assign({}, s, { enabled: true }) : s;
  });
  const r = composePrompt('online', { project: p, presets: [] });
  assert.match(r.text, /【可用钩子/);
});

test('关掉某段后该段文字消失且体积下降', function () {
  const p1 = project();
  const before = composePrompt('online', { project: p1, presets: [] });
  const p2 = project({
    segments: mergeSegments(null).map(function (s) {
      return s.id === 'style.rules' ? Object.assign({}, s, { enabled: false }) : s;
    })
  });
  const after = composePrompt('online', { project: p2, presets: [] });
  assert.doesNotMatch(after.text, /【硬规则】/);
  assert.ok(after.bytes < before.bytes, '关段后应更短：' + before.bytes + ' → ' + after.bytes);
});

test('参考档位 off / condensed / full 体积递增', function () {
  const off = composePrompt('online', { project: project({ promptCfg: { refMode: 'off', presetId: '' } }), presets: [] });
  const cond = composePrompt('online', { project: project(), presets: [] });
  const full = composePrompt('online', { project: project({ promptCfg: { refMode: 'full', presetId: '' } }), presets: [] });
  assert.doesNotMatch(off.text, /【参考/);
  assert.ok(cond.bytes > off.bytes);
  assert.ok(full.bytes > cond.bytes);
});

test('已有 CSS 默认不注入，开启后出现', function () {
  const p = project();
  const base = composePrompt('online.bubble-me', { project: p, presets: [] });
  assert.doesNotMatch(base.text, /现有 CSS/);
  p.segments = mergeSegments(null).map(function (s) {
    return s.id === 'branch.existing' ? Object.assign({}, s, { enabled: true }) : s;
  });
  const withExisting = composePrompt('online.bubble-me', { project: p, presets: [] });
  assert.match(withExisting.text, /现有 CSS/);
  assert.match(withExisting.text, /--ss-ink|background:#111/);
});

test('预设条目按作用域与分支命中过滤', function () {
  const p = project();
  const magazine = builtinPresets().find(function (x) { return x.id === 'preset_magazine'; });
  p.promptCfg.presetId = magazine.id;

  const online = composePrompt('online.bubble-me', { project: p, presets: allPresets([]) });
  assert.match(online.text, /气泡只改配色与字排/);
  assert.doesNotMatch(online.text, /档案卡：作者行/);

  const offline = composePrompt('offline.card-chrome', { project: p, presets: allPresets([]) });
  assert.match(offline.text, /档案卡：作者行/);
});

test('预设条目绑定的分支不命中时不注入', function () {
  const p = project();
  p.promptCfg.presetId = 'preset_magazine';
  const header = composePrompt('online.header', { project: p, presets: allPresets([]) });
  assert.doesNotMatch(header.text, /气泡只改配色与字排/);
});

test('风格规划节点不注入 cssOnly 段与目标分支清单', function () {
  const r = composePrompt('plan', { project: project(), presets: [] });
  assert.match(r.text, /风格规划/);
  assert.doesNotMatch(r.text, /【目标分支】/);
  assert.doesNotMatch(r.text, /【可用钩子/);
});

test('段可编辑：改文字后进入拼装结果', function () {
  const p = project();
  p.segments = mergeSegments(null).map(function (s) {
    return s.id === 'task.reminder' ? Object.assign({}, s, { text: '只改颜色，别动布局。' }) : s;
  });
  const r = composePrompt('online', { project: p, presets: [] });
  assert.match(r.text, /只改颜色，别动布局/);
});

test('预设库内置四套且每条都有标题与正文', function () {
  const list = builtinPresets();
  assert.ok(list.length >= 4);
  list.forEach(function (preset) {
    assert.ok(preset.entries.length >= 3, preset.name + ' 条目太少');
    preset.entries.forEach(function (e) {
      assert.ok(e.title && e.text.length > 10, preset.name + ' 的条目不全');
      assert.ok(e.layer);
    });
  });
});
