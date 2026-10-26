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
| `index.html`, `assets/js/app.js` | Trang khách: sản phẩm Kenzo / Titan Moto, video lắp đèn theo dòng xe, chi tiết SP — khách Gọi / Zalo để tư vấn (giá 0 hiển thị "Liên hệ") |
| `admin.html`, `assets/js/admin.js` | Admin: sản phẩm, danh mục, banner, Flash Sale, thư viện TikTok (+ đồng bộ), cài đặt, **🚀 Xuất bản lên web** |
| `assets/data/catalog.json` | Dữ liệu web khách đang dùng — Admin ghi file này lên GitHub khi xuất bản |
| `assets/js/data.js` | Dữ liệu mặc định + lớp dữ liệu (Admin: nháp trong localStorage; khách: đọc `catalog.json`) |
| `scripts/sync-tiktok.mjs`, `.github/workflows/sync-tiktok.yml` | GitHub tự đồng bộ video TikTok mỗi 6 giờ hoặc khi bấm **🔄 Đồng bộ TikTok** ở Admin → ghi `assets/data/tiktok.json` + ảnh bìa |
| `assets/js/media.js` | Danh sách video TikTok gốc (108 video @ts.superlight + 10 video @_superlightshop_) và thông tin 2 kênh; video mới đồng bộ nằm trong `assets/data/tiktok.json` |
| `assets/img/`, `assets/video/` | Ảnh/video TikTok, ảnh sản phẩm Kenzo (`kenzo/`), ảnh tải lên từ Admin (`uploads/`) |

## Đưa lên web & vận hành
- **HUONG-DAN-DUA-LEN-WEB.md** — GitHub Pages, tên miền riêng, token để Admin xuất bản.

## Lưu ý
- Đăng nhập admin chỉ là lớp che phía trình duyệt, **không bảo mật**; xuất bản lên web được bảo vệ bằng GitHub token (chỉ lưu trên máy admin).
- Web không nhận đơn / thanh toán online — khách liên hệ qua Hotline / Zalo.
