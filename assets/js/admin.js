/* ============ TS SUPERLIGHT — Admin app ============
   Đăng nhập bằng GitHub token có quyền ghi repo (GitHub kiểm tra) — không có mật khẩu viết trong code.
   =================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = $('#root');
  const D = () => DB.data;
  const MEDIA = () => DB.media();

  const THEMES = { amber: 'Vàng cam', cyan: 'Xanh neon', red: 'Đỏ' };

  function toast(html) {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  const save = msg => { if (DB.save()) toast(msg || 'Đã lưu <b>✓</b>'); };
  // Mỗi lần lưu nháp → cập nhật trạng thái "Có thay đổi chưa xuất bản"
  const dbSave = DB.save.bind(DB);
  DB.save = () => { const ok = dbSave(); drawPublish(); return ok; };
  const pill = ([t, c]) => `<span class="pill ${c}">${t}</span>`;

  /* ---------------- Xuất bản lên web: ghi assets/data/catalog.json (+ ảnh tải lên) vào GitHub ----------------
     GitHub Pages tự đưa bản mới lên web sau ~1 phút. Token chỉ lưu trên máy admin. */
  const GH_CFG = 'tsl_github', PUBLISHED = 'tsl_published';
  const GH = {
    cfg() {
      let c = {}; try { c = JSON.parse(localStorage.getItem(GH_CFG)) || {}; } catch (e) {}
      return { owner: c.owner || 'ntvhoang1711062326', repo: c.repo || 'engineering-hub-source', branch: c.branch || 'main', token: c.token || '' };
    },
    setCfg(c) { try { localStorage.setItem(GH_CFG, JSON.stringify(c)); } catch (e) {} },
    ready() { return !!this.cfg().token; },
    siteUrl() { const { owner, repo } = this.cfg(); return `https://${owner}.github.io/${repo}/`; },
    async api(path, { method = 'GET', body, raw } = {}) {
      const { owner, repo, token } = this.cfg();
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
        method, body: body && JSON.stringify(body), cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).message || res.statusText;
        throw new Error(res.status === 401 ? 'Token sai hoặc đã hết hạn' : res.status === 404 ? 'Không tìm thấy repo/nhánh — hoặc token chưa được cấp quyền repo này' : res.status === 403 ? `Token chưa có quyền ghi — sửa token: Contents = Read and write (GitHub: ${msg})` : `${res.status} ${msg}`);
      }
      return raw ? res.text() : res.json();
    },
    // Kiểm tra token GHI được thật: tạo 1 blob rỗng (không gắn vào commit nào, GitHub tự dọn).
    // Không dùng permissions.push của repo — đó là quyền của tài khoản, không phải của token.
    async checkWrite() {
      await this.api('');
      await this.api(`/git/ref/heads/${this.cfg().branch}`);
      await this.api('/git/blobs', { method: 'POST', body: { content: '', encoding: 'utf-8' } });
    },
    // Ghi nhiều file trong 1 commit (Git Data API)
    async commit(files, message) {
      const { branch } = this.cfg();
      const ref = await this.api(`/git/ref/heads/${branch}`);
      const base = await this.api(`/git/commits/${ref.object.sha}`);
      const tree = [];
      for (const [path, content] of files) {
        const blob = await this.api('/git/blobs', { method: 'POST', body: { content, encoding: 'base64' } });
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const t = await this.api('/git/trees', { method: 'POST', body: { base_tree: base.tree.sha, tree } });
      if (t.sha === base.tree.sha) return null; // không có gì thay đổi
      const c = await this.api('/git/commits', { method: 'POST', body: { message, tree: t.sha, parents: [ref.object.sha] } });
      await this.api(`/git/refs/heads/${branch}`, { method: 'PATCH', body: { sha: c.sha } });
      return c.sha;
    },
    async fetchCatalog() {
      return JSON.parse(await this.api(`/contents/assets/data/catalog.json?ref=${encodeURIComponent(this.cfg().branch)}`, { raw: true }));
    },
  };
  const b64utf8 = s => { const b = new TextEncoder().encode(s); let r = ''; for (let i = 0; i < b.length; i += 0x8000) r += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(r); };
  const hashStr = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0') + s.length.toString(36); };
  const isDirty = () => { try { return localStorage.getItem(PUBLISHED) !== JSON.stringify(DB.catalog()); } catch (e) { return true; } };
  const markPublished = () => { try { localStorage.setItem(PUBLISHED, JSON.stringify(DB.catalog())); } catch (e) {} };

  // Ảnh tải lên trong Admin đang ở dạng data:… → tách thành file assets/img/uploads/*.jpg khi xuất bản
  function catalogForWeb() {
    const cat = JSON.parse(JSON.stringify(DB.catalog())), files = new Map();
    const conv = url => {
      const m = /^data:image\/(\w+);base64,(.+)$/.exec(url || '');
      if (!m) return url;
      const path = `assets/img/uploads/${hashStr(m[2])}.${m[1] === 'png' ? 'png' : 'jpg'}`;
      files.set(path, m[2]);
      return path;
    };
    cat.products.forEach(p => {
      p.image = conv(p.image); p.gallery = (p.gallery || []).map(conv);
      Object.keys(p.vehicleImages || {}).forEach(v => { p.vehicleImages[v] = conv(p.vehicleImages[v]); });
    });
    [...(cat.banners || []), ...(cat.sideAds || []), cat.promos.popup].forEach(x => { if (x) x.image = conv(x.image); });
    // Ảnh bìa video mới đồng bộ từ TikTok → assets/img/<id>.jpg (cùng chỗ với ảnh bìa có sẵn)
    (cat.tiktok || []).forEach(x => {
      const m = /^data:image\/\w+;base64,(.+)$/.exec(x.cover || '');
      if (m) files.set(`assets/img/${x.id}.jpg`, m[1]);
      delete x.cover;
    });
    Object.entries(cat.tiktokChannels || {}).forEach(([user, c]) => {
      const m = /^data:image\/\w+;base64,(.+)$/.exec(c.avatar || '');
      if (m) { files.set(`assets/img/avatar-${user}.jpg`, m[1]); c.avatar = `assets/img/avatar-${user}.jpg`; }
    });
    files.set('assets/data/catalog.json', b64utf8(JSON.stringify({ ...cat, publishedAt: new Date().toISOString() }, null, 1)));
    return files;
  }

  async function publish() {
    if (!GH.ready()) { location.hash = '#/settings'; return toast('Nhập <b>GitHub token</b> ở Cài đặt → Xuất bản lên web trước'); }
    const btn = $('#pubBtn'); if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang xuất bản…'; }
    try {
      const sha = await GH.commit(catalogForWeb(), `Cập nhật dữ liệu web từ Admin (${new Date().toLocaleString('vi-VN')})`);
      // Ảnh bìa đã thành file trên web → bỏ bản data:… khỏi nháp cho nhẹ bộ nhớ trình duyệt
      (D().tiktok || []).forEach(x => { delete x.cover; });
      Object.entries(D().tiktokChannels || {}).forEach(([user, c]) => { if (/^data:/.test(c.avatar || '')) c.avatar = `assets/img/avatar-${user}.jpg`; });
      DB.save();
      markPublished();
      toast(sha ? `Đã xuất bản <b>✓</b> — web khách cập nhật sau khoảng 1 phút` : 'Web đã là bản mới nhất <b>✓</b>');
    } catch (e) { toast('Xuất bản lỗi: ' + esc(e.message)); }
    drawPublish();
  }
  async function pullLive() {
    if (!GH.ready()) { location.hash = '#/settings'; return toast('Nhập <b>GitHub token</b> ở Cài đặt trước'); }
    if (isDirty() && !confirm('Bản nháp đang có thay đổi CHƯA xuất bản. Lấy bản trên web về sẽ ghi đè các thay đổi đó. Tiếp tục?')) return;
    try {
      const cat = await GH.fetchCatalog();
      if (!cat.products) throw new Error('File catalog.json trên web không hợp lệ');
      DB.data = { ...DB.data, ...cat };
      delete DB.data.publishedAt;
      DB.save(); markPublished(); toast('Đã lấy bản đang chạy trên web về <b>✓</b>'); route();
    } catch (e) { toast('Không lấy được: ' + esc(e.message)); }
  }
  // Nút + trạng thái ở thanh bên: "Có thay đổi chưa xuất bản"
  function drawPublish() {
    const box = $('#pubBox'); if (!box) return;
    const dirty = isDirty();
    box.innerHTML = `
      <button class="btn ${dirty ? 'btn-brand' : 'btn-outline'} btn-block" id="pubBtn">🚀 Xuất bản lên web</button>
      <small class="${dirty ? 'dirty' : ''}">${!GH.ready() ? 'Chưa kết nối GitHub' : dirty ? '● Có thay đổi chưa xuất bản' : '✓ Web đang là bản mới nhất'}</small>`;
    $('#pubBtn').onclick = publish;
  }

  const dt = s => new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const num = v => Number(String(v).replace(/[^\d]/g, '')) || 0;
  const catName = id => DB.category(id)?.name || id;

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
      fr.onload = () => shrinkImage(fr.result, max).then(res, rej);
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function shrinkImage(src, max = 800) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k;
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', .82));
      };
      im.onerror = rej; im.src = src;
    });
  }

  /* Chọn ảnh từ thư viện TikTok hoặc tải lên */
  function pickImage(cb, { multi = false } = {}) {
    const sel = new Set();
    const m = modal(`
      <div class="m-head">Thư viện ảnh TikTok @ts.superlight (${MEDIA().length})</div>
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
      $('#libGrid', m).innerHTML = MEDIA().filter(x => !q || x.cap.toLowerCase().includes(q)).map(x => `
        <div class="it ${sel.has(x.id) ? 'on' : ''}" data-id="${x.id}">
          <img src="${esc(DB.cover(x))}" loading="lazy" alt="">
          ${x.video ? '<span class="v">VIDEO</span>' : ''}
          <div class="cap">${esc(x.cap || '—')}</div>
        </div>`).join('');
    };
    draw();
    $('#libQ', m).oninput = e => draw(e.target.value);
    $('#libGrid', m).onclick = e => {
      const it = e.target.closest('.it'); if (!it) return;
      const id = it.dataset.id;
      if (!multi) { cb(`assets/img/${id}.jpg`, MEDIA().find(x => x.id === id)); m.remove(); return; }
      sel.has(id) ? sel.delete(id) : sel.add(id); it.classList.toggle('on');
    };
    if (multi) $('#libOk', m).onclick = () => { cb([...sel].map(id => `assets/img/${id}.jpg`)); m.remove(); };
    $('#libUp', m).onchange = async e => {
      const files = [...e.target.files];
      const urls = await Promise.all(files.map(f => readImage(f)));
      cb(multi ? urls : urls[0]); m.remove();
    };
  }

  /* ---------------- Login ----------------
     Không có mật khẩu viết sẵn trong code: vào Admin bằng chính GitHub token có quyền ghi repo
     (token dùng để Xuất bản / Đồng bộ TikTok). GitHub kiểm tra token → chỉ chủ repo vào được. */
  function isAuthed() { return GH.ready(); }
  function renderLogin() {
    const c = GH.cfg();
    root.innerHTML = `
      <div class="login">
        <form class="login-box" id="loginForm">
          <div class="logo"><img class="logo-img" src="assets/img/logo2.webp" alt="TS SUPERLIGHT"><span class="logo-text"><small style="color:var(--muted)">Trang quản trị</small></span></div>
          <div class="field"><label>GitHub token (quyền Contents: Read and write)</label><input id="lt" type="password" autocomplete="off" placeholder="github_pat_…"></div>
          <div class="field"><label>Repo</label><input id="lr" value="${esc(c.owner + '/' + c.repo)}"></div>
          <div class="msg err" id="lmsg" style="margin-top:8px"></div>
          <button class="btn btn-brand btn-block btn-lg" style="margin-top:12px">Đăng nhập</button>
          <div class="note">Token chỉ lưu trong trình duyệt trên máy này. Cách tạo token: file <b>HUONG-DAN-DUA-LEN-WEB.md</b> mục 4.<br><a href="index.html" style="color:var(--brand-2)">← Về trang bán hàng</a></div>
        </form>
      </div>`;
    $('#loginForm').onsubmit = async e => {
      e.preventDefault();
      const [owner, repo] = $('#lr').value.trim().split('/'), token = $('#lt').value.trim(), msg = $('#lmsg'), btn = e.target.querySelector('button');
      if (!token || !owner || !repo) { msg.textContent = 'Nhập GitHub token và repo dạng tài-khoản/tên-repo'; return; }
      btn.disabled = true; msg.className = 'msg'; msg.textContent = 'Đang kiểm tra với GitHub…';
      GH.setCfg({ ...GH.cfg(), owner, repo, token });
      try {
        await GH.checkWrite();
        renderShell(); route();
      } catch (err) {
        GH.setCfg({ ...GH.cfg(), token: '' });
        msg.className = 'msg err'; msg.textContent = '✕ ' + err.message; btn.disabled = false;
      }
    };
  }

  /* ---------------- Shell ---------------- */
  const MENU = [
    ['dashboard', '📊', 'Tổng quan'], ['products', '💡', 'Sản phẩm'], ['categories', '📂', 'Danh mục'],
    ['banners', '🖼', 'Banner & Quảng cáo'], ['promos', '🏷', 'Khuyến mãi'], ['media', '🎬', 'Thư viện TikTok'], ['settings', '⚙', 'Cài đặt'],
  ];
  function renderShell() {
    root.innerHTML = `
      <div class="adm">
        <aside class="adm-side" id="side">
          <a href="#/dashboard" class="logo"><img class="logo-img" src="assets/img/logo2.webp" alt="TS SUPERLIGHT"><span class="logo-text"><small class="role">Admin</small></span></a>
          <ul class="adm-menu" id="admMenu"></ul>
          <div class="pub-box" id="pubBox"></div>
          <div class="foot">
            <a href="index.html" target="_blank">↗ Xem trước (bản nháp)</a>
            <a href="${esc(GH.siteUrl())}" target="_blank">🌐 Mở web khách đang dùng</a>
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
    $('#logout').onclick = e => {
      e.preventDefault();
      if (!confirm('Đăng xuất sẽ xoá GitHub token khỏi trình duyệt này (bản nháp vẫn giữ). Lần sau cần nhập lại token. Tiếp tục?')) return;
      GH.setCfg({ ...GH.cfg(), token: '' }); renderLogin();
    };
  }
  function drawMenu(cur) {
    $('#admMenu').innerHTML = MENU.map(([k, i, t]) => `<li><a href="#/${k}" class="${k === cur ? 'on' : ''}"><i>${i}</i>${t}</a></li>`).join('');
    $('#admTitle').textContent = MENU.find(m => m[0] === cur)?.[2] || '';
    $('#admTopActions').innerHTML = '';
    drawPublish();
  }

  /* ---------------- Dashboard ---------------- */
  function viewDashboard() {
    const ps = D().products, on = ps.filter(p => p.active);
    const f = D().promos.flash, flashOn = f.active && new Date(f.endsAt) > new Date();
    const vids = MEDIA(), synced = syncedAt();
    const latest = [...vids].sort((a, b) => b.id.length - a.id.length || b.id.localeCompare(a.id)).slice(0, 6);
    $('#view').innerHTML = `
      <div class="kpis">
        <div class="kpi"><small>Sản phẩm đang hiện</small><b>${on.length}</b><span>Tổng ${ps.length}${ps.length > on.length ? ` · ${ps.length - on.length} đang ẩn` : ''} · <a href="#/products">Quản lý →</a></span></div>
        <div class="kpi"><small>Danh mục</small><b>${D().categories.length}</b><span><a href="#/categories">Quản lý danh mục →</a></span></div>
        <div class="kpi"><small>Video TikTok</small><b>${vids.length}</b><span>${synced ? 'Đồng bộ ' + dt(synced) : 'Chưa đồng bộ'}</span></div>
        <div class="kpi"><small>Flash Sale</small><b>${flashOn ? f.items.length + ' SP' : 'Tắt'}</b><span>${flashOn ? 'Kết thúc ' + dt(f.endsAt) : '<a href="#/promos">Bật Flash Sale →</a>'}</span></div>
      </div>
      <div class="card-a" style="margin-top:14px">
        <h3>Video TikTok mới nhất<span class="sp"></span><a href="#/media" class="ib">Thư viện →</a></h3>
        <div class="lib">${latest.map(x => `<div class="it"><img src="${esc(DB.cover(x))}" loading="lazy" alt=""><div class="cap">👁 ${x.views.toLocaleString('vi-VN')} · ${esc(x.cap || '—')}</div></div>`).join('')}</div>
      </div>`;
  }

  /* ---------------- Products ---------------- */
  let pFilter = { q: '', cat: '', status: '' };
  function productsTable(list) {
    if (!list.length) return '<div class="empty">Không có sản phẩm</div>';
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th></th><th>Sản phẩm</th><th>Danh mục</th><th class="num">Giá bán</th><th class="num">Giá gốc</th><th>Hiển thị</th><th></th></tr></thead>
      <tbody>${list.map(p => {
        const fi = DB.flashItem(p.id);
        return `<tr>
        <td><img class="thumb" src="${esc(p.image)}" alt=""></td>
        <td class="nm">${esc(p.name)}<br><small class="muted">${esc(p.id.toUpperCase())} · ${esc(p.vehicles.join(', '))}</small>
          <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap">${p.featured ? pill(['Nổi bật', 'amber']) : ''}${p.isNew ? pill(['Mới', 'green']) : ''}${fi ? pill([`⚡ ${fmt(fi.salePrice)}`, 'red']) : ''}${p.video ? pill(['Video', 'gray']) : ''}</div></td>
        <td>${esc(catName(p.cat))}</td>
        <td class="num"><b>${p.price ? fmt(p.price) : 'Liên hệ'}</b></td>
        <td class="num muted">${p.oldPrice ? fmt(p.oldPrice) : '—'}</td>
        <td><label class="switch"><input type="checkbox" data-toggle="${p.id}" ${p.active ? 'checked' : ''}><span></span></label></td>
        <td class="acts"><button class="ib" data-edit="${p.id}">Sửa</button> <button class="ib" data-dup="${p.id}" title="Nhân bản">⧉</button> <button class="ib danger" data-del="${p.id}" title="Xoá">🗑</button></td>
      </tr>`; }).join('')}</tbody></table></div>`;
  }
  function bindProductRows() {
    $$('[data-toggle]').forEach(c => c.onchange = () => { DB.product(c.dataset.toggle).active = c.checked; save(c.checked ? 'Đã <b>hiện</b> sản phẩm' : 'Đã <b>ẩn</b> sản phẩm'); });
    $$('[data-edit]').forEach(b => b.onclick = () => productForm(DB.product(b.dataset.edit)));
    $$('[data-dup]').forEach(b => b.onclick = () => {
      const src = DB.product(b.dataset.dup);
      const cp = JSON.parse(JSON.stringify(src)); cp.id = DB.uid('p'); cp.name += ' (bản sao)'; cp.active = false;
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
        && (!pFilter.status || (pFilter.status === 'on' ? p.active : !p.active)));
      $('#pTable').innerHTML = productsTable(list);
      $('#pCount').textContent = `${list.length} / ${D().products.length} sản phẩm`;
      bindProductRows();
    };
    $('#view').innerHTML = `
      <div class="card-a">
        <div class="bar-tools">
          <input id="pq" placeholder="Tìm tên hoặc mã sản phẩm…" value="${esc(pFilter.q)}">
          <select id="pc"><option value="">Tất cả danh mục</option>${D().categories.map(c => `<option value="${c.id}" ${pFilter.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
          <select id="ps"><option value="">Mọi trạng thái</option><option value="on">Đang hiện</option><option value="off">Đang ẩn</option></select>
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
      id: DB.uid('p'), name: '', cat: D().categories[0].id, vehicles: [], price: 0, oldPrice: 0, image: '', gallery: [], vehicleImages: {}, video: '', tiktok: '',
      featured: false, isNew: true, warranty: '12 tháng', short: '', desc: '', specs: {}, active: true,
      ...preset,
    };
    if (!d.vehicleImages) d.vehicleImages = {};
    const videos = MEDIA().filter(m => m.video);
    const m = modal(`
      <div class="m-head">${isNew ? 'Thêm sản phẩm mới' : 'Sửa: ' + esc(d.name)}</div>
      <form class="m-body" id="pForm">
        <div class="form-grid">
          <div class="field full"><label>Tên sản phẩm *</label><input name="name" required value="${esc(d.name)}" placeholder="VD: Bi LED Kenzo S600 Pro V3"></div>
          <div class="field"><label>Danh mục</label><select name="cat">${D().categories.map(c => `<option value="${c.id}" ${d.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Bảo hành</label><input name="warranty" value="${esc(d.warranty)}"></div>
        </div>
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><label>Giá bán (đ)</label><input name="price" inputmode="numeric" value="${d.price ? d.price.toLocaleString('vi-VN') : ''}" placeholder="0"><div class="hint">Để trống hoặc 0 → web hiện “Liên hệ”</div></div>
          <div class="field"><label>Giá gốc / giá gạch (đ)</label><input name="oldPrice" inputmode="numeric" value="${d.oldPrice ? d.oldPrice.toLocaleString('vi-VN') : ''}"><div class="hint">Để trống nếu không giảm giá</div></div>
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
        <div class="field" style="margin-top:12px"><label>Ảnh theo dòng xe</label>
          <div class="hint" style="margin:0 0 6px">Khách chọn dòng xe ở trang chi tiết thì ảnh chính đổi sang ảnh này. Để trống thì dùng ảnh đại diện.</div>
          <div class="veh-imgs" id="pVehImgs"></div>
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
    const drawVehImgs = () => {
      const vs = $$('input[name=veh]:checked', m).map(x => x.value).filter(v => v !== 'Tất cả dòng xe');
      $('#pVehImgs', m).innerHTML = vs.map(v => `
        <div class="vi">
          <img src="${esc(d.vehicleImages[v] || d.image)}" class="${d.vehicleImages[v] ? '' : 'dim'}" alt="">
          <b>${esc(v)}</b>
          <button type="button" class="ib" data-vpick="${esc(v)}">${d.vehicleImages[v] ? 'Đổi ảnh' : 'Chọn ảnh'}</button>
          ${d.vehicleImages[v] ? `<button type="button" class="ib" data-vrm="${esc(v)}" style="color:var(--sale)">Xoá</button>` : ''}
        </div>`).join('') || '<span class="muted" style="font-size:12.5px">Tick dòng xe tương thích ở trên để gán ảnh</span>';
      $$('[data-vpick]', m).forEach(b => b.onclick = () => pickImage(url => { d.vehicleImages[b.dataset.vpick] = url; drawVehImgs(); }));
      $$('[data-vrm]', m).forEach(b => b.onclick = () => { delete d.vehicleImages[b.dataset.vrm]; drawVehImgs(); });
    };
    drawVehImgs();
    $$('input[name=veh]', m).forEach(i => i.onchange = drawVehImgs);
    $('#pickMain', m).onclick = () => pickImage((url, meta) => {
      d.image = url; $('#pImg', m).src = url; drawVehImgs();
      if (meta) { const f = $('#pForm', m); if (!f.tiktok.value) f.tiktok.value = `https://www.tiktok.com/@ts.superlight/video/${meta.id}`; if (meta.video && !f.video.value) f.video.value = `assets/video/${meta.id}.mp4`; }
    });
    $('#pickGal', m).onclick = () => pickImage(urls => { d.gallery.push(...urls); drawGal(); }, { multi: true });
    $$('input[name=price], input[name=oldPrice]', m).forEach(i => i.onblur = () => { const v = num(i.value); i.value = v ? v.toLocaleString('vi-VN') : ''; });

    $('#pSave', m).onclick = () => {
      const f = $('#pForm', m);
      if (!f.name.value.trim()) { f.name.focus(); return toast('Nhập <b>tên sản phẩm</b>'); }
      if (!d.image) return toast('Chọn <b>ảnh đại diện</b>');
      Object.assign(d, {
        name: f.name.value.trim(), cat: f.cat.value, warranty: f.warranty.value.trim(),
        price: num(f.price.value), oldPrice: num(f.oldPrice.value),
        vehicles: $$('input[name=veh]:checked', f).map(x => x.value),
        video: f.video.value, tiktok: f.tiktok.value.trim(), short: f.short.value.trim(), desc: f.desc.value.trim(),
        specs: Object.fromEntries(f.specs.value.split('\n').map(l => l.split(':')).filter(a => a.length > 1 && a[0].trim()).map(([k, ...v]) => [k.trim(), v.join(':').trim()])),
        featured: f.featured.checked, isNew: f.isNew.checked, active: f.active.checked,
      });
      if (!d.vehicles.length) d.vehicles = ['Tất cả dòng xe'];
      d.vehicleImages = Object.fromEntries(Object.entries(d.vehicleImages).filter(([v]) => d.vehicles.includes(v)));
      if (isNew) D().products.unshift(d);
      else D().products[D().products.findIndex(x => x.id === d.id)] = d;
      if (DB.save()) { m.remove(); toast(isNew ? 'Đã thêm sản phẩm <b>✓</b>' : 'Đã lưu <b>✓</b>'); route(); }
    };
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
    const opts = [['#/', 'Trang chủ'],['#/videos', 'Video theo xe: Tất cả'],
      ...DB.videoVehicleList().filter(v => DB.videosFor(v).length).map(v => [`#/vehicle/${encodeURIComponent(v)}`, `Video theo xe: ${v}`]),
      ...D().categories.map(c => [`#/category/${c.id}`, `Danh mục: ${c.name}`]),
      ...D().products.map(p => [`#/product/${p.id}`, `SP: ${p.name}`])];
    return opts.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  }
  function bannerForm(kind, idx) {
    const isBanner = kind === 'banners';
    const x = idx >= 0 ? { ...D()[kind][idx] } : { id: DB.uid('b'), title: '', subtitle: '', image: '', video: '', cta: 'Xem ngay', link: '#/', active: true, theme: 'amber' };
    const videos = MEDIA().filter(v => v.video);
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

  /* ---------------- Categories ----------------
     Mã danh mục (id) nằm trong đường dẫn #/category/<id> nên giữ nguyên khi đổi tên; chỉ tạo khi thêm mới. */
  const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'danh-muc';
  const catCount = id => D().products.filter(p => p.cat === id).length;
  function viewCategories() {
    const cs = D().categories;
    $('#admTopActions').innerHTML = `<button class="btn btn-brand" id="catAdd">+ Thêm danh mục</button>`;
    $('#catAdd').onclick = () => categoryForm(-1);
    $('#view').innerHTML = `
      <div class="card-a">
        <h3>📂 Danh mục sản phẩm<span class="sp"></span><span class="muted" style="font-size:13px;font-weight:500">${cs.length} danh mục</span></h3>
        <p class="muted" style="margin-top:-6px">Thứ tự ở đây là thứ tự hiện trên menu, trang chủ và bộ lọc của web khách. Sửa xong bấm <b>🚀 Xuất bản lên web</b>.</p>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Thứ tự</th><th>Tên danh mục</th><th>Mô tả ngắn</th><th>Mã (đường dẫn)</th><th class="num">Sản phẩm</th><th></th></tr></thead>
          <tbody>${cs.map((c, i) => `<tr>
            <td style="white-space:nowrap"><button class="ib" data-cup="${i}" ${i ? '' : 'disabled'} title="Lên">↑</button> <button class="ib" data-cdown="${i}" ${i < cs.length - 1 ? '' : 'disabled'} title="Xuống">↓</button></td>
            <td class="nm"><b>${esc(c.name)}</b></td>
            <td class="muted">${esc(c.desc || '—')}</td>
            <td><code>#/category/${esc(c.id)}</code></td>
            <td class="num"><a href="#/products" data-cprod="${esc(c.id)}">${catCount(c.id)}</a></td>
            <td class="acts"><button class="ib" data-catedit="${i}">Sửa</button> <button class="ib danger" data-catdel="${i}" title="Xoá">🗑</button></td>
          </tr>`).join('')}</tbody></table></div>
      </div>`;
    const move = (i, d) => { [cs[i], cs[i + d]] = [cs[i + d], cs[i]]; save('Đã đổi thứ tự'); viewCategories(); };
    $$('[data-cup]').forEach(b => b.onclick = () => move(+b.dataset.cup, -1));
    $$('[data-cdown]').forEach(b => b.onclick = () => move(+b.dataset.cdown, 1));
    $$('[data-catedit]').forEach(b => b.onclick = () => categoryForm(+b.dataset.catedit));
    $$('[data-catdel]').forEach(b => b.onclick = () => deleteCategory(+b.dataset.catdel));
    $$('[data-cprod]').forEach(a => a.onclick = () => { pFilter = { q: '', cat: a.dataset.cprod, status: '' }; });
  }
  function categoryForm(idx) {
    const cs = D().categories;
    const c = idx >= 0 ? { ...cs[idx] } : { id: '', name: '', icon: '◎', desc: '' };
    const m = modal(`
      <div class="m-head">${idx >= 0 ? 'Sửa danh mục: ' + esc(c.name) : 'Thêm danh mục'}</div>
      <div class="m-body form-grid">
        <div class="field full"><label>Tên danh mục *</label><input id="catName" value="${esc(c.name)}" placeholder="VD: Đèn hậu, Phụ kiện…"></div>
        <div class="field full"><label>Mô tả ngắn (hiện dưới tên ở trang chủ)</label><input id="catDesc" value="${esc(c.desc)}" placeholder="VD: Đèn hậu Audi, đèn xi-nhan…"></div>
        <div class="field full"><label>Mã (đường dẫn)</label><input id="catId" value="${esc(c.id)}" ${idx >= 0 ? 'readonly' : ''} placeholder="Tự tạo theo tên">
          <small class="muted">${idx >= 0 ? 'Không đổi được để giữ các link đã chia sẻ.' : 'Chỉ gồm chữ không dấu, số, dấu gạch ngang.'}</small></div>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-close>Huỷ</button><button class="btn btn-brand" id="catSave">Lưu danh mục</button></div>`);
    let idTouched = false;
    if (idx < 0) {
      $('#catId', m).oninput = () => { idTouched = true; };
      $('#catName', m).oninput = e => { if (!idTouched) $('#catId', m).value = slugify(e.target.value); };
    }
    $('#catSave', m).onclick = () => {
      const name = $('#catName', m).value.trim();
      if (!name) return toast('Nhập <b>tên danh mục</b>');
      if (cs.some((x, i) => i !== idx && x.name.toLowerCase() === name.toLowerCase())) return toast('Tên danh mục <b>đã tồn tại</b>');
      if (idx < 0) {
        const id = slugify($('#catId', m).value || name);
        if (id === 'all' || cs.some(x => x.id === id)) return toast('Mã <b>' + esc(id) + '</b> đã được dùng — đổi mã khác');
        c.id = id;
      }
      Object.assign(c, { name, desc: $('#catDesc', m).value.trim() });
      if (idx >= 0) cs[idx] = c; else cs.push(c);
      if (DB.save()) { m.remove(); toast('Đã lưu danh mục <b>' + esc(name) + '</b>'); viewCategories(); }
    };
  }
  // Xoá danh mục: sản phẩm + banner/quảng cáo đang trỏ tới danh mục này được chuyển sang danh mục khác
  function deleteCategory(idx) {
    const cs = D().categories, c = cs[idx];
    if (cs.length < 2) return toast('Phải còn ít nhất <b>1 danh mục</b>');
    const n = catCount(c.id), others = cs.filter(x => x.id !== c.id);
    const m = modal(`
      <div class="m-head">Xoá danh mục: ${esc(c.name)}</div>
      <div class="m-body">
        ${n ? `<p>Danh mục này đang có <b>${n} sản phẩm</b>. Chuyển các sản phẩm đó sang:</p>
        <div class="field"><select id="catTo">${others.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></div>` : '<p>Danh mục này không có sản phẩm nào.</p>'}
        <p class="muted">Banner / quảng cáo đang dẫn tới danh mục này sẽ được chuyển link sang ${n ? 'danh mục trên' : '“Tất cả sản phẩm”'}.</p>
      </div>
      <div class="m-foot"><button class="btn btn-outline" data-close>Huỷ</button><button class="btn btn-brand" id="catDelOk" style="background:var(--sale);border-color:var(--sale)">Xoá danh mục</button></div>`);
    $('#catDelOk', m).onclick = () => {
      const to = n ? $('#catTo', m).value : '';
      D().products.forEach(p => { if (p.cat === c.id) p.cat = to; });
      const link = `#/category/${c.id}`;
      [...(D().banners || []), ...(D().sideAds || []), D().promos.popup].forEach(x => { if (x && x.link === link) x.link = to ? `#/category/${to}` : '#/category/all'; });
      if (pFilter.cat === c.id) pFilter.cat = '';
      D().categories = cs.filter(x => x.id !== c.id);
      if (DB.save()) { m.remove(); toast('Đã xoá danh mục <b>' + esc(c.name) + '</b>'); viewCategories(); }
    };
  }

  /* ---------------- Promotions ---------------- */
  function viewPromos() {
    const f = D().promos.flash;
    const expired = new Date(f.endsAt) < new Date();
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
  }
  /* ---------------- Đồng bộ TikTok ----------------
     Ghi file .github/sync-tiktok-request lên GitHub → workflow "Đồng bộ TikTok" chạy (~1 phút): lấy video mới
     của các kênh ở Cài đặt, lưu ảnh bìa + assets/data/tiktok.json → web khách tự hiện, không cần Xuất bản.
     GitHub cũng tự chạy mỗi 6 giờ. Trình duyệt không đọc thẳng được TikTok nên phải nhờ GitHub. */
  const syncedAt = () => DB.feed?.syncedAt || D().settings.tiktokSyncedAt;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function syncTikTok() {
    if (!GH.ready()) { location.hash = '#/settings'; return toast('Đồng bộ TikTok chạy trên GitHub — nhập <b>GitHub token</b> ở Cài đặt → Xuất bản lên web trước'); }
    const btn = $('#ttSync');
    const status = html => { if (btn?.isConnected) btn.innerHTML = html; };
    if (btn) btn.disabled = true;
    try {
      status('⏳ Đang gửi yêu cầu…');
      const id = Date.now().toString(36);
      await GH.commit(new Map([['.github/sync-tiktok-request', b64utf8(id + '\n')]]), 'Yêu cầu đồng bộ TikTok từ Admin');
      // Chờ GitHub chạy xong (thường 40–90 giây), tối đa ~4 phút
      let feed = null;
      for (let t = 0; t < 48 && feed?.request !== id; t++) {
        status(`⏳ GitHub đang lấy video… ${t * 5}s`);
        await sleep(5000);
        feed = await GH.api(`/contents/assets/data/tiktok.json?ref=${encodeURIComponent(GH.cfg().branch)}`, { raw: true }).then(JSON.parse).catch(() => null);
      }
      if (feed?.request !== id) throw new Error('GitHub chưa chạy xong — đợi vài phút rồi tải lại trang (xem tab Actions trên GitHub)');
      DB.feed = feed;
      window.dispatchEvent(new Event('db-changed'));
      toast(`${feed.added ? `Đã thêm <b>${feed.added} video mới</b>` : 'Không có video mới'} · cập nhật ${feed.updated} video — web khách tự hiện sau ~1 phút${feed.error ? `<br>Lỗi: ${esc(feed.error)}` : ''}`);
    } catch (e) { toast('Đồng bộ TikTok lỗi: ' + esc(e.message)); }
    if (btn?.isConnected) { btn.disabled = false; btn.innerHTML = '🔄 Đồng bộ TikTok'; }
  }

  /* ---------------- Media library ---------------- */
  function viewMedia() {
    const used = new Set(D().products.flatMap(p => [p.image, ...p.gallery]).map(u => (u.match(/(\d{15,})/) || [])[1]).filter(Boolean));
    $('#view').innerHTML = `
      <div class="card-a">
        <h3>Ảnh & video từ TikTok ${DB.channels().map(c => '@' + esc(c.user)).join(' · ')}<span class="sp"></span><button class="btn btn-brand" id="ttSync">🔄 Đồng bộ TikTok</button>${DB.channels().map(c => `<a class="ib" href="${esc(c.url)}" target="_blank">@${esc(c.user)} ↗</a>`).join(' ')}</h3>
        <p class="muted" style="margin-top:-6px">${MEDIA().length} ảnh bìa video · ${MEDIA().filter(m => m.video).length} video đã tải về · <span class="pill green">Đang dùng</span> = ảnh đã gắn vào sản phẩm. Bấm vào ảnh để tạo nhanh sản phẩm.${syncedAt() ? ` · Đồng bộ lần cuối: ${dt(syncedAt())} (GitHub tự đồng bộ mỗi 6 giờ)` : ''}</p>
        <div class="bar-tools"><input id="mq" placeholder="Lọc theo caption…"><select id="mc"><option value="">Mọi kênh</option>${[...new Set(MEDIA().map(x => DB.chOf(x)))].map(u => `<option value="${esc(u)}">@${esc(u)} (${MEDIA().filter(x => DB.chOf(x) === u).length})</option>`).join('')}</select><select id="mv"><option value="">Mọi dòng xe (${MEDIA().length})</option>${DB.videoVehicleList().map(v => [v, DB.videosFor(v).length]).filter(([, n]) => n).map(([v, n]) => `<option value="${esc(v)}">${esc(v)} (${n})</option>`).join('')}<option value="-">Chưa rõ dòng xe (${MEDIA().filter(x => !DB.videoVehiclesOf(x).length).length})</option></select><select id="mf"><option value="">Tất cả</option><option value="unused">Chưa dùng</option><option value="video">Có video</option></select></div>
        <p class="muted" style="margin:0 0 10px;font-size:12.5px">Dòng xe được tự nhận từ caption (vd: “Ab”, “Airbalde” → Air Blade; “Fuled” → Future) — giống mục <b>Video theo xe</b> trên trang bán hàng.</p>
        <div class="lib" id="mGrid"></div>
      </div>`;
    const draw = () => {
      const q = $('#mq').value.toLowerCase(), fl = $('#mf').value, fv = $('#mv').value, fc = $('#mc').value;
      const vehOk = x => !fv || (fv === '-' ? !DB.videoVehiclesOf(x).length : DB.videoMatches(x, fv));
      $('#mGrid').innerHTML = MEDIA().filter(x => (!q || x.cap.toLowerCase().includes(q)) && (!fc || DB.chOf(x) === fc) && vehOk(x) && (fl !== 'unused' || !used.has(x.id)) && (fl !== 'video' || x.video)).map(x => `
        <div class="it" data-mid="${x.id}" title="${esc(x.cap)}">
          <img src="${esc(DB.cover(x))}" loading="lazy" alt="">
          ${used.has(x.id) ? '<span class="used">Đang dùng</span>' : ''}${x.video ? '<span class="v">VIDEO</span>' : ''}
          ${DB.videoVehiclesOf(x).length ? `<span class="veh">${esc(DB.videoVehiclesOf(x).join(' · '))}</span>` : ''}
          <div class="cap">👁 ${x.views.toLocaleString('vi-VN')} · ${esc(x.cap || '—')}</div>
        </div>`).join('');
    };
    $('#mq').oninput = draw; $('#mf').onchange = draw; $('#mv').onchange = draw; $('#mc').onchange = draw; draw();
    $('#ttSync').onclick = syncTikTok;
    $('#mGrid').onclick = e => {
      const it = e.target.closest('[data-mid]'); if (!it) return;
      const x = MEDIA().find(m => m.id === it.dataset.mid);
      const m = modal(`
        <div class="m-head">Ảnh TikTok</div>
        <div class="m-body" style="display:flex;gap:16px;flex-wrap:wrap">
          ${x.video ? `<video src="assets/video/${x.id}.mp4" poster="${esc(DB.cover(x))}" controls style="width:240px;border-radius:10px;background:#000"></video>` : `<img src="${esc(DB.cover(x))}" style="width:240px;border-radius:10px">`}
          <div style="flex:1;min-width:220px">
            <p><b>${esc(x.cap || '—')}</b></p>
            <p class="muted">👁 ${x.views.toLocaleString('vi-VN')} lượt xem · ❤ ${x.likes.toLocaleString('vi-VN')}</p>
            <p>Dòng xe: <b>${esc(DB.videoVehiclesOf(x).join(', ') || 'Chưa rõ (chỉ hiện ở “Tất cả video”)')}</b></p>
            <div class="field"><label>Đường dẫn ảnh</label><input readonly value="assets/img/${x.id}.jpg" onclick="this.select()"></div>
            <div style="display:grid;gap:8px;margin-top:12px">
              <button class="btn btn-brand" id="mkP">+ Tạo sản phẩm từ ảnh này</button>
              <a class="btn btn-outline" target="_blank" href="https://www.tiktok.com/@${esc(DB.chOf(x))}/video/${x.id}">Xem trên TikTok ↗</a>
            </div>
          </div>
        </div>`);
      $('#mkP', m).onclick = () => {
        m.remove();
        productForm(null, {
          name: x.cap.replace(/[^\p{L}\p{N}\s+\-.,/]/gu, '').trim(),
          image: `assets/img/${x.id}.jpg`,
          tiktok: `https://www.tiktok.com/@${DB.chOf(x)}/video/${x.id}`,
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
          ${F('address', 'Địa chỉ', 'full')}${F('hours', 'Giờ mở cửa')}${F('tiktok', 'Link TikTok (kênh chính)')}${F('tiktok2', 'Link TikTok kênh 2')}
        </div>
      </div>
      <div style="display:flex;gap:10px;margin:14px 0"><button class="btn btn-brand btn-lg" id="sSave">Lưu cài đặt</button></div>
      <div class="card-a" id="ghCard"><h3>Xuất bản lên web (GitHub Pages)</h3>
        <p class="muted" style="margin-top:-6px">Sửa sản phẩm, banner, khuyến mãi, cài đặt… ở Admin chỉ lưu nháp trên máy này. Bấm <b>🚀 Xuất bản lên web</b> (thanh bên trái) để đưa lên web khách — khoảng 1 phút sau khách thấy. Token này cũng dùng cho nút <b>🔄 Đồng bộ TikTok</b>. Token chỉ lưu trên máy này. Hướng dẫn tạo token: file <b>HUONG-DAN-DUA-LEN-WEB.md</b>.</p>
        <div class="form-grid g3">
          <div class="field"><label>Tài khoản GitHub</label><input id="ghOwner" value="${esc(GH.cfg().owner)}"></div>
          <div class="field"><label>Repo</label><input id="ghRepo" value="${esc(GH.cfg().repo)}"></div>
          <div class="field"><label>Nhánh</label><input id="ghBranch" value="${esc(GH.cfg().branch)}"></div>
          <div class="field full" style="grid-column:1/-1"><label>GitHub token (Fine-grained, quyền Contents: Read and write)</label><input id="ghToken" type="password" value="${esc(GH.cfg().token)}" autocomplete="off" placeholder="github_pat_…"></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-brand" id="ghSave">Lưu &amp; kiểm tra kết nối</button>
          <button class="btn btn-outline" id="ghPull">⤓ Lấy bản đang chạy trên web về</button>
          <span id="ghMsg" class="msg" style="align-self:center;margin:0"></span>
        </div>
        <p class="muted" style="margin:10px 0 0;font-size:12.5px">Web khách: <a href="${esc(GH.siteUrl())}" target="_blank">${esc(GH.siteUrl())}</a></p>
      </div>
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
      save('Đã lưu cài đặt <b>✓</b>');
    };
    $('#ghSave').onclick = async () => {
      GH.setCfg({ owner: $('#ghOwner').value.trim(), repo: $('#ghRepo').value.trim(), branch: $('#ghBranch').value.trim() || 'main', token: $('#ghToken').value.trim() });
      const msg = $('#ghMsg');
      if (!GH.ready()) { msg.className = 'msg err'; msg.textContent = 'Nhập GitHub token'; return; }
      msg.className = 'msg'; msg.textContent = 'Đang kiểm tra…';
      try {
        await GH.checkWrite();
        msg.className = 'msg ok'; msg.textContent = '✓ Kết nối GitHub thành công — có thể xuất bản';
      } catch (e) { msg.className = 'msg err'; msg.textContent = '✕ ' + e.message; }
      drawPublish();
    };
    $('#ghPull').onclick = pullLive;
    $('#bkExport').onclick = () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' }));
      a.download = `tsl-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    };
    $('#bkImport').onchange = async e => {
      try { const data = JSON.parse(await e.target.files[0].text()); if (!data.products) throw 0; DB.data = data; save('Đã nhập dữ liệu <b>✓</b>'); route(); }
      catch (err) { toast('File không hợp lệ'); }
    };
    $('#bkReset').onclick = () => { if (confirm('Xoá toàn bộ thay đổi, khôi phục dữ liệu mẫu?')) { DB.reset(); toast('Đã khôi phục dữ liệu mẫu'); route(); } };
  }

  /* ---------------- Router ---------------- */
  const VIEWS = { dashboard: viewDashboard, products: viewProducts, categories: viewCategories, banners: viewBanners, promos: viewPromos, media: viewMedia, settings: viewSettings };
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
