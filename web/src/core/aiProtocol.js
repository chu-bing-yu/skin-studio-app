/**
 * 协议 v2：支持一次输出多段
 * 【判断】…
 * 【分支】online.bubble-me
 * 【模式】REPLACE
 * 【CSS】
 * ```css … ```
 * 【分支】online.bubble-tail
 * 【CSS】
 * ```css … ```
 * 【说明】…
 * 【下一步】…
 */
import { BRANCHES, ALIASES, getBranch } from './schema.js';

const BRANCH_TAG = /【分支】\s*([^\n\r【]+)/g;
const MODE_TAG = /【模式】\s*([^\n\r【]+)/;
const NOTE_TAG = /【说明】\s*([\s\S]*?)(?=【|$)/;
const NEXT_TAG = /【下一步】\s*([\s\S]*?)(?=【|$)/;
const JUDGE_TAG = /【判断】\s*([\s\S]*?)(?=【|$)/;

function pickCodeBlock(text) {
  const re = /```(?:css|CSS|scss)?\s*\n([\s\S]*?)```/g;
  let m;
  let best = '';
  while ((m = re.exec(text))) {
    if (m[1].length > best.length) best = m[1];
  }
  return best.trim();
}

function pickFirstCodeBlock(text) {
  const re = /```(?:css|CSS|scss)?\s*\n([\s\S]*?)```/;
  const m = re.exec(text);
  return m ? m[1].trim() : '';
}

function resolveBranch(raw, fallbackId) {
  const s = String(raw || '').trim().replace(/[。，,.\s]+$/, '');
  if (!s) return fallbackId || '';
  if (getBranch(s)) return s;
  const lower = s.toLowerCase();
  for (let i = 0; i < BRANCHES.length; i++) {
    if (BRANCHES[i].id.toLowerCase() === lower) return BRANCHES[i].id;
    if (BRANCHES[i].name === s) return BRANCHES[i].id;
  }
  if (ALIASES[s]) return ALIASES[s];
  if (ALIASES[lower]) return ALIASES[lower];
  const parts = s.split(/[\/／|·]/);
  const tail = parts[parts.length - 1].trim();
  if (ALIASES[tail]) return ALIASES[tail];
  if (getBranch(tail)) return tail;
  return fallbackId || '';
}

function normalizeMode(raw, fallback) {
  const s = String(raw || fallback || 'REPLACE').toUpperCase();
  return (s.indexOf('APPEND') > -1 || s.indexOf('追加') > -1) ? 'APPEND' : 'REPLACE';
}

function stripProtocol(text) {
  return String(text || '')
    .replace(/【分支】[^\n\r]*/g, '')
    .replace(/【模式】[^\n\r]*/g, '')
    .replace(/【CSS】/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/【说明】[\s\S]*?(?=【|$)/g, '')
    .replace(/【下一步】[\s\S]*?(?=【|$)/g, '')
    .replace(/【判断】/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} text
 * @param {string} fallbackBranchId
 * @returns {{chat:string, parts:Array<{branchId:string,mode:string,css:string}>, note:string, next:string, complete:boolean}}
 */
export function parseReply(text, fallbackBranchId) {
  const raw = String(text || '');
  const marks = [];
  BRANCH_TAG.lastIndex = 0;
  let m;
  while ((m = BRANCH_TAG.exec(raw))) {
    marks.push({ index: m.index, end: m.index + m[0].length, raw: m[1].trim() });
  }

  const noteM = NOTE_TAG.exec(raw);
  const nextM = NEXT_TAG.exec(raw);
  const judgeM = JUDGE_TAG.exec(raw);
  const globalMode = MODE_TAG.exec(raw);
  const parts = [];

  if (!marks.length) {
    const css = pickCodeBlock(raw);
    if (css) {
      parts.push({
        branchId: resolveBranch('', fallbackBranchId),
        mode: normalizeMode(globalMode && globalMode[1], 'REPLACE'),
        css: css
      });
    }
  } else {
    for (let i = 0; i < marks.length; i++) {
      const seqStart = marks[i].end;
      const seqEnd = i + 1 < marks.length ? marks[i + 1].index : raw.length;
      const slice = raw.slice(seqStart, seqEnd);
      const css = pickFirstCodeBlock(slice) || pickCodeBlock(slice);
      const localMode = MODE_TAG.exec(slice);
      parts.push({
        branchId: resolveBranch(marks[i].raw, fallbackBranchId),
        // 每段的模式只看自己那一段；没写就是 REPLACE（避免前面某段的模式污染后面）
        mode: normalizeMode(localMode && localMode[1], 'REPLACE'),
        css: css
      });
    }
  }

  const valid = parts.filter(function (p) { return p.branchId && p.css; });
  const head = judgeM ? judgeM[1].trim() : '';
  const body = stripProtocol(raw);
  const chat = [head, body].filter(Boolean).join('\n\n').trim();

  return {
    chat: chat || (valid.length ? '已生成 CSS，见下方代码卡。' : raw.trim()),
    parts: valid,
    allParts: parts,
    note: noteM ? noteM[1].trim() : '',
    next: nextM ? nextM[1].trim() : '',
    complete: valid.length > 0
  };
}

/** 从文本里抓 url(...) 外链（去重） */
export function extractUrls(text) {
  const out = [];
  const re = /url\(\s*['"]?(https?:\/\/[^'")\s]+)['"]?\s*\)/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    if (out.indexOf(m[1]) < 0) out.push(m[1]);
  }
  return out;
}
