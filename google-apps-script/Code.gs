/* ============================================================
   TS SUPERLIGHT — Nhận đơn đặt chỗ vào Google Sheets + gửi mail báo đơn mới
   Cách cài: xem file HUONG-DAN-GOOGLE-SHEETS.md ở thư mục gốc dự án.

   - Trang bán hàng gửi đơn mới  → POST { action: 'create', order }
   - Trang admin (máy cá nhân)   → GET  ?action=list&key=ADMIN_KEY      (tải đơn về)
                                 → POST { action: 'update' | 'delete', key, ... }
   ============================================================ */

// ⚠️ BẮT BUỘC đổi thành một chuỗi bí mật của riêng bạn (dài, khó đoán).
// Nhập đúng chuỗi này ở Admin → Cài đặt → "Google Sheets" để tải đơn về.
const ADMIN_KEY = 'DOI-MA-NAY';

// Email nhận thông báo đơn mới. Để trống = gửi về chính tài khoản Google đang chạy script.
const OWNER_EMAIL = '';

const SHOP_NAME = 'TS SUPERLIGHT';
const SHEET_NAME = 'Đơn hàng';

const HEADERS = ['Mã đơn', 'Thời gian đặt', 'Khách hàng', 'SĐT', 'Email', 'Ngày hẹn', 'Giờ hẹn', 'Sản phẩm', 'Hình thức cọc', 'Tiền cọc', 'Tình trạng cọc', 'Trạng thái', 'Ghi chú của khách', 'Cập nhật lúc', 'Dữ liệu (không sửa)'];
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i + 1]));

const STATUS = { new: 'Mới', confirmed: 'Đã xác nhận', shipping: 'Đã hẹn lắp', done: 'Hoàn thành', cancelled: 'Đã huỷ' };
const PAYN = { cod: 'Tại shop', bank: 'Chuyển khoản', momo: 'MoMo', vnpay: 'VNPay', zalopay: 'ZaloPay' };
const PAID = { paid: 'Đã cọc', unpaid: 'Chưa cọc' };
const keyOf = (map, label) => Object.keys(map).find(k => map[k] === label);

/* ---------------- Web App ---------------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'ping') return json({ ok: true, shop: SHOP_NAME });
  const auth = checkKey(p.key); if (auth) return json(auth);
  return json({ ok: true, orders: listOrders() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (body.action === 'create') return json(createOrder(body.order));
    const auth = checkKey(body.key); if (auth) return json(auth);
    if (body.action === 'update') return json(updateOrder(body));
    if (body.action === 'delete') return json(deleteOrder(body.id));
    return json({ ok: false, error: 'Hành động không hợp lệ' });
  } finally {
    lock.releaseLock();
  }
}

function checkKey(key) {
  if (ADMIN_KEY === 'DOI-MA-NAY') return { ok: false, error: 'Chưa đổi ADMIN_KEY trong Apps Script' };
  if (key !== ADMIN_KEY) return { ok: false, error: 'Sai mã bí mật (ADMIN_KEY)' };
  return null;
}

/* ---------------- Đơn hàng ---------------- */
function createOrder(o) {
  const err = validate(o);
  if (err) return { ok: false, error: err };
  const sh = sheet();
  if (findRow(sh, o.id)) return { ok: true, id: o.id, duplicate: true }; // khách bấm gửi 2 lần

  const order = {
    id: o.id, type: 'booking', createdAt: new Date().toISOString(),
    customer: { name: clip(o.customer.name, 100), phone: o.customer.phone, email: clip(o.customer.email, 100), note: clip(o.customer.note, 500) },
    appointment: { date: clip(o.appointment && o.appointment.date, 10), time: clip(o.appointment && o.appointment.time, 5) },
    payment: PAYN[o.payment] ? o.payment : 'bank',
    items: o.items.slice(0, 50).map(i => ({ pid: clip(i.pid, 40), name: clip(i.name, 150), image: clip(i.image, 200), qty: Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1)), vehicle: clip(i.vehicle, 40) })),
    deposit: Number(o.deposit) || 0, total: Number(o.total) || 0,
    // Cổng MoMo/VNPay/ZaloPay trên web là bản mô phỏng → không tin trạng thái "đã thanh toán" từ trình duyệt
    paymentStatus: 'unpaid', customerClaimedPaid: o.paymentStatus === 'paid',
    status: 'new',
  };
  sh.appendRow(toRow(order));
  try { notify(order); } catch (e) { console.error('Gửi mail lỗi: ' + e); }
  return { ok: true, id: order.id };
}

function updateOrder(b) {
  const sh = sheet();
  const r = findRow(sh, b.id);
  if (!r) return { ok: false, error: 'Không tìm thấy đơn ' + b.id };
  const o = readRow(sh.getRange(r, 1, 1, HEADERS.length).getValues()[0]);
  if (STATUS[b.status]) o.status = b.status;
  if (PAID[b.paymentStatus]) {
    if (b.paymentStatus === 'paid' && o.paymentStatus !== 'paid') o.paidAt = new Date().toISOString();
    o.paymentStatus = b.paymentStatus;
  }
  sh.getRange(r, 1, 1, HEADERS.length).setValues([toRow(o)]);
  return { ok: true, order: o };
}

function deleteOrder(id) {
  const sh = sheet();
  const r = findRow(sh, id);
  if (r) sh.deleteRow(r);
  return { ok: true };
}

function listOrders() {
  const sh = sheet();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, HEADERS.length).getValues().map(readRow).filter(Boolean).reverse(); // mới nhất trước
}

/* ---------------- Sheet helpers ---------------- */
function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#ffb800');
    sh.setFrozenRows(1);
    sh.setColumnWidth(COL['Sản phẩm'], 320);
    sh.hideColumns(COL['Dữ liệu (không sửa)']);
    // Chủ shop có thể đổi trạng thái ngay trên Sheets bằng danh sách chọn
    sh.getRange(2, COL['Trạng thái'], 1000).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.values(STATUS)).build());
    sh.getRange(2, COL['Tình trạng cọc'], 1000).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.values(PAID)).build());
  }
  return sh;
}

function findRow(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1 || !id) return 0;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function toRow(o) {
  return [
    o.id, new Date(o.createdAt), safe(o.customer.name), "'" + o.customer.phone, safe(o.customer.email),
    o.appointment.date, o.appointment.time,
    safe(o.items.map(i => `${i.name} x${i.qty}${i.vehicle ? ' (' + i.vehicle + ')' : ''}`).join('\n')),
    PAYN[o.payment] || o.payment, o.deposit,
    PAID[o.paymentStatus] + (o.paymentStatus !== 'paid' && o.customerClaimedPaid ? ' (khách báo đã TT — kiểm tra lại)' : ''),
    STATUS[o.status], safe(o.customer.note), new Date(), JSON.stringify(o),
  ];
}

// Đọc 1 dòng: lấy dữ liệu gốc từ cột JSON, nhưng ưu tiên Trạng thái / Tình trạng cọc chủ shop sửa tay trên Sheets
function readRow(row) {
  let o;
  try { o = JSON.parse(row[COL['Dữ liệu (không sửa)'] - 1]); } catch (e) { return null; }
  const st = keyOf(STATUS, row[COL['Trạng thái'] - 1]);
  const paid = keyOf(PAID, String(row[COL['Tình trạng cọc'] - 1]).split(' (')[0]);
  if (st) o.status = st;
  if (paid) o.paymentStatus = paid;
  return o;
}

/* ---------------- Mail báo đơn mới ---------------- */
function notify(o) {
  const to = OWNER_EMAIL || Session.getEffectiveUser().getEmail();
  const h = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const appt = [o.appointment.time, o.appointment.date && o.appointment.date.split('-').reverse().join('/')].filter(Boolean).join(' · ');
  const html = `
    <h2 style="margin:0 0 8px">🔔 Đơn đặt chỗ mới ${h(o.id)}</h2>
    <p><b>${h(o.customer.name)}</b> — ☎ <a href="tel:${h(o.customer.phone)}">${h(o.customer.phone)}</a> · <a href="https://zalo.me/${h(o.customer.phone)}">Zalo</a>${o.customer.email ? ' · ' + h(o.customer.email) : ''}</p>
    <p>📅 Lịch hẹn lắp: <b>${h(appt || '—')}</b></p>
    <ul>${o.items.map(i => `<li>${h(i.name)} × ${i.qty}${i.vehicle ? ' (' + h(i.vehicle) + ')' : ''}</li>`).join('')}</ul>
    <p>💰 Tiền cọc: <b>${o.deposit.toLocaleString('vi-VN')}đ</b> qua ${h(PAYN[o.payment])}${o.customerClaimedPaid ? ' — <b style="color:#c00">khách báo đã thanh toán, hãy kiểm tra tài khoản</b>' : ''}</p>
    ${o.customer.note ? `<p>📝 Ghi chú: <i>${h(o.customer.note)}</i></p>` : ''}
    <p><a href="${SpreadsheetApp.getActiveSpreadsheet().getUrl()}">Mở Google Sheets đơn hàng</a></p>`;
  MailApp.sendEmail({ to, subject: `[${SHOP_NAME}] Đơn mới ${o.id} — ${o.customer.name} ${o.customer.phone}`, htmlBody: html, name: SHOP_NAME });
}

/* ---------------- Tiện ích ---------------- */
function validate(o) {
  if (!o || typeof o !== 'object') return 'Thiếu thông tin đơn';
  if (!/^TSL[A-Z0-9]{6,20}$/.test(String(o.id))) return 'Mã đơn không hợp lệ';
  if (!o.customer || !String(o.customer.name || '').trim()) return 'Thiếu tên khách';
  if (!/^0\d{9}$/.test(String(o.customer.phone))) return 'Số điện thoại không hợp lệ';
  if (!Array.isArray(o.items) || !o.items.length) return 'Đơn chưa có sản phẩm';
  return '';
}
const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
// Chặn chèn công thức vào Sheets (giá trị bắt đầu bằng = + - @)
const safe = s => (/^[=+\-@]/.test(String(s)) ? "'" : '') + String(s == null ? '' : s);
const json = obj => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);

// Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền Sheets + Gmail và tạo sẵn trang tính "Đơn hàng"
function setup() {
  sheet();
  console.log('Đã tạo trang tính "' + SHEET_NAME + '". Mail báo đơn sẽ gửi tới: ' + (OWNER_EMAIL || Session.getEffectiveUser().getEmail()));
}
