/** 界面档：消息列表页 + 动态流页 + 桌面图标 + 底部导航 */
export const INTERFACE_HTML = `
<div class="iface">

  <section class="iface__page">
    <header class="page-header">
      <div class="page-header__back">‹</div>
      <div class="page-header__title">MESSAGES</div>
      <div class="page-header__action">✎</div>
    </header>

    <div class="inbox-search">
      <span class="inbox-search__text">Search</span>
    </div>

    <div class="inbox-list">
      <div class="conversation-item conversation-item--pinned">
        <div class="conversation-avatar"></div>
        <div class="conversation-info">
          <div class="conversation-line">
            <span class="conversation-pin">置顶</span>
            <span class="conversation-name">温砚雪</span>
            <span class="conversation-time">周五</span>
          </div>
          <div class="conversation-snippet">嘴倒是硬得很。</div>
        </div>
      </div>

      <div class="conversation-item conversation-item--active">
        <div class="conversation-avatar"></div>
        <div class="conversation-info">
          <div class="conversation-line">
            <span class="conversation-name">美化测试员</span>
            <span class="conversation-time">17:48</span>
          </div>
          <div class="conversation-snippet">1</div>
        </div>
      </div>

      <div class="conversation-item">
        <div class="conversation-avatar"></div>
        <div class="conversation-info">
          <div class="conversation-line">
            <span class="conversation-name">叶瑄</span>
            <span class="conversation-time">周三</span>
          </div>
          <div class="conversation-snippet">…听着这个，腰还难受么？</div>
        </div>
      </div>

      <div class="conversation-item">
        <div class="conversation-avatar"></div>
        <div class="conversation-info">
          <div class="conversation-line">
            <span class="conversation-name">砚雪</span>
            <span class="conversation-time">周二</span>
          </div>
          <div class="conversation-snippet">再传讯同我说。</div>
        </div>
      </div>
    </div>

    <nav class="bottom-nav">
      <span class="dock-icon-btn tab-item">⌂</span>
      <span class="dock-icon-btn nav-icon-active tab-item tab-item--on">✉</span>
      <span class="tab-item tab-item--plus">+</span>
      <span class="dock-icon-btn tab-item">♡</span>
      <span class="dock-icon-btn tab-item">☺</span>
    </nav>
  </section>

  <section class="iface__page">
    <header class="page-header">
      <div class="page-header__back">‹</div>
      <div class="page-header__title page-header__title--serif">NOIR</div>
      <div class="page-header__action">···</div>
    </header>

    <div class="feed">
      <article class="post-item">
        <div class="post-avatar-small"></div>
        <div class="post-main">
          <div class="post-line">
            <span class="post-author-name">温砚雪</span>
            <span class="post-timestamp">10-11 23:56</span>
            <span class="post-more">···</span>
          </div>
          <div class="post-body">子夜风露重，某人白日里睡足了，这会儿倒精神得很。</div>
          <div class="post-actions">
            <span class="post-action-btn post-action-unit">♡ <i>48</i></span>
            <span class="post-action-btn post-action-unit">◌ <i>15</i></span>
            <span class="post-action-btn post-action-unit">⇄ <i>3</i></span>
            <span class="post-action-btn post-action-unit">➤</span>
          </div>
        </div>
      </article>

      <article class="post-item">
        <div class="post-avatar-small"></div>
        <div class="post-main">
          <div class="post-line">
            <span class="post-author-name">温砚雪</span>
            <span class="post-timestamp">10-06 13:46</span>
          </div>
          <div class="post-body">炉火未熄，阶前晴雪初融。有人午正方醒，今日的课业便纵你躲过半日。</div>
          <div class="post-actions">
            <span class="post-action-btn post-action-unit">♡ <i>17</i></span>
            <span class="post-action-btn post-action-unit">◌ <i>13</i></span>
            <span class="post-action-btn post-action-unit">⇄ <i>3</i></span>
          </div>
        </div>
      </article>

      <article class="post-item">
        <div class="post-avatar-small"></div>
        <div class="post-main">
          <div class="post-line">
            <span class="post-author-name">叶瑄</span>
            <span class="post-timestamp">10-03 22:04</span>
          </div>
          <div class="post-body">露台的灯熄了，窗外的潮声很平缓。……晚安。</div>
          <div class="post-actions">
            <span class="post-action-btn post-action-unit">♡ <i>9</i></span>
            <span class="post-action-btn post-action-unit">◌ <i>2</i></span>
          </div>
        </div>
      </article>
    </div>

    <nav class="bottom-nav">
      <span class="dock-icon-btn nav-icon-active tab-item tab-item--on">⌂</span>
      <span class="dock-icon-btn tab-item">✉</span>
      <span class="tab-item tab-item--plus">+</span>
      <span class="dock-icon-btn tab-item">♡</span>
      <span class="dock-icon-btn tab-item">☺</span>
    </nav>
  </section>

  <section class="iface__page iface__page--desktop">
    <div class="grid">
      <div class="square-app-btn"><div class="app-icon-bg"></div><div class="app-label">相册</div></div>
      <div class="square-app-btn"><div class="app-icon-bg"></div><div class="app-label">备忘录</div></div>
      <div class="square-app-btn"><div class="app-icon-bg"></div><div class="app-label">世界书</div></div>
      <div class="square-app-btn"><div class="app-icon-bg"></div><div class="app-label">设置</div></div>
    </div>
  </section>

</div>`;
