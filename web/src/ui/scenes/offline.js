/** 线下档：Offline Mode 档案卡 + 侧栏菜单 + 线下输入栏 */
export const OFFLINE_HTML = `
<div class="offline-mode">
  <div class="offline-mode__scroll">

    <header class="offline-header">
      <div class="offline-header__back">‹</div>
      <div class="offline-header__main">
        <div class="offline-header__title">Offline Mode</div>
        <div class="offline-header__sub">LAST ONLINE: 3H 51M AGO</div>
      </div>
      <div class="offline-header__action">⤓</div>
      <div class="offline-header__action">···</div>
    </header>

    <article class="offline-card">
      <div class="offline-card__header">
        <div class="offline-card__avatar-shell"><div class="offline-card__avatar-fallback"></div></div>
        <div class="offline-card__header-main">
          <div class="offline-card__title-row">
            <span class="offline-card__sender">云枝</span>
            <span class="offline-card__floor">NO.001</span>
          </div>
          <div class="offline-card__meta-row">
            <span class="offline-card__time">OCT 5 · 20:15</span>
          </div>
        </div>
      </div>
      <div class="offline-card__body">
        <div class="offline-card__content">
          <div class="offline-card__content-text">随机生成一段校园剧情（男女主初遇），不少于 4000 字</div>
        </div>
      </div>
      <div class="offline-card__footer">
        <div class="offline-card__footer-line"></div>
        <div class="offline-card__footer-label">ARCHIVE</div>
        <div class="offline-card__footer-right">
          <span class="offline-card__footer-metric">87T / 2.32S</span>
        </div>
      </div>
    </article>

    <article class="offline-card">
      <div class="offline-card__header">
        <div class="offline-card__avatar-shell"><div class="offline-card__avatar-fallback"></div></div>
        <div class="offline-card__header-main">
          <div class="offline-card__title-row">
            <span class="offline-card__sender">美化测试员</span>
            <span class="offline-card__floor">NO.002</span>
          </div>
          <div class="offline-card__meta-row">
            <span class="offline-card__time">OCT 26 · 19:42</span>
          </div>
        </div>
      </div>
      <div class="offline-card__body">
        <div class="offline-card__content">
          <div class="offline-card__content-text">
            <span class="offline-card__play">▶</span> ako
          </div>
          <div class="offline-card__inline-quote">「留着吧，我记得回来看。」</div>
          <div class="offline-card__content-text">
            深秋的午后，图书馆最深处的那张长桌被斜射的阳光切成两半，明亮的一侧积满了浮尘，
            暗处则静得只能听见书页翻动的轻响。
          </div>
        </div>
      </div>
      <div class="offline-card__footer">
        <div class="offline-card__footer-line"></div>
        <div class="offline-card__footer-label">ARCHIVE</div>
        <div class="offline-card__footer-right">
          <span class="offline-card__footer-status"></span>
          <span class="offline-card__footer-metric">112T / 3.08S</span>
        </div>
      </div>
    </article>

    <div class="offline-menu">
      <div class="offline-menu__row"><span>历史记录</span><span class="offline-menu__chev">›</span></div>
      <div class="offline-menu__row"><span>画廊</span><span class="offline-menu__chev">›</span></div>
      <div class="offline-menu__row">
        <span>夜间模式</span>
        <span class="noir-toggle"><span class="noir-toggle-bg"></span></span>
      </div>
    </div>

  </div>

  <div class="offline-input-bar">
    <div class="offline-input-sync">⟳</div>
    <div class="offline-input-field">Type your thought...</div>
    <div class="offline-input-send">➜</div>
  </div>
</div>`;
