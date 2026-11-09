/**
 * 卡片墙：把各类卡片各摆一张，每张下方一行说明条（显示分支 id，点了跳该分支对话）
 * data-node 由 preview/index.js 统一绑点击。
 */
function card(nodeId, label, body) {
  return '<section class="cardwall__item">'
    + '<div class="cardwall__stage">' + body + '</div>'
    + '<div class="cardwall__cap" data-node="' + nodeId + '">'
    + '<span class="cardwall__line"></span>'
    + '<span class="cardwall__cap-text">' + nodeId + ' · ' + label + '</span>'
    + '<span class="cardwall__line"></span>'
    + '</div></section>';
}

export const CARDS_HTML = `
<div class="cardwall">
  ${card('online.card-transfer', '转账 / 收款', `
    <div class="chat-card chat-card--transfer">
      <div class="transfer-head"><span class="transfer-icon">¥</span><span class="transfer-label">转账</span><span class="transfer-status">待收款</span></div>
      <div class="transfer-amount">¥ 1.00</div>
      <div class="transfer-note">转给 美化测试</div>
    </div>`)}

  ${card('online.card-media', '图片 / 位置', `
    <div class="chat-card chat-card--image">
      <div class="image-card__image"></div>
      <div class="chat-card__caption">图片 · 16:20</div>
    </div>
    <div class="chat-card chat-card--location">
      <div class="location-title">江边 · 旧书店</div>
      <div class="location-map"></div>
    </div>`)}

  ${card('online.card-voice', '语音', `
    <div class="chat-card chat-card--voice">
      <span class="chat-voice-wave"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      <span class="chat-voice-duration">2″</span>
    </div>`)}

  ${card('online.card-sticker', '表情包 / 贴纸', `
    <div class="chat-card chat-card--sticker"><span class="sticker-dot">✳</span></div>`)}

  ${card('online.card-forward', '聊天记录', `
    <div class="chat-card chat-card--forward-bundle">
      <div class="forward-title">聊天记录 · 共 3 条</div>
      <div class="forward-line">01 今晚的雨停了</div>
      <div class="forward-line">02 我给你留一盏灯</div>
      <div class="forward-line">03 留着吧，我记得回来</div>
    </div>`)}

  ${card('online.card-invite', '邀请', `
    <div class="chat-card chat-card--drip-invite">
      <div class="invite-title">一起听 · 邀请</div>
      <div class="invite-actions">
        <button class="offline-invite__button offline-invite__button--accept">接受</button>
        <button class="offline-invite__button">拒绝</button>
      </div>
    </div>`)}

  ${card('online.card-notice', '通知', `
    <div class="chat-card chat-card--video-call-notice">
      <div class="call-icon">✆</div>
      <div class="call-text"><div class="call-title">Canceled Call</div><div class="call-sub">Canceled</div></div>
    </div>
    <div class="chat-card chat-card--payment-notice">
      <div class="notice-kicker">NOTICE</div>
      <div class="notice-text">对方已确认收款</div>
    </div>`)}

  ${card('online.receipt', '小票 / 票券', `
    <div class="receipt-shell">
      <div class="receipt-kicker">RECEIPT</div>
      <div class="receipt-title">转账凭证</div>
      <div class="receipt-dash"></div>
      <div class="receipt-total"><span>合计</span><span>¥ 1.00</span></div>
      <div class="ticket-barcode"></div>
    </div>`)}

  ${card('online.card-money', '赠送 / 代付 / 亲属卡', `
    <div class="checkout-card">
      <div class="checkout-title">赠送一杯咖啡</div>
      <div class="checkout-money">¥ 28.00</div>
      <div class="checkout-actions">
        <button class="checkout-button checkout-button--pay">送出</button>
        <button class="checkout-button">取消</button>
      </div>
    </div>
    <div class="peer-pay-notice">对方已代付 ¥ 20.00</div>`)}

  ${card('online.msgrow', '消息行 / 头像（只读）', `
    <div class="chat-message chat-message--received">
      <div class="chat-message-avatar"></div>
      <div class="chat-message-body">
        <div class="chat-message-sender-name">美化测试员</div>
        <div class="bubble-received bubble-tail-ios">这一条用来检查头像与消息行的间距</div>
      </div>
    </div>`)}

  ${card('online.translation', '翻译', `
    <div class="translation-panel">
      <div class="translation-block">
        <div class="translation-src">今晚的雨停了。</div>
        <div class="translation-dst">The rain stopped tonight.</div>
      </div>
    </div>`)}

  ${card('online.quote', '引用 / 回复', `
    <div class="chat-message chat-message--sent">
      <div class="chat-message-body">
        <div class="quote-line">那我给你留一盏灯。</div>
        <div class="bubble-sent bubble-tail-ios">留着吧</div>
      </div>
    </div>`)}

  ${card('online.time', '时间 / 发送者 / 灰字', `
    <div class="chat-message-time">17:43</div>
    <div class="chat-message-sender-name">美化测试员</div>
    <div class="chat-system-text">对方撤回了一条消息</div>`)}
</div>`;
