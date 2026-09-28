# TS SUPERLIGHT — Web bán đèn xe máy

Giao diện tham khảo bố cục shop2banh.vn, dùng ảnh/video thật từ TikTok @ts.superlight.

## Chạy thử
```
python -m http.server 8000
```
- Trang khách: http://localhost:8000/index.html
- Trang admin: http://localhost:8000/admin.html — đăng nhập demo `admin` / `superlight`

(Có thể mở thẳng file `index.html`, nhưng nên chạy qua server để video và dữ liệu hoạt động ổn định.)

## Cấu trúc
| File | Nội dung |
|---|---|
| `index.html`, `assets/js/app.js` | Trang khách: trang chủ, danh mục, lọc theo dòng xe, chi tiết SP, đặt chỗ, hẹn lịch lắp & đặt cọc (giá hiển thị "Liên hệ", không giao hàng) |
| `admin.html`, `assets/js/admin.js` | Admin: tổng quan, sản phẩm, đơn hàng, banner/quảng cáo/popup, khuyến mãi (flash sale + mã giảm giá), thư viện TikTok, cài đặt |
| `assets/js/data.js` | Dữ liệu mẫu + lớp lưu trữ dùng chung (localStorage) |
| `assets/js/media.js` | Danh sách 108 ảnh bìa video TikTok (caption, lượt xem) |
| `assets/img/`, `assets/video/` | Ảnh bìa và 4 video tải từ TikTok của shop |

## Lưu ý trước khi chạy thật
- Trang khách hiển thị mọi giá là **Liên hệ** và không còn giao hàng. Khách đặt chỗ và cọc một khoản cố định cho mỗi lượt đặt (mặc định 200.000đ, sửa ở Admin → Cài đặt). Giá trong Admin → Sản phẩm chỉ còn dùng nội bộ.
- Dữ liệu đang lưu trong trình duyệt (localStorage): admin và khách phải dùng cùng trình duyệt/máy mới thấy nhau. Muốn chạy thật cần backend + database (thay `DB.load/DB.save` trong `data.js` bằng gọi API).
- Đăng nhập admin chỉ là demo phía trình duyệt, **không bảo mật** — cần xác thực phía server.
- MoMo / VNPay / ZaloPay đang là **cổng mô phỏng**. Tích hợp thật cần đăng ký merchant và backend tạo link thanh toán (hàm `openGateway` trong `app.js`).
- Chuyển khoản VietQR hoạt động thật khi điền ngân hàng + số tài khoản ở Admin → Cài đặt.
