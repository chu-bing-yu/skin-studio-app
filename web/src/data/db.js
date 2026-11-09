/**
 * 本地存储：IndexedDB 为主（方案 / 对话 / 导出 / 用量），localStorage 兜底。
 * 浏览器与 WebView 都可用；隐私模式下 IDB 可能不可用，自动降级。
 */

const DB_NAME = 'skin-studio-app';
const DB_VERSION = 1;
const STORES = ['projects', 'chats', 'exports', 'usage', 'kv'];

let dbPromise = null;
let memoryOnly = false;
const memory = {
  projects: new Map(),
  chats: new Map(),
  exports: new Map(),
  usage: new Map(),
  kv: new Map()
};

function hasIDB() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch (err) {
    return false;
  }
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve, reject) {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () {
      const db = req.result;
      STORES.forEach(function (name) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: name === 'kv' ? 'key' : 'id' });
        }
      });
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error || new Error('indexedDB open failed')); };
    req.onblocked = function () { reject(new Error('indexedDB blocked')); };
  }).catch(function (err) {
    console.warn('[db] IndexedDB 不可用，降级为内存 + localStorage', err && err.message);
    memoryOnly = true;
    return null;
  });
  return dbPromise;
}

function lsKey(store, key) {
  return 'ss:' + store + ':' + key;
}

function memTable(store) {
  return memory[store] || (memory[store] = new Map());
}

async function tx(store, mode, fn) {
  const db = await openDB();
  if (!db) return fn(null);
  return new Promise(function (resolve, reject) {
    let t;
    try {
      t = db.transaction(store, mode);
    } catch (err) {
      reject(err);
      return;
    }
    const os = t.objectStore(store);
    let out;
    try {
      out = fn(os);
    } catch (err) {
      reject(err);
      return;
    }
    t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
    t.onerror = function () { reject(t.error); };
    t.onabort = function () { reject(t.error || new Error('aborted')); };
  });
}

function idbGet(store, key) {
  return tx(store, 'readonly', function (os) { return os.get(key); }).then(function (r) {
    return r && r.result !== undefined ? r.result : r;
  });
}

async function get(store, key) {
  const db = await openDB();
  if (!db) {
    const raw = localStorage.getItem(lsKey(store, key));
    if (raw) return JSON.parse(raw);
    return memTable(store).get(key) || undefined;
  }
  return idbGet(store, key);
}

async function put(store, value, keyPath) {
  const key = value[keyPath || 'id'];
  const db = await openDB();
  if (!db) {
    memTable(store).set(key, value);
    try { localStorage.setItem(lsKey(store, key), JSON.stringify(value)); } catch (err) { /* 容量 */ }
    return key;
  }
  return tx(store, 'readwrite', function (os) { return os.put(value); });
}

async function del(store, key) {
  const db = await openDB();
  if (!db) {
    memTable(store).delete(key);
    localStorage.removeItem(lsKey(store, key));
    return true;
  }
  return tx(store, 'readwrite', function (os) { return os.delete(key); });
}

async function all(store) {
  const db = await openDB();
  if (!db) {
    const out = [];
    const prefix = 'ss:' + store + ':';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) {
        try { out.push(JSON.parse(localStorage.getItem(k))); } catch (err) { /* 跳过坏数据 */ }
      }
    }
    return out;
  }
  return tx(store, 'readonly', function (os) { return os.getAll(); }).then(function (r) {
    return Array.isArray(r) ? r : (r && Array.isArray(r.result) ? r.result : []);
  });
}

/* ---------------- 方案 ---------------- */

export function listProjects() {
  return all('projects').then(function (list) {
    return list.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
  });
}

export function getProject(id) {
  return get('projects', id);
}

export function putProject(project) {
  project.updatedAt = Date.now();
  return put('projects', project);
}

export async function deleteProject(id) {
  await del('projects', id);
  const chats = await all('chats');
  for (const row of chats) {
    if (row.pid === id) await del('chats', row.id);
  }
}

/* ---------------- 对话 ---------------- */

function chatId(pid, nodeId) {
  return pid + '::' + nodeId;
}

export async function loadChat(pid, nodeId) {
  const row = await get('chats', chatId(pid, nodeId));
  return row && Array.isArray(row.messages) ? row.messages : [];
}

export function saveChat(pid, nodeId, messages) {
  return put('chats', { id: chatId(pid, nodeId), pid: pid, nodeId: nodeId, messages: messages || [] });
}

export function dropChat(pid, nodeId) {
  return del('chats', chatId(pid, nodeId));
}

/* ---------------- 导出历史 ---------------- */

export async function listExports() {
  const list = await all('exports');
  return list.sort(function (a, b) { return b.at - a.at; });
}

export function putExport(record) {
  return put('exports', record);
}

export function deleteExport(id) {
  return del('exports', id);
}

/* ---------------- 用量 ---------------- */

export async function listUsage() {
  const list = await all('usage');
  return list.sort(function (a, b) { return b.at - a.at; });
}

export function putUsage(record) {
  return put('usage', record);
}

export async function clearUsage() {
  const list = await all('usage');
  for (const row of list) await del('usage', row.id);
}

/* ---------------- 键值（设置 / 渠道 / 提示词段） ---------------- */

export async function getKV(key, fallback) {
  const row = await get('kv', key);
  return row && row.value !== undefined ? row.value : fallback;
}

export function setKV(key, value) {
  return put('kv', { key: key, value: value }, 'key');
}

/* ---------------- 清空 ---------------- */

export async function clearAll() {
  for (const store of STORES) {
    const list = await all(store);
    for (const row of list) {
      await del(store, row.key !== undefined ? row.key : row.id);
    }
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.indexOf('ss:') === 0) localStorage.removeItem(k);
    }
  } catch (err) { /* 忽略 */ }
}

export function isMemoryOnly() {
  return memoryOnly;
}
