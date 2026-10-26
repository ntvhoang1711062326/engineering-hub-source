# Cài Google Apps Script cho nút "🔄 Đồng bộ TikTok"

Nút **🔄 Đồng bộ TikTok** (Admin → **Thư viện TikTok**) lấy video mới từ các kênh TikTok ở **Cài đặt → Link TikTok (kênh chính)** và **Link TikTok kênh 2**.
Trình duyệt không tự đọc TikTok được nên cần một Google Apps Script nhỏ đọc hộ. Làm một lần, khoảng 5 phút.

---

## Bước 1 — Tạo Apps Script

1. Vào <https://script.google.com> → **Dự án mới**, đặt tên ví dụ `TS SUPERLIGHT TikTok`.
   (Nếu đã có script cũ dùng để nhận đơn, mở lại đúng script đó và dán đè — URL sẽ giữ nguyên.)
2. Xoá hết code mẫu, mở file `google-apps-script/Code.gs` trong dự án này, **copy toàn bộ** và dán vào → 💾 **Lưu**.

## Bước 2 — Cấp quyền

1. Ở thanh công cụ, chọn hàm **`setup`** → bấm **▶ Chạy**.
2. Google hỏi quyền → **Xem xét quyền** → chọn tài khoản → nếu hiện "Google chưa xác minh ứng dụng này" bấm **Nâng cao → Đi tới … (không an toàn)** → **Cho phép**.
   (Đây là script của chính bạn, chỉ cần quyền **kết nối với dịch vụ bên ngoài** để đọc TikTok.)
3. Nhật ký hiện *"Đọc TikTok thành công: … video"* là được.

## Bước 3 — Triển khai thành Web App

1. **Triển khai → Tùy chọn triển khai mới** → bấm ⚙ cạnh "Chọn loại" → **Ứng dụng web**.
2. Thiết lập: **Thực thi với tư cách:** `Tôi` · **Người có quyền truy cập:** `Bất kỳ ai`.
3. **Triển khai** → copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/……/exec`).

## Bước 4 — Dán URL vào Admin

Admin → **Cài đặt → Google Apps Script — đồng bộ TikTok** → dán URL → **Lưu & kiểm tra kết nối**. Thấy "✓ Kết nối thành công" là xong.

---

## Sử dụng

- Admin → **Thư viện TikTok** → **🔄 Đồng bộ TikTok**: mỗi kênh lấy được khoảng **10–12 video mới nhất** — video chưa có thì thêm vào thư viện (kèm ảnh bìa), video đã có thì cập nhật caption + lượt xem; số người theo dõi, lượt thích, ảnh đại diện kênh cũng được cập nhật. Dòng xe tự nhận theo caption.
- Sau khi đồng bộ, bấm **🚀 Xuất bản lên web** để khách thấy video mới.
- Nếu báo *"TikTok không trả về danh sách video"*: TikTok tạm chặn, đợi vài phút rồi bấm lại.

## Lưu ý

- **Sửa `Code.gs` sau này:** vào **Triển khai → Quản lý bản triển khai → ✏ Chỉnh sửa → Phiên bản: Phiên bản mới → Triển khai** thì thay đổi mới có hiệu lực (URL giữ nguyên).
- Script chỉ đọc video công khai trên TikTok, không lưu dữ liệu gì — không cần mã bí mật.
- Thư mục `google-apps-script/` và file hướng dẫn này **không cần** tải lên hosting.
