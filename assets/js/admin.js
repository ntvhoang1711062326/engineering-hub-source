/* ============ TS SUPERLIGHT — Admin app ============
   Đăng nhập demo: admin / superlight
   LƯU Ý: đăng nhập phía trình duyệt chỉ để demo giao diện.
   Khi đưa lên mạng thật cần backend có xác thực.
   =================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = $('#root');
  const D = () => DB.data;
  const MEDIA = window.TIKTOK_MEDIA || [];
  const DEMO_USER = 'admin', DEMO_PASS = 'superlight';

  const STATUS = {
    new: ['Mới', 'blue'], confirmed: ['Đã xác nhận', 'violet'], shipping: ['Đã hẹn lắp', 'amber'],
    done: ['Hoàn thành', 'green'], cancelled: ['Đã huỷ', 'red'],
  };
  const PAYN = { cod: 'COD / tại shop', bank: 'Chuyển khoản', momo: 'MoMo', vnpay: 'VNPay', zalopay: 'ZaloPay' };
  const THEMES = { amber: 'Vàng cam', cyan: 'Xanh neon', red: 'Đỏ' };

  function toast(html) {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  const save = msg => { if (DB.save()) toast(msg || 'Đã lưu <b>✓</b>'); };
  const pill = ([t, c]) => `<span class="pill ${c}">${t}</span>`;
  const dt = s => new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const num = v => Number(String(v).replace(/[^\d]/g, '')) || 0;
  const catName = id => DB.category(id)?.name || id;
  // Lịch hẹn của đơn đặt chỗ (đơn cũ trước khi bỏ giao hàng thì hiện hình thức nhận hàng)
  const apptText = o => o.appointment?.date
    ? `📅 ${o.appointment.time || ''} ${new Date(o.appointment.date + 'T00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    : o.delivery === 'ship' ? '🚚 Giao hàng (đơn cũ)' : '🔧 Lắp tại shop';
  const paidPill = o => o.paymentStatus === 'paid' ? pill([o.type === 'booking' ? 'Đã cọc' : 'Đã thanh toán', 'green']) : pill([o.type === 'booking' ? 'Chưa cọc' : 'Chưa thanh toán', 'gray']);

  /* ---------------- Modal (2 lớp: form + chọn ảnh) ---------------- */
  function modal(html, { id = 'modal', wide } = {}) {
    $('#' + id)?.remove();
    const m = document.createElement('div');
    m.className = 'modal'; m.id = id;
    m.innerHTML = `<div class="modal-box" style="${wide ? 'max-width:1000px' : ''}"><button class="modal-close" data-close aria-label="Đóng">✕</button>${html}</div>`;
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) m.remove(); });
    (document.querySelector('.adm') || document.body).appendChild(m);
    return m;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') ($('#modal2') || $('#modal'))?.remove(); });

  /* Thu nhỏ ảnh tải lên để vừa localStorage */
  function readImage(file, max = 800) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k;
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', .82));
        };
        im.onerror = rej; im.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  /* Chọn ảnh từ thư viện TikTok hoặc tải lên */
  function pickImage(cb, { multi = false } = {}) {
    const sel = new Set();
    const m = modal(`
      <div class="m-head">Thư viện ảnh TikTok @ts.superlight (${MEDIA.length})</div>
      <div class="m-body">
        <div class="bar-tools">
          <input id="libQ" placeholder="Lọc theo caption: vario, ab, audi, hậu…">
          <label class="btn btn-outline">⬆ Tải ảnh từ máy<input type="file" accept="image/*" id="libUp" hidden ${multi ? 'multiple' : ''}></label>
        </div>
        <div class="lib" id="libGrid"></div>
      </div>
      ${multi ? '<div class="m-foot"><button class="btn btn-outline" data-close>Huỷ</button><button class="btn btn-brand" id="libOk">Chọn ảnh</button></div>' : ''}`, { id: 'modal2', wide: true });
    const draw = q => {
      q = (q || '').toLowerCase();
      $('#libGrid', m).innerHTML = MEDIA.filter(x => !q || x.cap.toLowerCase().includes(q)).map(x => `
        <div class="it ${sel.has(x.id) ? 'on' : ''}" data-id="${x.id}">
          <img src="assets/img/${x.id}.jpg" loading="lazy" alt="">
          ${x.video ? '<span class="v">VIDEO</span>' : ''}
          <div class="cap">${esc(x.cap || '—')}</div>
        </div>`).join('');
    };
    draw();
    $('#libQ', m).oninput = e => draw(e.target.value);
    $('#libGrid', m).onclick = e => {
      const it = e.target.closest('.it'); if (!it) return;
      const id = it.dataset.id;
      if (!multi) { cb(`assets/img/${id}.jpg`, MEDIA.find(x => x.id === id)); m.remove(); return; }
      sel.has(id) ? sel.delete(id) : sel.add(id); it.classList.toggle('on');
    };
    if (multi) $('#libOk', m).onclick = () => { cb([...sel].map(id => `assets/img/${id}.jpg`)); m.remove(); };
    $('#libUp', m).onchange = async e => {
      const files = [...e.target.files];
      const urls = await Promise.all(files.map(f => readImage(f)));
      cb(multi ? urls : urls[0]); m.remove();
    };
  }

  /* ---------------- Login ---------------- */
  function isAuthed() { try { return sessionStorage.getItem('tsl_admin') === '1'; } catch (e) { return false; } }
  function renderLogin() {
    root.innerHTML = `
      <div class="login">
        <form class="login-box" id="loginForm">
          <div class="logo"><span class="logo-mark"></span><span class="logo-text"><b>TS <span style="color:var(--brand-2)">SUPERLIGHT</span></b><small style="color:var(--muted)">Trang quản trị</small></span></div>
          <div class="field"><label>Tài khoản</label><input id="lu" autocomplete="username" value="admin"></div>
          <div class="field"><label>Mật khẩu</label><input id="lp" type="password" autocomplete="current-password" placeholder="••••••••"></div>
          <div class="msg err" id="lmsg" style="margin-top:8px"></div>
          <button class="btn btn-brand btn-block btn-lg" style="margin-top:12px">Đăng nhập</button>
          <div class="note">Demo: <b>admin</b> / <b>superlight</b><br><a href="index.html" style="color:var(--brand-2)">← Về trang bán hàng</a></div>
        </form>
      </div>`;
    $('#loginForm').onsubmit = e => {
      e.preventDefault();
      if ($('#lu').value.trim() === DEMO_USER && $('#lp').value === DEMO_PASS) {
        try { sessionStorage.setItem('tsl_admin', '1'); } catch (err) {}
        renderShell(); route();
      } else $('#lmsg').textContent = 'Sai tài khoản hoặc mật khẩu';
    };
  }

  /* ---------------- Shell ---------------- */
  const MENU = [
    ['dashboard', '📊', 'Tổng quan'], ['products', '💡', 'Sản phẩm'], ['orders', '🧾', 'Đơn hàng'],
    ['banners', '🖼', 'Banner & Quảng cáo'], ['promos', '🏷', 'Khuyến mãi'], ['media', '🎬', 'Thư viện TikTok'], ['settings', '⚙', 'Cài đặt'],
  ];
  function renderShell() {
    root.innerHTML = `
      <div class="adm">
        <aside class="adm-side" id="side">
          <a href="#/dashboard" class="logo"><span class="logo-mark"></span><span class="logo-text"><b>TS <span>SUPERLIGHT</span></b><small class="role">Admin</small></span></a>
          <ul class="adm-menu" id="admMenu"></ul>
          <div class="foot">
            <a href="index.html" target="_blank">↗ Xem trang bán hàng</a>
            <a href="#" id="logout">⎋ Đăng xuất</a>
          </div>
        </aside>
        <div class="adm-main">
          <div class="adm-top"><button class="burger" id="burger">☰</button><h1 id="admTitle"></h1><div class="sp"></div><div id="admTopActions"></div></div>
          <div class="adm-body" id="view"></div>
        </div>
      </div>`;
    $('#burger').onclick = () => $('#side').classList.toggle('open');
    $('#side').onclick = e => { if (e.target.closest('a')) $('#side').classList.remove('open'); };
    $('#logout').onclick = e => { e.preventDefault(); try { sessionStorage.removeItem('tsl_admin'); } catch (err) {} renderLogin(); };
  }
  function drawMenu(cur) {
    const newOrders = D().orders.filter(o => o.status === 'new').length;
    $('#admMenu').innerHTML = MENU.map(([k, i, t]) => `<li><a href="#/${k}" class="${k === cur ? 'on' : ''}"><i>${i}</i>${t}${k === 'orders' && newOrders ? `<span class="cnt">${newOrders}</span>` : ''}</a></li>`).join('');
    $('#admTitle').textContent = MENU.find(m => m[0] === cur)?.[2] || '';
    $('#admTopActions').innerHTML = '';
  }

  /* ---------------- Dashboard ---------------- */
  function viewDashboard() {
    const orders = D().orders, valid = orders.filter(o => o.status !== 'cancelled');
    const revenue = valid.filter(o => o.status === 'done' || o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
    const pending = valid.filter(o => o.status !== 'done').reduce((s, o) => s + o.total, 0);
    const low = D().products.filter(p => p.active && p.stock <= 5);
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6 + i); return d; });
    const perDay = days.map(d => valid.filter(o => { const t = new Date(o.createdAt); return t >= d && t < new Date(+d + 864e5); }).reduce((s, o) => s + o.total, 0));
    const max = Math.max(1, ...perDay);
    const top = [...D().products].sort((a, b) => b.sold - a.sold).slice(0, 6);
    const short = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'tr' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : n;
    $('#view').innerHTML = `
      <div class="kpis">
        <div class="kpi"><small>Tiền cọc đã thu</small><b>${fmt(revenue)}</b><span>Đơn hoàn thành hoặc đã cọc</span></div>
        <div class="kpi"><small>Đang xử lý</small><b>${fmt(pending)}</b><span>${valid.filter(o => o.status !== 'done').length} đơn chưa hoàn thành</span></div>
        <div class="kpi"><small>Đặt chỗ mới</small><b>${orders.filter(o => o.status === 'new').length}</b><span>Tổng ${orders.length} đơn</span></div>
        <div class="kpi"><small>Sản phẩm</small><b>${D().products.filter(p => p.active).length}</b><span>${low.length ? `<b style="color:var(--sale)">${low.length}</b> sắp hết hàng` : 'Tồn kho ổn định'}</span></div>
      </div>
      <div class="two">
        <div class="card-a">
          <h3>Tiền cọc 7 ngày qua</h3>
          <div class="bars">${perDay.map((v, i) => `<div class="b" title="${fmt(v)}"><em>${v ? short(v) : ''}</em><i style="height:${Math.round(v / max * 120)}px"></i><small>${days[i].toLocaleDateString('vi-VN', { weekday: 'short' })}</small></div>`).join('')}</div>
          ${!orders.length ? '<p class="muted" style="text-align:center;margin:10px 0 0">Chưa có lượt đặt chỗ. Hãy thử đặt chỗ 1 lần ở trang khách.</p>' : ''}
        </div>
        <div class="card-a"><h3>Bán chạy nhất</h3><div class="top-list">
          ${top.map(p => `<div class="r"><img src="${esc(p.image)}" alt=""><div>${esc(p.name)}</div><b>${p.sold}</b></div>`).join('')}
        </div></div>
      </div>
      <div class="card-a" style="margin-top:14px">
        <h3>Đặt chỗ gần đây<span class="sp"></span><a href="#/orders" class="ib">Tất cả →</a></h3>
        ${ordersTable(orders.slice(0, 6))}
      </div>
      ${low.length ? `<div class="card-a"><h3>⚠ Sắp hết hàng</h3>${productsTable(low)}</div>` : ''}`;
    bindOrderRows(); bindProductRows();
  }

  /* ---------------- Products ---------------- */
  let pFilter = { q: '', cat: '', status: '' };
  function productsTable(list) {
    if (!list.length) return '<div class="empty">Không có sản phẩm</div>';
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th></th><th>Sản phẩm</th><th>Danh mục</th><th class="num">Giá bán</th><th class="num">Giá gốc</th><th class="num">Kho</th><th class="num">Đã bán</th><th>Hiển thị</th><th></th></tr></thead>
      <tbody>${list.map(p => {
        const fi = DB.flashItem(p.id);
        return `<tr>
        <td><img class="thumb" src="${esc(p.image)}" alt=""></td>
        <td class="nm">${esc(p.name)}<br><small class="muted">${esc(p.id.toUpperCase())} · ${esc(p.vehicles.join(', '))}</small>
          <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap">${p.featured ? pill(['Nổi bật', 'amber']) : ''}${p.isNew ? pill(['Mới', 'green']) : ''}${fi ? pill([`⚡ ${fmt(fi.salePrice)}`, 'red']) : ''}${p.video ? pill(['Video', 'gray']) : ''}</div></td>
        <td>${esc(catName(p.cat))}</td>
        <td class="num"><b>${fmt(p.price)}</b></td>
        <td class="num muted">${p.oldPrice ? fmt(p.oldPrice) : '—'}</td>
        <td class="num" style="${p.stock <= 5 ? 'color:var(--sale);font-weight:700' : ''}">${p.stock}</td>
        <td class="num">${p.sold}</td>
        <td><label class="switch"><input type="checkbox" data-toggle="${p.id}" ${p.active ? 'checked' : ''}><span></span></label></td>
        <td class="acts"><button class="ib" data-edit="${p.id}">Sửa</button> <button class="ib" data-dup="${p.id}" title="Nhân bản">⧉</button> <button class="ib danger" data-del="${p.id}" title="Xoá">🗑</button></td>
      </tr>`; }).join('')}</tbody></table></div>`;
  }
  function bindProductRows() {
    $$('[data-toggle]').forEach(c => c.onchange = () => { DB.product(c.dataset.toggle).active = c.checked; save(c.checked ? 'Đã <b>hiện</b> sản phẩm' : 'Đã <b>ẩn</b> sản phẩm'); });
    $$('[data-edit]').forEach(b => b.onclick = () => productForm(DB.product(b.dataset.edit)));
    $$('[data-dup]').forEach(b => b.onclick = () => {
      const src = DB.product(b.dataset.dup);
      const cp = JSON.parse(JSON.stringify(src)); cp.id = DB.uid('p'); cp.name += ' (bản sao)'; cp.sold = 0; cp.active = false;
      D().products.unshift(cp); save('Đã nhân bản — sản phẩm mới đang <b>ẩn</b>'); route();
    });
    $$('[data-del]').forEach(b => b.onclick = () => {
      const p = DB.product(b.dataset.del);
      if (!confirm(`Xoá sản phẩm "${p.name}"?`)) return;
      D().products = D().products.filter(x => x.id !== p.id);
      D().promos.flash.items = D().promos.flash.items.filter(i => i.productId !== p.id);
      save('Đã xoá sản phẩm'); route();
    });
  }
  function viewProducts() {
    $('#admTopActions').innerHTML = `<button class="btn btn-brand" id="addP">+ Thêm sản phẩm</button>`;
    $('#addP').onclick = () => productForm(null);
    const draw = () => {
      const q = pFilter.q.toLowerCase();
      const list = D().products.filter(p => (!q || p.name.toLowerCase().includes(q) || p.id.includes(q))
        && (!pFilter.cat || p.cat === pFilter.cat)
        && (!pFilter.status || (pFilter.status === 'on' ? p.active : pFilter.status === 'off' ? !p.active : p.stock <= 5)));
      $('#pTable').innerHTML = productsTable(list);
      $('#pCount').textContent = `${list.length} / ${D().products.length} sản phẩm`;
      bindProductRows();
    };
    $('#view').innerHTML = `
      <div class="card-a">
        <div class="bar-tools">
          <input id="pq" placeholder="Tìm tên hoặc mã sản phẩm…" value="${esc(pFilter.q)}">
          <select id="pc"><option value="">Tất cả danh mục</option>${D().categories.map(c => `<option value="${c.id}" ${pFilter.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
          <select id="ps"><option value="">Mọi trạng thái</option><option value="on">Đang hiện</option><option value="off">Đang ẩn</option><option value="low">Sắp hết hàng (≤5)</option></select>
          <span class="sp"></span><span class="muted" id="pCount"></span>
        </div>
        <div id="pTable"></div>
      </div>`;
    $('#ps').value = pFilter.status;
    $('#pq').oninput = e => { pFilter.q = e.target.value; draw(); };
    $('#pc').onchange = e => { pFilter.cat = e.target.value; draw(); };
    $('#ps').onchange = e => { pFilter.status = e.target.value; draw(); };
    draw();
  }

  function productForm(p, preset = {}) {
    const isNew = !p;
    const d = p ? JSON.parse(JSON.stringify(p)) : {
      id: DB.uid('p'), name: '', cat: D().categories[0].id, vehicles: [], price: 0, oldPrice: 0, image: '', gallery: [], video: '', tiktok: '',
      stock: 10, sold: 0, rating: 5, featured: false, isNew: true, warranty: '12 tháng', short: '', desc: '', specs: {}, active: true,
      ...preset,
    };
    const videos = MEDIA.filter(m => m.video);
    const m = modal(`
      <div class="m-head">${isNew ? 'Thêm sản phẩm mới' : 'Sửa: ' + esc(d.name)}</div>
      <form class="m-body" id="pForm">
        <div class="form-grid">
          <div class="field full"><label>Tên sản phẩm *</label><input name="name" required value="${esc(d.name)}" placeholder="VD: Bi cầu Kenzo S600 Pro V2"></div>
          <div class="field"><label>Danh mục</label><select name="cat">${D().categories.map(c => `<option value="${c.id}" ${d.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Bảo hành</label><input name="warranty" value="${esc(d.warranty)}"></div>
        </div>
        <div class="form-grid g3" style="margin-top:12px">
          <div class="field"><label>Giá bán (đ) *</label><input name="price" inputmode="numeric" value="${d.price ? d.price.toLocaleString('vi-VN') : ''}" required></div>
          <div class="field"><label>Giá gốc / giá gạch (đ)</label><input name="oldPrice" inputmode="numeric" value="${d.oldPrice ? d.oldPrice.toLocaleString('vi-VN') : ''}"><div class="hint">Để trống nếu không giảm giá</div></div>
          <div class="field"><label>Tồn kho</label><input name="stock" type="number" min="0" value="${d.stock}"></div>
        </div>
        <div class="field" style="margin-top:12px"><label>Dòng xe tương thích</label>
          <div class="checks">${D().vehicles.map(v => `<label><input type="checkbox" name="veh" value="${esc(v)}" ${d.vehicles.includes(v) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div>
        </div>
        <div class="field" style="margin-top:12px"><label>Ảnh đại diện *</label>
          <div class="img-pick">
            <img class="pv" id="pImg" src="${esc(d.image)}" alt="">
            <div class="btns">
              <button type="button" class="btn btn-outline" id="pickMain">🎬 Chọn từ TikTok / tải lên</button>
              <div class="hint">Ảnh vuông hoặc dọc, sẽ tự thu nhỏ khi tải lên.</div>
            </div>
          </div>
        </div>
        <div class="field" style="margin-top:12px"><label>Ảnh phụ (gallery)</label>
          <div class="gal" id="pGal"></div>
          <button type="button" class="ib" id="pickGal" style="margin-top:6px">+ Thêm ảnh</button>
        </div>
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><label>Video sản phẩm</label>
            <select name="video"><option value="">— Không có —</option>${videos.map(v => `<option value="assets/video/${v.id}.mp4" ${d.video === `assets/video/${v.id}.mp4` ? 'selected' : ''}>${esc(v.cap.slice(0, 60))}</option>`).join('')}${d.video && !videos.some(v => d.video.includes(v.id)) ? `<option selected value="${esc(d.video)}">${esc(d.video)}</option>` : ''}</select>
            <div class="hint">Thêm file .mp4 vào thư mục assets/video để có thêm lựa chọn</div>
          </div>
          <div class="field"><label>Link TikTok</label><input name="tiktok" value="${esc(d.tiktok)}" placeholder="https://www.tiktok.com/@ts.superlight/video/…"></div>
        </div>
        <div class="field" style="margin-top:12px"><label>Mô tả ngắn</label><input name="short" value="${esc(d.short)}"></div>
        <div class="field" style="margin-top:12px"><label>Mô tả chi tiết</label><textarea name="desc" rows="5">${esc(d.desc)}</textarea></div>
        <div class="field" style="margin-top:12px"><label>Thông số kỹ thuật</label><textarea name="specs" rows="4" placeholder="Công suất: 55W&#10;Nhiệt màu: 6000K">${esc(Object.entries(d.specs).map(([k, v]) => `${k}: ${v}`).join('\n'))}</textarea><div class="hint">Mỗi dòng một thông số, dạng "Tên: Giá trị"</div></div>
        <div class="checks" style="margin-top:12px">
          <label><input type="checkbox" name="featured" ${d.featured ? 'checked' : ''}> Sản phẩm nổi bật (trang chủ)</label>
          <label><input type="checkbox" name="isNew" ${d.isNew ? 'checked' : ''}> Nhãn “Mới”</label>
          <label><input type="checkbox" name="active" ${d.active ? 'checked' : ''}> Hiển thị trên web</label>
        </div>
      </form>
      <div class="m-foot"><button class="btn btn-outline" data-close>Huỷ</button><button class="btn btn-brand" id="pSave">${isNew ? 'Thêm sản phẩm' : 'Lưu thay đổi'}</button></div>`);

    const drawGal = () => {
      $('#pGal', m).innerHTML = d.gallery.map((g, i) => `<div class="g"><img src="${esc(g)}" alt=""><button type="button" data-rg="${i}">✕</button></div>`).join('') || '<span class="muted" style="font-size:12.5px">Chưa có ảnh phụ</span>';
      $$('[data-rg]', m).forEach(b => b.onclick = () => { d.gallery.splice(+b.dataset.rg, 1); drawGal(); });
    };
    drawGal();
    $('#pickMain', m).onclick = () => pickImage((url, meta) => {
      d.image = url; $('#pImg', m).src = url;
      if (meta) { const f = $('#pForm', m); if (!f.tiktok.value) f.tiktok.value = `https://www.tiktok.com/@ts.superlight/video/${meta.id}`; if (meta.video && !f.video.value) f.video.value = `assets/video/${meta.id}.mp4`; }
    });
    $('#pickGal', m).onclick = () => pickImage(urls => { d.gallery.push(...urls); drawGal(); }, { multi: true });
    $$('input[name=price], input[name=oldPrice]', m).forEach(i => i.onblur = () => { const v = num(i.value); i.value = v ? v.toLocaleString('vi-VN') : ''; });

    $('#pSave', m).onclick = () => {
      const f = $('#pForm', m);
      if (!f.name.value.trim()) { f.name.focus(); return toast('Nhập <b>tên sản phẩm</b>'); }
      if (!num(f.price.value)) { f.price.focus(); return toast('Nhập <b>giá bán</b>'); }
      if (!d.image) return toast('Chọn <b>ảnh đại diện</b>');
      Object.assign(d, {
        name: f.name.value.trim(), cat: f.cat.value, warranty: f.warranty.value.trim(),
        price: num(f.price.value), oldPrice: num(f.oldPrice.value), stock: Math.max(0, +f.stock.value || 0),
        vehicles: $$('input[name=veh]:checked', f).map(x => x.value),
        video: f.video.value, tiktok: f.tiktok.value.trim(), short: f.short.value.trim(), desc: f.desc.value.trim(),
        specs: Object.fromEntries(f.specs.value.split('\n').map(l => l.split(':')).filter(a => a.length > 1 && a[0].trim()).map(([k, ...v]) => [k.trim(), v.join(':').trim()])),
        featured: f.featured.checked, isNew: f.isNew.checked, active: f.active.checked,
      });
      if (!d.vehicles.length) d.vehicles = ['Tất cả dòng xe'];
      if (isNew) D().products.unshift(d);
      else D().products[D().products.findIndex(x => x.id === d.id)] = d;
      if (DB.save()) { m.remove(); toast(isNew ? 'Đã thêm sản phẩm <b>✓</b>' : 'Đã lưu <b>✓</b>'); route(); }
    };
  }

  /* ---------------- Orders ---------------- */
  let oFilter = { q: '', status: '' };
  function ordersTable(list) {
    if (!list.length) return '<div class="empty">Chưa có đơn hàng</div>';
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Khách hàng</th><th>Lịch hẹn</th><th>Tiền cọc</th><th class="num">Số tiền</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${list.map(o => `<tr>
        <td><b>${esc(o.id)}</b><br><small class="muted">${o.items.reduce((s, i) => s + i.qty, 0)} sản phẩm</small></td>
        <td>${dt(o.createdAt)}</td>
        <td>${esc(o.customer.name)}<br><small class="muted">${esc(o.customer.phone)}</small></td>
        <td>${esc(apptText(o))}</td>
        <td>${esc(PAYN[o.payment])}<br>${paidPill(o)}</td>
        <td class="num"><b>${fmt(o.total)}</b></td>
        <td>${pill(STATUS[o.status])}</td>
        <td class="acts"><button class="ib" data-order="${esc(o.id)}">Chi tiết</button></td>
      </tr>`).join('')}</tbody></table></div>`;
  }
  function bindOrderRows() { $$('[data-order]').forEach(b => b.onclick = () => orderDetail(b.dataset.order)); }
  function viewOrders() {
    $('#admTopActions').innerHTML = `<button class="btn btn-outline" id="exportCsv">⬇ Xuất Excel (CSV)</button>`;
    $('#exportCsv').onclick = exportCsv;
    const draw = () => {
      const q = oFilter.q.toLowerCase();
      const list = D().orders.filter(o => (!oFilter.status || o.status === oFilter.status) && (!q || o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q)));
      $('#oTable').innerHTML = ordersTable(list); bindOrderRows();
    };
    const counts = Object.fromEntries(Object.keys(STATUS).map(k => [k, D().orders.filter(o => o.status === k).length]));
    $('#view').innerHTML = `
      <div class="card-a">
        <div class="bar-tools">
          <input id="oq" placeholder="Tìm mã đơn, tên, số điện thoại…" value="${esc(oFilter.q)}">
          <div class="chips" id="oChips">
            <button class="chip ${!oFilter.status ? 'on' : ''}" data-st="">Tất cả (${D().orders.length})</button>
            ${Object.entries(STATUS).map(([k, [t]]) => `<button class="chip ${oFilter.status === k ? 'on' : ''}" data-st="${k}">${t} (${counts[k]})</button>`).join('')}
          </div>
        </div>
        <div id="oTable"></div>
      </div>`;
    $('#oq').oninput = e => { oFilter.q = e.target.value; draw(); };
    $$('#oChips [data-st]').forEach(b => b.onclick = () => { oFilter.status = b.dataset.st; $$('#oChips .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    draw();
  }
  function orderDetail(id) {
    const o = D().orders.find(x => x.id === id);
    const c = o.customer;
    const m = modal(`
      <div class="m-head">Đơn hàng ${esc(o.id)} · ${pill(STATUS[o.status])}</div>
      <div class="m-body">
        <div class="form-grid">
          <div class="card-a" style="box-shadow:none;border:1px solid var(--line)"><h3>Khách hàng</h3>
            <b>${esc(c.name)}</b><br>☎ <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a> · <a href="https://zalo.me/${esc(c.phone)}" target="_blank" style="color:#0068ff">Zalo</a>
            ${c.email ? `<br>✉ ${esc(c.email)}` : ''}
            <br>${o.delivery === 'ship' ? `🚚 ${esc([c.address, c.district, c.province].filter(Boolean).join(', '))}` : `🔧 Lắp đặt tại shop${o.appointment ? ` · ${esc(apptText(o))}` : ''}`}
            ${c.note ? `<br><br><i>Ghi chú: ${esc(c.note)}</i>` : ''}
          </div>
          <div class="card-a" style="box-shadow:none;border:1px solid var(--line)"><h3>${o.type === 'booking' ? 'Tiền cọc' : 'Thanh toán'}</h3>
            ${esc(PAYN[o.payment])} · ${paidPill(o)}<br>
            <small class="muted">Đặt lúc ${dt(o.createdAt)}${o.paidAt ? ` · Thanh toán ${dt(o.paidAt)}` : ''}</small>
            <div class="summary" style="margin-top:8px">
              ${o.type === 'booking' ? `
              <div class="row total"><span>Tiền cọc</span><span>${fmt(o.deposit)}</span></div>
              <small class="muted">Giá sản phẩm: báo giá khi liên hệ — trừ tiền cọc khi thanh toán tại shop.</small>` : `
              <div class="row"><span>Tạm tính</span><span>${fmt(o.subtotal)}</span></div>
              ${o.discount ? `<div class="row"><span>Giảm (${esc(o.coupon)})</span><span>−${fmt(o.discount)}</span></div>` : ''}
              <div class="row"><span>Vận chuyển</span><span>${o.ship ? fmt(o.ship) : 'Miễn phí'}</span></div>
              <div class="row total"><span>Tổng</span><span>${fmt(o.total)}</span></div>`}
            </div>
          </div>
        </div>
        <div class="mini-items" style="margin-top:14px">
          ${o.items.map(i => `<div class="it"><img src="${esc(i.image)}" alt=""><div>${esc(i.name)}<br><small class="muted">${i.price != null ? `${fmt(i.price)} × ` : 'SL: '}${i.qty}${i.vehicle ? ' · ' + esc(i.vehicle) : ''}</small></div>${i.price != null ? `<b>${fmt(i.price * i.qty)}</b>` : ''}</div>`).join('')}
        </div>
        <div class="form-grid" style="margin-top:14px">
          <div class="field"><label>Trạng thái đơn</label><select id="oStatus">${Object.entries(STATUS).map(([k, [t]]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Thanh toán</label><select id="oPay"><option value="unpaid">${o.type === 'booking' ? 'Chưa cọc' : 'Chưa thanh toán'}</option><option value="paid" ${o.paymentStatus === 'paid' ? 'selected' : ''}>${o.type === 'booking' ? 'Đã cọc' : 'Đã thanh toán'}</option></select></div>
        </div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" id="oDel" style="margin-right:auto;color:var(--sale)">Xoá đơn</button><button class="btn btn-outline" data-close>Đóng</button><button class="btn btn-brand" id="oSave">Cập nhật</button></div>`);
    $('#oSave', m).onclick = () => {
      const st = $('#oStatus', m).value;
      if (st === 'cancelled' && o.status !== 'cancelled') o.items.forEach(i => { const p = DB.product(i.pid); if (p) { p.stock += i.qty; p.sold = Math.max(0, p.sold - i.qty); } });
      o.status = st;
      const pay = $('#oPay', m).value;
      if (pay === 'paid' && o.paymentStatus !== 'paid') o.paidAt = new Date().toISOString();
      o.paymentStatus = pay;
      save('Đã cập nhật đơn <b>✓</b>'); m.remove(); route();
    };
    $('#oDel', m).onclick = () => { if (confirm('Xoá vĩnh viễn đơn này?')) { D().orders = D().orders.filter(x => x.id !== o.id); save('Đã xoá đơn'); m.remove(); route(); } };
  }
  function exportCsv() {
    const rows = [['Mã đơn', 'Thời gian', 'Khách hàng', 'SĐT', 'Lịch hẹn', 'Sản phẩm', 'Số tiền (cọc)', 'Thanh toán', 'TT thanh toán', 'Trạng thái']];
    D().orders.forEach(o => rows.push([o.id, dt(o.createdAt), o.customer.name, o.customer.phone, o.delivery === 'ship' ? [o.customer.address, o.customer.district, o.customer.province].join(', ') : apptText(o).replace(/^\S+\s/, ''),
      o.items.map(i => `${i.name} x${i.qty}`).join('; '), o.total, PAYN[o.payment], o.paymentStatus === 'paid' ? 'Đã TT' : 'Chưa TT', STATUS[o.status][0]]));
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `don-hang-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  /* ---------------- Banners & Ads ---------------- */
  function viewBanners() {
    const b = D().banners, a = D().sideAds, pp = D().promos.popup, tb = D().promos.topbar;
    const row = (x, i, kind) => `
      <div class="banner-row">
        <div class="bp"><img src="${esc(x.image)}" alt=""><b>${esc(x.title)}</b></div>
        <div><b>${esc(x.title)}</b><br><span class="muted">${esc(x.subtitle)}</span><br><small class="muted">→ ${esc(x.link)}${x.video ? ' · có video nền' : ''}</small></div>
        <div class="acts">
          <label class="switch" title="Bật/tắt"><input type="checkbox" data-bon="${kind}:${i}" ${x.active ? 'checked' : ''}><span></span></label>
          <button class="ib" data-bmove="${kind}:${i}:-1" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="ib" data-bmove="${kind}:${i}:1">↓</button>
          <button class="ib" data-bedit="${kind}:${i}">Sửa</button>
          <button class="ib danger" data-bdel="${kind}:${i}">🗑</button>
        </div>
      </div>`;
    $('#view').innerHTML = `
      <div class="card-a"><h3>Banner trình chiếu (slider trang chủ)<span class="sp"></span><button class="btn btn-brand" data-badd="banners">+ Thêm banner</button></h3>
        ${b.map((x, i) => row(x, i, 'banners')).join('') || '<div class="empty">Chưa có banner</div>'}</div>
      <div class="card-a"><h3>Quảng cáo bên phải slider<span class="sp"></span><button class="btn btn-outline" data-badd="sideAds">+ Thêm quảng cáo</button></h3>
        ${a.map((x, i) => row(x, i, 'sideAds')).join('') || '<div class="empty">Chưa có quảng cáo</div>'}</div>
      <div class="card-a"><h3>Popup quảng cáo khi vào web<span class="sp"></span><label class="switch"><input type="checkbox" id="ppOn" ${pp.active ? 'checked' : ''}><span></span></label></h3>
        <div class="img-pick">
          <img class="pv" id="ppImg" src="${esc(pp.image)}" alt="">
          <div style="flex:1;min-width:240px" class="form-grid">
            <div class="field"><label>Tiêu đề</label><input id="ppTitle" value="${esc(pp.title)}"></div>
            <div class="field"><label>Link khi bấm</label><input id="ppLink" value="${esc(pp.link)}"></div>
            <div class="field full"><label>Nội dung</label><input id="ppText" value="${esc(pp.text)}"></div>
            <div class="full" style="display:flex;gap:8px"><button class="btn btn-outline" id="ppPick">Đổi ảnh</button><button class="btn btn-brand" id="ppSave">Lưu popup</button></div>
          </div>
        </div>
      </div>
      <div class="card-a"><h3>Thanh thông báo đầu trang<span class="sp"></span><label class="switch"><input type="checkbox" id="tbOn" ${tb.active ? 'checked' : ''}><span></span></label></h3>
        <div style="display:flex;gap:8px"><div class="field" style="flex:1"><input id="tbText" value="${esc(tb.text)}"></div><button class="btn btn-brand" id="tbSave">Lưu</button></div>
      </div>`;

    const list = k => D()[k];
    $$('[data-bon]').forEach(c => c.onchange = () => { const [k, i] = c.dataset.bon.split(':'); list(k)[i].active = c.checked; save(); });
    $$('[data-bmove]').forEach(btn => btn.onclick = () => {
      const [k, i, d] = btn.dataset.bmove.split(':'); const L = list(k), j = +i + +d;
      if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; save('Đã đổi thứ tự'); viewBanners();
    });
    $$('[data-bdel]').forEach(btn => btn.onclick = () => { const [k, i] = btn.dataset.bdel.split(':'); if (confirm('Xoá mục này?')) { list(k).splice(i, 1); save('Đã xoá'); viewBanners(); } });
    $$('[data-bedit]').forEach(btn => btn.onclick = () => { const [k, i] = btn.dataset.bedit.split(':'); bannerForm(k, +i); });
    $$('[data-badd]').forEach(btn => btn.onclick = () => bannerForm(btn.dataset.badd, -1));
    $('#ppPick').onclick = () => pickImage(u => { pp.image = u; $('#ppImg').src = u; });
    $('#ppSave').onclick = () => { Object.assign(pp, { active: $('#ppOn').checked, title: $('#ppTitle').value, text: $('#ppText').value, link: $('#ppLink').value }); save('Đã lưu popup <b>✓</b>'); };
    $('#ppOn').onchange = () => { pp.active = $('#ppOn').checked; save(); };
    $('#tbSave').onclick = () => { tb.text = $('#tbText').value; tb.active = $('#tbOn').checked; save(); };
    $('#tbOn').onchange = () => { tb.active = $('#tbOn').checked; save(); };
  }
  function linkOptions(cur) {
    const opts = [['#/', 'Trang chủ'], ['#/flash', 'Trang khuyến mãi'], ['#/videos', 'Video TikTok'],
      ...D().categories.map(c => [`#/category/${c.id}`, `Danh mục: ${c.name}`]),
      ...D().products.map(p => [`#/product/${p.id}`, `SP: ${p.name}`])];
    return opts.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  }
  function bannerForm(kind, idx) {
    const isBanner = kind === 'banners';
    const x = idx >= 0 ? { ...D()[kind][idx] } : { id: DB.uid('b'), title: '', subtitle: '', image: '', video: '', cta: 'Xem ngay', link: '#/', active: true, theme: 'amber' };
    const videos = MEDIA.filter(v => v.video);
    const m = modal(`
      <div class="m-head">${idx >= 0 ? 'Sửa' : 'Thêm'} ${isBanner ? 'banner' : 'quảng cáo'}</div>
      <div class="m-body">
        <div class="img-pick" style="margin-bottom:12px"><img class="pv" id="bImg" src="${esc(x.image)}" alt="" style="width:180px"><button type="button" class="btn btn-outline" id="bPick">Chọn ảnh</button></div>
        <div class="form-grid">
          <div class="field"><label>Tiêu đề *</label><input id="bTitle" value="${esc(x.title)}"></div>
          <div class="field"><label>${isBanner ? 'Mô tả' : 'Dòng phụ (VD: Chỉ từ 1.150K)'}</label><input id="bSub" value="${esc(x.subtitle)}"></div>
          <div class="field ${isBanner ? '' : 'full'}"><label>Liên kết tới</label><select id="bLink">${linkOptions(x.link)}</select></div>
          ${isBanner ? `
          <div class="field"><label>Chữ trên nút</label><input id="bCta" value="${esc(x.cta)}"></div>
          <div class="field"><label>Video nền (tự phát)</label><select id="bVid"><option value="">— Dùng ảnh tĩnh —</option>${videos.map(v => `<option value="assets/video/${v.id}.mp4" ${x.video === `assets/video/${v.id}.mp4` ? 'selected' : ''}>${esc(v.cap.slice(0, 50))}</option>`).join('')}</select></div>
          <div class="field"><label>Tông màu</label><select id="bTheme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${x.theme === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>` : ''}
        </div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-close>Huỷ</button><button class="btn btn-brand" id="bSave">Lưu</button></div>`);
    $('#bPick', m).onclick = () => pickImage((u, meta) => { x.image = u; $('#bImg', m).src = u; if (meta?.video && $('#bVid', m) && !$('#bVid', m).value) $('#bVid', m).value = `assets/video/${meta.id}.mp4`; });
    $('#bSave', m).onclick = () => {
      if (!$('#bTitle', m).value.trim()) return toast('Nhập <b>tiêu đề</b>');
      if (!x.image) return toast('Chọn <b>ảnh</b>');
      Object.assign(x, { title: $('#bTitle', m).value.trim(), subtitle: $('#bSub', m).value.trim(), link: $('#bLink', m).value });
      if (isBanner) Object.assign(x, { cta: $('#bCta', m).value.trim(), video: $('#bVid', m).value, theme: $('#bTheme', m).value });
      if (idx >= 0) D()[kind][idx] = x; else D()[kind].push(x);
      if (DB.save()) { m.remove(); toast('Đã lưu <b>✓</b>'); viewBanners(); }
    };
  }

  /* ---------------- Promotions ---------------- */
  function viewPromos() {
    const f = D().promos.flash, cs = D().promos.coupons;
    const expired = new Date(f.endsAt) < new Date();
    const typeLabel = c => c.type === 'percent' ? `Giảm ${c.value}%${c.max ? ` (tối đa ${fmt(c.max)})` : ''}` : c.type === 'fixed' ? `Giảm ${fmt(c.value)}` : 'Miễn phí ship';
    $('#view').innerHTML = `
      <div class="card-a">
        <h3>⚡ Flash Sale ${f.active ? (expired ? pill(['Đã hết hạn', 'red']) : pill(['Đang chạy', 'green'])) : pill(['Tắt', 'gray'])}<span class="sp"></span><label class="switch"><input type="checkbox" id="fOn" ${f.active ? 'checked' : ''}><span></span></label></h3>
        <div class="form-grid">
          <div class="field"><label>Tên chương trình</label><input id="fTitle" value="${esc(f.title)}"></div>
          <div class="field"><label>Kết thúc lúc</label><input id="fEnd" type="datetime-local" value="${esc(f.endsAt)}"></div>
        </div>
        <div class="flash-items" id="fItems" style="margin-top:12px"></div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <select id="fAddSel" style="flex:1;min-width:200px;border:1.5px solid var(--line);border-radius:8px;padding:9px"><option value="">+ Chọn sản phẩm đưa vào Flash Sale…</option>${D().products.filter(p => !f.items.some(i => i.productId === p.id)).map(p => `<option value="${p.id}">${esc(p.name)} — ${fmt(p.price)}</option>`).join('')}</select>
          <button class="btn btn-brand" id="fSave">Lưu Flash Sale</button>
        </div>
      </div>
      <div class="card-a">
        <h3>🏷 Mã giảm giá<span class="sp"></span><button class="btn btn-brand" id="cAdd">+ Tạo mã</button></h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Mã</th><th>Ưu đãi</th><th class="num">Đơn tối thiểu</th><th>Hết hạn</th><th>Mô tả</th><th>Bật</th><th></th></tr></thead>
          <tbody>${cs.map((c, i) => {
            const exp = c.expires && new Date(c.expires + 'T23:59:59') < new Date();
            return `<tr>
            <td><b style="font-family:monospace;font-size:14px">${esc(c.code)}</b></td>
            <td>${typeLabel(c)}</td>
            <td class="num">${c.min ? fmt(c.min) : '—'}</td>
            <td>${c.expires ? new Date(c.expires).toLocaleDateString('vi-VN') : 'Không giới hạn'} ${exp ? pill(['Hết hạn', 'red']) : ''}</td>
            <td class="muted">${esc(c.desc)}</td>
            <td><label class="switch"><input type="checkbox" data-con="${i}" ${c.active ? 'checked' : ''}><span></span></label></td>
            <td class="acts"><button class="ib" data-cedit="${i}">Sửa</button> <button class="ib danger" data-cdel="${i}">🗑</button></td>
          </tr>`; }).join('') || '<tr><td colspan="7" class="empty">Chưa có mã</td></tr>'}</tbody>
        </table></div>
      </div>`;

    const drawItems = () => {
      $('#fItems').innerHTML = f.items.length ? `<div class="fi muted" style="font-size:12px;font-weight:600"><span></span><span>SẢN PHẨM</span><span>GIÁ GỐC</span><span>GIÁ FLASH SALE</span><span></span></div>` + f.items.map((it, i) => {
        const p = DB.product(it.productId); if (!p) return '';
        return `<div class="fi"><img src="${esc(p.image)}" alt=""><b>${esc(p.name)}${it.salePrice >= p.price ? `<br>${pill(['Giá flash ≥ giá bán — không áp dụng', 'red'])}` : ''}</b><span class="muted">${fmt(p.price)}</span>
          <input data-fprice="${i}" inputmode="numeric" value="${it.salePrice.toLocaleString('vi-VN')}">
          <button class="ib danger" data-frm="${i}">✕</button></div>`;
      }).join('') : '<div class="empty" style="padding:20px">Chưa có sản phẩm trong Flash Sale</div>';
      $$('[data-fprice]').forEach(inp => inp.onchange = () => { f.items[+inp.dataset.fprice].salePrice = num(inp.value); inp.value = num(inp.value).toLocaleString('vi-VN'); });
      $$('[data-frm]').forEach(b => b.onclick = () => { f.items.splice(+b.dataset.frm, 1); save('Đã bỏ khỏi Flash Sale'); viewPromos(); });
    };
    drawItems();
    $('#fAddSel').onchange = e => {
      const p = DB.product(e.target.value); if (!p) return;
      f.items.push({ productId: p.id, salePrice: Math.round(p.price * 0.9 / 10000) * 10000 });
      save(`Đã thêm <b>${esc(p.name)}</b> (giá gợi ý -10%)`); viewPromos();
    };
    $('#fOn').onchange = e => { f.active = e.target.checked; save(); viewPromos(); };
    $('#fSave').onclick = () => {
      const bad = f.items.find(i => { const p = DB.product(i.productId); return !i.salePrice || i.salePrice >= p.price; });
      if (bad) return toast(`Giá flash của <b>${esc(DB.product(bad.productId).name)}</b> phải thấp hơn giá bán`);
      f.title = $('#fTitle').value.trim() || 'Flash Sale'; f.endsAt = $('#fEnd').value; save('Đã lưu Flash Sale <b>✓</b>'); viewPromos();
    };
    $$('[data-con]').forEach(c => c.onchange = () => { cs[+c.dataset.con].active = c.checked; save(); });
    $$('[data-cdel]').forEach(b => b.onclick = () => { if (confirm('Xoá mã này?')) { cs.splice(+b.dataset.cdel, 1); save('Đã xoá mã'); viewPromos(); } });
    $$('[data-cedit]').forEach(b => b.onclick = () => couponForm(+b.dataset.cedit));
    $('#cAdd').onclick = () => couponForm(-1);
  }
  function couponForm(idx) {
    const cs = D().promos.coupons;
    const c = idx >= 0 ? { ...cs[idx] } : { code: '', type: 'percent', value: 10, min: 0, max: 0, expires: '', active: true, desc: '' };
    const m = modal(`
      <div class="m-head">${idx >= 0 ? 'Sửa mã ' + esc(c.code) : 'Tạo mã giảm giá'}</div>
      <div class="m-body form-grid">
        <div class="field"><label>Mã *</label><input id="cCode" value="${esc(c.code)}" style="text-transform:uppercase;font-family:monospace" placeholder="VD: TET2027"></div>
        <div class="field"><label>Loại ưu đãi</label><select id="cType"><option value="percent">Giảm theo %</option><option value="fixed">Giảm số tiền cố định</option><option value="ship">Miễn phí vận chuyển</option></select></div>
        <div class="field" id="cValW"><label id="cValL">Giá trị</label><input id="cVal" inputmode="numeric" value="${c.value}"></div>
        <div class="field" id="cMaxW"><label>Giảm tối đa (đ)</label><input id="cMax" inputmode="numeric" value="${c.max || ''}" placeholder="Không giới hạn"></div>
        <div class="field"><label>Đơn tối thiểu (đ)</label><input id="cMin" inputmode="numeric" value="${c.min || ''}" placeholder="0"></div>
        <div class="field"><label>Hết hạn</label><input id="cExp" type="date" value="${esc(c.expires)}"></div>
        <div class="field full"><label>Mô tả hiển thị cho khách</label><input id="cDesc" value="${esc(c.desc)}" placeholder="Tự tạo nếu để trống"></div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-close>Huỷ</button><button class="btn btn-brand" id="cSave">Lưu mã</button></div>`);
    const t = $('#cType', m); t.value = c.type;
    const sync = () => { $('#cValW', m).classList.toggle('hidden', t.value === 'ship'); $('#cMaxW', m).classList.toggle('hidden', t.value !== 'percent'); $('#cValL', m).textContent = t.value === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (đ)'; };
    t.onchange = sync; sync();
    $('#cSave', m).onclick = () => {
      const code = $('#cCode', m).value.trim().toUpperCase().replace(/\s/g, '');
      if (!code) return toast('Nhập <b>mã</b>');
      if (cs.some((x, i) => x.code === code && i !== idx)) return toast('Mã này <b>đã tồn tại</b>');
      const type = t.value, value = num($('#cVal', m).value);
      if (type === 'percent' && (value < 1 || value > 100)) return toast('Phần trăm phải từ <b>1 – 100</b>');
      if (type === 'fixed' && !value) return toast('Nhập <b>số tiền giảm</b>');
      Object.assign(c, { code, type, value: type === 'ship' ? 0 : value, max: type === 'percent' ? num($('#cMax', m).value) : 0, min: num($('#cMin', m).value), expires: $('#cExp', m).value });
      c.desc = $('#cDesc', m).value.trim() || (type === 'percent' ? `Giảm ${value}%` : type === 'fixed' ? `Giảm ${fmt(value)}` : 'Miễn phí vận chuyển') + (c.min ? ` cho đơn từ ${fmt(c.min)}` : '');
      if (idx >= 0) cs[idx] = c; else cs.unshift(c);
      if (DB.save()) { m.remove(); toast('Đã lưu mã <b>' + esc(code) + '</b>'); viewPromos(); }
    };
  }

  /* ---------------- Media library ---------------- */
  function viewMedia() {
    const used = new Set(D().products.flatMap(p => [p.image, ...p.gallery]).map(u => (u.match(/(\d{15,})/) || [])[1]).filter(Boolean));
    $('#view').innerHTML = `
      <div class="card-a">
        <h3>Ảnh & video từ TikTok @ts.superlight<span class="sp"></span><a class="ib" href="${esc(D().settings.tiktok)}" target="_blank">Mở TikTok ↗</a></h3>
        <p class="muted" style="margin-top:-6px">${MEDIA.length} ảnh bìa video · ${MEDIA.filter(m => m.video).length} video đã tải về · <span class="pill green">Đang dùng</span> = ảnh đã gắn vào sản phẩm. Bấm vào ảnh để tạo nhanh sản phẩm.</p>
        <div class="bar-tools"><input id="mq" placeholder="Lọc theo caption…"><select id="mf"><option value="">Tất cả</option><option value="unused">Chưa dùng</option><option value="video">Có video</option></select></div>
        <div class="lib" id="mGrid"></div>
      </div>`;
    const draw = () => {
      const q = $('#mq').value.toLowerCase(), fl = $('#mf').value;
      $('#mGrid').innerHTML = MEDIA.filter(x => (!q || x.cap.toLowerCase().includes(q)) && (fl !== 'unused' || !used.has(x.id)) && (fl !== 'video' || x.video)).map(x => `
        <div class="it" data-mid="${x.id}" title="${esc(x.cap)}">
          <img src="assets/img/${x.id}.jpg" loading="lazy" alt="">
          ${used.has(x.id) ? '<span class="used">Đang dùng</span>' : ''}${x.video ? '<span class="v">VIDEO</span>' : ''}
          <div class="cap">👁 ${x.views.toLocaleString('vi-VN')} · ${esc(x.cap || '—')}</div>
        </div>`).join('');
    };
    $('#mq').oninput = draw; $('#mf').onchange = draw; draw();
    $('#mGrid').onclick = e => {
      const it = e.target.closest('[data-mid]'); if (!it) return;
      const x = MEDIA.find(m => m.id === it.dataset.mid);
      const m = modal(`
        <div class="m-head">Ảnh TikTok</div>
        <div class="m-body" style="display:flex;gap:16px;flex-wrap:wrap">
          ${x.video ? `<video src="assets/video/${x.id}.mp4" poster="assets/img/${x.id}.jpg" controls style="width:240px;border-radius:10px;background:#000"></video>` : `<img src="assets/img/${x.id}.jpg" style="width:240px;border-radius:10px">`}
          <div style="flex:1;min-width:220px">
            <p><b>${esc(x.cap || '—')}</b></p>
            <p class="muted">👁 ${x.views.toLocaleString('vi-VN')} lượt xem · ❤ ${x.likes.toLocaleString('vi-VN')}</p>
            <div class="field"><label>Đường dẫn ảnh</label><input readonly value="assets/img/${x.id}.jpg" onclick="this.select()"></div>
            <div style="display:grid;gap:8px;margin-top:12px">
              <button class="btn btn-brand" id="mkP">+ Tạo sản phẩm từ ảnh này</button>
              <a class="btn btn-outline" target="_blank" href="https://www.tiktok.com/@ts.superlight/video/${x.id}">Xem trên TikTok ↗</a>
            </div>
          </div>
        </div>`);
      $('#mkP', m).onclick = () => {
        m.remove();
        productForm(null, {
          name: x.cap.replace(/[^\p{L}\p{N}\s+\-.,/]/gu, '').trim(),
          image: `assets/img/${x.id}.jpg`,
          tiktok: `https://www.tiktok.com/@ts.superlight/video/${x.id}`,
          video: x.video ? `assets/video/${x.id}.mp4` : '',
        });
      };
    };
  }

  /* ---------------- Settings ---------------- */
  function viewSettings() {
    const s = D().settings;
    const F = (k, l, extra = '') => `<div class="field ${extra}"><label>${l}</label><input data-s="${k}" value="${esc(s[k])}"></div>`;
    $('#view').innerHTML = `
      <div class="card-a"><h3>Thông tin cửa hàng</h3>
        <div class="form-grid">
          ${F('shopName', 'Tên shop')}${F('slogan', 'Slogan')}${F('hotline', 'Hotline')}${F('zalo', 'Số Zalo')}
          ${F('address', 'Địa chỉ', 'full')}${F('hours', 'Giờ mở cửa')}${F('tiktok', 'Link TikTok')}
        </div>
      </div>
      <div class="card-a"><h3>Đặt chỗ &amp; tiền cọc</h3>
        <p class="muted" style="margin-top:-6px">Trang khách hiển thị giá "Liên hệ" và không giao hàng. Khách đặt chỗ, hẹn lịch lắp và cọc số tiền này cho mỗi lượt đặt.</p>
        <div class="form-grid">
          <div class="field"><label>Tiền cọc mỗi lượt đặt chỗ (đ)</label><input data-sn="deposit" inputmode="numeric" value="${(Number(s.deposit) || 0).toLocaleString('vi-VN')}"></div>
        </div>
      </div>
      <div class="card-a"><h3>Tài khoản nhận chuyển khoản (VietQR)</h3>
        <p class="muted" style="margin-top:-6px">Điền để trang đặt chỗ tự tạo mã QR đúng số tiền cọc. Mã ngân hàng theo chuẩn VietQR: MB, VCB, TCB, ACB, BIDV, VPB, TPB…</p>
        <div class="form-grid g3">${F('bankName', 'Mã ngân hàng')}${F('bankAccount', 'Số tài khoản')}${F('bankOwner', 'Tên chủ tài khoản')}</div>
      </div>
      <div style="display:flex;gap:10px;margin:14px 0"><button class="btn btn-brand btn-lg" id="sSave">Lưu cài đặt</button></div>
      <div class="card-a"><h3>Sao lưu dữ liệu</h3>
        <p class="muted" style="margin-top:-6px">Dữ liệu đang lưu trong trình duyệt này. Xuất file để sao lưu hoặc chuyển sang máy khác.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-outline" id="bkExport">⬇ Xuất dữ liệu (.json)</button>
          <label class="btn btn-outline">⬆ Nhập dữ liệu<input type="file" accept=".json" id="bkImport" hidden></label>
          <button class="btn btn-outline" id="bkReset" style="color:var(--sale)">↺ Khôi phục dữ liệu mẫu</button>
        </div>
      </div>`;
    $('#sSave').onclick = () => {
      $$('[data-s]').forEach(i => s[i.dataset.s] = i.value.trim());
      $$('[data-sn]').forEach(i => s[i.dataset.sn] = num(i.value));
      s.bankName = s.bankName.toUpperCase();
      save('Đã lưu cài đặt <b>✓</b>');
    };
    $('#bkExport').onclick = () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' }));
      a.download = `tsl-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    };
    $('#bkImport').onchange = async e => {
      try { const data = JSON.parse(await e.target.files[0].text()); if (!data.products) throw 0; DB.data = data; save('Đã nhập dữ liệu <b>✓</b>'); route(); }
      catch (err) { toast('File không hợp lệ'); }
    };
    $('#bkReset').onclick = () => { if (confirm('Xoá toàn bộ thay đổi và đơn hàng, khôi phục dữ liệu mẫu?')) { DB.reset(); toast('Đã khôi phục dữ liệu mẫu'); route(); } };
  }

  /* ---------------- Router ---------------- */
  const VIEWS = { dashboard: viewDashboard, products: viewProducts, orders: viewOrders, banners: viewBanners, promos: viewPromos, media: viewMedia, settings: viewSettings };
  function route() {
    if (!isAuthed()) return renderLogin();
    if (!$('.adm')) renderShell();
    $$('.modal').forEach(m => m.remove());
    const k = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'dashboard';
    drawMenu(VIEWS[k] ? k : 'dashboard');
    (VIEWS[k] || viewDashboard)();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('db-changed', () => { if (isAuthed() && !$('.modal')) route(); });
  route();
})();
