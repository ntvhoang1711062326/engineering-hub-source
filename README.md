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
| `index.html`, `assets/js/app.js` | Trang khách: sản phẩm Kenzo, video lắp đèn theo dòng xe, chi tiết SP, đặt chỗ & cọc (giá hiển thị "Liên hệ") |
| `admin.html`, `assets/js/admin.js` | Admin: sản phẩm, đơn hàng (tải từ Google Sheets), banner, khuyến mãi, thư viện TikTok, cài đặt, **🚀 Xuất bản lên web** |
| `assets/data/catalog.json` | Dữ liệu web khách đang dùng — Admin ghi file này lên GitHub khi xuất bản |
| `assets/js/data.js` | Dữ liệu mặc định + lớp dữ liệu (Admin: nháp trong localStorage; khách: đọc `catalog.json`) |
| `assets/js/config.js` | URL Google Apps Script nhận đơn |
| `google-apps-script/Code.gs` | Script dán vào Google Sheets: ghi đơn, mail báo đơn mới, cho Admin tải đơn |
| `assets/js/media.js` | Danh sách 108 ảnh bìa video TikTok |
| `assets/img/`, `assets/video/` | Ảnh/video TikTok, ảnh sản phẩm Kenzo (`kenzo/`), ảnh tải lên từ Admin (`uploads/`) |

## Đưa lên web & vận hành
- **HUONG-DAN-DUA-LEN-WEB.md** — GitHub Pages, tên miền riêng, token để Admin xuất bản.
- **HUONG-DAN-GOOGLE-SHEETS.md** — nhận đơn vào Google Sheets + mail báo đơn mới.

## Lưu ý
- Đăng nhập admin chỉ là lớp che phía trình duyệt, **không bảo mật**; dữ liệu thật được bảo vệ bằng GitHub token và mã bí mật Sheets (chỉ lưu trên máy admin).
- MoMo / VNPay / ZaloPay đang là **cổng mô phỏng** (hàm `openGateway` trong `app.js`). Chuyển khoản VietQR hoạt động thật khi điền ngân hàng ở Admin → Cài đặt rồi xuất bản.
