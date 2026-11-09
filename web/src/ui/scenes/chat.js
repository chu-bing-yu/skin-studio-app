/**
 * 聊天档：用 Roche 真实类名 + Tailwind 工具类还原（配合全量 roche.css）
 * 依据：roche.html 里的模板字面量
 *   chat-header__inner flex items-center px-4 pt-[calc(10px_+_env(safe-area-inset-top))] pb-3 w-full
 *   chat-message flex items-start gap-2 mb-2 w-full ... + chat-message--sent flex-row-reverse
 *   chat-card--sent bubble-sent bg-bubble-sent text-white / chat-card--received bubble-received bg-bubble-received text-black
 *   chat-input-bar flex items-center gap-2 + chat-input-textarea w-full bg-zinc-100/60 rounded-[26px] px-5 py-3 text-[15px]
 */
export const CHAT_HTML = `
<div class="chat-viewport-root flex flex-col h-screen overflow-hidden bg-white">

  <header class="chat-header shrink-0">
    <div class="chat-header__inner flex items-center px-4 pt-[calc(10px_+_env(safe-area-inset-top))] pb-3 w-full">
      <button class="chat-header-button chat-header-button--back shrink-0">‹</button>
      <div class="chat-header-profile flex min-w-0 flex-1 items-center gap-3 ml-1">
        <div class="chat-header-avatar shrink-0"></div>
        <div class="min-w-0">
          <div class="chat-header-name truncate text-[15px] font-medium leading-tight">美化测试员</div>
          <div class="chat-header-status text-[10px] tracking-[0.12em] text-zinc-400">ONLINE</div>
        </div>
      </div>
      <button class="chat-header-button chat-header-button--search shrink-0">⌕</button>
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

    <div class="chat-message chat-message--received flex items-start gap-2 mb-2 w-full flex-row">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%]">
        <div class="chat-card chat-card--voice chat-card--received bubble-received bg-bubble-received text-black rounded-[18px] px-3 py-2 bubble-tail-ios">
          <span class="chat-voice-wave"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="chat-voice-duration text-[12px] text-zinc-500">2″</span>
        </div>
      </div>
    </div>

    <div class="chat-message-time flex justify-center text-[11px] text-zinc-400 py-2">17:32</div>

    <div class="chat-message chat-message--sent flex items-start gap-2 mb-2 w-full flex-row-reverse">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%] flex flex-col items-end">
        <div class="chat-card chat-card--video-call-notice chat-card--sent bubble-sent bg-bubble-sent text-white rounded-[18px] px-3 py-2 bubble-tail-ios">
          <div class="call-icon">✆</div>
          <div class="call-text">
            <div class="call-title text-[14px] font-medium">Canceled Call</div>
            <div class="call-sub text-[11px] opacity-70">Canceled</div>
          </div>
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
          <div class="transfer-note text-[11px] opacity-70 mt-1">转给 美化测试</div>
        </div>
      </div>
    </div>

    <div class="chat-message chat-message--sent flex items-start gap-2 mb-2 w-full flex-row-reverse">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%] flex flex-col items-end">
        <div class="quote-line text-[12px] opacity-60 border-l-2 border-black/15 pl-2 mb-1">美化测试员</div>
        <div class="chat-card chat-card--sent bubble-sent bg-bubble-sent text-white rounded-[18px] px-3 py-2 text-[15px] bubble-tail-ios">节奏感一下就上来了</div>
      </div>
    </div>

    <div class="chat-message chat-message--received flex items-start gap-2 mb-2 w-full flex-row">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-message-body min-w-0 max-w-[76%]">
        <div class="chat-card chat-card--image chat-card--received bubble-received bg-bubble-received rounded-[18px] overflow-hidden bubble-tail-ios">
          <div class="image-card__image h-[130px]"></div>
          <div class="chat-card__caption text-[11px] text-zinc-500 px-3 py-1">图片 · 16:20</div>
        </div>
      </div>
    </div>

    <div class="chat-message chat-message--received flex items-start gap-2 mb-2 w-full flex-row">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-card chat-card--sticker chat-card--received bubble-received bg-bubble-received rounded-[18px] p-2 bubble-tail-ios">
        <span class="sticker-dot">✳</span>
      </div>
    </div>

    <div class="chat-message chat-message--received flex items-start gap-2 mb-2 w-full flex-row">
      <div class="chat-message-avatar shrink-0"></div>
      <div class="chat-card chat-card--drip-invite chat-card--received bubble-received bg-bubble-received text-black rounded-[18px] px-3 py-2 bubble-tail-ios">
        <div class="invite-title text-[13px] font-medium mb-2">一起听 · 邀请</div>
        <div class="invite-actions flex gap-2">
          <button class="offline-invite__button offline-invite__button--accept">接受</button>
          <button class="offline-invite__button">拒绝</button>
        </div>
      </div>
    </div>

    <div class="chat-system-text text-center text-[11px] text-zinc-400 py-2">对方撤回了一条消息</div>
    <div class="chat-message-time flex items-center justify-center gap-1 text-[11px] text-zinc-400 pb-2">
      <span class="typing-dot"></span> 对方正在输入
    </div>
  </main>

  <div class="chat-input-bar flex items-center gap-2 px-3 pb-3 shrink-0">
    <button class="chat-input-plus shrink-0">+</button>
    <div class="chat-input-field flex-1 relative">
      <textarea class="chat-input-textarea w-full border-none bg-zinc-100/60 rounded-[26px] px-5 py-3 pr-12 text-[15px] placeholder-zinc-400 resize-none h-[44px] leading-snug" readonly>Message...</textarea>
    </div>
    <button class="chat-input-heart shrink-0">♡</button>
    <button class="chat-input-send shrink-0">➤</button>
  </div>
</div>`;
