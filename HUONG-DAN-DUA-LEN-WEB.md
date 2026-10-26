# Đưa web lên cho khách dùng & cập nhật từ trang Admin

```
              (máy cá nhân)                                   (trên mạng)
Admin ──🚀 Xuất bản lên web──▶ GitHub (repo) ──tự động ~1 phút──▶ Web khách (GitHub Pages / tên miền)
  ▲                                                                   │
  └──────── ⟳ Tải đơn ◀── Google Sheets ◀──── khách đặt chỗ ──────────┘   (+ mail báo đơn mới)
```

- **Sản phẩm, banner, khuyến mãi, cài đặt** (kể cả tài khoản ngân hàng VietQR): sửa trong Admin → bấm **🚀 Xuất bản lên web** → khoảng 1 phút sau khách thấy.
- **Đơn hàng**: khách đặt → Google Sheets + mail → Admin bấm **⟳ Tải đơn từ Google Sheets**.

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

## 3. Nhận đơn qua Google Sheets

Làm theo **HUONG-DAN-GOOGLE-SHEETS.md** (tạo Sheets, dán script, dán URL vào `assets/js/config.js`).

## 4. Kết nối Admin với GitHub để "Xuất bản lên web" (làm 1 lần)

### Tạo token
1. Đăng nhập GitHub → ảnh đại diện → **Settings** → **Developer settings** → **Personal access tokens → Fine-grained tokens** → **Generate new token**.
2. Điền:
   - **Token name:** `Admin TS SUPERLIGHT`
   - **Expiration:** chọn thời hạn (vd 1 năm — hết hạn thì tạo token mới)
   - **Repository access:** *Only select repositories* → chọn `engineering-hub-source`
   - **Permissions → Repository permissions → Contents:** `Read and write`
3. **Generate token** → copy chuỗi `github_pat_…` (chỉ hiện 1 lần).

### Nhập vào Admin
1. Mở `admin.html` trên máy → **Cài đặt → Xuất bản lên web (GitHub Pages)**.
2. Dán token → **Lưu & kiểm tra kết nối** → thấy "✓ Kết nối GitHub thành công".

> Token chỉ lưu trong trình duyệt trên máy này. **Không** gửi token cho người khác, không dán vào file của dự án.

## 5. Quy trình hằng ngày

1. Sửa trong Admin (thêm/sửa sản phẩm, banner, flash sale, cài đặt…). Thanh bên trái hiện **● Có thay đổi chưa xuất bản**.
2. Bấm **↗ Xem trước (bản nháp)** để xem web với dữ liệu mới ngay trên máy.
3. Ưng ý → bấm **🚀 Xuất bản lên web**. Sau ~1 phút mở **🌐 Mở web khách đang dùng** để kiểm tra.

Ảnh tải lên trong Admin được tự lưu thành file `assets/img/uploads/…` khi xuất bản.

## 6. Dùng Admin trên máy khác / cài lại trình duyệt

Dữ liệu nháp nằm trong trình duyệt. Ở máy mới: mở `admin.html` → nhập token (bước 4) → **Cài đặt → ⤓ Lấy bản đang chạy trên web về** → sửa tiếp như bình thường.
Nên thỉnh thoảng bấm **⬇ Xuất dữ liệu (.json)** ở Cài đặt để sao lưu.

## Lưu ý

- **Nếu bạn (hoặc người khác) sửa code bằng `git` trên máy:** chạy `git pull` trước khi sửa/push, vì Admin cũng tạo commit trên GitHub.
- **`admin.html` cũng có trên web** (GitHub Pages đưa cả repo lên) nhưng không có dữ liệu thật: không có token thì không xuất bản được, không có mã bí mật Sheets thì không xem được đơn. Đăng nhập `admin / superlight` chỉ là lớp che tạm.
- Cổng MoMo / VNPay / ZaloPay trên web vẫn là **bản mô phỏng** — nên để khách cọc bằng **chuyển khoản VietQR** (điền ngân hàng ở Admin → Cài đặt rồi xuất bản).
