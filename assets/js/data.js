/* ============================================================
   TS SUPERLIGHT — Lớp dữ liệu dùng chung (trang khách + trang admin)
   Lưu trong localStorage để admin sửa là trang khách thấy ngay.
   Khi có backend thật: thay DB.load/DB.save bằng gọi API.
   ============================================================ */
(function () {
  const KEY = 'tsl_db_v1';
  const img = id => `assets/img/${id}.jpg`;
  const vid = id => `assets/video/${id}.mp4`;

  // Danh mục của bộ sản phẩm cũ (đã ngừng bán) — dùng để dọn dữ liệu cũ trong migrate5
  const OLD_CATEGORY_IDS = ['bi-cau', 'audi', 'den-hau', 'combo', 'tro-sang', 'phu-kien'];

  const VEHICLES = ['Vario', 'Air Blade', 'Vision', 'SH', 'SH Mode', 'Lead', 'Scoopy', 'Future', 'NVX', 'Click', 'Vespa', 'Tất cả dòng xe'];

  /* Tự gợi ý ảnh theo dòng xe từ caption TikTok: caption phải nhắc tới dòng xe VÀ loại đèn của sản phẩm */
  const VEH_RE = {
    'Vario': /vario/, 'Air Blade': /\b(ab|air ?blade)\b/, 'Vision': /vision/, 'SH': /\bsh\b(?! ?mode)/, 'SH Mode': /sh ?mode/,
    'Lead': /\blead\b/, 'Scoopy': /scoopy/, 'Future': /future/, 'NVX': /nvx/, 'Click': /click/, 'Vespa': /vespa/,
  };
  const KW = [['kenzo'], ['aozoom', 'ex3'], ['cb150'], ['sharingan', 'sharigan', 'mắt xoay'], ['audi'], ['hậu'], ['bi cầu', 'bicau'], ['zhipat'], ['bimini', 'bi mini'], ['chóa'], ['bảng led']];
  function suggestVehicleImages(p) {
    const media = window.TIKTOK_MEDIA || [];
    const name = p.name.toLowerCase();
    const kws = KW.filter(g => g.some(k => name.includes(k)));
    const out = {};
    if (!kws.length) return out;
    p.vehicles.forEach(v => {
      const re = VEH_RE[v]; if (!re) return;
      let best = null, bestScore = 0;
      media.forEach(m => {
        const cap = (m.cap || '').toLowerCase();
        if (!re.test(cap)) return;
        const score = kws.filter(g => g.some(k => cap.includes(k))).length;
        if (score > bestScore || (score === bestScore && best && m.views > best.views)) { best = m; bestScore = score; }
      });
      if (best && bestScore) out[v] = img(best.id);
    });
    return out;
  }

  /* Sản phẩm chính hãng Kenzo (theo kenzolight.com/san-pham-kenzo-2 — không gồm Bi LED gầm).
     Giá = giá bán lẻ khuyến nghị cho xe máy của Kenzo, đã gồm lắp đặt. */
  const KENZO_CATEGORIES = [
    { id: 'kenzo-bi-led', name: 'Bi LED & Laser Kenzo', icon: '◎', desc: 'Kenzo M18 Mini 1.8″ & S-Series chính hãng' },
    { id: 'kenzo-tro-sang', name: 'Trợ sáng Kenzo', icon: '✧', desc: 'Trợ sáng, bi mini, bóng LED Kenzo' },
  ];
  const K = (id, name, cat, price, short, desc, extra = {}) => ({
    id, name, cat, vehicles: ['Tất cả dòng xe'], price, oldPrice: 0, image: `assets/img/kenzo/${id}.jpg`,
    gallery: [], video: '', tiktok: '', stock: 20, sold: 0, rating: 5,
    featured: !!extra.featured, isNew: !!extra.isNew, warranty: 'Theo chính sách Kenzo',
    short, desc: `${name} — ${short}\n\n${desc}\n\nSản phẩm chính hãng Kenzo Việt Nam, lắp đặt trực tiếp tại TS SUPERLIGHT. Liên hệ Hotline/Zalo để được tư vấn và báo giá theo dòng xe.`,
    specs: { 'Thương hiệu': 'Kenzo', ...(extra.specs || {}) }, vehicleImages: {}, active: true,
  });
  const KENZO_PRODUCTS = [
    K('kz-m18', 'Bi LED Kenzo M18', 'kenzo-bi-led', 5000000, 'Nhỏ gọn – dành cho moto.', 'Bi LED Mini 1.8″ thuộc dòng Kenzo M-Series, chip LED thế hệ mới từ CHLB Đức, tiêu thụ điện ít nhưng cường độ sáng cao.', { specs: { 'Kích thước': '1.8″' } }),
    K('kz-m18-matrix', 'Bi LED Kenzo M18 Matrix', 'kenzo-bi-led', 6500000, 'Nhỏ gọn – siêu việt.', 'Nhỏ gọn nhưng sở hữu hiệu suất siêu việt, Bi LED 1.8″ Kenzo M18 Matrix thế hệ mới là lựa chọn tăng sáng lý tưởng.', { specs: { 'Kích thước': '1.8″' } }),
    K('kz-m18-laser', 'Bi LED Kenzo M18 Laser Matrix', 'kenzo-bi-led', 9000000, 'Nhỏ gọn – laser siêu việt.', 'Trang bị 9 chip LED OSRAM và 10W Laser Nichia. Kenzo M18 Laser Matrix là lựa chọn tăng sáng hoàn hảo cho các dòng xe chóa nhỏ.', { specs: { 'Kích thước': '1.8″', 'Chip': '9 LED OSRAM + Laser Nichia 10W' } }),
    K('kz-s500-mini', 'Bi LED Kenzo S500 Mini', 'kenzo-bi-led', 4000000, 'Kích thước nhỏ, hiệu suất cao.', 'Phiên bản nhỏ gọn của dòng Kenzo S-Series, phù hợp nhiều dòng xe máy.'),
    K('kz-s500-pro-v2', 'Bi LED Kenzo S500 Pro V2', 'kenzo-bi-led', 5000000, 'Nâng cấp mạnh mẽ, giá không đổi.', 'Ra mắt 20/12/2025, Bi LED Kenzo S500 Pro V2 là phiên bản nâng cấp dựa trên thành công của S500 Pro V1.', { isNew: true }),
    K('kz-s600-25', 'Bi LED Kenzo S600 2.5', 'kenzo-bi-led', 5200000, 'Thoát sáng đỉnh cao, chấp bụi chấp bão.', 'Thiết kế nhỏ gọn chỉ 2.5″ cùng công nghệ thoát sáng đỉnh cao mang lại hiệu suất chiếu sáng vượt trội.', { specs: { 'Kích thước': '2.5″' } }),
    K('kz-s600-pro-v3', 'Bi LED Kenzo S600 Pro V3', 'kenzo-bi-led', 6000000, 'Sáng như mong đợi.', 'Phiên bản mới nhất S600 Pro V3 nâng cấp toàn diện: chip LED 12 nhân hiệu năng cao, tăng sáng 25%, tối ưu vận hành đô thị với City Mode.', { featured: true, isNew: true }),
    K('kz-s700-pro', 'Bi LED Kenzo S700 Pro V2', 'kenzo-bi-led', 7500000, 'Kỷ nguyên mới của Bi LED.', 'Hội tụ các công nghệ đột phá lần đầu tiên xuất hiện trên Bi LED Kenzo S700 Pro.', { featured: true }),
    K('kz-s800', 'Bi LED Kenzo S800', 'kenzo-bi-led', 8000000, 'Hiệu suất vượt trội.', 'Chip LED OSRAM từ CHLB Đức, công suất Cos 65W – Pha 75W, Bi LED Kenzo S800 hiệu suất cao cho độ sáng vượt trội.', { specs: { 'Công suất': 'Cos 65W – Pha 75W' } }),
    K('kz-s900-pro', 'Bi LED Laser Kenzo S900 Pro', 'kenzo-bi-led', 13500000, 'Không chỉ là tầm nhìn.', 'Dòng Bi LED Laser cao cấp nhất của Kenzo S-Series.', { featured: true }),
    K('kz-x3-pro', 'Đèn trợ sáng dạng rời Kenzo X3 Pro', 'kenzo-tro-sang', 5000000, 'Trợ sáng dạng rời toàn diện nhất phân khúc.', 'Kenzo X3 Pro được phát triển để trở thành lựa chọn đèn trợ sáng dạng rời toàn diện nhất trong phân khúc.', { isNew: true }),
    K('kz-v9s', 'Đèn LED Kenzo V9S', 'kenzo-tro-sang', 2400000, 'Đỉnh cao công nghệ đèn LED cho ô tô và xe máy.', 'Nối tiếp thành công của dòng Kenzo V8S, Kenzo ra mắt mẫu đèn mới V9S kế thừa người tiền nhiệm.'),
    K('kz-v16', 'Đèn LED Kenzo V16', 'kenzo-tro-sang', 2500000, 'Mẫu bóng đèn LED thế hệ mới.', 'Kenzo V16 – mẫu bóng đèn LED cao cấp mới nhất, nâng tầm hiệu suất chiếu sáng cho mọi dòng xe, kể cả ô tô và xe máy.', { isNew: true }),
    K('kz-z20', 'Bi LED Mini Kenzo Z20 V2', 'kenzo-tro-sang', 1400000, 'Thiết kế nhỏ gọn – dễ lắp đặt.', 'Super Bi LED Mini Kenzo Z20 là đèn trợ sáng hiệu quả cho đèn chính, tích hợp 2 chế độ pha/cos trong 1 và driver tích hợp trên thân đèn.'),
    K('kz-x100', 'Đèn trợ sáng Mini Kenzo X100 V4', 'kenzo-tro-sang', 1500000, 'Trợ sáng mini thế hệ mới.', 'Thiết kế nhỏ gọn – linh hoạt – dễ lắp đặt, Kenzo X100 là lựa chọn tối ưu cho những ai cần bổ sung ánh sáng an toàn.'),
    K('kz-x200', 'Đèn trợ sáng Kenzo X200', 'kenzo-tro-sang', 2500000, 'Trợ sáng thế hệ mới, mạnh mẽ trong từng chi tiết.', 'Thiết kế nhỏ gọn – dễ lắp đặt, đèn trợ sáng mini Kenzo X200 mang đến hiệu suất vượt trội cho mọi hành trình.', { specs: { 'Công suất': '45W', 'Nhiệt màu': '5500K', 'Chống nước': 'IP68' } }),
    K('kz-kz40-v5', 'Đèn trợ sáng pha thế hệ mới Kenzo KZ40 V5.0', 'kenzo-tro-sang', 2500000, 'Trợ sáng pha thế hệ mới.', 'Đèn trợ sáng pha Kenzo KZ40 phiên bản V5.0.'),
    K('kz-cx80-v2', 'Đèn trợ sáng bi cầu Kenzo CX80 V2 2026', 'kenzo-tro-sang', 4200000, 'Đèn trợ sáng văn minh, an toàn.', 'Kenzo CX80 V2 – đèn LED trợ sáng dạng bi cầu (projector) văn minh, sáng mạnh, an toàn cho anh em đi phố, offroad…'),
  ];

  // Nhận cả cách viết tắt/sai chính tả hay gặp trong caption TikTok: Ab/Airbalde → Air Blade, Fuled → Future…
  const VIDEO_VEH_RE = {
    'Vario': /vario/, 'Air Blade': /\bab\b|air ?b(la|al)de/, 'Vision': /vision/, 'SH': /\bsh\b(?! ?mode)/, 'SH Mode': /\bsh ?mode/,
    'Lead': /\blead\b/, 'Scoopy': /scoopy/, 'Future': /future|fuled/, 'NVX': /\bnvx\b/, 'Click': /\bclick\b/, 'Vespa': /vespa/,
    'Ô tô': /innova|\bcrv\b|ô tô|\boto\b/,
  };

  const kimg = id => `assets/img/kenzo/${id}.jpg`;
  const BANNERS = [
    { id: 'b1', title: 'Bi LED Kenzo S600 Pro V3', subtitle: 'Chip LED 12 nhân, tăng sáng 25%, City Mode — lắp đặt & test sáng tại shop', image: kimg('kz-s600-pro-v3'), video: '', cta: 'Xem chi tiết', link: '#/product/kz-s600-pro-v3', active: true, theme: 'amber' },
    { id: 'b2', title: 'Kenzo S500 Pro V2', subtitle: 'Nâng cấp mạnh mẽ, giá không đổi — Bi LED chính hãng Kenzo', image: kimg('kz-s500-pro-v2'), video: '', cta: 'Khám phá', link: '#/product/kz-s500-pro-v2', active: true, theme: 'cyan' },
    { id: 'b3', title: 'Trợ sáng Kenzo', subtitle: 'X3 Pro · X100 · X200 · CX80 — sáng mạnh, an toàn khi đi đêm', image: kimg('kz-x3-pro'), video: '', cta: 'Chọn trợ sáng', link: '#/category/kenzo-tro-sang', active: true, theme: 'red' },
  ];

  const SIDE_ADS = [
    { id: 'a1', title: 'Laser Kenzo S900 Pro', subtitle: 'Liên hệ báo giá', image: kimg('kz-s900-pro'), link: '#/product/kz-s900-pro', active: true },
    { id: 'a2', title: 'Kenzo M18 Laser Matrix', subtitle: 'Nhỏ gọn – laser siêu việt', image: kimg('kz-m18-laser'), link: '#/product/kz-m18-laser', active: true },
  ];

  /* Nội dung mặc định cũ (trước khi chuyển sang hàng Kenzo) — migrate6 chỉ thay những mục chủ shop chưa tự sửa */
  const OLD_DEFAULTS = {
    banners: { b1: 'Lên đèn cháy phố', b2: 'Vario mẫu đèn mới', b3: 'Bi cầu Kenzo · Aozoom' },
    sideAds: { a1: 'Hậu Audi A7', a2: 'Audi AB 2026' },
    popupImage: img('7613980016220671253'),
    slogan: 'Chuyên làm Bi cầu · Audi · Trợ sáng · Bimini',
    lenden200: 'Giảm 200K cho combo từ 3 triệu',
  };

  const in7days = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16);
  const PROMOS = {
    coupons: [
      { code: 'SUPERLIGHT10', type: 'percent', value: 10, min: 1000000, max: 500000, expires: '2026-12-31', active: true, desc: 'Giảm 10% đơn từ 1 triệu (tối đa 500K)' },
      { code: 'LENDEN200', type: 'fixed', value: 200000, min: 3000000, max: 0, expires: '2026-12-31', active: true, desc: 'Giảm 200K cho đơn từ 3 triệu' },
      { code: 'FREESHIP', type: 'ship', value: 0, min: 0, max: 0, expires: '2026-12-31', active: true, desc: 'Miễn phí vận chuyển' },
    ],
    flash: {
      active: true,
      title: 'Flash Sale cuối tuần',
      endsAt: in7days(),
      items: [], // thêm sản phẩm Flash Sale trong Admin
    },
    popup: { active: true, title: 'Đặt chỗ lắp đèn online', text: 'Chọn mẫu đèn, hẹn giờ lắp và cọc trước để giữ hàng. Lắp đặt miễn phí tại shop Bình Thạnh!', image: kimg('kz-s700-pro'), link: '#/category/all' },
    topbar: { active: true, text: '🔥 Lắp đặt miễn phí tại shop · Đặt chỗ online, cọc giữ lịch · Bảo hành đến 24 tháng' },
  };

  const SETTINGS = {
    shopName: 'TS SUPERLIGHT',
    slogan: 'Chuyên lắp Bi LED · Laser · Trợ sáng Kenzo chính hãng',
    zalo: '0769678981',
    hotline: '0769678981',
    address: 'Bình Thạnh, TP. Hồ Chí Minh',
    hours: '8:00 – 20:00 (Cả T7 & CN)',
    tiktok: 'https://www.tiktok.com/@ts.superlight',
    deposit: 200000, // tiền cọc giữ chỗ cho mỗi lượt đặt
    bankName: '',
    bankAccount: '',
    bankOwner: '',
  };

  const seed = () => ({
    version: 6,
    categories: KENZO_CATEGORIES,
    vehicles: VEHICLES,
    products: KENZO_PRODUCTS,
    banners: BANNERS,
    sideAds: SIDE_ADS,
    promos: PROMOS,
    settings: SETTINGS,
    orders: [],
  });

  const DB = {
    data: null,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        this.data = raw ? JSON.parse(raw) : seed();
      } catch (e) { this.data = seed(); }
      this.migrate();
      this.migrate3();
      this.migrate4();
      this.migrate5();
      this.migrate6();
      return this.data;
    },
    /* v2: bỏ giao hàng, chuyển sang đặt chỗ + cọc */
    migrate() {
      const d = this.data;
      if ((d.version || 1) >= 2) return;
      const s = d.settings, pr = d.promos;
      if (s.deposit == null) s.deposit = SETTINGS.deposit;
      delete s.shipFee; delete s.freeShipFrom;
      if (pr.topbar && /ship/i.test(pr.topbar.text)) pr.topbar.text = PROMOS.topbar.text;
      if (pr.popup && /SUPERLIGHT10/.test(pr.popup.text)) Object.assign(pr.popup, { title: PROMOS.popup.title, text: PROMOS.popup.text });
      (d.sideAds || []).forEach(a => { if (/Chỉ từ/.test(a.subtitle)) a.subtitle = 'Liên hệ báo giá'; });
      d.version = 2;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    /* v3: ảnh theo dòng xe */
    migrate3() {
      const d = this.data;
      if ((d.version || 1) >= 3) return;
      d.products.forEach(p => { if (!p.vehicleImages) p.vehicleImages = suggestVehicleImages(p); });
      d.version = 3;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    /* v4: thêm danh mục + sản phẩm Kenzo, giữ nguyên dữ liệu đã có */
    migrate4() {
      const d = this.data;
      if ((d.version || 1) >= 4) return;
      KENZO_CATEGORIES.forEach(c => { if (!d.categories.some(x => x.id === c.id)) d.categories.push({ ...c }); });
      KENZO_PRODUCTS.forEach(p => { if (!d.products.some(x => x.id === p.id)) d.products.push(JSON.parse(JSON.stringify(p))); });
      d.version = 4;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    /* v5: xoá toàn bộ sản phẩm & danh mục cũ, chỉ giữ hàng Kenzo; dọn các liên kết trỏ tới sản phẩm đã xoá */
    migrate5() {
      const d = this.data;
      if ((d.version || 1) >= 5) return;
      const kenzoIds = new Set(KENZO_PRODUCTS.map(p => p.id));
      d.products = d.products.filter(p => kenzoIds.has(p.id));
      d.categories = d.categories.filter(c => !OLD_CATEGORY_IDS.includes(c.id));
      d.promos.flash.items = d.promos.flash.items.filter(i => kenzoIds.has(i.productId));
      const fixLink = l => {
        const [, type, id] = String(l || '').match(/^#\/(product|category)\/([^/?]+)/) || [];
        if (type === 'product' && !kenzoIds.has(id)) return '#/category/all';
        if (type === 'category' && OLD_CATEGORY_IDS.includes(id)) return id === 'bi-cau' ? '#/category/kenzo-bi-led' : '#/category/all';
        return l;
      };
      [...(d.banners || []), ...(d.sideAds || []), d.promos.popup].forEach(x => { if (x) x.link = fixLink(x.link); });
      d.version = 5;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    /* v6: đổi banner, quảng cáo, popup, slogan sang hàng Kenzo (giữ nguyên mục chủ shop đã tự sửa) */
    migrate6() {
      const d = this.data;
      if ((d.version || 1) >= 6) return;
      const swap = (list, defs, olds) => (list || []).forEach((x, i) => {
        const nw = defs.find(n => n.id === x.id);
        if (nw && olds[x.id] === x.title) list[i] = { ...nw, active: x.active };
      });
      swap(d.banners, BANNERS, OLD_DEFAULTS.banners);
      swap(d.sideAds, SIDE_ADS, OLD_DEFAULTS.sideAds);
      if (d.promos.popup?.image === OLD_DEFAULTS.popupImage) d.promos.popup.image = PROMOS.popup.image;
      if (d.settings.slogan === OLD_DEFAULTS.slogan) d.settings.slogan = SETTINGS.slogan;
      d.promos.coupons.forEach(c => { if (c.desc === OLD_DEFAULTS.lenden200) c.desc = 'Giảm 200K cho đơn từ 3 triệu'; });
      d.version = 6;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); return true; }
      catch (e) { alert('Không lưu được dữ liệu (bộ nhớ trình duyệt đầy?). Hãy dùng ảnh nhỏ hơn.'); return false; }
    },
    reset() { this.data = seed(); this.save(); },
    product(id) { return this.data.products.find(p => p.id === id); },
    category(id) { return this.data.categories.find(c => c.id === id); },
    /* Ảnh sản phẩm theo dòng xe đã chọn (không có thì dùng ảnh đại diện) */
    imageFor(p, vehicle) { return (vehicle && p.vehicleImages?.[vehicle]) || p.image; },

    /* Giá hiệu lực: ưu tiên giá flash sale nếu còn hạn */
    flashItem(pid) {
      const f = this.data.promos.flash;
      if (!f || !f.active || new Date(f.endsAt) < new Date()) return null;
      const it = f.items.find(i => i.productId === pid);
      const p = this.product(pid);
      // Chỉ áp giá flash khi thực sự rẻ hơn giá bán hiện tại
      return it && p && it.salePrice > 0 && it.salePrice < p.price ? it : null;
    },
    priceOf(p) {
      const fi = this.flashItem(p.id);
      const price = fi ? fi.salePrice : p.price;
      const compare = fi ? Math.max(p.price, p.oldPrice || 0) : (p.oldPrice || 0);
      return { price, compare: compare > price ? compare : 0, flash: !!fi };
    },
    /* Áp mã giảm giá: trả về {ok, discount, freeShip, msg} */
    applyCoupon(code, subtotal) {
      const c = this.data.promos.coupons.find(x => x.code.toUpperCase() === String(code).trim().toUpperCase());
      if (!c || !c.active) return { ok: false, msg: 'Mã không tồn tại hoặc đã tắt' };
      if (c.expires && new Date(c.expires + 'T23:59:59') < new Date()) return { ok: false, msg: 'Mã đã hết hạn' };
      if (subtotal < (c.min || 0)) return { ok: false, msg: `Đơn tối thiểu ${fmt(c.min)}` };
      let discount = 0, freeShip = false;
      if (c.type === 'percent') { discount = Math.round(subtotal * c.value / 100); if (c.max) discount = Math.min(discount, c.max); }
      else if (c.type === 'fixed') discount = Math.min(c.value, subtotal);
      else if (c.type === 'ship') freeShip = true;
      return { ok: true, code: c.code, discount, freeShip, msg: c.desc };
    },
    /* Video TikTok theo dòng xe: tự phân loại từ caption (dùng chung cho trang khách + Admin) */
    allVideos() { return [...(window.TIKTOK_MEDIA || [])].sort((a, b) => (b.video - a.video) || (b.views - a.views)); },
    // Dòng xe trong Admin + nhóm "Ô tô" (có video lắp cho Innova, CRV…)
    videoVehicleList() { return [...new Set([...this.data.vehicles.filter(v => v !== 'Tất cả dòng xe'), 'Ô tô'])]; },
    videoMatches(m, v) {
      const re = VIDEO_VEH_RE[v] || new RegExp(v.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      return re.test((m.cap || '').toLowerCase());
    },
    videoVehiclesOf(m) { return this.videoVehicleList().filter(v => this.videoMatches(m, v)); },
    videosFor(v) { return this.allVideos().filter(m => this.videoMatches(m, v)); },
    uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); },
  };

  function fmt(n) { return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'; }

  window.DB = DB;
  window.fmt = fmt;
  window.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  DB.load();
  // Đồng bộ giữa tab admin và tab khách
  window.addEventListener('storage', e => { if (e.key === KEY) { DB.load(); window.dispatchEvent(new Event('db-changed')); } });
})();
