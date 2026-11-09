/** 备份导出 / 导入（默认剔除 API Key） */
export function buildBackup(state, opts) {
  const includeKeys = !!(opts && opts.includeKeys);
  const channels = (state.channels || []).map(function (c) {
    const copy = Object.assign({}, c);
    if (!includeKeys) copy.apiKey = '';
    return copy;
  });
  const imageHost = Object.assign({}, state.settings && state.settings.imageHost);
  if (!includeKeys) {
    imageHost.imgbbApiKey = '';
    imageHost.catboxUserhash = '';
    imageHost.customApiKey = '';
  }
  return {
    schema: 1,
    exportedAt: Date.now(),
    app: 'skin-studio-app',
    includeKeys: includeKeys,
    projects: state.projects || [],
    presets: state.presets || [],
    channels: channels,
    settings: Object.assign({}, state.settings, { imageHost: imageHost })
  };
}

export function backupFileName(d) {
  const t = d || new Date();
  const p = function (n) { return n < 10 ? '0' + n : String(n); };
  return 'skin-studio-backup-' + t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate())
    + '-' + p(t.getHours()) + p(t.getMinutes()) + '.json';
}
