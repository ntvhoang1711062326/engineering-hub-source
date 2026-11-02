# Đưa web TS SUPERLIGHT lên Google — toàn bộ các bước

```
Mua tên miền ─▶ Gắn tên miền vào GitHub ─▶ Search Console (Google tìm kiếm)
                                         └▶ Google Business Profile (Google Maps)
```

Web đã chạy sẵn trên GitHub Pages, **không cần thuê hosting**. Chỉ cần mua tên miền rồi trỏ về GitHub.
Ký hiệu: 👤 = bạn tự làm · 🤖 = nhờ Claude làm.

---

## Giai đoạn 1 — Mua tên miền (👤, ~15 phút)

- [ ] **1.1** Chọn tên: ngắn, giống tên shop, không dấu, tránh dấu gạch ngang. Ví dụ `supperlightshop.com`.
  - **.vn**: ~450k–750k năm đầu, khách Việt tin tưởng, cần CCCD. *(Khuyên dùng)*
  - **.com**: ~250k–350k/năm. Có thể mua thêm cùng tên để giữ chỗ.
- [ ] **1.2** Vào một nhà đăng ký: Mắt Bão (matbao.net), P.A Việt Nam (pavietnam.vn), iNET (inet.vn) hoặc Tenten (tenten.vn) → gõ tên kiểm tra còn trống → thanh toán.
  - Chỉ mua **tên miền**. **Không** mua hosting, email hay gói thiết kế web.
- [ ] **1.3** Giữ lại tài khoản đăng nhập trang quản lý tên miền (cần cho bước 2.3).
- [ ] **1.4** Gửi tên miền đã mua cho Claude.

## Giai đoạn 2 — Gắn tên miền vào web (~30 phút + chờ DNS)

- [ ] **2.1** 🤖 Claude sửa web sang tên miền mới (`index.html`, `sitemap.xml`, file `CNAME`) và đưa lên GitHub.
- [ ] **2.2** 👤 GitHub → repo `engineering-hub-source` → **Settings → Pages → Custom domain** → nhập `www.supperlightshop.com` → **Save**.
- [ ] **2.3** 👤 Vào trang quản lý DNS của tên miền, xoá các bản ghi A/CNAME mặc định (nếu có) rồi thêm:

  | Loại | Tên (Host) | Giá trị |
  |---|---|---|
  | A | `@` | `185.199.108.153` |
  | A | `@` | `185.199.109.153` |
  | A | `@` | `185.199.110.153` |
  | A | `@` | `185.199.111.153` |
  | CNAME | `www` | `ntvhoang1711062326.github.io` |

- [ ] **2.4** 👤 Chờ vài phút đến vài giờ → mở `supperlightshop.com` thấy web là được.
- [ ] **2.5** 👤 Quay lại **Settings → Pages** → tick **Enforce HTTPS** (nếu ô bị mờ, chờ thêm rồi thử lại).
- [ ] **2.6** 🤖 Claude kiểm tra web, ảnh, nút gọi/Zalo và trang Admin chạy đúng trên tên miền mới.

## Giai đoạn 3 — Google Search Console: hiện trên Google tìm kiếm (~20 phút)

- [ ] **3.1** 👤 Vào <https://search.google.com/search-console> → **Thêm sản phẩm** → chọn ô **Miền (Domain)** → nhập `supperlightshop.com` (không có https, không có www).
- [ ] **3.2** 👤 Google đưa một bản ghi **TXT** dạng `google-site-verification=...` → sao chép.
- [ ] **3.3** 👤 Vào trang quản lý DNS → thêm bản ghi **TXT**, Tên `@`, Giá trị = chuỗi vừa sao chép → lưu.
- [ ] **3.4** 👤 Chờ 5–30 phút → quay lại Search Console bấm **Xác minh**.
- [ ] **3.5** 👤 Menu trái **Sơ đồ trang web** → nhập `sitemap.xml` → **Gửi**.
- [ ] **3.6** 👤 Ô tìm kiếm trên cùng (**Kiểm tra URL**) → dán `https://www.supperlightshop.com/` → **Yêu cầu lập chỉ mục**.
- [ ] **3.7** Chờ vài ngày đến 1–2 tuần. Kiểm tra bằng cách gõ `site:supperlightshop.com` trên Google.
- [ ] **3.8** *(Tuỳ chọn)* Vào <https://www.bing.com/webmasters> → **Nhập từ Google Search Console** để có mặt cả trên Bing / Cốc Cốc.

## Giai đoạn 4 — Google Business Profile: hiện trên Google Maps (👤, quan trọng nhất)

Khi khách tìm "độ đèn xe máy Bình Thạnh", Google ưu tiên hiện **cửa hàng trên bản đồ**.
*Có thể làm ngay, không cần chờ tên miền.*

- [ ] **4.1** Vào <https://business.google.com> → **Thêm doanh nghiệp**.
- [ ] **4.2** Điền: tên **TS SUPERLIGHT**, danh mục *Cửa hàng phụ tùng xe máy* (hoặc *Cửa hàng phụ kiện ô tô/xe máy*), địa chỉ **38/8A Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM**, SĐT **0769.678.981**, giờ mở cửa, trang web `https://www.supperlightshop.com`.
- [ ] **4.3** Xác minh theo cách Google yêu cầu (gọi điện / tin nhắn / quay video shop / thư gửi về địa chỉ).
- [ ] **4.4** Đăng ảnh: mặt tiền, biển hiệu, bên trong shop, xe đã lắp đèn (càng nhiều càng tốt).
- [ ] **4.5** Viết mô tả ngắn: lắp Bi LED, Laser, trợ sáng Kenzo, Titan, Aozoom; test sáng miễn phí.
- [ ] **4.6** Nhờ khách quen để lại **đánh giá 5 sao**. Đánh giá giúp shop lên top bản đồ nhanh nhất.

## Giai đoạn 5 — Duy trì để lên top (thường xuyên)

- [ ] Gắn link web vào: Facebook page, Zalo OA, bio TikTok, Shopee/Lazada (nếu có), biển hiệu, card visit.
- [ ] Thêm/cập nhật sản phẩm đều đặn qua Admin (có mô tả rõ ràng, ảnh thật).
- [ ] Đăng ảnh/bài mới trên Google Business Profile khoảng 1 lần/tuần, trả lời mọi đánh giá.
- [ ] Mỗi tháng mở Search Console xem: khách tìm từ khoá gì, có lỗi gì không.
- [ ] **Gia hạn tên miền trước hạn** (bật tự động gia hạn), hết hạn là web mất.

---

> Không để lộ GitHub token: không gửi cho người khác, không đưa file `token github.txt` lên mạng (đã được chặn trong `.gitignore`).
