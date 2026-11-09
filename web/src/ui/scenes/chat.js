/**
 * 聊天档：NOIR 聊天应用的界面示例。
 * 用 Roche 真实类名（chat-header__inner / chat-message--sent / bubble-sent / chat-input-bar …）
 * 配合构建期抽出的真实样式（roche.css），所以皮肤改了能直接看到效果。
 */
export const CHAT_HTML = `
<div class="chat-viewport-root flex flex-col h-screen overflow-hidden bg-white">

  <!-- 顶栏：返回 / NOIR / 更多 -->
  <header class="chat-header shrink-0">
    <div class="chat-header__inner flex items-center px-4 pt-[calc(10px_+_env(safe-area-inset-top))] pb-3 w-full">
      <button class="chat-header-button chat-header-button--back shrink-0">‹</button>
      <div class="flex-1 flex items-center justify-center">
        <span class="text-[17px] font-semibold tracking-[0.18em] text-zinc-900">NOIR</span>
      </div>
      <button class="chat-header-button chat-header-button--more shrink-0">···</button>
    </div>
  </header>

  <main class="chat-scroll-area flex-1 overflow-y-auto px-4 py-3">
    <div class="chat-message-time flex justify-center text-[11px] text-zinc-400 py-2">16:56</div>

    <div class="chat-message chat-message--received flex items-start gap-2 mb-2 w-full flex-row">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%]">
        <div class="chat-card chat-card--received bubble-received bg-bubble-received text-black rounded-[18px] px-3 py-2 text-[15px] leading-relaxed bubble-tail-ios">今天表现不错吧</div>
      </div>
    </div>

    <div class="chat-message chat-message--sent flex items-start gap-2 mb-2 w-full flex-row-reverse">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%] flex flex-col items-end">
        <div class="chat-card chat-card--sent bubble-sent bg-bubble-sent text-white rounded-[18px] px-3 py-2 text-[15px] leading-relaxed bubble-tail-ios">还行，就是有点困</div>
      </div>
    </div>

    <div class="chat-message chat-message--received flex items-start gap-2 mb-2 w-full flex-row">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%]">
        <div class="chat-card chat-card--voice chat-card--received bubble-received bg-bubble-received text-black rounded-[18px] px-3 py-2 bubble-tail-ios">
          <span class="chat-voice-wave"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="chat-voice-duration text-[12px] text-zinc-500">2″</span>
        </div>
      </div>
    </div>

    <div class="chat-message-time flex justify-center text-[11px] text-zinc-400 py-2">17:43</div>

    <div class="chat-message chat-message--sent flex items-start gap-2 mb-2 w-full flex-row-reverse">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%] flex flex-col items-end">
        <div class="chat-card chat-card--transfer chat-card--sent bubble-sent bg-bubble-sent text-white rounded-[18px] px-4 py-3 bubble-tail-ios">
          <div class="transfer-head flex items-center gap-2">
            <span class="transfer-icon">¥</span>
            <span class="transfer-label text-[13px] font-medium">转账</span>
            <span class="transfer-status text-[11px] opacity-70 ml-auto">待收款</span>
          </div>
          <div class="transfer-amount text-[24px] font-semibold leading-tight mt-2">¥ 1.00</div>
          <div class="transfer-note text-[11px] opacity-70 mt-1">转给 NOIR</div>
        </div>
      </div>
    </div>

    <div class="chat-system-text text-center text-[11px] text-zinc-400 py-2">对方撤回了一条消息</div>
  </main>

  <!-- 输入栏 -->
  <div class="chat-input-bar flex items-center gap-2 px-3 pb-2 shrink-0">
    <button class="chat-input-plus shrink-0">+</button>
    <div class="chat-input-field flex-1 relative">
      <textarea class="chat-input-textarea w-full border-none bg-zinc-100/60 rounded-[26px] px-5 py-3 pr-12 text-[15px] placeholder-zinc-400 resize-none h-[44px] leading-snug" readonly>Message...</textarea>
    </div>
    <button class="chat-input-heart shrink-0">♡</button>
    <button class="chat-input-send shrink-0">➤</button>
  </div>

  <!-- 底部导航：home / mail / + / heart / me -->
  <nav class="dock-icon-btn-group flex items-center justify-around px-4 pt-2 pb-3 border-t border-zinc-100 shrink-0">
    <button class="dock-icon-btn"><span class="text-[20px]">⌂</span></button>
    <button class="dock-icon-btn"><span class="text-[18px]">✉</span></button>
    <button class="dock-icon-btn dock-icon-btn--plus"><span class="text-[22px]">＋</span></button>
    <button class="dock-icon-btn"><span class="text-[18px]">♡</span></button>
    <button class="dock-icon-btn"><span class="text-[18px]">☺</span></button>
  </nav>
</div>`;
