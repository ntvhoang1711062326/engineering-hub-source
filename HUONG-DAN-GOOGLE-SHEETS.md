# Nhận đơn đặt chỗ qua Google Sheets + mail báo đơn mới

Khách đặt chỗ trên web → đơn được ghi vào **Google Sheets** của bạn và **gửi mail báo đơn mới**.
Trang admin (để trên máy cá nhân) bấm **"⟳ Tải đơn từ Google Sheets"** để lấy đơn về xem và xử lý.

```
Khách (web trên tên miền) ──gửi đơn──▶ Google Sheets ──mail──▶ Email của bạn
                                            ▲
Admin (máy cá nhân) ──tải đơn / cập nhật────┘
```

Làm một lần, khoảng 5–10 phút.

---

## Bước 1 — Tạo file Google Sheets

1. Vào <https://sheets.google.com> → tạo **Bảng tính trống**, đặt tên ví dụ `Đơn hàng TS SUPERLIGHT`.

## Bước 2 — Dán script

1. Trong file Sheets: menu **Tiện ích mở rộng → Apps Script**.
2. Xoá hết code mẫu, mở file `google-apps-script/Code.gs` trong dự án này, **copy toàn bộ** và dán vào.
3. Sửa 2 dòng đầu file:
   - `const ADMIN_KEY = 'DOI-MA-NAY';` → đổi thành chuỗi bí mật của riêng bạn, ví dụ `'TsL-2026-x9Kq7mPz'`. **Ghi lại chuỗi này**, lát nữa nhập vào admin.
   - `const OWNER_EMAIL = '';` → để trống thì mail gửi về chính Gmail đang dùng; muốn gửi email khác thì điền vào.
4. Bấm biểu tượng 💾 **Lưu**.

## Bước 3 — Cấp quyền

1. Ở thanh công cụ, chọn hàm **`setup`** → bấm **▶ Chạy**.
2. Google hỏi quyền → **Xem xét quyền** → chọn tài khoản → nếu hiện "Google chưa xác minh ứng dụng này" bấm **Nâng cao → Đi tới … (không an toàn)** → **Cho phép**.
   (Đây là script của chính bạn, cần quyền ghi Sheets và gửi mail.)
3. Quay lại file Sheets sẽ thấy trang tính **"Đơn hàng"** đã có sẵn tiêu đề cột.

## Bước 4 — Triển khai thành Web App

1. Trong Apps Script: **Triển khai → Tùy chọn triển khai mới**.
2. Bấm ⚙ cạnh "Chọn loại" → **Ứng dụng web**.
3. Thiết lập:
   - **Thực thi với tư cách:** `Tôi`
   - **Người có quyền truy cập:** `Bất kỳ ai`
4. **Triển khai** → copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/……/exec`).

## Bước 5 — Gắn URL vào trang web

1. Mở `assets/js/config.js`, dán URL vào:
   ```js
   window.SHOP_CONFIG = {
     orderEndpoint: 'https://script.google.com/macros/s/……/exec',
   };
   ```
2. Tải lại file `assets/js/config.js` lên hosting (cùng các file web khác).

> ⚠️ **Không** ghi `ADMIN_KEY` vào `config.js` — file này nằm trên web, ai cũng xem được.

## Bước 6 — Kết nối trang admin (máy cá nhân)

1. Mở `admin.html` trên máy → đăng nhập.
2. **Cài đặt → Google Sheets — nhận đơn từ trang web**: dán **URL** và **mã bí mật (ADMIN_KEY)** → **Lưu & kiểm tra kết nối**.
3. Thấy "✓ Kết nối thành công" là xong.

## Bước 7 — Đặt thử 1 đơn

Vào web trên tên miền → chọn sản phẩm → **Đặt chỗ**. Kiểm tra:
- Có dòng mới trong Google Sheets.
- Có mail "[TS SUPERLIGHT] Đơn mới …".
- Admin → **Đơn hàng** → **⟳ Tải đơn từ Google Sheets** thấy đơn.

---

## Sử dụng hằng ngày

- **Đơn mới:** nhận mail → mở admin → trang **Đơn hàng** tự tải đơn (hoặc bấm **⟳ Tải đơn từ Google Sheets**).
- **Đổi trạng thái / xác nhận đã cọc** trong admin → tự cập nhật lên Sheets.
- Cũng có thể đổi cột **Trạng thái** / **Tình trạng cọc** ngay trên Sheets (có danh sách chọn) — lần tải sau admin sẽ thấy.
- **Không sửa / xoá** cột ẩn "Dữ liệu (không sửa)".
- Cột Tình trạng cọc ghi *"khách báo đã TT — kiểm tra lại"* nghĩa là khách bấm thanh toán ví điện tử trên web — cổng MoMo/VNPay/ZaloPay trên web hiện là **bản mô phỏng**, hãy kiểm tra tài khoản trước khi xác nhận "Đã cọc".

## Đồng bộ video TikTok

Nút **🔄 Đồng bộ TikTok** (Admin → **Thư viện TikTok**) dùng chung Apps Script này để đọc các kênh TikTok ở **Cài đặt → Link TikTok (kênh chính)** và **Link TikTok kênh 2** (trình duyệt không tự đọc TikTok được). Đồng bộ TikTok **chỉ cần URL Web App**, không cần mã bí mật. Mỗi kênh có một dải video kéo ngang ở trang chủ; số người theo dõi, lượt thích, ảnh đại diện cũng được cập nhật khi đồng bộ.

- Mỗi lần bấm lấy được khoảng **10–12 video mới nhất** của mỗi kênh: video chưa có thì thêm vào thư viện (kèm ảnh bìa), video đã có thì cập nhật caption + lượt xem. Dòng xe tự nhận theo caption như cũ.
- Sau khi đồng bộ, bấm **🚀 Xuất bản lên web** để khách thấy video mới.
- Khách bấm vào video sẽ xem ngay trên web bằng trình phát của TikTok.
- **Lần đầu dùng (khi cập nhật `Code.gs` có chức năng này):** dán lại `Code.gs` mới → chạy hàm `setup` một lần để cấp thêm quyền **"Kết nối với dịch vụ bên ngoài"** → triển khai **Phiên bản mới** (xem Lưu ý bên dưới).
- Nếu báo *"TikTok không trả về danh sách video"*: TikTok tạm chặn, đợi vài phút rồi bấm lại.

## Lưu ý

- **Sửa `Code.gs` sau này:** phải vào **Triển khai → Quản lý bản triển khai → ✏ Chỉnh sửa → Phiên bản: Phiên bản mới → Triển khai** thì thay đổi mới có hiệu lực (URL giữ nguyên, không cần sửa `config.js`).
- Gmail cá nhân gửi được khoảng **100 mail/ngày** từ Apps Script — đủ cho báo đơn.
- `admin.html`, thư mục `google-apps-script/` và file hướng dẫn này **không cần** tải lên hosting.
- Nếu `config.js` để trống URL, web vẫn chạy nhưng đơn chỉ lưu trên máy khách (chế độ thử) — shop **không nhận được đơn**.
