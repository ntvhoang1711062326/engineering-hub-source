/* ============ TS SUPERLIGHT — Storefront app ============ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');
  const D = () => DB.data;
  const S = () => D().settings;

  const PRICE_TEXT = 'Liên hệ';
  // Logo TikTok: nốt nhạc trắng với viền xanh ngọc / hồng lệch nhau như logo gốc
  const TT_PATH = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';
  const TIKTOK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#25f4ee" transform="translate(-1 -1)" d="${TT_PATH}"/><path fill="#fe2c55" transform="translate(1 1)" d="${TT_PATH}"/><path fill="#fff" d="${TT_PATH}"/></svg>`;
  // Giá bán = 0 → hiện "Liên hệ"; có giá thì hiện giá (kèm giá gạch / giá Flash Sale nếu có)
  function priceHTML(p) {
    const pr = DB.priceOf(p);
    return pr.price > 0 ? `<b>${fmt(pr.price)}</b>${pr.compare ? `<s>${fmt(pr.compare)}</s>` : ''}` : `<b>${PRICE_TEXT}</b>`;
  }

  /* ---------------- Helpers ---------------- */
  function toast(html) {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }
  const activeProducts = () => D().products.filter(p => p.active);

  /* ---------------- Video theo dòng xe (phân loại dùng chung với Admin — xem DB.videosFor) ---------------- */
  const allVideos = () => DB.allVideos();
  const videoVehicleList = () => DB.videoVehicleList();
  const videosFor = v => DB.videosFor(v);
  function vehicleChips(sel) {
    return `<div class="chips">
      <a class="chip ${sel ? '' : 'on'}" href="#/videos">Tất cả <small>${allVideos().length}</small></a>
      ${videoVehicleList().map(v => [v, videosFor(v).length]).filter(([, n]) => n).map(([v, n]) =>
        `<a class="chip ${v === sel ? 'on' : ''}" href="#/vehicle/${encodeURIComponent(v)}">${esc(v)} <small>${n}</small></a>`).join('')}
    </div>`;
  }
  const zaloLink = () => `https://zalo.me/${S().zalo}`;
  // Nút TikTok (góc dưới, chân trang) mở kênh đứng đầu — kênh nhiều người theo dõi nhất
  /* Link "Chỉ đường": lấy toạ độ ghim (!3d…!4d…) trong link Google Maps; link rút gọn thì mở thẳng link đó */
  const directionsLink = () => {
    const s = S(), u = String(s.mapUrl || ''), m = u.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/) || u.match(/@(-?[\d.]+),(-?[\d.]+)/);
    if (m) return `https://www.google.com/maps/dir/?api=1&destination=${m[1]},${m[2]}`;
    return u || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address || '')}`;
  };
  const ttTop = () => DB.channels()[0]?.url || S().tiktok;
  const phoneFmt = p => String(p).replace(/(\d{4})(\d{3})(\d+)/, '$1.$2.$3');

  function card(p) {
    const fi = DB.flashItem(p.id);
    return `
    <article class="card">
      <a href="#/product/${p.id}" class="card-img">
        <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
        <div class="badges">
          ${fi ? '<span class="badge flash">⚡ Flash</span>' : ''}
          ${p.isNew ? '<span class="badge new">Mới</span>' : ''}
          ${p.video ? '<span class="badge video">▶ Video</span>' : ''}
        </div>
      </a>
      <div class="card-body">
        <a href="#/product/${p.id}" class="card-name">${esc(p.name)}</a>
        <div class="price">${priceHTML(p)}</div>
        <a class="card-add" href="${zaloLink()}" target="_blank" rel="noopener">💬 Tư vấn Zalo</a>
      </div>
    </article>`;
  }
  const grid = (list, cls = '') => list.length
    ? `<div class="grid ${cls}">${list.map(card).join('')}</div>`
    : `<div class="empty panel"><div class="big">🔦</div><p>Chưa có sản phẩm phù hợp.</p><a class="btn btn-dark" href="#/">Về trang chủ</a></div>`;

  function countdownHTML(id) { return `<div class="countdown" id="${id}"><span>00</span><em>:</em><span>00</span><em>:</em><span>00</span><em>:</em><span>00</span></div>`; }
  let cdTimer;
  function startCountdowns() {
    clearInterval(cdTimer);
    const f = D().promos.flash;
    const tick = () => {
      const ms = Math.max(0, new Date(f.endsAt) - new Date());
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      $$('.countdown').forEach(el => {
        const sp = el.querySelectorAll('span');
        [d, h, m, s].forEach((v, i) => sp[i].textContent = String(v).padStart(2, '0'));
      });
    };
    tick(); cdTimer = setInterval(tick, 1000);
  }

  /* ---------------- Layout chrome ---------------- */
  function renderChrome() {
    const s = S(), pr = D().promos;
    const tb = $('#topbar');
    tb.textContent = pr.topbar?.text || '';
    tb.classList.toggle('hidden', !pr.topbar?.active);
    $('#hdrHotline').textContent = phoneFmt(s.hotline);
    $('#hdrHotlineLink').href = 'tel:' + String(s.hotline || '').replace(/\D/g, '');
    const arrow = `<button class="arrow" type="button" aria-label="Mở menu con"><svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    const vehicles = videoVehicleList().filter(v => videosFor(v).length);
    $('#navMenu').innerHTML = `
      <li class="nav-item"><a href="#/" data-nav="home">Trang chủ</a></li>
      <li class="nav-item"><a href="#/category/all" data-nav="all">Sản phẩm</a>${arrow}
        <ul class="nav-sub">
          <li class="sub-all"><a href="#/category/all">Tất cả sản phẩm</a></li>
          ${D().categories.map(c => {
            const list = activeProducts().filter(p => p.cat === c.id);
            return `<li class="has-child"><a href="#/category/${c.id}" data-nav="${c.id}">${esc(c.name)}</a>${list.length ? `
            <ul class="nav-sub-child">
              ${list.slice(0, 12).map(p => `<li><a href="#/product/${p.id}">${esc(p.name)}</a></li>`).join('')}
              ${list.length > 12 ? `<li class="sub-all"><a href="#/category/${c.id}">Xem tất cả ${list.length} sản phẩm →</a></li>` : ''}
            </ul>` : ''}</li>`;
          }).join('')}
        </ul>
      </li>
      <li class="nav-item"><a href="#/videos" data-nav="videos">Video theo xe</a>${arrow}
        <ul class="nav-sub${vehicles.length > 8 ? ' cols' : ''}">
          <li class="sub-all" style="grid-column:1/-1"><a href="#/videos">Tất cả video (${allVideos().length})</a></li>
          ${vehicles.map(v => `<li><a href="#/vehicle/${encodeURIComponent(v)}">${esc(v)} <small class="muted">(${videosFor(v).length})</small></a></li>`).join('')}
        </ul>
      </li>
      <li class="nav-item"><a href="#/policy" data-nav="policy">Bảo hành</a></li>
      <li class="nav-item"><a href="${zaloLink()}" target="_blank" rel="noopener">Liên hệ</a></li>`;
    $('#footer').innerHTML = `
      <div>
        <a href="#/" class="logo" style="margin-bottom:12px"><img class="logo-img" src="assets/img/logo2.webp" alt="TS SUPERLIGHT"></a>
        <p>${esc(s.slogan)}. Lắp đặt, test sáng miễn phí tại shop — bảo hành rõ ràng, liên hệ để được báo giá.</p>
        <div class="social">
          <a href="${esc(ttTop())}" target="_blank" rel="noopener">TikTok</a>
          <a href="${zaloLink()}" target="_blank" rel="noopener">Zalo</a>
        </div>
      </div>
      <div><h5>Danh mục</h5><ul>${D().categories.map(c => `<li><a href="#/category/${c.id}">${esc(c.name)}</a></li>`).join('')}</ul></div>
      <div><h5>Hỗ trợ</h5><ul>
        <li><a href="#/policy">Chính sách bảo hành</a></li>
        <li><a href="#/videos">Video lắp đèn theo xe</a></li>
        <li><a href="tel:${esc(s.hotline)}">Gọi tư vấn ${phoneFmt(s.hotline)}</a></li>
      </ul></div>
      <div class="contact"><h5>Liên hệ</h5><ul>
        <li><a href="${esc(directionsLink())}" target="_blank" rel="noopener" title="Chỉ đường đến shop">📍 ${esc(s.address)} <u>(Chỉ đường)</u></a></li>
        <li>☎ Hotline/Zalo: <b>${phoneFmt(s.hotline)}</b></li>
        <li>🕘 ${esc(s.hours)}</li>
        ${DB.channels().map(c => `<li>🎵 TikTok: <a href="${esc(c.url)}" target="_blank" rel="noopener">@${esc(c.user)}</a></li>`).join('')}
      </ul></div>`;
    $('#footerBottom').textContent = `© ${new Date().getFullYear()} ${s.shopName}. Chuyên độ đèn xe máy tại TP.HCM.`;
    // Nút gọi kiểu app Điện thoại trên iPhone: nền xanh lá, ống nghe trắng
    $('#floatContact').innerHTML = `
      <a class="p" href="tel:${String(s.hotline || '').replace(/\D/g, '')}" title="Gọi ${phoneFmt(s.hotline)}" aria-label="Gọi điện"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z"/></svg></a>
      <a class="z" href="${zaloLink()}" target="_blank" rel="noopener" title="Chat Zalo">Zalo</a>
      <a class="t" href="${esc(ttTop())}" target="_blank" rel="noopener" title="TikTok" aria-label="TikTok">${TIKTOK_ICON}</a>`;
    // Thanh liên hệ cố định dưới đáy — chỉ hiện trên điện thoại/máy tính bảng
    $('#mobileBar').innerHTML = `
      <a class="call" href="tel:${String(s.hotline || '').replace(/\D/g, '')}"><i>📞</i>Gọi</a>
      <a class="zalo" href="${zaloLink()}" target="_blank" rel="noopener"><i>💬</i>Zalo</a>
      <a class="map" href="${esc(directionsLink())}" target="_blank" rel="noopener"><i>📍</i>Chỉ đường</a>`;
  }
  function setNav(key) {
    $$('#navMenu a').forEach(a => a.classList.toggle('on', !!key && a.dataset.nav === key));
    $$('#navMenu .nav-item').forEach(li => li.classList.toggle('on', !!li.querySelector('a.on')));
  }

  /* ---------------- Pages ---------------- */
  let slideTimer;
  function pageHome() {
    setNav('home');
    const banners = D().banners.filter(b => b.active);
    const ads = D().sideAds.filter(a => a.active);
    const f = D().promos.flash;
    const flashOn = f.active && new Date(f.endsAt) > new Date();
    const flashList = flashOn ? f.items.map(i => DB.product(i.productId)).filter(p => p && p.active) : [];
    // Nổi bật trước, thiếu thì lấy thêm hàng mới / bán chạy cho đủ 10 — CSS chỉ hiện số vừa khít hàng (.grid.fill)
    const featured = [...activeProducts()].sort((a, b) => b.featured - a.featured || b.isNew - a.isNew).slice(0, 10);
    const catImg = cid => (activeProducts().find(p => p.cat === cid) || {}).image || '';

    app.innerHTML = `
      <section class="hero">
        <div class="slider" id="slider">
          ${banners.map((b, i) => `
            <div class="slide ${esc(b.theme || 'amber')} ${i === 0 ? 'on' : ''}">
              <div class="slide-glow"></div>
              <div class="slide-text">
                <span class="tag">TS Superlight</span>
                <h2>${esc(b.title)}</h2>
                <p>${esc(b.subtitle)}</p>
                <div><a class="btn btn-brand btn-lg" href="${esc(b.link)}">${esc(b.cta || 'Xem ngay')} →</a></div>
              </div>
              <div class="slide-media">
                ${b.video ? `<video src="${esc(b.video)}" poster="${esc(b.image)}" muted loop playsinline preload="none"></video>` : `<img src="${esc(b.image)}" alt="">`}
              </div>
            </div>`).join('')}
          ${banners.length > 1 ? `
            <button class="slider-arrow prev" data-slide="-1">‹</button>
            <button class="slider-arrow next" data-slide="1">›</button>
            <div class="dots">${banners.map((_, i) => `<button class="${i === 0 ? 'on' : ''}" data-dot="${i}"></button>`).join('')}</div>` : ''}
        </div>
        <div class="side-ads">
          ${ads.map(a => `<a class="side-ad" href="${esc(a.link)}"><img src="${esc(a.image)}" alt=""><div><b>${esc(a.title)}</b><span>${esc(a.subtitle)}</span></div></a>`).join('')}
        </div>
      </section>

      <section class="policies">
        <div class="policy"><i>🔧</i><div><b>Lắp đặt miễn phí</b><small>Tại shop Bình Thạnh</small></div></div>
        <div class="policy"><i>💡</i><div><b>Test sáng trước khi lắp</b><small>Hài lòng mới thanh toán</small></div></div>
        <div class="policy"><i>🛡</i><div><b>Hàng chính hãng</b><small>Kenzo · Titan Moto · Aozoom</small></div></div>
        <div class="policy"><i>💬</i><div><b>Tư vấn miễn phí</b><small>Gọi / Zalo ${phoneFmt(S().hotline)}</small></div></div>
      </section>

      ${flashOn && flashList.length ? `
      <section class="section flash">
        <div class="flash-head">
          <h3>${esc(f.title)}</h3>
          <span>Kết thúc sau</span>${countdownHTML('cdHome')}
        </div>
        ${grid(flashList)}
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h3>Danh mục sản phẩm</h3><a href="#/category/all">Xem tất cả →</a></div>
        <div class="cats">
          ${D().categories.map(c => [c, activeProducts().filter(p => p.cat === c.id).length]).filter(([, n]) => n).map(([c, n]) => `<a class="cat" href="#/category/${c.id}"><div class="ic">${catImg(c.id) ? `<img src="${esc(catImg(c.id))}" alt="" loading="lazy">` : ''}</div><div><b>${esc(c.name)}</b><small>${esc(c.desc)}</small><em>${n} sản phẩm →</em></div></a>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h3>Sản phẩm nổi bật</h3><a href="#/category/all">Xem tất cả →</a></div>
        ${grid(featured, 'fill')}
      </section>

      <section class="section">
        <div class="section-head"><h3>Video lắp đèn theo dòng xe</h3><a href="#/videos">Tất cả video →</a></div>
        ${vehicleChips('')}
      </section>

      ${DB.channels().map(c => tiktokRail(c)).join('')}`;

    initSlider(banners.length);
    if (flashOn) startCountdowns();
    maybePopup();
  }

  // 1.2K / 186.2K / 4.2M
  const kfmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n || 0);
  function vidCard(m) {
    return `
          <div class="vid" data-video="${m.video ? m.id : ''}" data-tt="${m.id}" data-u="${esc(DB.chOf(m))}">
            <img src="${esc(DB.cover(m))}" alt="" loading="lazy">
            <span class="play">▶</span>
            <div class="cap"><b>▶ ${kfmt(m.views)} lượt xem</b><span>${esc(m.cap || 'TS Superlight')}</span></div>
          </div>`;
  }
  function channelHead(c) {
    return `
      <div class="tiktok-head">
        <div class="avatar">${c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : ''}</div>
        <div><b>${esc(c.name)}</b><small>@${esc(c.user)}${c.followers ? ` · ${kfmt(c.followers)} người theo dõi` : ''}${c.likes ? ` · ${kfmt(c.likes)} lượt thích` : ''}</small></div>
        <a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">Theo dõi TikTok</a>
      </div>`;
  }
  // Trang chủ: mỗi kênh TikTok một dải video kéo ngang (vuốt trên điện thoại, nút ‹ › trên máy tính)
  function tiktokRail(c) {
    const list = DB.channelVideos(c.user);
    if (!list.length) return '';
    return `
      <section class="section">
        ${channelHead(c)}
        <div class="rail-wrap">
          <button class="rail-nav prev" data-rail="-1" aria-label="Video trước">‹</button>
          <div class="rail">${list.slice(0, 20).map(vidCard).join('')}
            <a class="vid more" href="${esc(c.url)}" target="_blank" rel="noopener"><span>Xem thêm trên TikTok<br><b>@${esc(c.user)} →</b></span></a></div>
          <button class="rail-nav next" data-rail="1" aria-label="Video tiếp">›</button>
        </div>
      </section>`;
  }
  // Trang Video theo xe: lưới video của tất cả kênh
  function tiktokBlock(media) {
    const chs = DB.channels();
    return `
      <div class="tiktok-head">
        <div class="avatars">${chs.filter(c => c.avatar).map(c => `<div class="avatar"><img src="${esc(c.avatar)}" alt=""></div>`).join('')}</div>
        <div><b>Video thi công từ TikTok</b><small>${chs.map(c => '@' + esc(c.user)).join(' · ')}</small></div>
        <div class="tt-follow">${chs.map(c => `<a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">Theo dõi @${esc(c.user)}</a>`).join('')}</div>
      </div>
      <div class="videos">${media.map(vidCard).join('')}</div>`;
  }

  function initSlider(n) {
    clearInterval(slideTimer);
    const slider = $('#slider'); if (!slider || !n) return;
    let cur = 0;
    const go = i => {
      const slides = $$('.slide', slider), dots = $$('[data-dot]', slider);
      slides[cur].classList.remove('on'); dots[cur]?.classList.remove('on');
      const v0 = slides[cur].querySelector('video'); if (v0) v0.pause();
      cur = (i + n) % n;
      slides[cur].classList.add('on'); dots[cur]?.classList.add('on');
      const v = slides[cur].querySelector('video'); if (v) v.play().catch(() => {});
    };
    const v = $('.slide.on video', slider); if (v) v.play().catch(() => {});
    slider.addEventListener('click', e => {
      const a = e.target.closest('[data-slide]'), d = e.target.closest('[data-dot]');
      if (a) { go(cur + +a.dataset.slide); restart(); }
      if (d) { go(+d.dataset.dot); restart(); }
    });
    const restart = () => { clearInterval(slideTimer); slideTimer = setInterval(() => go(cur + 1), 7000); };
    if (n > 1) restart();
  }

  function maybePopup() {
    const p = D().promos.popup;
    let seen = false; try { seen = sessionStorage.getItem('tsl_popup') === '1'; } catch (e) {}
    if (!p?.active || seen) return;
    setTimeout(() => {
      if (location.hash && location.hash !== '#/') return;
      try { sessionStorage.setItem('tsl_popup', '1'); } catch (e) {}
      openModal(`
        <div class="popup-ad">
          ${p.image ? `<img src="${esc(p.image)}" alt="">` : ''}
          <div class="body">
            <h3>${esc(p.title)}</h3>
            <p class="muted">${esc(p.text)}</p>
            <a class="btn btn-brand btn-block btn-lg" href="${esc(p.link || '#/')}" data-close>Xem ngay</a>
          </div>
        </div>`);
    }, 1500);
  }

  function pageListing({ title, list, crumbs, key, showFilters = true, baseCat }) {
    setNav(key);
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const sort = params.get('sort') || 'pop';
    const veh = params.get('v') || '';
    let items = list.slice();
    if (veh) items = items.filter(p => p.vehicles.includes(veh) || p.vehicles.includes('Tất cả dòng xe'));
    // Giá 0 = "Liên hệ" → luôn xếp sau các sản phẩm có giá
    const price = p => DB.priceOf(p).price || Infinity;
    if (sort === 'new') items.sort((a, b) => b.isNew - a.isNew);
    else if (sort === 'asc') items.sort((a, b) => price(a) - price(b));
    else if (sort === 'desc') items.sort((a, b) => (DB.priceOf(b).price || -1) - (DB.priceOf(a).price || -1));
    else items.sort((a, b) => b.featured - a.featured || b.isNew - a.isNew);

    const base = location.hash.split('?')[0];
    const q = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); return `${base}?${p}`; };
    const vehicles = [...new Set(list.flatMap(p => p.vehicles))].filter(v => v !== 'Tất cả dòng xe');

    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a>${crumbs.map(c => `<span>${c}</span>`).join('')}</nav>
      <div class="${showFilters ? 'listing' : ''}">
        ${showFilters ? `
        <aside class="panel filters">
          ${baseCat !== undefined ? `<div class="grp"><h4>Danh mục</h4>
            <label><input type="radio" name="c" ${baseCat === 'all' ? 'checked' : ''} onchange="location.hash='#/category/all'"> Tất cả</label>
            ${D().categories.map(c => `<label><input type="radio" name="c" ${baseCat === c.id ? 'checked' : ''} onchange="location.hash='#/category/${c.id}'"> ${esc(c.name)}</label>`).join('')}
          </div>` : ''}
          ${vehicles.length ? `<div class="grp"><h4>Dòng xe</h4>
            <label><input type="radio" name="v" ${!veh ? 'checked' : ''} onchange="location.hash='${q('v', '')}'"> Tất cả</label>
            ${vehicles.map(v => `<label><input type="radio" name="v" ${veh === v ? 'checked' : ''} onchange="location.hash='${q('v', v)}'"> ${esc(v)}</label>`).join('')}
          </div>` : ''}
        </aside>` : ''}
        <div>
          <div class="toolbar">
            <h2>${esc(title)} <small class="muted" style="font-size:14px;font-weight:500">(${items.length} sản phẩm)</small></h2>
            <select class="sort" onchange="location.hash=this.value">
              ${[['pop', 'Nổi bật'], ['new', 'Mới nhất'], ['asc', 'Giá thấp → cao'], ['desc', 'Giá cao → thấp']].map(([v, l]) => `<option value="${q('sort', v)}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          ${grid(items)}
        </div>
      </div>`;
  }

  function pageCategory(id) {
    if (id === 'all') return pageListing({ title: 'Tất cả sản phẩm', list: activeProducts(), crumbs: ['Tất cả sản phẩm'], key: 'all', baseCat: 'all' });
    const c = DB.category(id);
    if (!c) return pageNotFound();
    pageListing({ title: c.name, list: activeProducts().filter(p => p.cat === id), crumbs: [esc(c.name)], key: id, baseCat: id });
  }
  // Trang dòng xe = video lắp đèn của dòng xe đó + sản phẩm lắp được cho xe
  function pageVehicle(v) { pageVideos(decodeURIComponent(v)); }
  function pageVehicles() {
    setNav('videos');
    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a><span><a href="#/videos">Video theo xe</a></span><span>Dòng xe</span></nav>
      <div class="cats">${videoVehicleList().map(v => [v, videosFor(v)]).filter(([, l]) => l.length).map(([v, list]) =>
        `<a class="cat" href="#/vehicle/${encodeURIComponent(v)}"><div class="ic"><img src="${esc(DB.cover(list[0]))}" alt="" loading="lazy"></div><b>${esc(v)}</b><small>${list.length} video</small></a>`).join('')}</div>`;
  }
  function pageSearch(q) {
    q = decodeURIComponent(q);
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    const words = norm(q).split(/\s+/).filter(Boolean);
    const alias = { ab: 'air blade', airblade: 'air blade', fuled: 'future', bicau: 'bi cau' };
    const list = activeProducts().filter(p => {
      const hay = norm([p.name, p.short, p.vehicles.join(' '), DB.category(p.cat)?.name].join(' '));
      return words.every(w => hay.includes(w) || (alias[w] && hay.includes(alias[w])));
    });
    $('#searchInput').value = q;
    pageListing({ title: `Kết quả cho “${q}”`, list, crumbs: ['Tìm kiếm'], key: '' });
  }
  // Trang Video theo xe: hiện 20 video, bấm "Xem thêm" tải tiếp 20 video
  const VIDEOS_PER_LOAD = 20;
  function pageVideos(v = '') {
    setNav('videos');
    const all = v ? videosFor(v) : allVideos();
    let shown = Math.min(VIDEOS_PER_LOAD, all.length);
    const moreLabel = () => `Xem thêm ${Math.min(VIDEOS_PER_LOAD, all.length - shown)} video <small>(còn ${all.length - shown})</small>`;
    const products = v ? activeProducts().filter(p => p.vehicles.includes(v) || p.vehicles.includes('Tất cả dòng xe')).sort((a, b) => b.featured - a.featured) : [];
    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a>${v ? `<span><a href="#/videos">Video theo xe</a></span><span>${esc(v)}</span>` : '<span>Video theo xe</span>'}</nav>
      <section class="section" style="margin-top:8px">
        <div class="section-head"><h3>${v ? `Video lắp đèn ${esc(v)}` : 'Video lắp đèn theo dòng xe'}</h3><span class="muted">${all.length} video${v ? '' : ' · chọn dòng xe để lọc'}</span></div>
        ${vehicleChips(v)}
      </section>
      <section class="section" style="margin-top:16px">
        ${all.length ? tiktokBlock(all.slice(0, shown)) + (shown < all.length ? `<div class="load-more"><button class="btn btn-dark btn-lg" id="vidMore">${moreLabel()}</button></div>` : '') : `<div class="empty panel"><div class="big">🎬</div><p>Chưa có video cho dòng xe ${esc(v)}.</p><a class="btn btn-outline" href="#/videos">Xem tất cả video</a></div>`}
      </section>
      ${products.length ? `
      <section class="section">
        <div class="section-head"><h3>Đèn lắp được cho ${esc(v)}</h3><a href="#/category/all">Xem tất cả →</a></div>
        ${grid(products.slice(0, 10))}
      </section>` : ''}`;
    const more = $('#vidMore');
    if (more) more.onclick = () => {
      $('#app .videos').insertAdjacentHTML('beforeend', all.slice(shown, shown + VIDEOS_PER_LOAD).map(vidCard).join(''));
      shown = Math.min(shown + VIDEOS_PER_LOAD, all.length);
      if (shown >= all.length) more.parentElement.remove(); else more.innerHTML = moreLabel();
    };
  }

  function pageProduct(id) {
    const p = DB.product(id);
    if (!p || !p.active) return pageNotFound();
    setNav(p.cat);
    const pr = DB.priceOf(p);
    const cat = DB.category(p.cat);
    const vehImgs = p.vehicles.map(v => DB.imageFor(p, v));
    const srcs = [...new Set([p.image, ...vehImgs, ...p.gallery])];
    const media = [{ type: 'img', src: p.image }, ...(p.video ? [{ type: 'video', src: p.video, poster: p.image }] : []), ...srcs.slice(1).map(src => ({ type: 'img', src }))];
    const related = activeProducts().filter(x => x.id !== p.id && (x.cat === p.cat || x.vehicles.some(v => p.vehicles.includes(v)))).slice(0, 5);
    const vehicles = p.vehicles;
    let selVeh = vehicles.length === 1 ? vehicles[0] : '';

    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a><span><a href="#/category/${p.cat}">${esc(cat?.name || '')}</a></span><span>${esc(p.name)}</span></nav>
      <section class="panel pd">
        <div class="pd-gallery">
          <div class="main" id="pdMain"><img src="${esc(DB.imageFor(p, selVeh))}" alt="${esc(p.name)}"></div>
          ${media.length > 1 ? `<div class="thumbs">${media.map((m, i) => `<button class="${m.type === 'img' && m.src === DB.imageFor(p, selVeh) ? 'on' : ''} ${m.type === 'video' ? 'is-video' : ''}" data-media="${i}"><img src="${esc(m.poster || m.src)}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        <div class="pd-info">
          <h1>${esc(p.name)}</h1>
          <div class="pd-meta">
            ${p.specs?.['Thương hiệu'] ? `<span>Thương hiệu: <b>${esc(p.specs['Thương hiệu'])}</b></span>` : ''}
            ${cat ? `<span>Danh mục: <a href="#/category/${cat.id}"><b>${esc(cat.name)}</b></a></span>` : ''}
            <span>Mã: ${esc(p.id.toUpperCase())}</span>
          </div>
          ${pr.flash ? `<div class="pd-flash">⚡ FLASH SALE · Kết thúc sau ${countdownHTML('cdPd')}</div>` : ''}
          <div class="pd-price">${pr.price > 0
            ? `<b>${fmt(pr.price)}</b>${pr.compare ? `<s>${fmt(pr.compare)}</s><span class="off">-${Math.round((1 - pr.price / pr.compare) * 100)}%</span>` : ''}<span class="muted" style="font-size:14px">Gọi/Zalo <a href="tel:${esc(S().hotline)}">${phoneFmt(S().hotline)}</a> để được tư vấn</span>`
            : `<b>${PRICE_TEXT}</b><span class="muted" style="font-size:14px">Gọi/Zalo <a href="tel:${esc(S().hotline)}">${phoneFmt(S().hotline)}</a> để được báo giá</span>`}</div>
          <p>${esc(p.short)}</p>
          <div class="pd-row"><label>Dòng xe</label>
            <div class="opt" id="vehOpt">${vehicles.map(v => `<button class="${v === selVeh ? 'on' : ''}" data-veh="${esc(v)}">${p.vehicleImages?.[v] ? `<img src="${esc(p.vehicleImages[v])}" alt="">` : ''}${esc(v)}</button>`).join('')}</div>
          </div>
          <div class="pd-row"><label>Bảo hành</label><b>${esc(p.warranty)}</b></div>
          <div class="pd-actions">
            <a class="btn btn-brand btn-lg" href="tel:${esc(S().hotline)}">📞 Gọi ${phoneFmt(S().hotline)}</a>
            <a class="btn btn-zalo btn-lg" href="${zaloLink()}" target="_blank" rel="noopener">💬 Tư vấn qua Zalo</a>
          </div>
          <div class="pd-perks">
            <div>Lắp đặt miễn phí tại shop — test sáng trước khi lắp</div>
            <div>Thanh toán tại shop sau khi lắp và test sáng</div>
          </div>
        </div>
      </section>

      <section class="section panel">
        <div class="tabs" id="pdTabs">
          <button class="on" data-tab="desc">Mô tả sản phẩm</button>
          <button data-tab="specs">Thông số kỹ thuật</button>
          ${p.video ? '<button data-tab="video">Video thực tế</button>' : ''}
          <button data-tab="policy">Bảo hành</button>
        </div>
        <div data-pane="desc" class="desc">${esc(p.desc)}</div>
        <div data-pane="specs" class="hidden">
          <table class="specs">${Object.entries({ 'Danh mục': cat?.name, 'Dòng xe': vehicles.join(', '), ...p.specs, 'Bảo hành': p.warranty }).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
        </div>
        ${p.video ? `<div data-pane="video" class="hidden"><video src="${esc(p.video)}" poster="${esc(p.image)}" controls playsinline style="max-height:70vh;margin:0 auto;border-radius:10px"></video><p style="text-align:center"><a href="${esc(p.tiktok)}" target="_blank" rel="noopener" class="muted">Xem trên TikTok ↗</a></p></div>` : ''}
        <div data-pane="policy" class="hidden desc">• Bảo hành ${esc(p.warranty)} cho lỗi kỹ thuật (không áp dụng khi va chạm, vào nước do độ chế sai cách).
• Hỗ trợ kiểm tra, cân chỉnh vệt sáng miễn phí trọn đời tại shop.
• Mang xe đến shop để được bảo hành.</div>
      </section>

      <div id="pdVideos"></div>

      ${related.length ? `<section class="section"><div class="section-head"><h3>Sản phẩm liên quan</h3></div>${grid(related)}</section>` : ''}`;

    // Video TikTok gợi ý: đúng mã đèn này trước, rồi video lắp bi cầu khác — ưu tiên dòng xe đang chọn
    const drawVideos = () => {
      const { exact, related: rel } = DB.videosForProduct(p, selVeh), list = [...exact, ...rel].slice(0, 12);
      $('#pdVideos').innerHTML = list.length ? `
        <section class="section">
          <div class="section-head"><h3>${exact.length ? `Video lắp ${esc(p.name)} thực tế` : 'Video lắp bi cầu thực tế tại shop'}</h3></div>
          <div class="rail-wrap">
            <button class="rail-nav prev" data-rail="-1" aria-label="Video trước">‹</button>
            <div class="rail">${list.map(vidCard).join('')}</div>
            <button class="rail-nav next" data-rail="1" aria-label="Video tiếp">›</button>
          </div>
        </section>` : '';
    };
    drawVideos();

    if (pr.flash) startCountdowns();
    const showMedia = i => {
      $$('[data-media]').forEach(x => x.classList.toggle('on', +x.dataset.media === i));
      const m = media[i];
      $('#pdMain').innerHTML = m.type === 'video'
        ? `<video src="${esc(m.src)}" poster="${esc(m.poster)}" controls autoplay playsinline></video>`
        : `<img src="${esc(m.src)}" alt="">`;
    };
    $$('[data-media]').forEach(b => b.onclick = () => showMedia(+b.dataset.media));
    // Chọn dòng xe → đổi ảnh chính sang ảnh của dòng xe đó
    $$('[data-veh]').forEach(b => b.onclick = () => {
      $$('[data-veh]').forEach(x => x.classList.remove('on')); b.classList.add('on'); selVeh = b.dataset.veh; drawVideos();
      const src = DB.imageFor(p, selVeh);
      showMedia(media.findIndex(m => m.type === 'img' && m.src === src));
    });
    $$('#pdTabs button').forEach(b => b.onclick = () => {
      $$('#pdTabs button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      $$('[data-pane]').forEach(x => x.classList.toggle('hidden', x.dataset.pane !== b.dataset.tab));
    });
  }

  function pagePolicy() {
    setNav('policy');
    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a><span>Chính sách</span></nav>
      <section class="panel desc">
<h2 style="margin-top:0">Chính sách bảo hành</h2>• Thời gian bảo hành tuỳ sản phẩm (ghi rõ tại trang chi tiết).
• Không bảo hành khi sản phẩm bị va chạm, cháy nổ do tự ý đấu nối sai.

<h2>Mua hàng &amp; lắp đặt</h2>• Giá sản phẩm tuỳ đời xe — vui lòng liên hệ Hotline/Zalo ${phoneFmt(S().hotline)} để được tư vấn, báo giá.
• Shop không giao hàng — sản phẩm được lắp đặt trực tiếp tại shop: <a href="${esc(directionsLink())}" target="_blank" rel="noopener">${esc(S().address)}</a> (bấm để chỉ đường).
• Thanh toán tại shop sau khi lắp và test sáng.
      </section>`;
  }

  function pageNotFound() {
    app.innerHTML = `<div class="empty panel" style="margin-top:20px"><div class="big">🔦</div><h3>Không tìm thấy trang</h3><a class="btn btn-brand" href="#/">Về trang chủ</a></div>`;
  }

  /* ---------------- Modal ---------------- */
  function openModal(html, cls = '') {
    closeModal();
    const m = document.createElement('div');
    m.className = 'modal ' + cls; m.id = 'modal';
    m.innerHTML = `<div class="modal-box"><button class="modal-close" data-close aria-label="Đóng">✕</button>${html}</div>`;
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); });
    document.body.appendChild(m);
  }
  function closeModal() { $('#modal')?.remove(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ---------------- Global events ---------------- */
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-rail]');
    if (nav) { const r = nav.parentElement.querySelector('.rail'); r.scrollBy({ left: nav.dataset.rail * r.clientWidth * 0.9, behavior: 'smooth' }); return; }
    const v = e.target.closest('.vid');
    if (v) {
      if (v.dataset.video) openModal(`<video src="assets/video/${v.dataset.video}.mp4" controls autoplay playsinline></video>`, 'video-modal');
      // Video chưa tải về máy → phát bằng trình phát nhúng của TikTok, khách không phải rời web
      else if (/^\d+$/.test(v.dataset.tt)) openModal(`<iframe src="https://www.tiktok.com/player/v1/${v.dataset.tt}?autoplay=1&description=1&rel=0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen title="Video TikTok"></iframe>
        <a class="tt-link" href="https://www.tiktok.com/@${encodeURIComponent(v.dataset.u || 'ts.superlight')}/video/${v.dataset.tt}" target="_blank" rel="noopener">Xem trên TikTok ↗</a>`, 'video-modal');
      return;
    }
  });
  $('#searchForm').onsubmit = e => { e.preventDefault(); const q = $('#searchInput').value.trim(); if (q) { closeSearch(); location.hash = '#/search/' + encodeURIComponent(q); } };

  /* ---------------- Header: menu mobile & ô tìm kiếm ---------------- */
  const openNav = on => { $('#nav').classList.toggle('open', on); $('#navBackdrop').classList.toggle('show', on); document.body.classList.toggle('nav-open', on); };
  function openSearch() { $('#searchOverlay').classList.add('show'); setTimeout(() => $('#searchInput').focus(), 50); }
  function closeSearch() { $('#searchOverlay').classList.remove('show'); }
  $('#menuBtn').onclick = () => openNav(true);
  $('#navClose').onclick = $('#navBackdrop').onclick = () => openNav(false);
  $('#searchBtn').onclick = openSearch;
  $('#searchClose').onclick = closeSearch;
  $('#searchOverlay').addEventListener('click', e => { if (e.target.id === 'searchOverlay') closeSearch(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSearch(); openNav(false); } });
  $('#navMenu').addEventListener('click', e => {
    const arrow = e.target.closest('.arrow');
    if (arrow) { arrow.parentElement.classList.toggle('open'); return; }
    if (e.target.closest('a')) openNav(false);
  });

  /* ---------------- Router ---------------- */
  function route() {
    closeModal(); closeSearch(); openNav(false); clearInterval(cdTimer);
    const [path] = (location.hash.slice(1) || '/').split('?');
    const [, a, b] = path.split('/');
    ({
      '': pageHome, category: () => pageCategory(b || 'all'), vehicle: () => pageVehicle(b), vehicles: pageVehicles,
      search: () => pageSearch(b), product: () => pageProduct(b), videos: pageVideos, policy: pagePolicy,
    }[a || ''] || pageNotFound)();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  // Dữ liệu mới (catalog vừa tải từ web / Admin sửa nháp): vẽ lại, giữ nguyên vị trí cuộn
  window.addEventListener('db-changed', () => {
    renderChrome();
    if ($('#modal')) return;
    const y = window.scrollY; route(); window.scrollTo(0, y);
  });

  renderChrome();
  route();
})();
