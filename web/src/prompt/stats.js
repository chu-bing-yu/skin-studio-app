/** 体积与 token 估算 */
export function estimateTokens(text) {
  const s = String(text || '');
  let cjk = 0;
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 255) cjk += 1;
  }
  return Math.round(cjk + (s.length - cjk) / 4);
}

export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return v + ' B';
  return (v / 1024).toFixed(1) + ' KB';
}

export function formatTokens(n) {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  return (v / 1000).toFixed(1) + 'k';
}

export function statsOf(text) {
  const s = String(text || '');
  return { bytes: s.length, tokens: estimateTokens(s) };
}
