/** 聊天档：还原真机聊天页（文本 / 引用 / 语音 / 图片 / 表情 / 通话 / 转账 / 邀请 / 输入栏） */
export const CHAT_HTML = `
<div class="chat-viewport-root">
  <header class="chat-header">
    <div class="chat-header-button chat-header-button--back">‹</div>
    <div class="chat-header-avatar"></div>
    <div class="chat-header-meta">
      <div class="chat-header-title">美化测试员</div>
      <div class="chat-header-subtitle">ONLINE</div>
    </div>
    <div class="chat-header-button chat-header-button--search">⌕</div>
    <div class="chat-header-button chat-header-button--more">···</div>
  </header>

  <main class="chat-scroll-area">
    <div class="chat-message-time">16:56</div>

    <div class="chat-message chat-message--received">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="bubble-received bubble-tail-ios">今天表现不错吧</div>
      </div>
    </div>

    <div class="chat-message chat-message--received">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="chat-card chat-card--voice">
          <span class="chat-voice-wave"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="chat-voice-duration">2″</span>
        </div>
        <div class="chat-message-time chat-message-time--below">16:56</div>
      </div>
    </div>

    <div class="chat-message-time">17:32</div>

    <div class="chat-message chat-message--sent">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="chat-card chat-card--video-call-notice">
          <div class="call-icon">✆</div>
          <div class="call-text">
            <div class="call-title">Canceled Call</div>
            <div class="call-sub">Canceled</div>
          </div>
        </div>
        <div class="chat-message-time chat-message-time--below">17:32</div>
      </div>
    </div>

    <div class="chat-message-time">17:43</div>

    <div class="chat-message chat-message--sent">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="chat-card chat-card--transfer">
          <div class="transfer-head">
            <span class="transfer-icon">¥</span>
            <span class="transfer-label">转账</span>
            <span class="transfer-status">待收款</span>
          </div>
          <div class="transfer-amount">¥ 1.00</div>
          <div class="transfer-note">转给 美化测试</div>
        </div>
        <div class="chat-message-time chat-message-time--below">17:43</div>
      </div>
    </div>

    <div class="chat-message chat-message--sent">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="quote-line">美化测试员</div>
        <div class="bubble-sent bubble-tail-ios">节奏感一下就上来了</div>
        <div class="chat-message-time chat-message-time--below">17:48</div>
      </div>
    </div>

    <div class="chat-message chat-message--received">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="chat-card chat-card--image">
          <div class="image-card__image"></div>
          <div class="chat-card__caption">图片 · 16:20</div>
        </div>
      </div>
    </div>

    <div class="chat-message chat-message--received">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="chat-card chat-card--sticker"><span class="sticker-dot">✳</span></div>
      </div>
    </div>

    <div class="chat-message chat-message--received">
      <div class="chat-message-avatar"></div>
      <div class="chat-card chat-card--drip-invite">
        <div class="invite-title">一起听 · 邀请</div>
        <div class="invite-actions">
          <button class="offline-invite__button offline-invite__button--accept">接受</button>
          <button class="offline-invite__button">拒绝</button>
        </div>
      </div>
    </div>

    <div class="chat-system-text">对方撤回了一条消息</div>
    <div class="chat-message-time"><span class="typing-dot"></span> 对方正在输入</div>
  </main>

  <div class="chat-input-bar">
    <div class="chat-input-plus">+</div>
    <div class="chat-input-textarea">Message...</div>
    <div class="chat-input-heart">♡</div>
    <div class="chat-input-send">➤</div>
  </div>
</div>`;
