/** 应用状态与动作：方案 / 对话 / 提示词 / AI / 用量 / 导出 */
import * as db from '../data/db.js';
import { parseImport } from '../data/migrate.js';
import { buildBackup, backupFileName } from '../data/backup.js';
import * as branchesApi from '../core/branches.js';
import { uid } from '../core/workspaces.js';
import { parseReply } from '../core/aiProtocol.js';
import { buildScopeCss, buildAll } from '../core/exportCss.js';
import { getNode, branchIdsOf, breadcrumb, scopeOf, labelOf, SCOPE_LABEL, NODES } from '../core/tree.js';
import { composePrompt } from '../prompt/compose.js';
import { ensureSegments, resetSegments, groupByLayer } from '../prompt/segments.js';
import { allPresets, findPreset, createPreset, clonePreset, updatePreset, removePreset } from '../prompt/presets.js';
import * as channelsApi from '../ai/channels.js';
import { chat as aiChat, testConnection } from '../ai/chat.js';
import * as usageApi from '../ai/usage.js';
import { upload as uploadImage, uploadViaNative, defaultImageHost, normalizeConfig } from '../ai/imageHost.js';
import { saveFile as nativeSave, shareFile as nativeShare, pickImages } from '../bridge/native.js';
import { compressImage } from '../core/image.js';

const DEFAULT_SETTINGS = {
  theme: 'light',
  fontSize: 14,
  prices: {},
  currency: '$',
  imageHost: defaultImageHost(),
  activeProjectId: '',
  activeChannelId: '',
  /* 预览用：真实应用的通行密钥（设置里填一次，只存在本机，不进代码库） */
  rocheKey: ''
};

export async function createStore() {
  const listeners = [];
  const state = {
    projects: [],
    project: null,
    chats: {},
    activeNodeId: 'plan',
    channels: [],
    presets: [],
    usage: [],
    exports: [],
    settings: Object.assign({}, DEFAULT_SETTINGS),
    loading: true,
    busy: false,
    draft: { text: '', images: [] },
    lastError: ''
  };

  let projectTimer = null;
  let chatTimer = null;

  function notify(scope) {
    listeners.forEach(function (fn) {
      try { fn(scope || 'all'); } catch (err) { console.warn('[store] 渲染失败', err); }
    });
  }

  function onChange(fn) {
    listeners.push(fn);
    return function () {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  function toast(message) {
    notify({ toast: message });
  }

  /* ---------------- 持久化 ---------------- */

  function persistProject() {
    if (!state.project) return;
    if (projectTimer) clearTimeout(projectTimer);
    const snapshot = JSON.parse(JSON.stringify(state.project));
    projectTimer = setTimeout(function () {
      projectTimer = null;
      db.putProject(snapshot);
    }, 300);
  }

  function persistChat() {
    if (chatTimer) clearTimeout(chatTimer);
    const pid = state.project ? state.project.id : '';
    const nodeId = state.activeNodeId;
    const list = state.chats[nodeId] || [];
    chatTimer = setTimeout(function () {
      chatTimer = null;
      db.saveChat(pid, nodeId, list);
    }, 300);
  }

  function persistSettings() {
    db.setKV('settings', state.settings);
  }

  async function flush() {
    if (projectTimer) { clearTimeout(projectTimer); projectTimer = null; }
    if (chatTimer) { clearTimeout(chatTimer); chatTimer = null; }
    if (state.project) await db.putProject(JSON.parse(JSON.stringify(state.project)));
    const pid = state.project ? state.project.id : '';
    for (const nodeId of Object.keys(state.chats)) {
      await db.saveChat(pid, nodeId, state.chats[nodeId] || []);
    }
    await db.setKV('settings', state.settings);
  }

  /* ---------------- 方案 ---------------- */

  function newProjectObject(name) {
    const now = Date.now();
    const project = {
      id: uid('p'),
      name: String(name || '我的美化').trim() || '我的美化',
      branches: branchesApi.emptyBranches(),
      nodes: {},
      promptCfg: { refMode: 'condensed', presetId: '' },
      segments: null,
      activeNodeId: 'plan',
      createdAt: now,
      updatedAt: now
    };
    project.segments = ensureSegments(project);
    return project;
  }

  async function loadProjectChats(project) {
    state.chats = {};
    state.activeNodeId = getNode(project.activeNodeId || '') ? project.activeNodeId : 'plan';
    state.chats[state.activeNodeId] = await db.loadChat(project.id, state.activeNodeId);
  }

  async function switchProject(id) {
    if (!id || (state.project && state.project.id === id)) return;
    await flush();
    await db.putProject(JSON.parse(JSON.stringify(state.project)));
    const next = state.projects.find(function (p) { return p.id === id; });
    if (!next) return;
    state.project = next;
    state.settings.activeProjectId = id;
    ensureSegments(state.project);
    await loadProjectChats(next);
    persistSettings();
    notify('all');
  }

  async function createProject(name) {
    await flush();
    const project = newProjectObject(name);
    state.projects.unshift(project);
    await db.putProject(project);
    state.project = project;
    state.settings.activeProjectId = project.id;
    state.chats = {};
    state.activeNodeId = 'plan';
    state.chats.plan = [];
    persistSettings();
    notify('all');
    toast('已新建方案「' + project.name + '」');
    return project;
  }

  async function renameProject(name, pid) {
    const target = pid ? state.projects.find(function (p) { return p.id === pid; }) : state.project;
    if (!target) return false;
    const title = String(name || '').trim();
    if (!title) return false;
    target.name = title;
    target.updatedAt = Date.now();
    await db.putProject(JSON.parse(JSON.stringify(target)));
    notify('all');
    return true;
  }

  async function duplicateProject(pid) {
    await flush();
    const source = pid ? state.projects.find(function (p) { return p.id === pid; }) : state.project;
    if (!source) return null;
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = uid('p');
    copy.name = source.name + ' 副本';
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    state.projects.unshift(copy);
    await db.putProject(copy);
    for (const node of NODES) {
      const msgs = await db.loadChat(source.id, node.id);
      if (msgs && msgs.length) await db.saveChat(copy.id, node.id, msgs);
    }
    notify('all');
    toast('已复制为「' + copy.name + '」');
    return copy;
  }

  async function deleteProject(pid) {
    const target = pid || (state.project && state.project.id);
    if (!target) return false;
    if (state.projects.length <= 1) {
      toast('至少保留一个方案');
      return false;
    }
    await db.deleteProject(target);
    state.projects = state.projects.filter(function (p) { return p.id !== target; });
    if (state.project && state.project.id === target) {
      state.project = state.projects[0];
      ensureSegments(state.project);
      await loadProjectChats(state.project);
      state.settings.activeProjectId = state.project.id;
      persistSettings();
    }
    notify('all');
    toast('已删除方案');
    return true;
  }

  async function importData(raw) {
    const parsed = parseImport(raw);
    if (!parsed.projects.length) throw new Error('没有可导入的方案');
    await flush();
    for (const p of parsed.projects) {
      state.projects.unshift(p);
      await db.putProject(p);
    }
    if (parsed.presets && parsed.presets.length) {
      state.presets = state.presets.concat(parsed.presets);
      await db.setKV('presets', state.presets);
    }
    state.project = state.projects[0];
    ensureSegments(state.project);
    await loadProjectChats(state.project);
    state.settings.activeProjectId = state.project.id;
    persistSettings();
    notify('all');
    return parsed.projects.length;
  }

  /* ---------------- 节点与对话 ---------------- */

  function messages() {
    return state.chats[state.activeNodeId] || [];
  }

  function setMessages(list) {
    state.chats[state.activeNodeId] = list;
  }

  async function switchNode(nodeId) {
    if (!getNode(nodeId)) return;
    if (nodeId === state.activeNodeId) return;
    const prev = state.activeNodeId;
    state.activeNodeId = nodeId;
    state.project.activeNodeId = nodeId;
    state.draft = { text: '', images: [] };
    /* 先切再落盘：落盘失败也不能卡住界面 */
    notify('node');
    try {
      if (!state.chats[nodeId]) {
        state.chats[nodeId] = await db.loadChat(state.project.id, nodeId);
      }
      await flush();
      persistProject();
      notify('node');
    } catch (err) {
      console.warn('[store] 切换节点时落盘失败', err);
      toast('对话已切换，但保存失败：' + ((err && err.message) || '未知'));
    }
  }

  function toggleCollapse(nodeId) {
    const nodes = state.project.nodes || (state.project.nodes = {});
    const cur = nodes[nodeId] || { collapsed: false };
    nodes[nodeId] = Object.assign({}, cur, { collapsed: !cur.collapsed });
    persistProject();
    notify('sidebar');
  }

  /* ---------------- 提示词 ---------------- */

  function segments() {
    return ensureSegments(state.project);
  }

  function groupedSegments() {
    return groupByLayer(segments());
  }

  function promptResult() {
    return composePrompt(state.activeNodeId, {
      project: state.project,
      presets: allPresets(state.presets)
    });
  }

  function promptText() {
    return promptResult().text;
  }

  function toggleSegment(id) {
    const seg = segments().find(function (s) { return s.id === id; });
    if (!seg) return false;
    seg.enabled = !seg.enabled;
    persistProject();
    notify('prompt');
    return seg.enabled;
  }

  function editSegmentText(id, text) {
    const seg = segments().find(function (s) { return s.id === id; });
    if (!seg) return false;
    seg.text = text;
    persistProject();
    notify('prompt');
    return true;
  }

  function moveSegment(id, dir) {
    const list = segments();
    const seg = list.find(function (s) { return s.id === id; });
    if (!seg) return false;
    const same = list.filter(function (s) { return s.layer === seg.layer; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    const idx = same.indexOf(seg);
    const target = same[idx + dir];
    if (!target) return false;
    const tmp = seg.order;
    seg.order = target.order;
    target.order = tmp;
    persistProject();
    notify('prompt');
    return true;
  }

  function resetSegmentLibrary() {
    resetSegments(state.project);
    persistProject();
    notify('prompt');
  }

  function setPreset(presetId) {
    state.project.promptCfg = Object.assign({ refMode: 'condensed' }, state.project.promptCfg, { presetId: presetId });
    persistProject();
    notify('prompt');
  }

  function setRefMode(mode) {
    state.project.promptCfg = Object.assign({}, state.project.promptCfg, { refMode: mode });
    persistProject();
    notify('prompt');
  }

  /* ---------------- 预设 ---------------- */

  function presetsAll() {
    return allPresets(state.presets);
  }

  function savePreset(preset) {
    if (preset.id && findPreset(state.presets, preset.id) && findPreset(state.presets, preset.id).builtin) {
      const copy = clonePreset(findPreset(state.presets, preset.id));
      state.presets.push(copy);
      db.setKV('presets', state.presets);
      notify('prompt');
      return copy;
    }
    if (preset.id) {
      updatePreset(state.presets, preset.id, preset);
    } else {
      state.presets.push(createPreset(preset.name, preset.desc));
    }
    db.setKV('presets', state.presets);
    notify('prompt');
    return preset;
  }

  function deletePreset(id) {
    const ok = removePreset(state.presets, id);
    if (ok) {
      db.setKV('presets', state.presets);
      notify('prompt');
    }
    return ok;
  }

  /* ---------------- 分支写入 ---------------- */

  function writeToBranch(branchId, css, mode, source) {
    const ok = branchesApi.write(state.project.branches, branchId, css, mode || 'REPLACE', source || 'ai');
    if (ok) persistProject();
    return ok;
  }

  function writePart(msgId, index) {
    const msg = messages().find(function (m) { return m.id === msgId; });
    if (!msg || !msg.parts || !msg.parts[index]) return false;
    const part = msg.parts[index];
    const ok = writeToBranch(part.branchId, part.css, part.mode, 'ai');
    if (ok) {
      part.written = true;
      persistChat();
      notify('chat');
    }
    return ok;
  }

  function writeAllParts(msgId) {
    const msg = messages().find(function (m) { return m.id === msgId; });
    if (!msg || !msg.parts) return { ok: 0, failed: [] };
    const failed = [];
    let ok = 0;
    msg.parts.forEach(function (part) {
      if (writeToBranch(part.branchId, part.css, part.mode, 'ai')) {
        part.written = true;
        ok += 1;
      } else {
        failed.push(part.branchId);
      }
    });
    persistChat();
    notify('chat');
    return { ok: ok, failed: failed };
  }

  function toggleBranchEnabled(branchId) {
    const b = state.project.branches[branchId];
    if (!b) return false;
    b.enabled = !b.enabled;
    persistProject();
    notify('branch');
    return b.enabled;
  }

  function undoBranch(branchId) {
    const ok = branchesApi.undo(state.project.branches, branchId);
    if (ok) { persistProject(); notify('chat'); }
    return ok;
  }

  /* ---------------- 渠道 ---------------- */

  function channelsAll() {
    return channelsApi.allChannels(state.channels);
  }

  function activeChannel() {
    const list = channelsAll();
    return list.find(function (c) { return c.id === state.settings.activeChannelId; })
      || list.find(function (c) { return !c.builtin; })
      || list[0];
  }

  function setActiveChannel(id) {
    state.settings.activeChannelId = id;
    persistSettings();
    notify('api');
  }

  async function saveChannel(channel) {
    channelsApi.upsertChannel(state.channels, channel);
    await db.setKV('channels', state.channels);
    state.settings.activeChannelId = channel.id;
    persistSettings();
    notify('api');
    return channel;
  }

  async function testChannel(channel) {
    const r = await testConnection(channel);
    notify('api');
    return r;
  }

  /* ---------------- 图片 ---------------- */

  async function addLocalImage(file) {
    const img = await compressImage(file);
    state.draft.images.push({ id: uid('img'), mode: 'local', dataUrl: img.dataUrl, name: img.name || file.name || 'image.jpg', mime: 'image/jpeg' });
    notify('composer');
    return true;
  }

  async function addPickedImages(limit) {
    const files = await pickImages(limit);
    let n = 0;
    for (const f of files) {
      if (f && f.dataUrl) {
        state.draft.images.push({
          id: uid('img'),
          mode: 'local',
          dataUrl: f.dataUrl,
          name: f.name || 'image.jpg',
          mime: f.mime || 'image/jpeg'
        });
        n += 1;
      }
    }
    notify('composer');
    return n;
  }

  async function uploadDraftImage(imageId) {
    const img = state.draft.images.find(function (i) { return i.id === imageId; });
    if (!img) return { ok: false, reason: '图片不存在' };
    const cfg = normalizeConfig(state.settings.imageHost);
    if (!cfg.enabled) return { ok: false, reason: '图床未启用（设置 → 图床）' };

    const blobRes = await fetch(img.dataUrl);
    const blob = await blobRes.blob();
    const file = new File([blob], img.name || 'image.jpg', { type: img.mime || 'image/jpeg' });

    let res = await uploadViaNative(file, cfg);
    if (!res) res = await uploadImage(file, cfg);
    if (res.ok) {
      img.mode = 'cloud';
      img.url = res.url;
      notify('composer');
    }
    return res;
  }

  function removeDraftImage(id) {
    state.draft.images = state.draft.images.filter(function (i) { return i.id !== id; });
    notify('composer');
  }

  /* ---------------- 对话 ---------------- */

  async function send(text, images) {
    if (state.busy) return;
    const content = String(text || '').trim();
    const imgs = (images || []).slice();
    if (!content && !imgs.length) return;

    const channel = activeChannel();
    if (!channel) {
      toast('没有可用渠道：去「API 预设」里配一个');
      return;
    }
    if (!channel.apiKey) {
      toast('渠道还没填 API Key');
      return;
    }

    const prompt = promptText();
    const nodeId = state.activeNodeId;

    const userMsg = {
      id: uid('m'),
      role: 'user',
      text: content,
      images: imgs.map(function (i) {
        return { dataUrl: i.dataUrl, url: i.url || '', mode: i.mode, name: i.name };
      }),
      createdAt: Date.now()
    };
    const list = messages();
    list.push(userMsg);
    setMessages(list);
    persistChat();
    state.busy = true;
    notify('chat');

    const history = list.slice(-6, -1).map(function (m) {
      return { role: m.role === 'ai' ? 'assistant' : 'user', content: m.text || '' };
    });

    let userContent = content;
    if (imgs.length) {
      userContent = [{ type: 'text', text: content || '参考这些截图。' }];
      imgs.forEach(function (i) {
        userContent.push({ type: 'image_url', image_url: { url: i.url || i.dataUrl } });
      });
    }

    const messagesPayload = [{ role: 'system', content: prompt }]
      .concat(history)
      .concat([{ role: 'user', content: userContent }]);

    const msgId = uid('m');
    const placeholder = {
      id: msgId,
      role: 'ai',
      text: '',
      streaming: true,
      createdAt: Date.now()
    };
    list.push(placeholder);
    setMessages(list);
    notify('chat');

    let streamed = '';
    const res = await aiChat({
      channel: channel,
      messages: messagesPayload,
      onDelta: function (delta) {
        streamed += delta;
        const target = messages().find(function (m) { return m.id === msgId; });
        if (target) {
          target.text = streamed;
          notify('chat');
        }
      }
    });

    state.busy = false;

    const finalList = messages();
    const idx = finalList.findIndex(function (m) { return m.id === msgId; });
    if (idx < 0) return;

    if (!res.ok) {
      finalList[idx] = {
        id: msgId,
        role: 'ai',
        text: '调用失败：' + res.error,
        failed: true,
        createdAt: Date.now()
      };
      setMessages(finalList);
      persistChat();
      notify('chat');
      await recordUsage(channel, prompt, res.text || streamed, res.usage, res.ms, false, res.error);
      return;
    }

    const parsed = parseReply(res.text || streamed, branchIdsOf(nodeId)[0] || '');
    finalList[idx] = {
      id: msgId,
      role: 'ai',
      text: parsed.chat || '已生成 CSS，见下方代码卡。',
      parts: parsed.parts,
      note: parsed.note,
      next: parsed.next,
      complete: parsed.complete,
      raw: res.text || streamed,
      createdAt: Date.now()
    };
    setMessages(finalList);
    persistChat();
    notify('chat');
    await recordUsage(channel, prompt, (res.text || streamed), res.usage, res.ms, true, '');
    if (!parsed.complete) toast('回复里没有可用的 CSS 代码块');
  }

  async function recordUsage(channel, promptText, replyText, rawUsage, ms, ok, error) {
    const usage = usageApi.normalizeUsage(rawUsage) || usageApi.estimateUsage(promptText, replyText);
    const record = usageApi.makeRecord({
      projectId: state.project ? state.project.id : '',
      projectName: state.project ? state.project.name : '',
      channelId: channel ? channel.id : '',
      channelName: channel ? channel.name : '',
      model: channel ? channel.model : '',
      usage: usage,
      prices: state.settings.prices,
      ms: ms,
      ok: ok,
      error: error
    });
    state.usage.unshift(record);
    if (state.usage.length > 2000) state.usage.length = 2000;
    await db.putUsage(record);
    notify('billing');
    return record;
  }

  function deleteMessage(id) {
    setMessages(messages().filter(function (m) { return m.id !== id; }));
    persistChat();
    notify('chat');
  }

  /* ---------------- 导出 ---------------- */

  function buildScope(scope) {
    return buildScopeCss(scope, state.project.branches, []);
  }

  function buildAllScopes() {
    return buildAll(state.project.branches, []);
  }

  async function recordExport(scope, built) {
    const rec = {
      id: uid('exp'),
      at: Date.now(),
      scope: scope,
      name: built.name,
      css: built.css.length > 120 * 1024 ? built.css.slice(0, 120 * 1024) + '\n/* …已截断… */' : built.css,
      truncated: built.css.length > 120 * 1024
    };
    state.exports.unshift(rec);
    state.exports = state.exports.slice(0, 10);
    await db.putExport(rec);
    notify('export');
    return rec;
  }

  async function exportToDevice(scope) {
    const built = buildScope(scope);
    if (!built.report.stats.branches) return { ok: false, reason: SCOPE_LABEL[scope] + '还没有内容' };
    const r = await nativeSave(built.name, built.css, 'text/css');
    if (r.ok) await recordExport(scope, built);
    return Object.assign({ built: built }, r);
  }

  async function shareExport(scope) {
    const built = buildScope(scope);
    if (!built.report.stats.branches) return { ok: false, reason: SCOPE_LABEL[scope] + '还没有内容' };
    const r = await nativeShare(built.name, built.css, 'text/css');
    if (r.ok) await recordExport(scope, built);
    return Object.assign({ built: built }, r);
  }

  async function downloadBackup(includeKeys) {
    const data = buildBackup(state, { includeKeys: includeKeys });
    const text = JSON.stringify(data, null, 2);
    return nativeSave(backupFileName(), text, 'application/json');
  }

  /* ---------------- 启动 ---------------- */

  async function boot() {
    const [projects, channelsKV, presetsKV, settingsKV, usage, exports] = await Promise.all([
      db.listProjects(),
      db.getKV('channels', []),
      db.getKV('presets', []),
      db.getKV('settings', {}),
      db.listUsage(),
      db.listExports()
    ]);

    state.channels = Array.isArray(channelsKV) ? channelsKV : [];
    state.presets = Array.isArray(presetsKV) ? presetsKV : [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS, settingsKV || {});
    state.settings.imageHost = normalizeConfig(state.settings.imageHost);
    state.usage = Array.isArray(usage) ? usage : [];
    state.exports = Array.isArray(exports) ? exports : [];

    if (!Array.isArray(projects) || !projects.length) {
      const project = newProjectObject('我的美化');
      await db.putProject(project);
      state.projects = [project];
    } else {
      state.projects = projects.map(function (p) {
        const fixed = Object.assign({ branches: branchesApi.emptyBranches(), nodes: {}, promptCfg: {} }, p);
        ensureSegments(fixed);
        return fixed;
      });
    }

    const wanted = state.settings.activeProjectId;
    state.project = state.projects.find(function (p) { return p.id === wanted; }) || state.projects[0];
    state.settings.activeProjectId = state.project.id;
    await loadProjectChats(state.project);

    if (!state.settings.activeChannelId) {
      const first = state.channels[0];
      state.settings.activeChannelId = first ? first.id : '';
    }

    state.loading = false;
    notify('all');
  }

  async function clearEverything() {
    await db.clearAll();
    const project = newProjectObject('我的美化');
    await db.putProject(project);
    state.projects = [project];
    state.project = project;
    state.chats = { plan: [] };
    state.activeNodeId = 'plan';
    state.channels = [];
    state.presets = [];
    state.usage = [];
    state.exports = [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS);
    notify('all');
  }

  return {
    state: state,
    onChange: onChange,
    notify: notify,
    toast: toast,
    boot: boot,
    flush: flush,

    switchProject: switchProject,
    createProject: createProject,
    renameProject: renameProject,
    duplicateProject: duplicateProject,
    deleteProject: deleteProject,
    importData: importData,

    switchNode: switchNode,
    messages: messages,
    toggleCollapse: toggleCollapse,

    segments: segments,
    groupedSegments: groupedSegments,
    promptResult: promptResult,
    promptText: promptText,
    toggleSegment: toggleSegment,
    editSegmentText: editSegmentText,
    moveSegment: moveSegment,
    resetSegmentLibrary: resetSegmentLibrary,
    setPreset: setPreset,
    setRefMode: setRefMode,

    presetsAll: presetsAll,
    savePreset: savePreset,
    deletePreset: deletePreset,

    writeToBranch: writeToBranch,
    writePart: writePart,
    writeAllParts: writeAllParts,
    toggleBranchEnabled: toggleBranchEnabled,
    undoBranch: undoBranch,

    channelsAll: channelsAll,
    activeChannel: activeChannel,
    setActiveChannel: setActiveChannel,
    saveChannel: saveChannel,
    testChannel: testChannel,

    addLocalImage: addLocalImage,
    addPickedImages: addPickedImages,
    uploadDraftImage: uploadDraftImage,
    removeDraftImage: removeDraftImage,

    send: send,
    deleteMessage: deleteMessage,
    recordUsage: recordUsage,

    buildScope: buildScope,
    buildAllScopes: buildAllScopes,
    recordExport: recordExport,
    exportToDevice: exportToDevice,
    shareExport: shareExport,
    downloadBackup: downloadBackup,

    usageSummary: function (range) { return usageApi.summarize(state.usage, range); },
    usageBy: function (key) { return usageApi.groupBy(state.usage, key); },
    usageLastDays: function (n) { return usageApi.lastDays(state.usage, n); },
    money: usageApi.money,

    clearEverything: clearEverything,

    /* 供 UI 读取 */
    labelOf: labelOf,
    branchIdsOf: branchIdsOf,
    breadcrumb: breadcrumb,
    scopeOf: scopeOf,
    SCOPE_LABEL: SCOPE_LABEL
  };
}
