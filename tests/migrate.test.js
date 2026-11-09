import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImport } from '../web/src/data/migrate.js';
import { buildBackup } from '../web/src/data/backup.js';
import { emptyBranches, write } from '../web/src/core/branches.js';

test('新备份格式：projects 数组', function () {
  const r = parseImport({ projects: [{ name: 'A', branches: emptyBranches() }] });
  assert.equal(r.projects.length, 1);
  assert.equal(r.projects[0].name, 'A');
  assert.equal(Object.keys(r.projects[0].branches).length, 35);
});

test('插件原始键值：ss.projects + ss.project.<id>', function () {
  const branches = emptyBranches();
  write(branches, 'online.bubble-me', '.x{color:red}', 'REPLACE', 'manual');
  const raw = {
    'ss.projects': [{ id: 'p_default', name: '我的美化' }],
    'ss.project.p_default': { id: 'p_default', name: '我的美化', branches: branches, nodes: {}, promptCfg: {} },
    'ss.presets': [{ id: 'x', name: '旧预设', text: 'hi' }],
    'ss.settings': { temperature: 0.5 }
  };
  const r = parseImport(raw);
  assert.equal(r.projects.length, 1);
  assert.match(r.projects[0].branches['online.bubble-me'].css, /color:red/);
  assert.equal(r.presets.length, 1);
  assert.equal(r.settings.temperature, 0.5);
});

test('单个方案对象', function () {
  const r = parseImport({ name: '单个', branches: emptyBranches() });
  assert.equal(r.projects.length, 1);
  assert.equal(r.projects[0].name, '单个');
});

test('坏数据抛错而不是静默', function () {
  assert.throws(function () { parseImport('{}'); }, /认不出/);
});

test('备份默认剔除 API Key，勾选后才带', function () {
  const state = {
    projects: [],
    presets: [],
    channels: [{ id: 'c1', name: 'X', apiKey: 'SECRET' }],
    settings: { imageHost: { imgbbApiKey: 'IMGKEY', catboxUserhash: 'UH', customApiKey: 'CK' } }
  };
  const safe = buildBackup(state, { includeKeys: false });
  assert.equal(safe.channels[0].apiKey, '');
  assert.equal(safe.settings.imageHost.imgbbApiKey, '');
  const full = buildBackup(state, { includeKeys: true });
  assert.equal(full.channels[0].apiKey, 'SECRET');
  assert.equal(full.settings.imageHost.imgbbApiKey, 'IMGKEY');
});
