/** 界面：两栏 + 左滑抽屉 + 二级页 */
import { el, svgIcon, clear } from './dom.js';
import { renderMarkdown } from '../core/markdown.js';
import { lineCount } from '../core/branches.js';
import { childrenOf, branchIdsOf, getNode, labelOf, SCOPE_LABEL } from '../core/tree.js';
import { createPreview } from './preview.js';
import { LAYERS } from '../prompt/defaults.js';
import { formatBytes, formatTokens } from '../prompt/stats.js';
import { copyText } from '../core/clipboard.js';
import { money, priceOf, DEFAULT_PRICES } from '../ai/usage.js';
import { BUILTIN_CHANNELS, allChannels, createChannel, endpointOf } from '../ai/channels.js';
import { providerLabel } from '../ai/imageHost.js';

function copyWithToast(store, text, ok) {
  copyText(text).then(function (r) {
    store.toast(r.ok ? (ok || '已复制') : '复制失败，请长按选择');
  });
}

export function mountApp(container, store) {
  const state = store.state;
  const root = el('div', { class: 'ss-root' });
  const app = el('div', { class: 'ss-app' });
  const main = el('div', { class: 'ss-main' });

  const crumbMain = el('div', { class: 'ss-crumb__main' });
  const crumbSub = el('div', { class: 'ss-crumb__sub' });

  const top = el('div', { class: 'ss-top' }, [
    el('button', {
      class: 'ss-icon-btn ss-edge-btn',
      title: '打开抽屉（也可从屏幕左边缘右滑）',
      onclick: function () { openDrawer(); }
    }, [svgIcon('menu', 18)]),
    el('div', { class: 'ss-crumb' }, [crumbMain, crumbSub]),
    el('button', { class: 'ss-icon-btn', title: '提示词', onclick: function () { openPage('prompt'); } }, [svgIcon('layers', 18)]),
    el('button', { class: 'ss-icon-btn', title: '导出', onclick: function () { openPage('export'); } }, [svgIcon('down', 18)]),
    el('button', { class: 'ss-icon-btn', title: '抽屉', onclick: function () { openDrawer(); } }, [svgIcon('dots', 18)])
  ]);

  const body = el('div', { class: 'ss-body' });
  const composer = el('div', { class: 'ss-composer' });

  main.appendChild(top);
  main.appendChild(body);
  main.appendChild(composer);
  app.appendChild(main);

  /* 左侧抽屉（卡片） */
  const mask = el('div', { class: 'ss-mask' });
  const sideDrawer = el('div', { class: 'ss-side-drawer' });
  const screen = el('div', { class: 'ss-screen' });
  const toastEl = el('div', { class: 'ss-toast' });
  const pvWrap = el('div', { class: 'ss-screen ss-screen--pv' });

  root.appendChild(app);
  root.appendChild(mask);
  root.appendChild(sideDrawer);
  root.appendChild(screen);
  root.appendChild(pvWrap);
  root.appendChild(toastEl);
  container.appendChild(root);

  let drawerOpen = false;
  let pageName = '';
  let previewOpen = false;
  let toastTimer = null;

  /* ---------------- 基础 ---------------- */

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('ss-toast--in');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('ss-toast--in');
      toastTimer = null;
    }, 2400);
  }

  function dialog(opts) {
    return new Promise(function (resolve) {
      const input = opts.multiline
        ? el('textarea', { class: 'ss-editor', style: { minHeight: '160px' }, text: opts.value || '' })
        : el('input', { class: 'ss-field__input', value: opts.value || '' });
      const layer = el('div', { class: 'ss-dialog' }, [
        el('div', { class: 'ss-dialog__box' }, [
          el('div', { class: 'ss-dialog__title', text: opts.title || '' }),
          opts.hint ? el('div', { class: 'ss-dialog__msg', text: opts.hint }) : null,
          input,
          el('div', { class: 'ss-dialog__foot' }, [
            el('button', { class: 'ss-btn ss-btn--ghost', text: '取消', onclick: function () { close(); resolve(null); } }),
            el('button', { class: 'ss-btn ss-btn--primary', text: '确定', onclick: function () { close(); resolve(input.value); } })
          ])
        ])
      ]);
      function close() {
        layer.classList.remove('ss-dialog--in');
        setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 180);
      }
      layer.addEventListener('click', function (ev) { if (ev.target === layer) { close(); resolve(null); } });
      root.appendChild(layer);
      requestAnimationFrame(function () { layer.classList.add('ss-dialog--in'); });
      setTimeout(function () { input.focus(); }, 60);
    });
  }

  function confirmBox(title, message) {
    return dialog({ title: title, hint: message, value: '' }).then(function (v) { return v !== null; });
  }

  /* ---------------- 抽屉 ---------------- */

  function openDrawer() {
    drawerOpen = true;
    renderDrawer();
    sideDrawer.classList.add('ss-side-drawer--in');
    mask.classList.add('ss-mask--in');
  }

  function closeDrawer() {
    drawerOpen = false;
    sideDrawer.classList.remove('ss-side-drawer--in');
    mask.classList.remove('ss-mask--in');
  }

  function renderDrawer() {
    clear(sideDrawer);
    const written = Object.keys(state.project.branches).filter(function (id) {
      const b = state.project.branches[id];
      return b && b.css && b.css.trim();
    }).length;
    const today = store.usageSummary('today');
    const month = store.usageSummary('month');

    const cards = [
      {
        id: 'architecture', title: '架构', desc: written + '/35 个分支有内容',
        icon: 'layers'
      },
      {
        id: 'api', title: 'API 预设', desc: (store.activeChannel() ? store.activeChannel().name : '未配置') + ' · ' + (store.activeChannel() ? store.activeChannel().model : ''),
        icon: 'palette'
      },
      {
        id: 'billing', title: 'Token 账单',
        desc: '今日 ' + formatTokens(today.totalTokens) + ' · 本月 ' + formatTokens(month.totalTokens) + ' · ' + money(month.cost, state.settings.currency),
        icon: 'down'
      },
      { id: 'prompt', title: '提示词', desc: store.promptResult().used.length + ' 段 · ' + formatBytes(store.promptResult().bytes), icon: 'edit' },
      { id: 'settings', title: '设置', desc: '图床 / 主题 / 导入导出', icon: 'dots' }
    ];

    sideDrawer.appendChild(el('div', { class: 'ss-side-drawer__head' }, [
      el('div', { class: 'ss-side-drawer__title', text: '美化' }),
      el('button', { class: 'ss-icon-btn', onclick: closeDrawer }, [svgIcon('close', 18)])
    ]));

    const list = el('div', { class: 'ss-menu-cards' });
    cards.forEach(function (c) {
      const row = el('button', { class: 'ss-menu-card' }, [
        el('span', { class: 'ss-menu-card__icon' }, [svgIcon(c.icon, 20)]),
        el('span', { class: 'ss-menu-card__main' }, [
          el('span', { class: 'ss-menu-card__title', text: c.title }),
          el('span', { class: 'ss-menu-card__desc', text: c.desc })
        ]),
        svgIcon('chevron', 16)
      ]);
      row.addEventListener('click', function () { closeDrawer(); openPage(c.id); });
      list.appendChild(row);
    });
    sideDrawer.appendChild(list);

    /* 方案切换 */
    sideDrawer.appendChild(el('div', { class: 'ss-side-drawer__section', text: '美化方案' }));
    const plist = el('div', { class: 'ss-proj-list' });
    state.projects.forEach(function (p) {
      const active = state.project && p.id === state.project.id;
      const row = el('div', { class: 'ss-proj-item' + (active ? ' ss-proj-item--on' : '') }, [
        el('button', { class: 'ss-proj-item__main' }, [
          el('div', { class: 'ss-proj-item__name', text: p.name }),
          el('div', {
            class: 'ss-proj-item__meta',
            text: Object.keys(p.branches || {}).filter(function (id) {
              const b = p.branches[id];
              return b && b.css && b.css.trim();
            }).length + ' 个分支有内容'
          })
        ]),
        active ? el('span', { class: 'ss-proj-item__tick', text: '✓' }) : null,
        el('button', {
          class: 'ss-mini-btn',
          onclick: function () {
            dialog({ title: '重命名方案', value: p.name }).then(function (name) {
              if (name === null || !name.trim()) return;
              store.renameProject(name, p.id).then(function () { renderDrawer(); });
            });
          }
        }, [svgIcon('edit', 14)]),
        el('button', {
          class: 'ss-mini-btn',
          onclick: function () { store.duplicateProject(p.id).then(function () { renderDrawer(); }); }
        }, [svgIcon('copy', 14)]),
        el('button', {
          class: 'ss-mini-btn',
          onclick: function () {
            confirmBox('删除「' + p.name + '」？', '该方案的所有分支与对话都会被删除，无法恢复。').then(function (ok) {
              if (ok) store.deleteProject(p.id).then(function () { renderDrawer(); });
            });
          }
        }, [svgIcon('trash', 14)])
      ]);
      row.querySelector('.ss-proj-item__main').addEventListener('click', function () {
        store.switchProject(p.id).then(function () { closeDrawer(); });
      });
      plist.appendChild(row);
    });
    sideDrawer.appendChild(plist);

    sideDrawer.appendChild(el('div', { class: 'ss-side-drawer__foot' }, [
      el('button', {
        class: 'ss-btn ss-btn--primary',
        style: { flex: '1 1 0' },
        text: '新建方案',
        onclick: function () {
          dialog({ title: '新方案名字', value: '美化 ' + (state.projects.length + 1) }).then(function (name) {
            if (name === null) return;
            store.createProject(name).then(function () { closeDrawer(); });
          });
        }
      }),
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '复制当前',
        onclick: function () { store.duplicateProject().then(function () { renderDrawer(); }); }
      })
    ]));
  }

  /* ---------------- 左边缘手势 ---------------- */

  let dragStart = null;
  root.addEventListener('pointerdown', function (ev) {
    if (pageName || previewOpen) return;
    if (ev.clientX <= 24) dragStart = { x: ev.clientX, y: ev.clientY, t: Date.now() };
  }, { passive: true });
  root.addEventListener('pointermove', function (ev) {
    if (!dragStart) return;
    const dx = ev.clientX - dragStart.x;
    const dy = Math.abs(ev.clientY - dragStart.y);
    if (dx > 40 && dx > dy) {
      dragStart = null;
      openDrawer();
    } else if (dy > 24) {
      dragStart = null;
    }
  }, { passive: true });
  root.addEventListener('pointerup', function () { dragStart = null; }, { passive: true });

  mask.addEventListener('click', function () { if (drawerOpen) closeDrawer(); });

  /* ---------------- 二级页 ---------------- */

  function openPage(name) {
    pageName = name;
    clear(screen);
    const page = buildPage(name);
    screen.appendChild(page);
    requestAnimationFrame(function () { screen.classList.add('ss-screen--in'); });
  }

  function closePage() {
    pageName = '';
    screen.classList.remove('ss-screen--in');
    setTimeout(function () { if (!pageName) clear(screen); }, 220);
  }

  function pageShell(title, content, actionsEl) {
    return el('div', { class: 'ss-page' }, [
      el('div', { class: 'ss-screen__bar' }, [
        el('button', { class: 'ss-icon-btn', onclick: closePage }, [svgIcon('back', 18)]),
        el('div', { class: 'ss-crumb__main', style: { flex: '1 1 auto', textAlign: 'center' }, text: title }),
        actionsEl || el('span', { style: { width: '36px' } })
      ]),
      el('div', { class: 'ss-page__body' }, [content])
    ]);
  }

  function buildPage(name) {
    if (name === 'architecture') return pageArchitecture();
    if (name === 'api') return pageApi();
    if (name === 'billing') return pageBilling();
    if (name === 'prompt') return pagePrompt();
    if (name === 'settings') return pageSettings();
    if (name === 'export') return pageExport('online');
    if (name === 'preview') return pagePreview();
    return pageShell(name, el('div', { class: 'ss-panel-note', text: '未知页面' }));
  }

  /* ---------------- 架构页 ---------------- */

  function pageArchitecture() {
    const body = el('div', { class: 'ss-arch' });
    body.appendChild(el('div', {
      class: 'ss-arch__note',
      text: '数据流：对话 → 协议解析（【分支】+ css 代码块）→ 分段写入分支 → 按作用域合并导出。点分支直接进对应对话。'
    }));

    function row(node, depth) {
      const kids = childrenOf(node.id);
      const collapsed = (state.project.nodes[node.id] || {}).collapsed;
      const active = state.activeNodeId === node.id;
      const wrap = el('div');

      const line = el('div', {
        class: 'ss-arch__row' + (active ? ' ss-arch__row--on' : ''),
        style: { paddingLeft: (10 + depth * 14) + 'px' }
      });

      if (kids.length) {
        const chev = el('button', { class: 'ss-tree__chev' + (collapsed ? '' : ' ss-tree__chev--open') }, [svgIcon('chevron', 14)]);
        chev.addEventListener('click', function (ev) {
          ev.stopPropagation();
          store.toggleCollapse(node.id);
        });
        line.appendChild(chev);
      } else {
        line.appendChild(el('span', { class: 'ss-tree__spacer' }));
      }

      line.appendChild(el('span', { class: 'ss-tree__label', text: node.label }));

      if (node.type === 'branch') {
        const b = state.project.branches[node.id] || {};
        const lines = lineCount(b.css);
        if (lines) line.appendChild(el('span', { class: 'ss-tree__badge', text: String(lines) }));
        const sw = el('button', {
          class: 'ss-switch' + (b.enabled === false ? '' : ' ss-switch--on'),
          title: '是否参与导出'
        });
        sw.addEventListener('click', function (ev) {
          ev.stopPropagation();
          store.toggleBranchEnabled(node.id);
        });
        line.appendChild(sw);
      }

      line.addEventListener('click', function () {
        /* 先关页再切：切换里有异步落盘，不能让它挡住界面 */
        closePage();
        Promise.resolve(store.switchNode(node.id)).catch(function (err) {
          toast('切换失败：' + ((err && err.message) || '未知错误'));
        });
      });
      wrap.appendChild(line);

      if (kids.length && !collapsed) {
        kids.forEach(function (k) { wrap.appendChild(row(k, depth + 1)); });
      }
      return wrap;
    }

    childrenOf('root').forEach(function (n) { body.appendChild(row(n, 0)); });
    return pageShell('架构', body);
  }

  /* ---------------- API 页 ---------------- */

  function pageApi() {
    const body = el('div', { class: 'ss-api' });
    const channels = allChannels(state.channels);

    channels.forEach(function (c) {
      const active = state.settings.activeChannelId === c.id;
      const card = el('div', { class: 'ss-channel' + (active ? ' ss-channel--on' : '') }, [
        el('div', { class: 'ss-channel__head' }, [
          el('div', { class: 'ss-channel__name', text: c.name + (c.builtin ? '' : ' · 自定义') }),
          active ? el('span', { class: 'ss-channel__tick', text: '使用中' }) : null
        ]),
        el('div', {
          class: 'ss-channel__meta',
          text: (c.baseURL || '未填地址') + ' · ' + (c.model || '未填模型') + ' · ' + (c.apiKey ? '已填 Key' : '未填 Key')
        }),
        el('div', { class: 'ss-channel__actions' }, [
          el('button', {
            class: 'ss-btn ss-btn--ghost',
            text: '编辑',
            onclick: function () { editChannel(c); }
          }),
          el('button', {
            class: 'ss-btn ss-btn--ghost',
            text: '测试',
            onclick: function () {
              const btn = this;
              btn.textContent = '测试中…';
              store.testChannel(c).then(function (r) {
                btn.textContent = '测试';
                toast(r.ok ? ('连通 · ' + r.ms + 'ms · ' + (r.usage ? r.usage.total_tokens || r.usage.totalTokens : '无 usage')) : ('失败：' + r.error));
              });
            }
          }),
          el('button', {
            class: 'ss-btn ss-btn--ghost',
            text: '设为当前',
            onclick: function () {
              store.setActiveChannel(c.id);
              openPage('api');
              toast('已切换到 ' + c.name);
            }
          })
        ])
      ]);
      body.appendChild(card);
    });

    body.appendChild(el('button', {
      class: 'ss-btn ss-btn--primary ss-btn--block',
      text: '新增渠道',
      onclick: function () { editChannel(createChannel({ name: '新渠道' })); }
    }));

    function editChannel(channel) {
      const base = el('input', { class: 'ss-field__input', value: channel.baseURL || '', placeholder: 'https://api.deepseek.com/v1' });
      const key = el('input', { class: 'ss-field__input', value: channel.apiKey || '', placeholder: 'sk-…' });
      const model = el('input', { class: 'ss-field__input', value: channel.model || '', placeholder: 'deepseek-chat' });
      const temp = el('input', { class: 'ss-field__input', value: String(channel.temperature == null ? 0.4 : channel.temperature) });
      const maxTokens = el('input', { class: 'ss-field__input', value: String(channel.maxTokens || 4000) });
      const stream = el('input', { type: 'checkbox' });
      stream.checked = channel.stream !== false;

      const layer = el('div', { class: 'ss-dialog' }, [
        el('div', { class: 'ss-dialog__box' }, [
          el('div', { class: 'ss-dialog__title', text: '渠道设置' }),
          el('div', { class: 'ss-form' }, [
            el('label', { text: 'baseURL' }), base,
            el('label', { text: 'API Key' }), key,
            el('label', { text: '模型' }), model,
            el('label', { text: '温度' }), temp,
            el('label', { text: '最大 token' }), maxTokens,
            el('label', { class: 'ss-form__inline' }, [stream, el('span', { text: '流式输出' })])
          ]),
          el('div', { class: 'ss-dialog__foot' }, [
            el('button', {
              class: 'ss-btn ss-btn--ghost',
              text: '取消',
              onclick: function () { close(); }
            }),
            el('button', {
              class: 'ss-btn ss-btn--primary',
              text: '保存',
              onclick: function () {
                const next = Object.assign({}, channel, {
                  baseURL: base.value.trim(),
                  apiKey: key.value.trim(),
                  model: model.value.trim(),
                  temperature: Number(temp.value) || 0.4,
                  maxTokens: Number(maxTokens.value) || 4000,
                  stream: stream.checked
                });
                store.saveChannel(next).then(function () {
                  close();
                  openPage('api');
                  toast('已保存渠道');
                });
              }
            })
          ])
        ])
      ]);
      function close() {
        layer.classList.remove('ss-dialog--in');
        setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 180);
      }
      root.appendChild(layer);
      requestAnimationFrame(function () { layer.classList.add('ss-dialog--in'); });
    }

    return pageShell('API 预设', body);
  }

  /* ---------------- 账单页 ---------------- */

  function pageBilling() {
    const body = el('div', { class: 'ss-billing' });
    const today = store.usageSummary('today');
    const month = store.usageSummary('month');
    const all = store.usageSummary('all');

    const cards = el('div', { class: 'ss-sumcards' });
    [['今日', today], ['本月', month], ['总计', all]].forEach(function (pair) {
      cards.appendChild(el('div', { class: 'ss-sumcard' }, [
        el('div', { class: 'ss-sumcard__label', text: pair[0] }),
        el('div', { class: 'ss-sumcard__value', text: formatTokens(pair[1].totalTokens) }),
        el('div', { class: 'ss-sumcard__sub', text: money(pair[1].cost, state.settings.currency) + ' · ' + pair[1].count + ' 次' })
      ]));
    });
    body.appendChild(cards);

    /* 最近 7 天柱条 */
    const days = store.usageLastDays(7);
    const max = Math.max.apply(null, days.map(function (d) { return d.tokens; }).concat([1]));
    const bars = el('div', { class: 'ss-bars' });
    days.forEach(function (d) {
      bars.appendChild(el('div', { class: 'ss-bar' }, [
        el('div', { class: 'ss-bar__col' }, [
          el('div', {
            class: 'ss-bar__fill',
            style: { height: Math.max(2, Math.round((d.tokens / max) * 32)) + 'px' }
          })
        ]),
        el('div', { class: 'ss-bar__label', text: d.key })
      ]));
    });
    body.appendChild(el('div', { class: 'ss-panel-note', text: '最近 7 天' }));
    body.appendChild(bars);

    /* 明细 */
    const byChannel = store.usageBy('channel');
    body.appendChild(el('div', { class: 'ss-panel-note', text: '按渠道' }));
    const list = el('div', { class: 'ss-table' });
    if (!byChannel.length) list.appendChild(el('div', { class: 'ss-panel-note', text: '还没有请求记录' }));
    byChannel.forEach(function (row) {
      list.appendChild(el('div', { class: 'ss-table__row' }, [
        el('span', { class: 'ss-table__key', text: row.key }),
        el('span', { class: 'ss-table__val', text: formatTokens(row.tokens) + ' · ' + money(row.cost, state.settings.currency) })
      ]));
    });
    body.appendChild(list);

    const byProject = store.usageBy('project');
    body.appendChild(el('div', { class: 'ss-panel-note', text: '按方案' }));
    const list2 = el('div', { class: 'ss-table' });
    byProject.forEach(function (row) {
      list2.appendChild(el('div', { class: 'ss-table__row' }, [
        el('span', { class: 'ss-table__key', text: row.key }),
        el('span', { class: 'ss-table__val', text: formatTokens(row.tokens) + ' · ' + money(row.cost, state.settings.currency) })
      ]));
    });
    if (!byProject.length) list2.appendChild(el('div', { class: 'ss-panel-note', text: '暂无数据' }));
    body.appendChild(list2);

    body.appendChild(el('div', { class: 'ss-row-actions' }, [
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '单价表',
        onclick: function () {
          const current = state.project ? state.settings.prices : {};
          dialog({
            title: '单价表（每 1M tokens，美元）',
            multiline: true,
            hint: 'JSON：{"deepseek-chat":{"in":0.27,"out":1.1}}',
            value: JSON.stringify(Object.assign({}, DEFAULT_PRICES, current), null, 2)
          }).then(function (text) {
            if (text === null) return;
            try {
              state.settings.prices = JSON.parse(text);
              store.notify('billing');
              openPage('billing');
              toast('单价表已更新');
            } catch (err) {
              toast('JSON 解析失败：' + err.message);
            }
          });
        }
      }),
      el('button', {
        class: 'ss-btn ss-btn--danger',
        text: '清空统计',
        onclick: function () {
          confirmBox('清空用量统计？', '只清空账单记录，不影响对话与分支。').then(function (ok) {
            if (!ok) return;
            import('../data/db.js').then(function (db) {
              db.clearUsage().then(function () {
                state.usage = [];
                openPage('billing');
                toast('已清空统计');
              });
            });
          });
        }
      })
    ]));

    return pageShell('Token 账单', body, el('button', {
      class: 'ss-icon-btn',
      title: '刷新',
      onclick: function () { openPage('billing'); }
    }, [svgIcon('refresh', 18)]));
  }

  /* ---------------- 提示词页 ---------------- */

  function pagePrompt() {
    const body = el('div', { class: 'ss-prompt' });
    const result = store.promptResult();

    const head = el('div', { class: 'ss-prompt__head' }, [
      el('div', { class: 'ss-prompt__stat', text: result.used.length + ' 段 · ' + formatBytes(result.bytes) + ' · 约 ' + formatTokens(result.tokens) + ' tokens' }),
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '完整提示词',
        onclick: function () {
          openPage('promptFull');
        }
      })
    ]);
    body.appendChild(head);

    /* 预设 + 参考档位 */
    const presets = store.presetsAll();
    const select = el('select', { class: 'ss-select' });
    select.appendChild(el('option', { value: '', text: '不使用预设' }));
    presets.forEach(function (p) {
      const opt = el('option', { value: p.id, text: p.name + '（' + (p.entries || []).length + ' 条）' + (p.builtin ? ' · 内置' : '') });
      if (state.project.promptCfg && state.project.promptCfg.presetId === p.id) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      store.setPreset(select.value);
      openPage('prompt');
    });

    const refSeg = el('div', { class: 'ss-seg' });
    [['off', '不注入'], ['condensed', '精炼'], ['full', '完整']].forEach(function (pair) {
      const b = el('button', {
        class: 'ss-seg__item' + ((state.project.promptCfg.refMode || 'condensed') === pair[0] ? ' ss-seg__item--on' : ''),
        text: pair[1]
      });
      b.addEventListener('click', function () { store.setRefMode(pair[0]); openPage('prompt'); });
      refSeg.appendChild(b);
    });

    body.appendChild(el('div', { class: 'ss-prompt__bar' }, [
      el('span', { class: 'ss-prompt__label', text: '预设' }), select,
      el('button', {
        class: 'ss-mini-btn',
        text: '另存为预设',
        onclick: function () {
          dialog({ title: '另存为预设（把当前启用的段固化成条目）', value: '我的预设' }).then(function (name) {
            if (name === null) return;
            const preset = { name: name, entries: store.promptResult().used.map(function (u) {
              const seg = store.segments().find(function (s) { return s.id === u.id; });
              return { id: u.id, title: u.title, text: seg ? seg.text : '', layer: u.layer, scope: seg ? seg.scope : '*', branchIds: seg ? seg.branchIds : null };
            }) };
            store.savePreset(preset);
            toast('已保存预设');
            openPage('prompt');
          });
        }
      })
    ]));
    body.appendChild(el('div', { class: 'ss-prompt__bar' }, [
      el('span', { class: 'ss-prompt__label', text: '参考片段' }), refSeg
    ]));

    /* 段列表 */
    store.groupedSegments().forEach(function (group) {
      body.appendChild(el('div', { class: 'ss-layer' }, [
        el('div', { class: 'ss-layer__title', text: group.label + ' · ' + group.items.length })
      ]));
      group.items.forEach(function (seg) {
        const usedInfo = result.used.find(function (u) { return u.id === seg.id; });
        const row = el('div', { class: 'ss-segrow' + (seg.enabled ? '' : ' ss-segrow--off') }, [
          el('button', {
            class: 'ss-switch' + (seg.enabled ? ' ss-switch--on' : ''),
            onclick: function () { store.toggleSegment(seg.id); openPage('prompt'); }
          }),
          el('div', { class: 'ss-segrow__main' }, [
            el('div', { class: 'ss-segrow__title', text: seg.title + (seg.custom ? ' · 自定义' : '') }),
            el('div', {
              class: 'ss-segrow__meta',
              text: (seg.scope === '*' ? '全作用域' : SCOPE_LABEL[seg.scope] || seg.scope)
                + ' · ' + formatBytes(seg.text.length)
                + (seg.enabled ? (usedInfo ? ' · 已注入' : ' · 未命中') : ' · 已关闭')
            })
          ]),
          el('button', {
            class: 'ss-mini-btn',
            title: '上移',
            onclick: function () { store.moveSegment(seg.id, -1); openPage('prompt'); }
          }, [svgIcon('chevron', 12)]),
          el('button', {
            class: 'ss-mini-btn',
            text: '编辑',
            onclick: function () {
              dialog({ title: '编辑段：' + seg.title, multiline: true, value: seg.text }).then(function (text) {
                if (text === null) return;
                store.editSegmentText(seg.id, text);
                openPage('prompt');
                toast('已保存段');
              });
            }
          })
        ]);
        body.appendChild(row);
      });
    });

    body.appendChild(el('div', { class: 'ss-row-actions' }, [
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '恢复默认段库',
        onclick: function () {
          confirmBox('恢复默认段库？', '你改过的段文字与开关会被重置。').then(function (ok) {
            if (!ok) return;
            store.resetSegmentLibrary();
            openPage('prompt');
          });
        }
      }),
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '预设库',
        onclick: function () { openPage('presets'); }
      })
    ]));

    if (pageName === 'promptFull') {
      /* 由 openPage('promptFull') 单独渲染 */
    }

    return pageShell('提示词', body);
  }

  function pagePromptFull() {
    const pre = el('pre', { class: 'ss-pre', text: store.promptText() });
    return pageShell('完整提示词', el('div', { class: 'ss-prompt' }, [
      el('div', { class: 'ss-panel-note', text: '与真实发送给模型的 system 内容逐字节一致' }),
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '复制全文',
        onclick: function () { copyWithToast(store, store.promptText(), '已复制完整提示词'); }
      }),
      pre
    ]));
  }

  function pagePresets() {
    const body = el('div', { class: 'ss-prompt' });
    store.presetsAll().forEach(function (p) {
      body.appendChild(el('div', { class: 'ss-preset-card' }, [
        el('div', { class: 'ss-preset-card__head' }, [
          el('div', { class: 'ss-preset-card__name', text: p.name + (p.builtin ? ' · 内置' : '') }),
          el('button', {
            class: 'ss-mini-btn',
            text: '复制',
            onclick: function () {
              const copy = { name: p.name + ' 副本', entries: p.entries, scope: p.scope };
              store.savePreset(copy);
              toast('已复制预设');
              openPage('presets');
            }
          })
        ]),
        el('div', { class: 'ss-preset-card__meta', text: (p.entries || []).length + ' 条 · ' + (p.desc || '') }),
        el('div', { class: 'ss-preset-card__entries' }, (p.entries || []).map(function (e) {
          return el('div', { class: 'ss-preset-entry' }, [
            el('span', { class: 'ss-preset-entry__title', text: e.title }),
            el('span', { class: 'ss-preset-entry__scope', text: e.scope === '*' ? '全作用域' : (SCOPE_LABEL[e.scope] || e.scope) })
          ]);
        }))
      ]));
    });
    return pageShell('预设库', body);
  }

  /* ---------------- 设置页 ---------------- */

  function pageSettings() {
    const body = el('div', { class: 'ss-settings' });
    const s = state.settings;

    function row(label, hint, right) {
      return el('div', { class: 'ss-list__row' }, [
        el('div', { class: 'ss-list__main' }, [
          el('div', { class: 'ss-list__label', text: label }),
          hint ? el('div', { class: 'ss-list__hint', text: hint }) : null
        ]),
        right
      ]);
    }

    body.appendChild(el('div', { class: 'ss-panel-note', text: '外观' }));
    const themes = el('div', { class: 'ss-seg' });
    [['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']].forEach(function (pair) {
      const b = el('button', {
        class: 'ss-seg__item' + (s.theme === pair[0] ? ' ss-seg__item--on' : ''),
        text: pair[1]
      });
      b.addEventListener('click', function () {
        s.theme = pair[0];
        import('../data/db.js').then(function (db) { db.setKV('settings', s); });
        applyTheme();
        openPage('settings');
      });
      themes.appendChild(b);
    });
    body.appendChild(row('主题', '深色只影响工具界面，不影响预览的皮肤', themes));

    const fontSeg = el('div', { class: 'ss-seg' });
    [13, 14, 15, 16].forEach(function (n) {
      const b = el('button', { class: 'ss-seg__item' + (s.fontSize === n ? ' ss-seg__item--on' : ''), text: String(n) });
      b.addEventListener('click', function () {
        s.fontSize = n;
        document.documentElement.style.setProperty('--ss-fs-body', n + 'px');
        import('../data/db.js').then(function (db) { db.setKV('settings', s); });
        openPage('settings');
      });
      fontSeg.appendChild(b);
    });
    body.appendChild(row('正文字号', '消息正文大小', fontSeg));

    body.appendChild(el('div', { class: 'ss-panel-note', text: '图床（云端上传，拿 URL 给模型）' }));
    const ih = s.imageHost;
    const providerSeg = el('div', { class: 'ss-seg' });
    ['imgbb', 'catbox', 'custom'].forEach(function (p) {
      const b = el('button', { class: 'ss-seg__item' + (ih.provider === p ? ' ss-seg__item--on' : ''), text: providerLabel(p) });
      b.addEventListener('click', function () {
        ih.provider = p;
        import('../data/db.js').then(function (db) { db.setKV('settings', s); });
        openPage('settings');
      });
      providerSeg.appendChild(b);
    });
    body.appendChild(row('启用图床', '关闭时「上传后发送」不可用', el('button', {
      class: 'ss-switch' + (ih.enabled ? ' ss-switch--on' : ''),
      onclick: function () {
        ih.enabled = !ih.enabled;
        import('../data/db.js').then(function (db) { db.setKV('settings', s); });
        openPage('settings');
      }
    })));
    body.appendChild(row('渠道', providerLabel(ih.provider), providerSeg));

    const fields = [];
    if (ih.provider === 'imgbb') {
      fields.push({ key: 'imgbbApiKey', label: 'ImgBB API Key' });
    } else if (ih.provider === 'catbox') {
      fields.push({ key: 'catboxUserhash', label: 'Catbox userhash（可空）' });
    } else {
      fields.push({ key: 'endpoint', label: '上传地址' });
      fields.push({ key: 'fileField', label: '文件字段名' });
      fields.push({ key: 'customApiKey', label: 'API Key' });
      fields.push({ key: 'authField', label: 'Key 字段名' });
      fields.push({ key: 'responseUrlPath', label: 'URL 路径（如 data.url）' });
    }
    fields.forEach(function (f) {
      const input = el('input', { class: 'ss-field__input', value: ih[f.key] || '', placeholder: f.label });
      input.addEventListener('change', function () {
        ih[f.key] = input.value.trim();
        import('../data/db.js').then(function (db) { db.setKV('settings', s); });
      });
      body.appendChild(el('div', { class: 'ss-field' }, [input]));
    });

    body.appendChild(el('div', { class: 'ss-panel-note', text: '数据' }));
    const list = el('div', { class: 'ss-list' });
    list.appendChild(row('导入旧插件数据', '粘贴 skin-studio 导出的 JSON（ss.projects / branches）', el('button', {
      class: 'ss-btn ss-btn--ghost',
      text: '导入',
      onclick: function () {
        dialog({ title: '粘贴 JSON', multiline: true, hint: '支持 {ss.projects…} 或 {projects:[…]}', value: '' }).then(function (text) {
          if (!text) return;
          store.importData(text).then(function (n) {
            toast('已导入 ' + n + ' 个方案');
            openPage('settings');
          }).catch(function (err) { toast('导入失败：' + err.message); });
        });
      }
    })));
    list.appendChild(row('导出备份', '默认不包含 API Key', el('button', {
      class: 'ss-btn ss-btn--ghost',
      text: '导出',
      onclick: function () {
        store.downloadBackup(false).then(function (r) {
          toast(r.ok ? '已保存备份' : ('保存失败：' + r.reason));
        });
      }
    })));
    list.appendChild(row('清空全部数据', '方案、对话、账单都会被删除', el('button', {
      class: 'ss-btn ss-btn--danger',
      text: '清空',
      onclick: function () {
        confirmBox('清空全部数据？', '不可恢复。建议先导出备份。').then(function (ok) {
          if (ok) store.clearEverything().then(function () { openPage('settings'); toast('已清空'); });
        });
      }
    })));
    body.appendChild(list);

    body.appendChild(el('div', {
      class: 'ss-panel-note',
      style: { marginTop: '18px' },
      text: 'Skin Studio v' + (window.__SS_VERSION__ || '1.0.0') + (window.__SS_NATIVE__ ? ' · APK 原生模式' : ' · 浏览器模式')
    }));

    return pageShell('设置', body);
  }

  /* ---------------- 导出页 ---------------- */

  function pageExport(scope) {
    let cur = scope || 'online';
    const body = el('div', { class: 'ss-export' });
    const tabs = el('div', { class: 'ss-pv__tabs' });
    const holder = el('div', { class: 'ss-export__holder' });

    function renderTabs() {
      tabs.replaceChildren();
      ['online', 'offline', 'global'].forEach(function (id) {
        const b = el('button', { class: 'ss-tab' + (cur === id ? ' ss-tab--on' : ''), text: SCOPE_LABEL[id] });
        b.addEventListener('click', function () { cur = id; renderTabs(); renderBody(); });
        tabs.appendChild(b);
      });
    }

    function renderBody() {
      clear(holder);
      const built = store.buildScope(cur);
      if (!built.report.stats.branches) {
        holder.appendChild(el('div', { class: 'ss-empty' }, [
          el('h2', { text: SCOPE_LABEL[cur] + '还没有内容' }),
          el('p', { text: '回到对话写几条，或换一个作用域。' })
        ]));
        return;
      }
      holder.appendChild(el('div', {
        class: 'ss-panel-note',
        text: built.name + ' · ' + built.report.stats.branches + ' 个分支 · ' + formatBytes(built.css.length)
      }));
      const nums = el('div', { class: 'ss-code__nums' });
      const code = el('pre', { class: 'ss-code__text' });
      const lines = built.css.split('\n');
      nums.textContent = lines.map(function (_, i) { return String(i + 1); }).join('\n');
      code.textContent = built.css;
      holder.appendChild(el('div', { class: 'ss-codebox' }, [nums, code]));
    }

    renderTabs();
    renderBody();

    const foot = el('div', { class: 'ss-pv__foot' }, [
      el('button', {
        class: 'ss-btn ss-btn--primary',
        style: { flex: '1 1 0' },
        text: '保存到手机',
        onclick: function () {
          store.exportToDevice(cur).then(function (r) {
            toast(r.ok ? ('已保存' + (r.path ? '：' + r.path : '')) : ('保存失败：' + r.reason));
          });
        }
      }),
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '复制',
        onclick: function () { copyWithToast(store, store.buildScope(cur).css, '已复制 CSS'); }
      }),
      el('button', {
        class: 'ss-btn ss-btn--ghost',
        text: '分享',
        onclick: function () {
          store.shareExport(cur).then(function (r) {
            toast(r.ok ? '已打开分享' : ('分享失败：' + r.reason));
          });
        }
      })
    ]);

    body.appendChild(tabs);
    body.appendChild(holder);
    body.appendChild(foot);

    return pageShell('导出', body);
  }

  /* ---------------- 预览 ---------------- */

  function pagePreview() {
    previewOpen = true;
    clear(pvWrap);
    const view = createPreview(store, {
      closeScreen: closePreview,
      openExport: function (scope) { closePreview(); openPage('export'); }
    });
    pvWrap.appendChild(view);
    requestAnimationFrame(function () { pvWrap.classList.add('ss-screen--in'); });
    return pvWrap;
  }

  function closePreview() {
    previewOpen = false;
    pvWrap.classList.remove('ss-screen--in');
    setTimeout(function () { if (!previewOpen) clear(pvWrap); }, 220);
  }

  /* ---------------- 侧边树（宽屏） ---------------- */

  function renderSidebar() {
    /* 窄屏只用抽屉；宽屏显示常驻侧栏 */
    const side = el('div', { class: 'ss-side' });
    const project = state.project;
    side.appendChild(el('div', { class: 'ss-side__head' }, [
      el('button', {
        class: 'ss-proj-btn',
        onclick: function () { openDrawer(); }
      }, [
        el('div', { class: 'ss-proj-btn__main' }, [
          el('div', { class: 'ss-proj-btn__name', text: project ? project.name : '' }),
          el('div', { class: 'ss-proj-btn__meta', text: state.projects.length + ' 个方案' })
        ]),
        el('span', { class: 'ss-proj-btn__chev' }, [svgIcon('chevron', 16)])
      ])
    ]));

    const tree = el('div', { class: 'ss-side__tree' });
    function row(node, depth) {
      const kids = childrenOf(node.id);
      const collapsed = (state.project.nodes[node.id] || {}).collapsed;
      const active = state.activeNodeId === node.id;
      const wrap = el('div');
      const line = el('div', {
        class: 'ss-tree__row' + (active ? ' ss-tree__row--on' : '') + (node.type === 'scope' ? ' ss-tree__row--scope' : ''),
        style: { paddingLeft: (8 + depth * 14) + 'px' }
      });
      if (kids.length) {
        const chev = el('button', { class: 'ss-tree__chev' + (collapsed ? '' : ' ss-tree__chev--open') }, [svgIcon('chevron', 14)]);
        chev.addEventListener('click', function (ev) { ev.stopPropagation(); store.toggleCollapse(node.id); });
        line.appendChild(chev);
      } else {
        line.appendChild(el('span', { class: 'ss-tree__spacer' }));
      }
      line.appendChild(el('span', { class: 'ss-tree__label', text: node.label }));
      if (node.type === 'branch') {
        const b = state.project.branches[node.id] || {};
        const n = lineCount(b.css);
        if (n) line.appendChild(el('span', { class: 'ss-tree__badge', text: String(n) }));
      }
      line.addEventListener('click', function () { store.switchNode(node.id); });
      wrap.appendChild(line);
      if (kids.length && !collapsed) kids.forEach(function (k) { wrap.appendChild(row(k, depth + 1)); });
      return wrap;
    }
    childrenOf('root').forEach(function (n) { tree.appendChild(row(n, 0)); });
    side.appendChild(tree);

    side.appendChild(el('div', { class: 'ss-side__foot' }, [
      el('button', { class: 'ss-btn ss-btn--ghost', style: { flex: '1 1 0' }, text: '预览', onclick: function () { pagePreview(); } }),
      el('button', { class: 'ss-btn ss-btn--ghost', style: { flex: '1 1 0' }, text: '设置', onclick: function () { openPage('settings'); } })
    ]));
    return side;
  }

  /* ---------------- 顶栏 / 消息 / 输入 ---------------- */

  function renderTop() {
    const node = getNode(state.activeNodeId);
    crumbMain.textContent = node ? node.label : '';
    const path = store.breadcrumb(state.activeNodeId).split(' · ');
    path.pop();
    crumbSub.textContent = [state.project ? state.project.name : ''].concat(path).filter(Boolean).join(' / ');
  }

  function messageNode(msg) {
    const wrap = el('div', { class: 'ss-msg' + (msg.role === 'user' ? ' ss-msg--me' : '') });
    if (msg.role === 'user') {
      wrap.appendChild(el('div', { class: 'ss-msg__bubble', text: msg.text || '' }));
      if (msg.images && msg.images.length) {
        const rowi = el('div', { class: 'ss-msg__images' });
        msg.images.forEach(function (img) {
          const box = el('div', { class: 'ss-msg__imagebox' }, [
            el('img', { class: 'ss-msg__img', src: img.dataUrl, alt: img.name || '图片' }),
            img.url ? el('div', { class: 'ss-msg__imgurl', text: img.url }) : null
          ]);
          if (img.url) {
            box.addEventListener('click', function () { copyWithToast(store, img.url, '已复制图片链接'); });
          }
          rowi.appendChild(box);
        });
        wrap.appendChild(rowi);
      }
      wrap.appendChild(el('div', { class: 'ss-msg__meta' }, [
        el('span', { text: new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }),
        el('button', { class: 'ss-mini-btn', text: '删除', onclick: function () { store.deleteMessage(msg.id); } })
      ]));
      return wrap;
    }

    const plain = el('div', { class: 'ss-msg__plain' });
    plain.appendChild(renderMarkdown(msg.text || (msg.streaming ? '…' : '')));
    wrap.appendChild(plain);

    if (msg.parts && msg.parts.length) {
      const total = msg.parts.reduce(function (n, p) { return n + lineCount(p.css); }, 0);
      const rows = el('div', { class: 'ss-card__rows' });
      msg.parts.forEach(function (part, i) {
        const btn = el('button', {
          class: 'ss-card__write' + (part.written ? ' ss-card__write--done' : ''),
          text: part.written ? '已写入' : '写入'
        });
        btn.addEventListener('click', function () {
          if (part.written) {
            store.undoBranch(part.branchId);
            part.written = false;
            store.notify('chat');
            toast('已撤销「' + labelOf(part.branchId) + '」');
            return;
          }
          if (store.writePart(msg.id, i)) toast('已写入「' + labelOf(part.branchId) + '」');
          else toast('写入失败：分支被锁或不存在');
        });
        rows.appendChild(el('div', { class: 'ss-card__row' }, [
          el('span', { class: 'ss-card__id', text: part.branchId }),
          el('span', { class: 'ss-card__lines', text: lineCount(part.css) + ' 行' }),
          btn
        ]));
      });

      const code = el('pre', { class: 'ss-card__code' });
      code.textContent = msg.parts.map(function (p) { return '/* ---- ' + p.branchId + ' ---- */\n' + p.css; }).join('\n\n');

      const head = el('div', { class: 'ss-card__head' }, [
        el('span', { class: 'ss-card__tag', text: 'CSS' }),
        el('span', { class: 'ss-card__meta', text: msg.parts.length + ' 段 · 共 ' + total + ' 行' }),
        el('span', { class: 'ss-card__chev' }, [svgIcon('chevron', 16)])
      ]);

      const card = el('div', { class: 'ss-card' }, [
        head,
        rows,
        code,
        el('div', { class: 'ss-card__foot' }, [
          el('button', {
            class: 'ss-btn ss-btn--ghost',
            text: '预览本次',
            onclick: function () {
              pagePreview();
              toast('预览已打开（本次回复需先写入分支才会显示）');
            }
          }),
          msg.parts.length > 1
            ? el('button', {
              class: 'ss-btn ss-btn--primary',
              text: '全部写入（' + msg.parts.length + '）',
              onclick: function () {
                const r = store.writeAllParts(msg.id);
                toast(r.failed.length ? ('写入 ' + r.ok + ' 段，' + r.failed.length + ' 段失败') : ('已写入 ' + r.ok + ' 段'));
              }
            })
            : el('button', {
              class: 'ss-btn ss-btn--primary',
              text: '写入',
              onclick: function () {
                if (store.writePart(msg.id, 0)) toast('已写入「' + labelOf(msg.parts[0].branchId) + '」');
              }
            })
        ])
      ]);
      head.addEventListener('click', function () { card.classList.toggle('ss-card--open'); });
      wrap.appendChild(card);
    }

    if (msg.failed) wrap.appendChild(el('div', { class: 'ss-msg__meta', text: '失败' }));
    wrap.appendChild(el('div', { class: 'ss-msg__meta' }, [
      el('button', {
        class: 'ss-mini-btn',
        text: '复制',
        onclick: function () { copyWithToast(store, msg.raw || msg.text || ''); }
      }),
      el('button', { class: 'ss-mini-btn', text: '删除', onclick: function () { store.deleteMessage(msg.id); } })
    ]));
    return wrap;
  }

  function renderThread() {
    const thread = el('div', { class: 'ss-thread' });
    const list = store.messages();
    if (!list.length) {
      const node = getNode(state.activeNodeId);
      thread.appendChild(el('div', { class: 'ss-empty' }, [
        el('h2', { text: node ? (node.type === 'plan' ? '先把方向定下来' : node.label) : '' }),
        el('p', {
          text: node && node.type === 'plan'
            ? '先把设计语言、令牌与验收标准定下来，后面每个部位都按它走。'
            : '这个对话只影响当前节点；注入的提示词可以在右上角「提示词」里逐段查看与关闭。'
        }),
        el('div', { class: 'ss-suggest' }, [
          el('button', { class: 'ss-chip', text: '先看看注入了什么', onclick: function () { openPage('prompt'); } }),
          el('button', { class: 'ss-chip', text: '配一个渠道', onclick: function () { openPage('api'); } })
        ])
      ]));
      return thread;
    }
    list.forEach(function (m) { thread.appendChild(messageNode(m)); });
    if (state.busy) thread.appendChild(el('div', { class: 'ss-msg__meta', text: '正在生成…' }));
    return thread;
  }

  function renderComposer() {
    clear(composer);
    const scope = store.scopeOf(state.activeNodeId);
    const ids = store.branchIdsOf(state.activeNodeId);
    const badge = el('button', { class: 'ss-scope-badge', onclick: function () { openPage('architecture'); } }, [
      el('span', { text: SCOPE_LABEL[scope] || '规划' }),
      el('span', { style: { color: 'var(--ss-muted)' }, text: ids.length ? '· ' + ids.length : '' })
    ]);

    const ta = el('textarea', { class: 'ss-textarea', rows: '1', placeholder: '描述你想改的地方…' });
    ta.value = state.draft.text || '';
    ta.addEventListener('input', function () {
      state.draft.text = ta.value;
      ta.style.height = 'auto';
      ta.style.height = Math.min(132, ta.scrollHeight) + 'px';
      updateSend();
    });

    const send = el('button', { class: 'ss-send' }, [svgIcon('send', 16)]);
    function updateSend() {
      const has = !!(ta.value.trim() || state.draft.images.length);
      send.className = 'ss-send' + (state.busy ? ' ss-send--stop' : (has ? ' ss-send--on' : ''));
      send.replaceChildren(svgIcon(state.busy ? 'close' : 'send', 16));
    }

    send.addEventListener('click', function () {
      if (state.busy) {
        toast('生成中，稍等…');
        return;
      }
      const text = ta.value.trim();
      const images = state.draft.images.slice();
      if (!text && !images.length) return;
      state.draft = { text: '', images: [] };
      ta.value = '';
      ta.style.height = 'auto';
      renderComposer();
      store.send(text, images);
    });

    const attach = el('div', { class: 'ss-attach-row' });
    state.draft.images.forEach(function (img) {
      const chip = el('div', { class: 'ss-attach' + (img.mode === 'cloud' ? ' ss-attach--cloud' : '') }, [
        el('img', { src: img.dataUrl, alt: img.name }),
        el('span', { class: 'ss-attach__mode', text: img.mode === 'cloud' ? '云' : '本地' }),
        el('button', { class: 'ss-attach__del', onclick: function () { store.removeDraftImage(img.id); } }, [svgIcon('close', 10)])
      ]);
      chip.addEventListener('click', function () { store.uploadDraftImage(img.id).then(function (r) {
        toast(r.ok ? ('已上传：' + r.url) : ('上传失败：' + r.reason));
      }); });
      attach.appendChild(chip);
    });
    if (state.draft.images.length) attach.style.display = 'flex';
    else attach.style.display = 'none';

    const tools = el('div', { class: 'ss-composer__tools' }, [
      el('button', {
        class: 'ss-icon-btn',
        style: { width: '28px', height: '28px' },
        title: '预览',
        onclick: function () { pagePreview(); }
      }, [svgIcon('eye', 17)]),
      el('button', {
        class: 'ss-icon-btn',
        style: { width: '28px', height: '28px' },
        title: '选图（点击图片可上传到云端）',
        onclick: function () {
          store.addPickedImages(2).then(function (n) {
            if (n) toast('已添加 ' + n + ' 张图（点图片可上传到云端）');
          });
        }
      }, [svgIcon('image', 17)]),
      el('span', { class: 'ss-composer__hint', text: state.draft.images.length ? '点图片上传云端拿 URL' : '' })
    ]);

    composer.appendChild(attach);
    composer.appendChild(el('div', { class: 'ss-inputbox' }, [badge, ta, send]));
    composer.appendChild(tools);
    updateSend();
    composer.__ta = ta;
  }

  /* ---------------- 主题 ---------------- */

  function applyTheme() {
    const theme = state.settings.theme || 'light';
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.documentElement.style.setProperty('--ss-fs-body', (state.settings.fontSize || 14) + 'px');
  }

  /* ---------------- 渲染 ---------------- */

  function render() {
    if (!state.project) {
      /* 还没读完数据：给一个白底占位，避免空指针 */
      clear(body);
      body.appendChild(el('div', { class: 'ss-empty' }, [el('p', { text: '正在读取本地数据…' })]));
      return;
    }
    const prevSide = app.querySelector('.ss-side');
    const nextSide = renderSidebar();
    if (prevSide) app.replaceChild(nextSide, prevSide);
    else app.insertBefore(nextSide, app.firstChild);

    renderTop();
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 60;
    clear(body);
    body.appendChild(renderThread());
    if (atBottom) body.scrollTop = body.scrollHeight;
    renderComposer();

    if (drawerOpen) renderDrawer();
    if (pageName === 'prompt') openPage('prompt');
    if (pageName === 'billing') openPage('billing');
    if (pageName === 'architecture') openPage('architecture');
  }

  const off = store.onChange(function (scope) {
    if (scope && typeof scope === 'object' && scope.toast) {
      toast(scope.toast);
      return;
    }
    render();
  });

  /* 指定页面渲染（避免整页重建） */
  const originalOpenPage = openPage;
  openPage = function (name) {
    if (name === 'promptFull') {
      pageName = 'promptFull';
      clear(screen);
      screen.appendChild(pagePromptFull());
      requestAnimationFrame(function () { screen.classList.add('ss-screen--in'); });
      return;
    }
    if (name === 'presets') {
      pageName = 'presets';
      clear(screen);
      screen.appendChild(pagePresets());
      requestAnimationFrame(function () { screen.classList.add('ss-screen--in'); });
      return;
    }
    if (name === 'preview') {
      pagePreview();
      return;
    }
    originalOpenPage(name);
  };

  applyTheme();
  render();

  return {
    destroy: function () {
      off();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
    toast: toast,
    openDrawer: openDrawer,
    openPage: function (n) { openPage(n); },
    goBack: function () {
      if (previewOpen) { closePreview(); return true; }
      if (pageName) { closePage(); return true; }
      if (drawerOpen) { closeDrawer(); return true; }
      return false;
    }
  };
}
