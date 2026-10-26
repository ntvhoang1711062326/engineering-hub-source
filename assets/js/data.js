/* ============================================================
   TS SUPERLIGHT — Lớp dữ liệu dùng chung (trang khách + trang admin)
   - Admin (máy chủ shop): sửa bản nháp trong localStorage, bấm "Xuất bản lên web"
     để ghi assets/data/catalog.json lên GitHub (xem admin.js → GH).
   - Trang khách: đọc assets/data/catalog.json mới nhất; chỉ lưu đơn của chính khách.
     Mở trên máy (file:// / localhost) thì hiển thị bản nháp của Admin để xem trước.
   ============================================================ */
(function () {
  const KEY = 'tsl_db_v1';                     // bản nháp của Admin
  const CATALOG_URL = 'assets/data/catalog.json';
  const CATALOG_CACHE = 'tsl_catalog_cache';   // bản catalog khách tải gần nhất (hiện ngay khi mở lại)
  const MY_ORDERS = 'tsl_my_orders';           // đơn khách đã đặt trên máy này (trang "Đặt chỗ thành công")
  const CATALOG_KEYS = ['version', 'categories', 'vehicles', 'products', 'banners', 'sideAds', 'promos', 'settings', 'tiktok', 'tiktokChannels'];
  const IS_ADMIN = !!window.IS_ADMIN;
  const IS_LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
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

  /* Hàng Titan Moto (danh mục Đèn Bi LED / Đèn trợ sáng / Bóng LED trên titanmoto.vn). Giá 0 = web hiện "Liên hệ" */
  const TITAN_CATEGORIES = [
    { id: 'titan-bi-led', name: 'Đèn Bi LED Titan Moto', icon: '◎', desc: 'Bi LED Black Mini, CB150, CB100, F200 chính hãng' },
    { id: 'titan-tro-sang', name: 'Đèn trợ sáng Titan Moto', icon: '✧', desc: 'Trợ sáng M10, M20, M60, F1, F2 Zero GT' },
    { id: 'titan-bong-led', name: 'Bóng LED Titan Moto', icon: '✦', desc: 'Bóng LED, Bi LED mini Titan Moto' },
  ];
  const T = (id, name, cat, price, short, extra = {}) => ({
    id, name, cat, vehicles: ['Tất cả dòng xe'], price, oldPrice: extra.oldPrice || 0, image: `assets/img/titan/${id}.jpg`,
    gallery: [], video: '', tiktok: '', stock: 20, sold: 0, rating: 5, featured: false, isNew: false, warranty: extra.warranty,
    short, desc: `${name} — ${short}

Sản phẩm chính hãng Titan Moto, lắp đặt và test sáng trực tiếp tại TS SUPERLIGHT. Liên hệ Hotline/Zalo để được tư vấn theo dòng xe.`,
    specs: { 'Thương hiệu': 'Titan Moto', ...extra.specs }, vehicleImages: {}, active: true,
  });
  const TITAN_PRODUCTS = [
    T("tt-black-mini-20-version-2", "Bi LED Titan Moto Black Mini 2.0 Version 2", "titan-bi-led", 3400000, "Cos 45W – Pha 50W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "45W", "Công suất Pha": "50W", "Nhân LED": "6+1 chip Led (Osram)", "Nhiệt màu": "5000K", "Điện áp": "12V"}}),
    T("tt-black-mini-20-version-2-square", "Bi LED Titan Moto Black Mini 2.0 Version 2 Square", "titan-bi-led", 3400000, "Cos 45W – Pha 50W · 5500K · Ánh sáng mịn đều.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "45W", "Công suất Pha": "50W", "Nhân LED": "6+1 chip Led (Osram)", "Nhiệt màu": "5500K", "Điện áp": "12 - 16V", "Đặc điểm nổi bật": "Ánh sáng mịn đều"}}),
    T("tt-cb150-pro-square", "Bi LED Titan Moto CB150 Pro Square", "titan-bi-led", 5000000, "Công suất 55W · 5500K · Công nghệ thoát sáng TWR.", {"warranty": "2 năm", "specs": {"Công suất Cos": "55W", "Nhân LED": "9+1+1 (Osram)", "Nhiệt màu": "5500K", "Tuổi thọ": "30000 giờ", "Kích thước lens": "3.0 inch", "Vật liệu tản nhiệt": "Quạt + Khối Nhôm", "Đặc điểm nổi bật": "Công nghệ thoát sáng TWR"}}),
    T("tt-black-mini-20-square", "Titan Moto Black Mini 2.0 Square", "titan-bi-led", 3400000, "Cos 40W – Pha 45W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "40W", "Công suất Pha": "45W", "Nhiệt màu": "5000K"}}),
    T("tt-cb150-pro", "Bi LED Titan Moto CB150 Pro", "titan-bi-led", 5000000, "Cos 55W – Pha 65W · 5500K · Công nghệ thoát sáng TWR.", {"warranty": "2 năm", "specs": {"Công suất Cos": "55W", "Công suất Pha": "65W", "Nhân LED": "9+1+1 (Osram)", "Nhiệt màu": "5500K", "Tuổi thọ": "30000 giờ", "Kích thước lens": "3.0 inch", "Vật liệu tản nhiệt": "Quạt + Khối Nhôm", "Đặc điểm nổi bật": "Công nghệ thoát sáng TWR"}}),
    T("tt-f200-storm", "Bi LED Titan Moto F200 Storm", "titan-bi-led", 6000000, "Cos 50W – Pha 80W · 5500K · Hai trợ pha - siêu nhỏ gọn.", {"warranty": "2 năm", "specs": {"Công suất Cos": "50W", "Công suất Pha": "80W", "Nhân LED": "9", "Nhiệt màu": "5500K", "Mắt trợ pha": "1+1", "Kích thước lens": "3.0 inch", "Đặc điểm nổi bật": "Hai trợ pha - siêu nhỏ gọn"}}),
    T("tt-cb100-pro", "Bi LED Titan Moto CB100 Pro", "titan-bi-led", 4000000, "Cos 55W – Pha 65W · 5500K · Phiên bản tiết kiệm - Công nghệ đầy đủ.", {"warranty": "2 năm", "specs": {"Công suất Cos": "55W", "Công suất Pha": "65W", "Nhân LED": "6 (big) + 1", "Nhiệt màu": "5500K", "Đặc điểm nổi bật": "Phiên bản tiết kiệm - Công nghệ đầy đủ"}}),
    T("tt-cb100-pro-square", "Bi LED Titan Moto CB100 Pro Square", "titan-bi-led", 4000000, "Cos 55W – Pha 65W · 5500K · Phiên bản tiết kiệm - công nghệ đầy đủ.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "55W", "Công suất Pha": "65W", "Nhân LED": "6 (Big) + 1", "Nhiệt màu": "5500K", "Kích thước lens": "3.0 inch", "Đặc điểm nổi bật": "Phiên bản tiết kiệm - công nghệ đầy đủ"}}),
    T("tt-mini-f15", "Bi LED Mini Titan Moto F15", "titan-bi-led", 2200000, "Cos 35W – Pha 50W · 5500K.", {"warranty": "1 năm", "specs": {"Công suất Cos": "35W", "Công suất Pha": "50W", "Số nhân LED": "6 (Big) + 6", "Nhiệt màu": "5500K", "Vật liệu tản nhiệt": "Aluminum"}}),
    T("tt-black-mini-2", "Bi LED Titan Moto Black Mini 2.0 Inch", "titan-bi-led", 3400000, "Cos 40W – Pha 45W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "40W", "Công suất Pha": "45W", "Nhân LED": "6+1 Osram", "Nhiệt màu": "5000K", "Điện áp": "12V"}}),
    T("tt-cb750", "Bi LED Titan Moto CB750", "titan-bi-led", 3000000, "Cos 45W – Pha 55W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "45W", "Công suất Pha": "55W", "Nhiệt màu": "5000K"}, "oldPrice": 3500000}),
    T("tt-cb150", "Bi LED Titan Moto CB150", "titan-bi-led", 5000000, "Cos 55W – Pha 65W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "55W", "Công suất Pha": "65W", "Nhiệt màu": "5000K"}}),
    T("tt-black-mini-18-laser", "Titan Moto Black Mini 1.8 Laser", "titan-bi-led", 4000000, "Cos 50W – Pha 60W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "50W", "Công suất Pha": "60W", "Nhiệt màu": "5000K"}}),
    T("tt-black-mini-18", "Bi LED Titan Black Mini 1.8", "titan-bi-led", 4000000, "Cos 40W – Pha 45W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "40W", "Công suất Pha": "45W", "Nhiệt màu": "5000K"}}),
    T("tt-cb150-hp", "Bi LED Titan Moto CB150 HP", "titan-bi-led", 6500000, "Cos 45W – Pha 75W · 5800K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "45W", "Công suất Pha": "75W", "Nhiệt màu": "5800K"}}),
    T("tt-black-mini-15-inch", "Bi LED Titan Black Mini 1.5 Inch", "titan-bi-led", 4000000, "Cos 40W – Pha 45W · 5000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "40W", "Công suất Pha": "45W", "Nhiệt màu": "5000K"}}),
    T("tt-m45-hyper", "Đèn trợ sáng Titan Moto M45 Hyper", "titan-tro-sang", 3500000, "Công suất 45W · 6000K - 3000K · Vùng sáng rộng, sắc nét.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất": "45W", "Nhân LED": "6+6 (Big) thế hệ mới", "Nhiệt màu": "6000K - 3000K", "Đặc điểm nổi bật": "Vùng sáng rộng, sắc nét"}}),
    T("tt-m60-ultra-v2", "Đèn trợ sáng Titan Moto M60 Ultra V2", "titan-tro-sang", 2500000, "Công suất 65W · 6000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất": "65W", "Nhân LED": "Sft-40", "Nhiệt màu": "6000K"}}),
    T("tt-m10-ultra-v2", "Đèn trợ sáng M10 Ultra V2", "titan-tro-sang", 1700000, "Công suất 28W · 6000K/3000K · Cường độ sáng mạnh, mặt cắt sắc nét.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất": "28W", "Nhân LED": "3 Vàng + 3 Trắng", "Nhiệt màu": "6000K/3000K", "Chống nước": "IP68", "Điện áp": "12 - 16V", "Đặc điểm nổi bật": "Cường độ sáng mạnh, mặt cắt sắc nét"}}),
    T("tt-f1-turbo-s", "Đèn trợ sáng Titan Moto F1 Turbo S", "titan-tro-sang", 4200000, "Cos 42W – Pha 67W · 4300K/5500K · Trợ pha kép, giả lập laser.", {"warranty": "1 năm", "specs": {"Công suất Cos": "42W", "Công suất Pha": "67W", "Nhân LED": "6 (big) + 1 + 1 (osram)", "Nhiệt màu": "4300K/5500K", "Chống nước": "IP68", "Tuổi thọ": "30.000 GIỜ", "Vật liệu tản nhiệt": "Chủ động và thụ động", "Đặc điểm nổi bật": "Trợ pha kép, giả lập laser"}}),
    T("tt-f1-gt", "Đèn trợ sáng Titan Moto F1 GT", "titan-tro-sang", 2500000, "Cos ~30W – Pha ~40W · 5500K/3000K & 5500K/5500K · Trợ sáng nhỏ gọn - chuẩn sáng Bi LED.", {"warranty": "1 năm", "specs": {"Công suất Cos": "~30W", "Công suất Pha": "~40W", "Nhân LED": "3+3", "Nhiệt màu": "5500K/3000K & 5500K/5500K", "Đặc điểm nổi bật": "Trợ sáng nhỏ gọn - chuẩn sáng Bi LED"}}),
    T("tt-m10-plus", "Đèn trợ sáng Titan Moto M10 Plus", "titan-tro-sang", 1200000, "Công suất 20W · Nhỏ gọn, tối ưu hiệu ứng.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "20W", "Công suất": "20W", "Nhân LED": "3 Trắng + 3 Vàng", "Điện áp": "12 - 16V", "Đặc điểm nổi bật": "Nhỏ gọn, tối ưu hiệu ứng"}}),
    T("tt-f2-zero-gt", "Đèn trợ sáng Titan Moto F2 Zero GT", "titan-tro-sang", 3500000, "Cos ~45W – Pha ~65W · 4800K/3000K & 5500K/3000K · Hai nguồn sáng cos, ba nguồn sáng pha.", {"warranty": "2 năm", "specs": {"Công suất Cos": "~45W", "Công suất Pha": "~65W", "Nhân LED": "6+6+1+1+1", "Nhiệt màu": "4800K/3000K & 5500K/3000K", "Đặc điểm nổi bật": "Hai nguồn sáng cos, ba nguồn sáng pha"}}),
    T("tt-m90-ultra", "Đèn trợ sáng Titan Moto M90 Ultra", "titan-tro-sang", 2999000, "5500K.", {"warranty": "12 tháng", "specs": {"Nhân LED": "Luminus SBT90.2", "Nhiệt màu": "5500K", "Điện áp": "12-16V", "Vật liệu tản nhiệt": "Thụ động"}}),
    T("tt-m60-ultra-high", "Đèn trợ sáng Titan Moto M60 Ultra High", "titan-tro-sang", 2800000, "Cos 70W – Pha 70W.", {"warranty": "12 tháng", "specs": {"Công suất Cos": "70W", "Công suất Pha": "70W"}}),
    T("tt-m10-ultra", "Đèn trợ sáng Titan Moto M10 Ultra", "titan-tro-sang", 1400000, "Công suất 25W.", {"warranty": "12 tháng", "specs": {"Công suất Pha": "25W", "Nhân LED": "Titan Custom", "Cường độ ánh sáng": "7.500 lux", "Điện áp": "12V"}}),
    T("tt-m60-ultra", "Đèn trợ sáng Titan Moto M60 Ultra", "titan-tro-sang", 2500000, "Công suất 60W.", {"warranty": "12 tháng", "specs": {"Công suất Pha": "60W", "Cường độ ánh sáng": "7.500 lux"}}),
    T("tt-m20-ultra", "Đèn trợ sáng Titan Moto M20 Ultra", "titan-tro-sang", 2800000, "Cos 50W – Pha 50W · 3000K, 6000K.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "50W", "Công suất Pha": "50W", "Nhiệt màu": "3000K, 6000K"}}),
    T("tt-z20", "Titan Moto Z20", "titan-tro-sang", 0, "Cos 35W – Pha 60W.", {"warranty": "Theo chính sách Titan Moto", "specs": {"Công suất Cos": "35W", "Công suất Pha": "60W", "Cường độ ánh sáng": "7.500 lux"}}),
    T("tt-z40", "Titan Moto Z40", "titan-tro-sang", 0, "Cos 45-50W – Pha 90-100W.", {"warranty": "12 tháng", "specs": {"Công suất Cos": "45-50W", "Công suất Pha": "90-100W"}}),
    T("tt-l60", "Titan Moto L60", "titan-tro-sang", 0, "Cos 30-35W – Pha 90-100W.", {"warranty": "12 tháng", "specs": {"Công suất Cos": "30-35W", "Công suất Pha": "90-100W"}}),
    T("tt-f60", "Titan Moto F60", "titan-tro-sang", 0, "Cos 110w – Pha 150w.", {"warranty": "12 tháng", "specs": {"Công suất Cos": "110w", "Công suất Pha": "150w"}}),
    T("tt-mini-f15-v2", "Bi LED Mini Titan Moto F-15 V2", "titan-bong-led", 2200000, "Cos ~40W/đèn – Pha ~65W/đèn · 5500K.", {"warranty": "12 tháng", "specs": {"Công suất Cos": "~40W/đèn", "Công suất Pha": "~65W/đèn", "Chân bóng": "H4", "Nhiệt màu": "5500K"}}),
    T("tt-bong-led-a7-ultra", "Bóng LED Titan A7 Ultra", "titan-bong-led", 2200000, "Công suất ~70W · 6000K · Tăng sáng 300%.", {"warranty": "2 năm", "specs": {"Công suất": "~70W", "Chân bóng": "H4, H7, H11, 9005", "Nhiệt màu": "6000K", "Vật liệu tản nhiệt": "Quạt + 2 Ống đồng + Lá tản nhiệt", "Đặc điểm nổi bật": "Tăng sáng 300%"}}),
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
    popup: { active: true, title: 'Tư vấn lắp đèn miễn phí', text: 'Chọn mẫu đèn ưng ý rồi gọi hoặc nhắn Zalo để được tư vấn, báo giá theo dòng xe. Lắp đặt miễn phí tại shop Bình Thạnh!', image: kimg('kz-s700-pro'), link: '#/category/all' },
    topbar: { active: true, text: '🔥 Lắp đặt miễn phí tại shop · Test sáng trước khi lắp · Bảo hành đến 24 tháng' },
  };

  const SETTINGS = {
    shopName: 'TS SUPERLIGHT',
    slogan: 'Chuyên lắp Bi LED · Laser · Trợ sáng Kenzo chính hãng',
    zalo: '0769678981',
    hotline: '0769678981',
    address: '38/8 Đường Đinh Bộ Lĩnh, Bình Thạnh, Hồ Chí Minh',
    hours: '8:00 – 20:00 (Cả T7 & CN)',
    tiktok: 'https://www.tiktok.com/@ts.superlight',
    tiktok2: 'https://www.tiktok.com/@_superlightshop_',
    deposit: 200000, // tiền cọc giữ chỗ cho mỗi lượt đặt
    bankName: '',
    bankAccount: '',
    bankOwner: '',
  };

  const seed = () => ({
    version: 9,
    categories: [...KENZO_CATEGORIES, ...TITAN_CATEGORIES],
    vehicles: VEHICLES,
    products: [...KENZO_PRODUCTS, ...TITAN_PRODUCTS],
    banners: BANNERS,
    sideAds: SIDE_ADS,
    promos: PROMOS,
    settings: SETTINGS,
    orders: [],
  });

  const DB = {
    data: null,
    load() {
      const draft = readJSON(KEY);
      if (IS_ADMIN) this.data = draft || seed();
      else {
        // Khách: catalog đã xuất bản (bản cache gần nhất, refresh() sẽ tải bản mới) — trên máy shop thì xem trước bản nháp
        const cat = (IS_LOCAL && draft) || readJSON(CATALOG_CACHE) || {};
        this.data = { ...seed(), ...pick(cat, CATALOG_KEYS), orders: readJSON(MY_ORDERS) || [] };
        this.previewDraft = !!(IS_LOCAL && draft);
      }
      this.migrate();
      this.migrate3();
      this.migrate4();
      this.migrate5();
      this.migrate6();
      this.migrate7();
      this.migrate8();
      this.migrate9();
      if (this.data.settings.tiktok2 == null) this.data.settings.tiktok2 = SETTINGS.tiktok2;
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
    /* v7: thêm danh mục + sản phẩm Titan Moto, giữ nguyên dữ liệu đã có */
    migrate7() {
      const d = this.data;
      if ((d.version || 1) >= 7) return;
      TITAN_CATEGORIES.forEach(c => { if (!d.categories.some(x => x.id === c.id)) d.categories.push({ ...c }); });
      TITAN_PRODUCTS.forEach(p => { if (!d.products.some(x => x.id === p.id)) d.products.push(JSON.parse(JSON.stringify(p))); });
      d.version = 7;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    /* v8: địa chỉ shop cụ thể (chỉ thay khi chủ shop chưa tự sửa địa chỉ mặc định cũ) */
    migrate8() {
      const d = this.data;
      if ((d.version || 1) >= 8) return;
      if (d.settings.address === 'Bình Thạnh, TP. Hồ Chí Minh') d.settings.address = SETTINGS.address;
      d.version = 8;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    /* v9: bỏ đặt chỗ & tiền cọc trên trang khách → đổi chữ thanh thông báo / popup mặc định (giữ nguyên nếu chủ shop đã tự sửa) */
    migrate9() {
      const d = this.data, pr = d.promos;
      if ((d.version || 1) >= 9) return;
      if (pr.topbar?.text === '🔥 Lắp đặt miễn phí tại shop · Đặt chỗ online, cọc giữ lịch · Bảo hành đến 24 tháng') pr.topbar.text = PROMOS.topbar.text;
      if (pr.popup?.title === 'Đặt chỗ lắp đèn online') pr.popup.title = PROMOS.popup.title;
      if (pr.popup?.text === 'Chọn mẫu đèn, hẹn giờ lắp và cọc trước để giữ hàng. Lắp đặt miễn phí tại shop Bình Thạnh!') pr.popup.text = PROMOS.popup.text;
      d.version = 9;
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    },
    save() {
      try {
        if (IS_ADMIN) localStorage.setItem(KEY, JSON.stringify(this.data));
        else localStorage.setItem(MY_ORDERS, JSON.stringify(this.data.orders.slice(0, 20)));
        return true;
      } catch (e) { alert('Không lưu được dữ liệu (bộ nhớ trình duyệt đầy?). Hãy dùng ảnh nhỏ hơn.'); return false; }
    },
    reset() { this.data = seed(); this.save(); },
    /* Phần dữ liệu đưa lên web (không gồm đơn hàng) */
    catalog() { return pick(this.data, CATALOG_KEYS); },
    /* Trang khách: tải catalog mới nhất từ web; khác bản đang hiện thì báo 'db-changed' để vẽ lại */
    async refresh() {
      if (IS_ADMIN || this.previewDraft) return;
      try {
        const res = await fetch(`${CATALOG_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const cat = pick(await res.json(), CATALOG_KEYS);
        if (!cat.products) return;
        try { localStorage.setItem(CATALOG_CACHE, JSON.stringify(cat)); } catch (e) {}
        if (JSON.stringify(cat) === JSON.stringify(this.catalog())) return;
        Object.assign(this.data, cat);
        window.dispatchEvent(new Event('db-changed'));
      } catch (e) { /* mất mạng / mở file:// → giữ bản đang có */ }
    },
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
    // media.js là danh sách gốc; data.tiktok = video mới / số liệu mới từ nút "Đồng bộ TikTok" ở Admin
    media() {
      const sync = new Map((this.data.tiktok || []).map(x => [x.id, x]));
      const base = (window.TIKTOK_MEDIA || []).map(m => sync.has(m.id) ? { ...m, ...sync.get(m.id) } : m);
      const known = new Set(base.map(m => m.id));
      const added = [...sync.values()].filter(x => !known.has(x.id)).map(x => ({ cap: '', views: 0, likes: 0, video: false, ...x }));
      return [...added.sort((a, b) => b.id.length - a.id.length || b.id.localeCompare(a.id)), ...base];
    },
    allVideos() { return this.media().sort((a, b) => (b.video - a.video) || (b.views - a.views)); },
    // Video mới đồng bộ chưa xuất bản: ảnh bìa còn nằm trong bản nháp (data:…)
    cover(m) { return m.cover || img(m.id); },
    /* Kênh TikTok: link ở Cài đặt (tiktok, tiktok2) + thông tin kênh (media.js, số liệu mới từ Đồng bộ) */
    chOf(m) { return m.ch || 'ts.superlight'; },
    channels() {
      const s = this.data.settings, users = [s.tiktok, s.tiktok2 ?? SETTINGS.tiktok2].map(u => (String(u || '').match(/@([\w.]+)/) || [])[1]).filter(Boolean);
      return [...new Set(users)].map(user => ({
        user, name: '@' + user, followers: 0, likes: 0, avatar: '',
        ...(window.TIKTOK_CHANNELS || []).find(c => c.user === user), ...(this.data.tiktokChannels || {})[user],
        url: 'https://www.tiktok.com/@' + user,
      }));
    },
    channelVideos(user) { return this.media().filter(m => this.chOf(m) === user).sort((a, b) => b.id.length - a.id.length || b.id.localeCompare(a.id)); },
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
  function pick(o, keys) { return Object.fromEntries(keys.filter(k => o && o[k] !== undefined).map(k => [k, o[k]])); }

  window.DB = DB;
  window.fmt = fmt;
  window.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  DB.load();
  DB.refresh();
  // Trên máy shop: tab Admin sửa nháp → tab xem trước cập nhật ngay
  window.addEventListener('storage', e => { if (e.key === KEY && (IS_ADMIN || IS_LOCAL)) { DB.load(); window.dispatchEvent(new Event('db-changed')); } });
})();
