/* ============================================================
   TS SUPERLIGHT — Google Apps Script đọc hộ TikTok cho nút "🔄 Đồng bộ TikTok" ở Admin
   (trình duyệt không đọc thẳng được TikTok). Cách cài: xem HUONG-DAN-APPS-SCRIPT.md.

   - GET ?action=ping                    → kiểm tra kết nối
   - GET ?action=tiktok&user=…&known=…   → ~12 video mới nhất của kênh + thông tin kênh
   ============================================================ */

const SHOP_NAME = 'TS SUPERLIGHT';

/* ---------------- Web App ---------------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'ping') return json({ ok: true, shop: SHOP_NAME });
  if (p.action === 'tiktok') return json(syncTikTok(p.user, p.known));
  return json({ ok: false, error: 'Hành động không hợp lệ' });
}

/* ---------------- Đồng bộ TikTok ----------------
   Đọc trang nhúng của kênh (tiktok.com/embed/@kênh) — có ~12 video mới nhất kèm caption, lượt xem, ảnh bìa.
   Ảnh bìa trên TikTok là link có hạn → tải về gửi kèm dạng base64 (chỉ cho video Admin chưa có: tham số known). */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
function syncTikTok(user, known) {
  user = String(user || '').replace(/^@/, '').trim();
  if (!/^[\w.]{2,24}$/.test(user)) return { ok: false, error: 'Tên kênh TikTok không hợp lệ' };
  const res = UrlFetchApp.fetch('https://www.tiktok.com/embed/@' + user, { muteHttpExceptions: true, headers: { 'User-Agent': UA, 'Accept-Language': 'vi-VN,vi;q=0.9' } });
  if (res.getResponseCode() !== 200) return { ok: false, error: 'TikTok trả về lỗi ' + res.getResponseCode() + ' — thử lại sau ít phút' };
  const m = /<script id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/.exec(res.getContentText());
  let list, u = {};
  try {
    const data = JSON.parse(m[1]).source.data;
    const page = data['/embed/@' + user] || Object.values(data).find(x => x && x.videoList) || {};
    list = page.videoList; u = page.userInfo || {};
  } catch (e) { list = null; }
  if (!Array.isArray(list)) return { ok: false, error: 'TikTok không trả về danh sách video (có thể tạm chặn) — thử lại sau' };
  const have = new Set(String(known || '').split(','));
  const dataUrl = url => {
    try {
      const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': UA } });
      const type = String(r.getHeaders()['Content-Type'] || 'image/jpeg').split(';')[0];
      return r.getResponseCode() === 200 && /^image\//.test(type) ? 'data:' + type + ';base64,' + Utilities.base64Encode(r.getContent()) : '';
    } catch (e) { return ''; }
  };
  const videos = list.filter(v => v && /^\d+$/.test(String(v.id)) && !v.privateItem).map(v => {
    const out = { id: String(v.id), cap: clip(String(v.desc || '').replace(/#\S+/g, '').replace(/\s+/g, ' '), 300), views: Number(v.playCount) || 0 };
    if (!have.has(out.id) && v.coverUrl) out.cover = dataUrl(v.coverUrl); // lỗi → bỏ qua, lần sau đồng bộ lại
    return out;
  });
  // Thông tin kênh hiện ở đầu dải video trang chủ
  const info = { name: clip(u.nickname, 60), followers: Number(u.followerCount) || 0, likes: Number(u.heartCount) || 0, avatar: u.avatarThumbUrl ? dataUrl(u.avatarThumbUrl) : '' };
  return { ok: true, user, info, videos };
}

/* ---------------- Tiện ích ---------------- */
const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const json = obj => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);

// Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền "Kết nối với dịch vụ bên ngoài" (đọc TikTok)
function setup() {
  const r = syncTikTok('ts.superlight', '');
  console.log(r.ok ? 'Đọc TikTok thành công: ' + r.videos.length + ' video' : 'Lỗi: ' + r.error);
}
