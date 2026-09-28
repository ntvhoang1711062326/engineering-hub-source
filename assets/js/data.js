/* ============================================================
   TS SUPERLIGHT — Lớp dữ liệu dùng chung (trang khách + trang admin)
   Lưu trong localStorage để admin sửa là trang khách thấy ngay.
   Khi có backend thật: thay DB.load/DB.save bằng gọi API.
   ============================================================ */
(function () {
  const KEY = 'tsl_db_v1';
  const img = id => `assets/img/${id}.jpg`;
  const vid = id => `assets/video/${id}.mp4`;
  const tt = id => `https://www.tiktok.com/@ts.superlight/video/${id}`;

  const CATEGORIES = [
    { id: 'bi-cau', name: 'Bi cầu', icon: '◉', desc: 'Bi cầu LED projector Kenzo, Aozoom, CB150…' },
    { id: 'audi', name: 'Đèn Audi', icon: '≋', desc: 'Demi/xi nhan Audi A7, A8, đổi màu' },
    { id: 'den-hau', name: 'Đèn hậu', icon: '▭', desc: 'Hậu Audi, hậu bảng LED, hậu chỉnh app' },
    { id: 'combo', name: 'Combo trước sau', icon: '⇄', desc: 'Full option trọn bộ, tiết kiệm hơn' },
    { id: 'tro-sang', name: 'Trợ sáng · Bimini', icon: '✦', desc: 'Demi, zhipat, bimini, trợ sáng' },
    { id: 'phu-kien', name: 'Phụ kiện đèn', icon: '⚙', desc: 'Chóa, dây, relay, bảng LED' },
  ];

  const VEHICLES = ['Vario', 'Air Blade', 'Vision', 'SH', 'SH Mode', 'Lead', 'Scoopy', 'Future', 'NVX', 'Click', 'Vespa', 'Tất cả dòng xe'];

  const P = (id, name, cat, vehicles, price, oldPrice, imgId, extra = {}) => ({
    id, name, cat, vehicles, price, oldPrice, image: img(imgId),
    gallery: extra.gallery ? extra.gallery.map(img) : [],
    video: extra.video ? vid(imgId) : '',
    tiktok: tt(imgId),
    stock: extra.stock ?? 20,
    sold: extra.sold ?? Math.floor(20 + (parseInt(imgId.slice(-3)) % 180)),
    rating: extra.rating ?? 5,
    featured: !!extra.featured,
    isNew: !!extra.isNew,
    warranty: extra.warranty || '12 tháng',
    short: extra.short || '',
    desc: extra.desc || '',
    specs: extra.specs || {},
    vehicleImages: {}, // { 'Vario': 'assets/img/…jpg' } — ảnh riêng theo dòng xe
    active: true,
  });

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

  /* Giá bên dưới là GIÁ MẪU — chỉnh lại trong trang Admin */
  const PRODUCTS = [
    P('p01', 'Bi cầu Kenzo S600 Pro V2', 'bi-cau', ['Vario', 'Air Blade', 'Vision', 'SH'], 1850000, 2200000, '7482386436822519048', {
      featured: true, gallery: ['7513134420300352775', '7497615096949116167'],
      short: 'Bi cầu LED 2 chế độ cos/pha, vệt cắt sắc nét, không chói xe đối diện.',
      specs: { 'Công suất': '55W / bóng', 'Nhiệt màu': '6000K trắng', 'Điện áp': '12V', 'Chống nước': 'IP67' },
    }),
    P('p02', 'Bi cầu Kenzo S700 Pro V2', 'bi-cau', ['Air Blade', 'Vario', 'SH'], 2450000, 2750000, '7675338859588193543', {
      isNew: true, short: 'Thế hệ mới sáng hơn S600, tăng tầm chiếu xa, chip LED làm mát chủ động.',
      specs: { 'Công suất': '70W / bóng', 'Nhiệt màu': '5800K', 'Điện áp': '12V', 'Chống nước': 'IP67' },
    }),
    P('p03', 'Bi cầu Aozoom EX3', 'bi-cau', ['Scoopy', 'Lead', 'Vision', 'Air Blade'], 2650000, 2900000, '7622881459195399444', {
      featured: true, gallery: ['7634428134279925013', '7568740538187369735'],
      short: 'Aozoom chính hãng, ánh sáng tập trung, bảo hành 24 tháng.', warranty: '24 tháng',
      specs: { 'Thương hiệu': 'Aozoom', 'Công suất': '60W', 'Nhiệt màu': '6000K', 'Chống nước': 'IP68' },
    }),
    P('p04', 'Cặp bi cầu CB150 Pro', 'bi-cau', ['NVX', 'Vario', 'Air Blade'], 1650000, 0, '7681273723789495560', {
      short: 'Cặp 2 bi nhỏ gọn, phù hợp mặt nạ NVX, Vario.',
      specs: { 'Số lượng': '2 bi', 'Công suất': '45W / bi', 'Nhiệt màu': '6000K' },
    }),
    P('p05', 'Bi cầu mắt xoay Sharingan', 'bi-cau', ['Air Blade', 'Vario', 'SH'], 2900000, 3300000, '7676341375083793682', {
      isNew: true, featured: true, short: 'Kenzo S600 Pro V3 kèm mắt xoay Sharingan hiệu ứng động — cực nổi.',
      specs: { 'Hiệu ứng': 'Mắt xoay RGB', 'Điều khiển': 'App Bluetooth', 'Công suất': '55W' },
    }),
    P('p06', 'Mắt chớp (mắt quỷ) bi cầu', 'phu-kien', ['Tất cả dòng xe'], 450000, 550000, '7475295111216155922', {
      short: 'Mắt quỷ gắn trong bi cầu, nhiều màu, chớp theo nhịp.',
      specs: { 'Màu': 'Đỏ / Xanh / RGB', 'Điện áp': '12V' },
    }),
    P('p07', 'Demi Audi A7 Pro V3', 'audi', ['Air Blade', 'Vario', 'Vision', 'SH'], 1350000, 1550000, '7623267460459924757', {
      featured: true, gallery: ['7639196270099172628', '7616596969569406229'],
      short: 'Dải LED Audi chạy đuổi, tích hợp xi nhan, lắp như zin.',
      specs: { 'Chế độ': 'Demi + xi nhan chạy đuổi', 'Màu': 'Trắng / Vàng', 'Điện áp': '12V' },
    }),
    P('p08', 'Demi Audi A8 Pro ngôi sao', 'audi', ['Vario', 'Air Blade', 'NVX'], 1650000, 0, '7688304356801662226', {
      isNew: true, short: 'Audi A8 Pro hoạ tiết ngôi sao, sáng đều, không hắt sáng.',
      specs: { 'Chế độ': 'Demi + xi nhan', 'Màu': 'Trắng', 'Điện áp': '12V' },
    }),
    P('p09', 'Audi đổi màu RGB', 'audi', ['Air Blade', 'Vario', 'Vision'], 1550000, 1790000, '7670084619982916882', {
      short: 'Đổi màu theo ý thích qua app, nhiều hiệu ứng chạy.',
      specs: { 'Màu': 'RGB 16 triệu màu', 'Điều khiển': 'App điện thoại', 'Điện áp': '12V' },
    }),
    P('p10', 'Audi A7 cho Air Blade 2026', 'audi', ['Air Blade'], 1350000, 0, '7631484082240670996', {
      video: true, featured: true, gallery: ['7661850610035182869', '7636993325802818837'],
      short: 'Bản riêng cho AB 2026, cắm giắc zin, không cắt dây.',
      specs: { 'Đời xe': 'Air Blade 2026', 'Chế độ': 'Demi + xi nhan chạy đuổi' },
    }),
    P('p11', 'Hậu Audi A7 Vario', 'den-hau', ['Vario'], 1250000, 1450000, '7613980016220671253', {
      video: true, featured: true, gallery: ['7625123255896001812', '7647764770388479253', '7611750448004893972'],
      short: 'Mẫu hậu bán chạy nhất shop — phanh, xi nhan chạy đuổi, demi hậu.',
      specs: { 'Đời xe': 'Vario 125/150/160', 'Chức năng': 'Hậu + phanh + xi nhan', 'Lắp đặt': 'Giắc zin' },
    }),
    P('p12', 'Hậu Audi A7 Air Blade', 'den-hau', ['Air Blade'], 1250000, 1400000, '7628819982461390101', {
      gallery: ['7649992336075672852', '7614716092409335061'],
      short: 'Gắn như zin, sáng rõ, tăng an toàn khi phanh.',
      specs: { 'Đời xe': 'AB 2016 – 2026', 'Chức năng': 'Hậu + phanh + xi nhan' },
    }),
    P('p13', 'Hậu Audi chỉnh app đổi hiệu ứng', 'den-hau', ['Vario', 'Air Blade'], 1690000, 1990000, '7623651883256679700', {
      isNew: true, gallery: ['7624354499867561237', '7614337085796896020'],
      short: 'Chỉnh hiệu ứng trên app — thích kiểu nào chỉnh kiểu đó.',
      specs: { 'Điều khiển': 'App Bluetooth', 'Hiệu ứng': '20+ kiểu', 'Chức năng': 'Hậu + phanh + xi nhan' },
    }),
    P('p14', 'Hậu bảng LED + Audi Vario', 'den-hau', ['Vario'], 1450000, 0, '7658584023949659399', {
      short: 'Bảng LED ma trận kết hợp dải Audi, nhìn cực hiện đại.',
      specs: { 'Đời xe': 'Vario', 'Loại': 'Bảng LED ma trận' },
    }),
    P('p15', 'Hậu Audi Lead 2020 – 2026', 'den-hau', ['Lead'], 1190000, 1350000, '7629736608509611285', {
      short: 'Dành riêng cho Lead 4 van, lắp đặt nhanh.',
      specs: { 'Đời xe': 'Lead 2020 – 2026', 'Chức năng': 'Hậu + phanh + xi nhan' },
    }),
    P('p16', 'Hậu Audi SH Mode', 'den-hau', ['SH Mode'], 1290000, 0, '7617699797549518101', {
      short: 'Tinh tế, sang trọng, hợp phong cách SH Mode.',
      specs: { 'Đời xe': 'SH Mode', 'Chức năng': 'Hậu + phanh + xi nhan' },
    }),
    P('p17', 'Hậu Audi A7 Future 125 Fi', 'den-hau', ['Future'], 1150000, 1300000, '7615485842877910293', {
      short: 'Cho Future 125 Fi, dải Audi chạy đuổi.',
      specs: { 'Đời xe': 'Future 125 Fi', 'Chức năng': 'Hậu + phanh + xi nhan' },
    }),
    P('p18', 'Combo Audi trước sau + Zhipat Vision 2017–2019', 'combo', ['Vision'], 3290000, 3800000, '7477175155995757831', {
      video: true, featured: true, sold: 312,
      short: 'Video 112K lượt xem! Full combo Audi trước sau + zhipat cho Vision.',
      specs: { 'Đời xe': 'Vision 2017 – 2019', 'Bao gồm': 'Audi trước, hậu Audi, zhipat', 'Lắp đặt': 'Miễn phí tại shop' },
    }),
    P('p19', 'Full đèn Vario 160 — 4 bi vòng 3D', 'combo', ['Vario'], 5900000, 6500000, '7632184781651840276', {
      featured: true, short: '4 bi cầu thật nét và sáng, vòng 3D cực ngầu.',
      specs: { 'Đời xe': 'Vario 160', 'Bao gồm': '4 bi cầu + vòng 3D + demi' },
    }),
    P('p20', 'Combo Bi cầu + Audi Scoopy 2020–2024', 'combo', ['Scoopy'], 3950000, 4400000, '7639587781437689109', {
      gallery: ['7584317182306274581'],
      short: 'Đi Scoopy là phải lên đèn — bi cầu + Audi trọn bộ.',
      specs: { 'Đời xe': 'Scoopy 2020 – 2024', 'Bao gồm': 'Bi cầu + Audi' },
    }),
    P('p21', 'Combo Audi A7 trước sau Vision 2016–2019', 'combo', ['Vision'], 2490000, 2800000, '7503537333468253448', {
      short: 'Combo Audi A7 trước + hậu cho Vision, lắp như zin.',
      specs: { 'Đời xe': 'Vision 2016 – 2019', 'Bao gồm': 'Audi trước + hậu Audi' },
    }),
    P('p22', 'Full option Audi + Bi cầu Vario', 'combo', ['Vario'], 4650000, 5200000, '7654074125723421970', {
      gallery: ['7611872850621877511', '7579255653617782034'],
      short: 'Full option trước sau cho Vario, sáng — đẹp — an toàn.',
      specs: { 'Đời xe': 'Vario 125/150/160', 'Bao gồm': 'Bi cầu + Audi trước + hậu Audi' },
    }),
    P('p23', 'Combo Aozoom EX3 + Audi A7 cho Lead', 'combo', ['Lead'], 3590000, 3990000, '7546259462840061192', {
      short: 'Bi cầu Aozoom EX3 kết hợp Audi A7 cho Lead.',
      specs: { 'Đời xe': 'Lead', 'Bao gồm': 'Bi EX3 + Audi A7' },
    }),
    P('p24', 'Demi Future chữ X', 'tro-sang', ['Future'], 450000, 0, '7627722033517907220', {
      short: 'Demi hình chữ X cho Future 125, nổi bật ban đêm.',
      specs: { 'Đời xe': 'Future 125 Fi', 'Màu': 'Trắng' },
    }),
    P('p25', 'Hậu bảng LED + Audi V3 + Zhipat Future', 'combo', ['Future'], 2850000, 3150000, '7621018915308670228', {
      short: 'Combo bảng LED + Audi V3 + zhipat cho Future — quá nét!',
      specs: { 'Đời xe': 'Future 125 Fi', 'Bao gồm': 'Hậu bảng LED + Audi V3 + zhipat' },
    }),
    P('p26', 'Chóa đèn pha Vario mẫu X mới', 'phu-kien', ['Vario'], 3450000, 0, '7623989432148053269', {
      video: true, isNew: true, featured: true,
      short: 'Mẫu mới 74K lượt xem — chóa pha thiết kế chữ X kèm hậu đồng bộ.',
      specs: { 'Đời xe': 'Vario 2023+', 'Bao gồm': 'Chóa pha + hậu' },
    }),
    P('p27', 'Zhipat trợ sáng đa năng', 'tro-sang', ['Tất cả dòng xe'], 390000, 490000, '7497615096949116167', {
      short: 'Trợ sáng / zhipat lắp mọi dòng xe, tăng khả năng nhận diện.',
      specs: { 'Điện áp': '12V', 'Chống nước': 'IP67' },
    }),
    P('p28', 'Bimini LED mini 2 màu', 'tro-sang', ['Tất cả dòng xe'], 650000, 750000, '7507577085100068104', {
      short: 'Bi mini 2 màu vàng/trắng, xuyên sương mưa tốt.',
      specs: { 'Màu': 'Trắng / Vàng', 'Công suất': '30W' },
    }),
  ];
  PRODUCTS.forEach(p => {
    p.vehicleImages = suggestVehicleImages(p);
    if (!p.desc) p.desc = `${p.name} — ${p.short}\n\nSản phẩm được TS SUPERLIGHT tuyển chọn và lắp đặt trực tiếp tại shop. Test sáng miễn phí trước khi lắp, bảo hành ${p.warranty}, hỗ trợ đổi mới 7 ngày nếu lỗi nhà sản xuất.\n\nGiá tuỳ đời xe — liên hệ Hotline/Zalo để được báo giá và tư vấn. Đặt chỗ online, cọc trước để giữ hàng và lịch lắp.`;
  });

  const BANNERS = [
    { id: 'b1', title: 'Lên đèn cháy phố', subtitle: 'Full combo Audi trước sau + Zhipat cho Vision — giảm đến 500K', image: img('7477175155995757831'), video: vid('7477175155995757831'), cta: 'Xem combo', link: '#/product/p18', active: true, theme: 'amber' },
    { id: 'b2', title: 'Vario mẫu đèn mới', subtitle: 'Chóa pha chữ X + hậu đồng bộ — mẫu hot 74K lượt xem', image: img('7623989432148053269'), video: vid('7623989432148053269'), cta: 'Khám phá', link: '#/product/p26', active: true, theme: 'cyan' },
    { id: 'b3', title: 'Bi cầu Kenzo · Aozoom', subtitle: 'Sáng — nét — không chói. Test sáng miễn phí tại shop', image: img('7482386436822519048'), video: '', cta: 'Chọn bi cầu', link: '#/category/bi-cau', active: true, theme: 'red' },
  ];

  const SIDE_ADS = [
    { id: 'a1', title: 'Hậu Audi A7', subtitle: 'Liên hệ báo giá', image: img('7625123255896001812'), link: '#/category/den-hau', active: true },
    { id: 'a2', title: 'Audi AB 2026', subtitle: 'Lắp như zin', image: img('7661850610035182869'), link: '#/product/p10', active: true },
  ];

  const in7days = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16);
  const PROMOS = {
    coupons: [
      { code: 'SUPERLIGHT10', type: 'percent', value: 10, min: 1000000, max: 500000, expires: '2026-12-31', active: true, desc: 'Giảm 10% đơn từ 1 triệu (tối đa 500K)' },
      { code: 'LENDEN200', type: 'fixed', value: 200000, min: 3000000, max: 0, expires: '2026-12-31', active: true, desc: 'Giảm 200K cho combo từ 3 triệu' },
      { code: 'FREESHIP', type: 'ship', value: 0, min: 0, max: 0, expires: '2026-12-31', active: true, desc: 'Miễn phí vận chuyển' },
    ],
    flash: {
      active: true,
      title: 'Flash Sale cuối tuần',
      endsAt: in7days(),
      items: [
        { productId: 'p11', salePrice: 1090000 },
        { productId: 'p07', salePrice: 1190000 },
        { productId: 'p01', salePrice: 1690000 },
        { productId: 'p18', salePrice: 2990000 },
        { productId: 'p27', salePrice: 290000 },
      ],
    },
    popup: { active: true, title: 'Đặt chỗ lắp đèn online', text: 'Chọn mẫu đèn, hẹn giờ lắp và cọc trước để giữ hàng. Lắp đặt miễn phí tại shop Bình Thạnh!', image: img('7613980016220671253'), link: '#/category/den-hau' },
    topbar: { active: true, text: '🔥 Lắp đặt miễn phí tại shop · Đặt chỗ online, cọc giữ lịch · Bảo hành đến 24 tháng' },
  };

  const SETTINGS = {
    shopName: 'TS SUPERLIGHT',
    slogan: 'Chuyên làm Bi cầu · Audi · Trợ sáng · Bimini',
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
    version: 3,
    categories: CATEGORIES,
    vehicles: VEHICLES,
    products: PRODUCTS,
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
