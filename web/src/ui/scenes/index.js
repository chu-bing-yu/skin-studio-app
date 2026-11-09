/** 预览四档：聊天 / 卡片墙 / 界面 / 线下 */
import { CHAT_HTML } from './chat.js';
import { CARDS_HTML } from './cards.js';
import { INTERFACE_HTML } from './interface.js';
import { OFFLINE_HTML } from './offline.js';

export const TABS = [
  { id: 'chat', label: '聊天', scope: 'online' },
  { id: 'cards', label: '卡片墙', scope: 'online' },
  { id: 'interface', label: '界面', scope: 'global' },
  { id: 'offline', label: '线下', scope: 'offline' }
];

export function tabOf(id) {
  return TABS.find(function (t) { return t.id === id; }) || TABS[0];
}

export function htmlFor(tabId) {
  if (tabId === 'cards') return CARDS_HTML;
  if (tabId === 'interface') return INTERFACE_HTML;
  if (tabId === 'offline') return OFFLINE_HTML;
  return CHAT_HTML;
}

export const TAB_IDS = TABS.map(function (t) { return t.id; });
