/* ============ TS SUPERLIGHT — Storefront app ============ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');
  const D = () => DB.data;
  const S = () => D().settings;

  /* ---------------- Danh sách đặt chỗ (localStorage) ---------------- */
  const CART_KEY = 'tsl_cart';
  const Cart = {
    items: [],
    load() { try { this.items = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { this.items = []; } this.clean(); },
    save() { try { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); } catch (e) {} updateCartCount(); },
    clean() { this.items = this.items.filter(i => { const p = DB.product(i.pid); return p && p.active; }); },
    add(pid, qty = 1, vehicle = '') {
      const ex = this.items.find(i => i.pid === pid && i.vehicle === vehicle);
      if (ex) ex.qty += qty; else this.items.push({ pid, qty, vehicle });
      this.save();
    },
    set(idx, qty) { this.items[idx].qty = Math.max(1, Math.min(99, qty)); this.save(); },
    remove(idx) { this.items.splice(idx, 1); this.save(); },
    clear() { this.items = []; this.save(); },
    count() { return this.items.reduce((s, i) => s + i.qty, 0); },
    lines() { return this.items.map(i => ({ ...i, p: DB.product(i.pid) })); },
  };
  // Tiền cọc cố định cho mỗi lượt đặt chỗ (Admin → Cài đặt)
  const deposit = () => Number(S().deposit) || 0;
  const PRICE_TEXT = 'Liên hệ';

  /* ---------------- Helpers ---------------- */
  function toast(html) {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function updateCartCount() { $('#cartCount').textContent = Cart.count(); }
  const stars = n => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
  const activeProducts = () => D().products.filter(p => p.active);
  const zaloLink = () => `https://zalo.me/${S().zalo}`;
  const phoneFmt = p => String(p).replace(/(\d{4})(\d{3})(\d+)/, '$1.$2.$3');

  function card(p, opts = {}) {
    const fi = DB.flashItem(p.id);
    const soldPct = Math.min(95, Math.round(p.sold / (p.sold + p.stock) * 100));
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
        <div class="price"><b>${PRICE_TEXT}</b></div>
        <div class="card-meta">
          ${opts.flash
            ? `<div class="bar"><i style="width:${soldPct}%"></i><span>Đã bán ${p.sold}</span></div>`
            : `<span class="stars">${stars(p.rating)}</span><span>Đã bán ${p.sold}</span>`}
        </div>
        <button class="card-add" data-add="${p.id}">+ Đặt chỗ</button>
      </div>
    </article>`;
  }
  const grid = (list, cls = '', opts) => list.length
    ? `<div class="grid ${cls}">${list.map(p => card(p, opts)).join('')}</div>`
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
    $('#navMenu').innerHTML = `
      <li><a href="#/" data-nav="home">Trang chủ</a></li>
      ${D().promos.flash.active ? '<li><a href="#/flash" class="hot" data-nav="flash">⚡ Flash Sale</a></li>' : ''}
      ${D().categories.map(c => `<li><a href="#/category/${c.id}" data-nav="${c.id}">${esc(c.name)}</a></li>`).join('')}
      <li><a href="#/vehicles" data-nav="vehicles">Theo dòng xe</a></li>
      <li><a href="#/videos" data-nav="videos">Video TikTok</a></li>`;
    $('#footer').innerHTML = `
      <div>
        <a href="#/" class="logo" style="margin-bottom:12px"><span class="logo-mark"></span><span class="logo-text"><b style="color:#fff">TS <span>SUPERLIGHT</span></b></span></a>
        <p>${esc(s.slogan)}. Lắp đặt, test sáng miễn phí tại shop — bảo hành rõ ràng, liên hệ để được báo giá.</p>
        <div class="social">
          <a href="${esc(s.tiktok)}" target="_blank" rel="noopener">TikTok</a>
          <a href="${zaloLink()}" target="_blank" rel="noopener">Zalo</a>
        </div>
      </div>
      <div><h5>Danh mục</h5><ul>${D().categories.map(c => `<li><a href="#/category/${c.id}">${esc(c.name)}</a></li>`).join('')}</ul></div>
      <div><h5>Hỗ trợ</h5><ul>
        <li><a href="#/cart">Đặt chỗ của bạn</a></li>
        <li><a href="#/flash">Khuyến mãi</a></li>
        <li><a href="#/policy">Chính sách bảo hành</a></li>
        <li><a href="#/policy">Đặt chỗ &amp; tiền cọc</a></li>
      </ul></div>
      <div class="contact"><h5>Liên hệ</h5><ul>
        <li>📍 ${esc(s.address)}</li>
        <li>☎ Hotline/Zalo: <b>${phoneFmt(s.hotline)}</b></li>
        <li>🕘 ${esc(s.hours)}</li>
        <li>🎵 TikTok: <a href="${esc(s.tiktok)}" target="_blank" rel="noopener">@ts.superlight</a></li>
      </ul></div>`;
    $('#footerBottom').textContent = `© ${new Date().getFullYear()} ${s.shopName}. Chuyên độ đèn xe máy tại TP.HCM.`;
    $('#floatContact').innerHTML = `
      <a class="z" href="${zaloLink()}" target="_blank" rel="noopener" title="Chat Zalo">Zalo</a>
      <a class="t" href="${esc(s.tiktok)}" target="_blank" rel="noopener" title="TikTok">TT</a>`;
    updateCartCount();
  }
  function setNav(key) { $$('#navMenu a').forEach(a => a.classList.toggle('on', a.dataset.nav === key)); }

  /* ---------------- Pages ---------------- */
  let slideTimer;
  function pageHome() {
    setNav('home');
    const banners = D().banners.filter(b => b.active);
    const ads = D().sideAds.filter(a => a.active);
    const f = D().promos.flash;
    const flashOn = f.active && new Date(f.endsAt) > new Date();
    const flashList = flashOn ? f.items.map(i => DB.product(i.productId)).filter(p => p && p.active) : [];
    const featured = activeProducts().filter(p => p.featured);
    const catImg = cid => (activeProducts().find(p => p.cat === cid) || {}).image || '';
    const media = [...(window.TIKTOK_MEDIA || [])].sort((a, b) => (b.video - a.video) || (b.views - a.views)).slice(0, 12);

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
        <div class="policy"><i>🛡</i><div><b>Bảo hành đến 24 tháng</b><small>1 đổi 1 trong 7 ngày</small></div></div>
        <div class="policy"><i>📅</i><div><b>Đặt chỗ online</b><small>Cọc ${fmt(deposit())} giữ hàng &amp; lịch lắp</small></div></div>
      </section>

      ${flashOn && flashList.length ? `
      <section class="section flash">
        <div class="flash-head">
          <h3>${esc(f.title)}</h3>
          <span>Kết thúc sau</span>${countdownHTML('cdHome')}
          <a href="#/flash" style="margin-left:auto;color:var(--brand);font-weight:600">Xem tất cả →</a>
        </div>
        ${grid(flashList, '', { flash: true })}
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h3>Danh mục sản phẩm</h3></div>
        <div class="cats">
          ${D().categories.map(c => `<a class="cat" href="#/category/${c.id}"><div class="ic">${catImg(c.id) ? `<img src="${esc(catImg(c.id))}" alt="" loading="lazy">` : ''}</div><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></a>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h3>Tìm đèn theo dòng xe</h3><a href="#/vehicles">Tất cả →</a></div>
        <div class="chips">${D().vehicles.filter(v => v !== 'Tất cả dòng xe').map(v => `<a class="chip" href="#/vehicle/${encodeURIComponent(v)}">${esc(v)}</a>`).join('')}</div>
      </section>

      <section class="section">
        <div class="section-head"><h3>Sản phẩm nổi bật</h3><a href="#/category/all">Xem tất cả →</a></div>
        ${grid(featured.slice(0, 10))}
      </section>

      ${D().categories.map(c => {
        const list = activeProducts().filter(p => p.cat === c.id);
        return list.length ? `
        <section class="section">
          <div class="section-head"><h3>${esc(c.name)}</h3><a href="#/category/${c.id}">Xem tất cả ${list.length} sản phẩm →</a></div>
          ${grid(list.slice(0, 5))}
        </section>` : '';
      }).join('')}

      <section class="section">
        ${tiktokBlock(media)}
      </section>`;

    initSlider(banners.length);
    if (flashOn) startCountdowns();
    maybePopup();
  }

  function tiktokBlock(media, full) {
    return `
      <div class="tiktok-head">
        <div class="avatar"><img src="assets/img/${media[0]?.id || ''}.jpg" alt=""></div>
        <div><b>TS SUPERLIGHT 🇻🇳</b><small>@ts.superlight · 800+ followers · 14.7K lượt thích · 109 video</small></div>
        <a class="btn" href="${esc(S().tiktok)}" target="_blank" rel="noopener">Theo dõi TikTok</a>
      </div>
      <div class="videos">
        ${media.map(m => `
          <div class="vid" data-video="${m.video ? m.id : ''}" data-tt="${m.id}">
            <img src="assets/img/${m.id}.jpg" alt="" loading="lazy">
            <span class="play">▶</span>
            <div class="cap"><b>▶ ${m.views >= 1000 ? (m.views / 1000).toFixed(1).replace('.0', '') + 'K' : m.views} lượt xem</b><span>${esc(m.cap || 'TS Superlight')}</span></div>
          </div>`).join('')}
      </div>
      ${full ? '' : `<div style="text-align:center;margin-top:12px"><a class="btn btn-outline" href="#/videos">Xem thêm video thi công →</a></div>`}`;
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
    if (sort === 'new') items.sort((a, b) => b.isNew - a.isNew);
    else items.sort((a, b) => b.sold - a.sold);

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
              ${[['pop', 'Bán chạy'], ['new', 'Mới nhất']].map(([v, l]) => `<option value="${q('sort', v)}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}
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
  function pageVehicle(v) {
    v = decodeURIComponent(v);
    pageListing({ title: `Đèn cho ${v}`, list: activeProducts().filter(p => p.vehicles.includes(v) || p.vehicles.includes('Tất cả dòng xe')), crumbs: ['<a href="#/vehicles">Theo dòng xe</a>', esc(v)], key: 'vehicles' });
  }
  function pageVehicles() {
    setNav('vehicles');
    const vs = D().vehicles.filter(v => v !== 'Tất cả dòng xe');
    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a><span>Theo dòng xe</span></nav>
      <div class="cats">${vs.map(v => {
        const list = activeProducts().filter(p => p.vehicles.includes(v));
        return `<a class="cat" href="#/vehicle/${encodeURIComponent(v)}"><div class="ic">${list[0] ? `<img src="${esc(list[0].image)}" alt="" loading="lazy">` : ''}</div><b>${esc(v)}</b><small>${list.length} sản phẩm</small></a>`;
      }).join('')}</div>`;
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
  function pageFlash() {
    setNav('flash');
    const f = D().promos.flash;
    const on = f.active && new Date(f.endsAt) > new Date();
    const list = on ? f.items.map(i => DB.product(i.productId)).filter(p => p && p.active) : [];
    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a><span>Khuyến mãi</span></nav>
      <section class="flash">
        <div class="flash-head"><h3>${esc(f.title)}</h3>${on ? `<span>Kết thúc sau</span>${countdownHTML('cdFlash')}` : '<span>Chương trình đã kết thúc — hẹn bạn lần sau!</span>'}</div>
        ${on ? `<p class="muted" style="margin:0 0 12px">Liên hệ Hotline/Zalo để nhận giá ưu đãi Flash Sale.</p>${grid(list, '', { flash: true })}` : ''}
      </section>`;
    if (on) startCountdowns();
  }
  function pageVideos() {
    setNav('videos');
    const media = [...(window.TIKTOK_MEDIA || [])].sort((a, b) => (b.video - a.video) || (b.views - a.views));
    app.innerHTML = `<nav class="crumbs"><a href="#/">Trang chủ</a><span>Video TikTok</span></nav>${tiktokBlock(media, true)}`;
  }

  function pageProduct(id) {
    const p = DB.product(id);
    if (!p || !p.active) return pageNotFound();
    setNav(p.cat);
    const pr = DB.priceOf(p);
    const cat = DB.category(p.cat);
    const media = [{ type: 'img', src: p.image }, ...(p.video ? [{ type: 'video', src: p.video, poster: p.image }] : []), ...p.gallery.map(src => ({ type: 'img', src }))];
    const related = activeProducts().filter(x => x.id !== p.id && (x.cat === p.cat || x.vehicles.some(v => p.vehicles.includes(v)))).slice(0, 5);
    const vehicles = p.vehicles;
    let selVeh = vehicles.length === 1 ? vehicles[0] : '';

    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a><span><a href="#/category/${p.cat}">${esc(cat?.name || '')}</a></span><span>${esc(p.name)}</span></nav>
      <section class="panel pd">
        <div class="pd-gallery">
          <div class="main" id="pdMain"><img src="${esc(p.image)}" alt="${esc(p.name)}"></div>
          ${media.length > 1 ? `<div class="thumbs">${media.map((m, i) => `<button class="${i === 0 ? 'on' : ''} ${m.type === 'video' ? 'is-video' : ''}" data-media="${i}"><img src="${esc(m.poster || m.src)}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        <div class="pd-info">
          <h1>${esc(p.name)}</h1>
          <div class="pd-meta">
            <span class="stars">${stars(p.rating)}</span><span>Đã bán ${p.sold}</span>
            <span>Kho: ${p.stock > 0 ? `<b style="color:var(--ok)">Còn hàng</b>` : '<b style="color:var(--sale)">Hết hàng</b>'}</span>
            <span>Mã: ${esc(p.id.toUpperCase())}</span>
          </div>
          ${pr.flash ? `<div class="pd-flash">⚡ FLASH SALE · Kết thúc sau ${countdownHTML('cdPd')}</div>` : ''}
          <div class="pd-price"><b>${PRICE_TEXT}</b><span class="muted" style="font-size:14px">Gọi/Zalo <a href="tel:${esc(S().hotline)}">${phoneFmt(S().hotline)}</a> để được báo giá</span></div>
          <p>${esc(p.short)}</p>
          <div class="pd-row"><label>Dòng xe</label>
            <div class="opt" id="vehOpt">${vehicles.map(v => `<button class="${v === selVeh ? 'on' : ''}" data-veh="${esc(v)}">${esc(v)}</button>`).join('')}</div>
          </div>
          <div class="pd-row"><label>Số lượng</label>
            <div class="qty"><button data-q="-1">−</button><input id="pdQty" type="number" value="1" min="1" max="99"><button data-q="1">+</button></div>
          </div>
          <div class="pd-row"><label>Bảo hành</label><b>${esc(p.warranty)}</b></div>
          <div class="pd-actions">
            <button class="btn btn-outline btn-lg" id="pdAdd" ${p.stock > 0 ? '' : 'disabled'}>📋 Thêm vào đặt chỗ</button>
            <button class="btn btn-brand btn-lg" id="pdBuy" ${p.stock > 0 ? '' : 'disabled'}>📅 Đặt chỗ &amp; cọc ngay</button>
            <a class="btn btn-zalo btn-lg" href="${zaloLink()}" target="_blank" rel="noopener">💬 Tư vấn qua Zalo ${phoneFmt(S().zalo)}</a>
          </div>
          <div class="pd-perks">
            <div>Lắp đặt miễn phí tại shop — test sáng trước khi lắp</div>
            <div>1 đổi 1 trong 7 ngày nếu lỗi nhà sản xuất</div>
            <div>Đặt cọc ${fmt(deposit())} để giữ hàng &amp; lịch lắp — trừ vào tiền đèn khi lắp</div>
            <div>Cọc qua chuyển khoản, MoMo, VNPay, ZaloPay · Phần còn lại thanh toán tại shop</div>
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
• 1 đổi 1 trong 7 ngày đầu nếu lỗi nhà sản xuất.
• Hỗ trợ kiểm tra, cân chỉnh vệt sáng miễn phí trọn đời tại shop.
• Mang xe đến shop để được bảo hành.</div>
      </section>

      ${related.length ? `<section class="section"><div class="section-head"><h3>Sản phẩm liên quan</h3></div>${grid(related)}</section>` : ''}`;

    if (pr.flash) startCountdowns();
    $$('[data-media]').forEach(b => b.onclick = () => {
      $$('[data-media]').forEach(x => x.classList.remove('on')); b.classList.add('on');
      const m = media[+b.dataset.media];
      $('#pdMain').innerHTML = m.type === 'video'
        ? `<video src="${esc(m.src)}" poster="${esc(m.poster)}" controls autoplay playsinline></video>`
        : `<img src="${esc(m.src)}" alt="">`;
    });
    $$('[data-veh]').forEach(b => b.onclick = () => { $$('[data-veh]').forEach(x => x.classList.remove('on')); b.classList.add('on'); selVeh = b.dataset.veh; });
    const qty = $('#pdQty');
    $$('[data-q]').forEach(b => b.onclick = () => { qty.value = Math.max(1, Math.min(99, (+qty.value || 1) + +b.dataset.q)); });
    const add = () => {
      if (vehicles.length > 1 && !selVeh) { toast('Vui lòng chọn <b>dòng xe</b> của bạn'); $('#vehOpt').scrollIntoView({ block: 'center', behavior: 'smooth' }); return false; }
      Cart.add(p.id, Math.max(1, +qty.value || 1), selVeh);
      return true;
    };
    $('#pdAdd').onclick = () => { if (add()) toast(`Đã thêm <b>${esc(p.name)}</b> vào danh sách đặt chỗ`); };
    $('#pdBuy').onclick = () => { if (add()) location.hash = '#/cart'; };
    $$('#pdTabs button').forEach(b => b.onclick = () => {
      $$('#pdTabs button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      $$('[data-pane]').forEach(x => x.classList.toggle('hidden', x.dataset.pane !== b.dataset.tab));
    });
  }

  function steps(n) {
    const s = ['Chọn sản phẩm', 'Hẹn lịch & đặt cọc', 'Hoàn tất'];
    return `<div class="steps">${s.map((t, i) => `${i ? '<div class="ln"></div>' : ''}<span class="${i < n ? 'on' : ''}"><i>${i + 1}</i>${t}</span>`).join('')}</div>`;
  }

  function summaryHTML() {
    return `
      <aside class="panel summary">
        <h3 style="margin:0 0 10px">Tóm tắt đặt chỗ</h3>
        <div class="row"><span>Sản phẩm</span><span>${Cart.count()}</span></div>
        <div class="row"><span>Giá sản phẩm</span><span>${PRICE_TEXT}</span></div>
        <div class="row total"><span>Tiền cọc giữ chỗ</span><span>${fmt(deposit())}</span></div>
        <p class="muted" style="font-size:12px;margin:6px 0 0">Tiền cọc được trừ vào tổng tiền khi lắp. Shop sẽ gọi/Zalo báo giá chi tiết trước khi lắp.</p>
        <div id="summaryAction"></div>
      </aside>`;
  }

  function pageCart() {
    setNav('');
    Cart.clean();
    const lines = Cart.lines();
    if (!lines.length) {
      app.innerHTML = `${steps(1)}<div class="empty panel"><div class="big">📋</div><h3>Chưa có sản phẩm đặt chỗ</h3><p>Chọn mẫu đèn ưng ý rồi đặt chỗ, cọc trước để giữ hàng và lịch lắp nhé!</p><a class="btn btn-brand btn-lg" href="#/">Xem sản phẩm</a></div>`;
      return;
    }
    app.innerHTML = `
      ${steps(1)}
      <div class="cart-layout">
        <section class="panel">
          <h3 style="margin:0 0 14px">Sản phẩm đặt chỗ (${Cart.count()})</h3>
          ${lines.map((l, i) => `
            <div class="cart-item">
              <a href="#/product/${l.p.id}"><img src="${esc(l.p.image)}" alt=""></a>
              <div>
                <a class="nm" href="#/product/${l.p.id}">${esc(l.p.name)}</a>
                ${l.vehicle ? `<div class="vh">Dòng xe: ${esc(l.vehicle)}</div>` : ''}
                <div class="price" style="margin-top:4px"><b style="font-size:14px">${PRICE_TEXT}</b></div>
              </div>
              <div class="right">
                <div class="qty"><button data-cq="${i}" data-d="-1">−</button><input value="${l.qty}" data-ci="${i}" type="number" min="1"><button data-cq="${i}" data-d="1">+</button></div>
                <button class="rm" data-rm="${i}">Xoá</button>
              </div>
            </div>`).join('')}
          <div style="margin-top:14px"><a href="#/" class="muted">← Xem thêm sản phẩm</a></div>
        </section>
        ${summaryHTML()}
      </div>`;
    $('#summaryAction').innerHTML = `<a class="btn btn-brand btn-block btn-lg" href="#/checkout" style="margin-top:12px">Hẹn lịch &amp; đặt cọc →</a>`;
    $$('[data-cq]').forEach(b => b.onclick = () => { const i = +b.dataset.cq; Cart.set(i, Cart.items[i].qty + +b.dataset.d); pageCart(); });
    $$('[data-ci]').forEach(inp => inp.onchange = () => { Cart.set(+inp.dataset.ci, +inp.value || 1); pageCart(); });
    $$('[data-rm]').forEach(b => b.onclick = () => { Cart.remove(+b.dataset.rm); pageCart(); });
  }

  const PAY = {
    bank: { name: 'Chuyển khoản ngân hàng (VietQR)', sub: 'Quét mã QR bằng app ngân hàng', color: '#0f766e', short: 'QR' },
    momo: { name: 'Ví MoMo', sub: 'Thanh toán qua ứng dụng MoMo', color: '#a50064', short: 'MoMo' },
    vnpay: { name: 'VNPay (ATM / Visa / Master)', sub: 'Thẻ nội địa & quốc tế', color: '#005baa', short: 'VNPAY' },
    zalopay: { name: 'ZaloPay', sub: 'Thanh toán qua ví ZaloPay', color: '#0068ff', short: 'Zalo' },
  };
  const SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  const localDate = (d = new Date()) => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  function pageCheckout() {
    setNav('');
    Cart.clean();
    if (!Cart.items.length) { location.hash = '#/cart'; return; }
    let draft = {}; try { draft = JSON.parse(localStorage.getItem('tsl_customer')) || {}; } catch (e) {}
    const s = S();
    const render = () => {
      const pay = $('input[name=pay]:checked').value;
      const amount = deposit();
      const bankOk = s.bankName && s.bankAccount;
      const detail = {
        bank: bankOk
          ? `<div class="qr-box"><img src="https://img.vietqr.io/image/${encodeURIComponent(s.bankName)}-${encodeURIComponent(s.bankAccount)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent('TSL COC ' + ($('#fPhone')?.value || ''))}&accountName=${encodeURIComponent(s.bankOwner)}" alt="QR chuyển khoản"><div>Ngân hàng: <b>${esc(s.bankName)}</b><br>STK: <b>${esc(s.bankAccount)}</b><br>Chủ TK: <b>${esc(s.bankOwner)}</b><br>Tiền cọc: <b style="color:var(--sale)">${fmt(amount)}</b><br><small class="muted">Nội dung: TSL COC + số điện thoại</small></div></div>`
          : `Mã QR chuyển khoản sẽ hiển thị khi shop cấu hình tài khoản ngân hàng. Bạn vẫn có thể đặt chỗ — shop sẽ gửi thông tin chuyển khoản cọc qua Zalo.`,
        momo: 'Sau khi bấm Đặt chỗ, bạn sẽ được chuyển đến cổng thanh toán MoMo để cọc.',
        vnpay: 'Sau khi bấm Đặt chỗ, bạn sẽ được chuyển đến cổng VNPay để cọc bằng thẻ ATM/Visa/Master.',
        zalopay: 'Sau khi bấm Đặt chỗ, bạn sẽ được chuyển đến cổng ZaloPay để cọc.',
      }[pay];
      $('#payDetail').innerHTML = detail;
    };

    app.innerHTML = `
      ${steps(2)}
      <form class="cart-layout" id="checkoutForm" novalidate>
        <div style="display:grid;gap:16px">
          <section class="panel">
            <h3 style="margin:0 0 14px">1. Thông tin khách hàng</h3>
            <div class="form-grid">
              <div class="field"><label>Họ và tên *</label><input id="fName" required value="${esc(draft.name || '')}" placeholder="Nguyễn Văn A"></div>
              <div class="field"><label>Số điện thoại *</label><input id="fPhone" required inputmode="tel" value="${esc(draft.phone || '')}" placeholder="09xx xxx xxx"></div>
              <div class="field full"><label>Email (không bắt buộc)</label><input id="fEmail" type="email" value="${esc(draft.email || '')}" placeholder="email@example.com"></div>
            </div>
          </section>
          <section class="panel">
            <h3 style="margin:0 0 6px">2. Hẹn lịch lắp tại shop</h3>
            <p class="muted" style="margin:0 0 12px">🔧 ${esc(s.address)} · ${esc(s.hours)}</p>
            <div class="form-grid">
              <div class="field"><label>Ngày hẹn *</label><input id="fDate" type="date" min="${localDate()}" value="${localDate(new Date(Date.now() + 864e5))}"></div>
              <div class="field"><label>Giờ hẹn *</label><select id="fTime">${SLOTS.map(t => `<option>${t}</option>`).join('')}</select></div>
            </div>
            <div class="field" style="margin-top:12px"><label>Ghi chú (đời xe, yêu cầu thêm…)</label><textarea id="fNote" rows="2" placeholder="VD: Vario 2022, muốn xem thêm mẫu hậu"></textarea></div>
          </section>
          <section class="panel">
            <h3 style="margin:0 0 14px">3. Thanh toán tiền cọc ${fmt(deposit())}</h3>
            <div class="pay-methods">
              ${Object.entries(PAY).map(([k, v], i) => `<label class="pay"><input type="radio" name="pay" value="${k}" ${i === 0 ? 'checked' : ''}><span class="logo-pay" style="background:${v.color}">${v.short}</span><div><b>${v.name}</b><small>${v.sub}</small></div></label>`).join('')}
            </div>
            <div class="pay-detail" id="payDetail"></div>
          </section>
        </div>
        <div>
          ${summaryHTML()}
        </div>
      </form>`;

    $('#summaryAction').innerHTML = `
      <div class="mini-items" style="margin:12px 0;border-top:1px solid var(--line);padding-top:8px">
        ${Cart.lines().map(l => `<div class="it"><img src="${esc(l.p.image)}" alt=""><div>${esc(l.p.name)}<br><small class="muted">x${l.qty}${l.vehicle ? ' · ' + esc(l.vehicle) : ''}</small></div></div>`).join('')}
      </div>
      <button class="btn btn-brand btn-block btn-lg" type="submit">Đặt chỗ &amp; cọc ${fmt(deposit())}</button>
      <p class="muted" style="font-size:12px;text-align:center;margin:8px 0 0">Bằng việc đặt chỗ, bạn đồng ý với chính sách đặt cọc của ${esc(s.shopName)}</p>
      <a href="#/cart" class="muted" style="display:block;text-align:center;font-size:13px;margin-top:6px">← Quay lại danh sách đặt chỗ</a>`;

    $$('#checkoutForm input[name=pay]').forEach(r => r.onchange = render);
    $('#fPhone').addEventListener('change', render);
    render();

    $('#checkoutForm').onsubmit = e => {
      e.preventDefault();
      const pay = $('input[name=pay]:checked').value;
      const f = { name: $('#fName').value.trim(), phone: $('#fPhone').value.replace(/\s|\./g, ''), email: $('#fEmail').value.trim(), note: $('#fNote').value.trim() };
      const appt = { date: $('#fDate').value, time: $('#fTime').value };
      const need = [['fName', f.name], ['fPhone', /^0\d{9}$/.test(f.phone)], ['fDate', appt.date && appt.date >= localDate()]];
      let bad = null;
      need.forEach(([id, ok]) => { const fld = $('#' + id).closest('.field'); fld.classList.toggle('invalid', !ok); if (!ok && !bad) bad = $('#' + id); });
      if (bad) { bad.focus(); toast(bad.id === 'fPhone' ? 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0)' : bad.id === 'fDate' ? 'Vui lòng chọn ngày hẹn từ hôm nay trở đi' : 'Vui lòng điền đủ thông tin bắt buộc'); return; }
      try { localStorage.setItem('tsl_customer', JSON.stringify(f)); } catch (e) {}
      const order = {
        id: 'TSL' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + Math.random().toString(36).slice(2, 6).toUpperCase(),
        type: 'booking',
        createdAt: new Date().toISOString(),
        customer: f, appointment: appt, payment: pay,
        items: Cart.lines().map(l => ({ pid: l.p.id, name: l.p.name, image: l.p.image, qty: l.qty, vehicle: l.vehicle })),
        deposit: deposit(), total: deposit(),
        paymentStatus: 'unpaid', status: 'new',
      };
      if (['momo', 'vnpay', 'zalopay'].includes(pay)) openGateway(order);
      else placeOrder(order);
    };
  }

  function placeOrder(order) {
    DB.load(); // tránh ghi đè thay đổi từ tab admin
    order.items.forEach(i => { const p = DB.product(i.pid); if (p) { p.stock = Math.max(0, p.stock - i.qty); p.sold += i.qty; } });
    DB.data.orders.unshift(order);
    DB.save();
    Cart.clear();
    closeModal();
    location.hash = '#/success/' + order.id;
  }

  /* Cổng thanh toán mô phỏng — thay bằng redirect tới URL thanh toán do backend tạo (MoMo/VNPay/ZaloPay SDK) */
  function openGateway(order) {
    const g = PAY[order.payment];
    openModal(`
      <div class="gateway">
        <div class="gw-head" style="background:${g.color}"><span class="logo-pay" style="background:rgba(255,255,255,.2)">${g.short}</span><div><b>${g.name}</b><br><small>Cổng thanh toán (mô phỏng)</small></div></div>
        <div class="gw-body" id="gwBody">
          <div class="muted">Tiền cọc đặt chỗ ${esc(order.id)} · ${esc(S().shopName)}</div>
          <div class="amount">${fmt(order.deposit)}</div>
          <div class="fake-qr"></div>
          <p class="muted" style="font-size:13px">Quét mã bằng ứng dụng ${g.short} để thanh toán.<br>Đây là bản demo — chưa trừ tiền thật.</p>
          <button class="btn btn-brand btn-block btn-lg" id="gwPay">Xác nhận đã thanh toán</button>
          <button class="btn btn-outline btn-block" data-close style="margin-top:8px">Huỷ giao dịch</button>
        </div>
      </div>`);
    $('#gwPay').onclick = () => {
      $('#gwBody').innerHTML = '<div class="spinner"></div><p>Đang xác thực giao dịch…</p>';
      setTimeout(() => { order.paymentStatus = 'paid'; order.paidAt = new Date().toISOString(); placeOrder(order); }, 1600);
    };
  }

  function pageSuccess(id) {
    setNav('');
    const o = D().orders.find(x => x.id === id);
    if (!o) return pageNotFound();
    const a = o.appointment || {};
    const apptText = a.date ? `${a.time || ''} · ${new Date(a.date + 'T00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}` : '—';
    app.innerHTML = `
      ${steps(3)}
      <section class="panel success">
        <div class="tick">✓</div>
        <h2>Đặt chỗ thành công!</h2>
        <p class="muted">Cảm ơn ${esc(o.customer.name)}. Shop sẽ gọi/Zalo xác nhận lịch hẹn và báo giá trong ít phút.</p>
        <div class="code">${esc(o.id)}</div>
        <div style="text-align:left;margin:16px 0" class="summary">
          <div class="row"><span>Lịch hẹn lắp</span><b>${esc(apptText)}</b></div>
          <div class="row"><span>Địa điểm</span><b>${esc(S().address)}</b></div>
          <div class="row"><span>Hình thức cọc</span><b>${PAY[o.payment]?.name || esc(o.payment)}</b></div>
          <div class="row"><span>Trạng thái cọc</span><b style="color:${o.paymentStatus === 'paid' ? 'var(--ok)' : 'var(--brand-2)'}">${o.paymentStatus === 'paid' ? 'Đã cọc' : 'Chờ xác nhận chuyển khoản'}</b></div>
          <div class="row total"><span>Tiền cọc</span><span>${fmt(o.deposit ?? o.total)}</span></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn btn-zalo btn-lg" href="${zaloLink()}" target="_blank" rel="noopener">Nhắn Zalo shop</a>
          <a class="btn btn-dark btn-lg" href="#/">Xem thêm sản phẩm</a>
        </div>
      </section>`;
  }

  function pagePolicy() {
    setNav('');
    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Trang chủ</a><span>Chính sách</span></nav>
      <section class="panel desc">
<h2 style="margin-top:0">Chính sách bảo hành</h2>• Bảo hành 12 – 24 tháng tuỳ sản phẩm (ghi rõ tại trang chi tiết).
• 1 đổi 1 trong 7 ngày nếu lỗi nhà sản xuất.
• Không bảo hành khi sản phẩm bị va chạm, cháy nổ do tự ý đấu nối sai.

<h2>Đặt chỗ &amp; tiền cọc</h2>• Giá sản phẩm tuỳ đời xe — vui lòng liên hệ Hotline/Zalo ${phoneFmt(S().hotline)} để được báo giá.
• Shop không giao hàng — sản phẩm được lắp đặt trực tiếp tại shop: ${esc(S().address)}.
• Đặt chỗ online và cọc ${fmt(deposit())} để giữ hàng và lịch lắp. Tiền cọc được trừ vào tổng tiền khi lắp.
• Cần đổi lịch hẹn, vui lòng báo trước qua Zalo/Hotline.

<h2>Thanh toán</h2>• Tiền cọc: chuyển khoản VietQR, ví MoMo, VNPay, ZaloPay.
• Phần còn lại: thanh toán tại shop sau khi lắp và test sáng.
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
    const add = e.target.closest('[data-add]');
    if (add) {
      const p = DB.product(add.dataset.add);
      if (p.vehicles.length > 1) { location.hash = '#/product/' + p.id; toast('Chọn <b>dòng xe</b> trước khi đặt chỗ'); return; }
      Cart.add(p.id, 1, p.vehicles[0] || ''); toast(`Đã thêm <b>${esc(p.name)}</b> vào danh sách đặt chỗ`); return;
    }
    const v = e.target.closest('.vid');
    if (v) {
      if (v.dataset.video) openModal(`<video src="assets/video/${v.dataset.video}.mp4" controls autoplay playsinline></video>`, 'video-modal');
      else window.open(`https://www.tiktok.com/@ts.superlight/video/${v.dataset.tt}`, '_blank', 'noopener');
      return;
    }
  });
  $('#searchForm').onsubmit = e => { e.preventDefault(); const q = $('#searchInput').value.trim(); if (q) location.hash = '#/search/' + encodeURIComponent(q); };

  /* ---------------- Router ---------------- */
  function route() {
    closeModal(); clearInterval(cdTimer);
    const [path] = (location.hash.slice(1) || '/').split('?');
    const [, a, b] = path.split('/');
    ({
      '': pageHome, category: () => pageCategory(b || 'all'), vehicle: () => pageVehicle(b), vehicles: pageVehicles,
      search: () => pageSearch(b), product: () => pageProduct(b), cart: pageCart, checkout: pageCheckout,
      success: () => pageSuccess(b), flash: pageFlash, videos: pageVideos, policy: pagePolicy,
    }[a || ''] || pageNotFound)();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('db-changed', () => { renderChrome(); if (!/checkout/.test(location.hash)) route(); });

  Cart.load();
  renderChrome();
  route();
})();
