# Đưa web lên cho khách dùng & cập nhật từ trang Admin

```
              (máy cá nhân)                                   (trên mạng)
Admin ──🚀 Xuất bản lên web──▶ GitHub (repo) ──tự động ~1 phút──▶ Web khách (GitHub Pages / tên miền)
```

- **Sản phẩm, danh mục, banner, khuyến mãi, video TikTok, cài đặt**: sửa trong Admin → bấm **🚀 Xuất bản lên web** → khoảng 1 phút sau khách thấy.
- Web không nhận đơn — khách xem sản phẩm rồi **Gọi / Chat Zalo** để được tư vấn.

---

## 1. Web đang chạy ở đâu

Repo `engineering-hub-source` đã bật **GitHub Pages** (nhánh `main`), web khách ở:
**<https://ntvhoang1711062326.github.io/engineering-hub-source/>**

Mỗi khi nhánh `main` có commit mới (từ Admin hoặc `git push`), GitHub tự cập nhật web sau khoảng 1 phút.

## 2. Gắn tên miền riêng (nếu có)

1. GitHub → repo → **Settings → Pages → Custom domain** → nhập tên miền (vd `tssuperlight.vn` hoặc `www.tssuperlight.vn`) → **Save**.
2. Vào trang quản lý tên miền (nơi bạn mua), thêm bản ghi DNS:
   - Tên miền gốc (`tssuperlight.vn`): 4 bản ghi **A** → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: bản ghi **CNAME** → `ntvhoang1711062326.github.io`
3. Chờ DNS cập nhật (vài phút đến vài giờ) → quay lại **Settings → Pages** → tick **Enforce HTTPS**.

## 3. Đồng bộ video TikTok (tự động)

Không cần cài gì thêm: GitHub tự lấy video mới của các kênh ở **Admin → Cài đặt → Link TikTok** **mỗi 6 giờ** (workflow `.github/workflows/sync-tiktok.yml`, chạy `scripts/sync-tiktok.mjs`).
Muốn lấy ngay: Admin → **Thư viện TikTok** → **🔄 Đồng bộ TikTok** (dùng chung GitHub token ở mục 4) → chờ ~1 phút là video mới lên web, **không cần bấm Xuất bản**.
Xem lịch sử chạy / lỗi: tab **Actions** của repo trên GitHub.

## 4. Kết nối Admin với GitHub để "Xuất bản lên web" (làm 1 lần)

### Tạo token
1. Đăng nhập GitHub → ảnh đại diện → **Settings** → **Developer settings** → **Personal access tokens → Fine-grained tokens** → **Generate new token**.
2. Điền:
   - **Token name:** `Admin TS SUPERLIGHT`
   - **Expiration:** chọn thời hạn (vd 1 năm — hết hạn thì tạo token mới)
   - **Repository access:** *Only select repositories* → chọn `engineering-hub-source`
   - **Permissions → Repository permissions → Contents:** `Read and write`
3. **Generate token** → copy chuỗi `github_pat_…` (chỉ hiện 1 lần).

### Đăng nhập Admin
Mở `admin.html` → dán token vào ô **GitHub token** → **Đăng nhập**. Token này dùng luôn cho **🚀 Xuất bản lên web** và **🔄 Đồng bộ TikTok** (đổi token / repo ở **Cài đặt → Xuất bản lên web**).

> Token chỉ lưu trong trình duyệt trên máy này. **Không** gửi token cho người khác, không dán vào file của dự án.

## 5. Quy trình hằng ngày

1. Sửa trong Admin (thêm/sửa sản phẩm, banner, flash sale, cài đặt…). Thanh bên trái hiện **● Có thay đổi chưa xuất bản**.
2. Bấm **↗ Xem trước (bản nháp)** để xem web với dữ liệu mới ngay trên máy.
3. Ưng ý → bấm **🚀 Xuất bản lên web**. Sau ~1 phút mở **🌐 Mở web khách đang dùng** để kiểm tra.

Ảnh tải lên trong Admin được tự lưu thành file `assets/img/uploads/…` khi xuất bản.

## 6. Dùng Admin trên máy khác / cài lại trình duyệt

Dữ liệu nháp nằm trong trình duyệt. Ở máy mới: mở `admin.html` → đăng nhập bằng token (bước 4) → **Cài đặt → ⤓ Lấy bản đang chạy trên web về** → sửa tiếp như bình thường.
Nên thỉnh thoảng bấm **⬇ Xuất dữ liệu (.json)** ở Cài đặt để sao lưu.

## Lưu ý

- **Nếu bạn (hoặc người khác) sửa code bằng `git` trên máy:** chạy `git pull` trước khi sửa/push, vì Admin cũng tạo commit trên GitHub.
- **`admin.html` cũng có trên web** (GitHub Pages đưa cả repo lên) nhưng chỉ vào được bằng GitHub token có quyền ghi repo — không có mật khẩu nào viết trong code. Bấm **⎋ Đăng xuất** để xoá token khỏi máy dùng chung.
