/* ============================================================
   TS SUPERLIGHT — Đồng bộ video TikTok cho web (chạy trên GitHub Actions, xem .github/workflows/sync-tiktok.yml)
   - Đọc trang nhúng của từng kênh (tiktok.com/embed/@kênh): ~10–12 video mới nhất + thông tin kênh
   - Video mới: tải ảnh bìa về assets/img/<id>.jpg; video đã có: cập nhật caption + lượt xem
   - Ghi kết quả vào assets/data/tiktok.json — trang khách & Admin tự đọc file này
   Chạy thử trên máy: node scripts/sync-tiktok.mjs
   ============================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEED = path.join(ROOT, 'assets/data/tiktok.json');
const IMG = path.join(ROOT, 'assets/img');
const REQUEST = path.join(ROOT, '.github/sync-tiktok-request');
const DEFAULT_CHANNELS = ['ts.superlight', '_superlightshop_'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const readJSON = async (f, fallback) => { try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch (e) { return fallback; } };
const exists = f => fs.access(f).then(() => true, () => false);
const clip = (s, n) => String(s ?? '').trim().slice(0, n);

// Ảnh bìa gốc ~250KB → thu về ≤960px nếu có sharp (cài trong workflow), không có thì lưu nguyên
let sharp = null;
try { sharp = (await import('sharp')).default; } catch (e) { /* chạy trên máy không cài sharp */ }
async function saveImage(url, file, max) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(file, sharp ? await sharp(buf).resize(max, max, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer() : buf);
}

// Kênh lấy theo Admin → Cài đặt (Link TikTok kênh chính / kênh 2) đã xuất bản trong catalog.json
async function channelList() {
  const s = (await readJSON(path.join(ROOT, 'assets/data/catalog.json'), {})).settings || {};
  const users = [s.tiktok, s.tiktok2 ?? 'https://www.tiktok.com/@' + DEFAULT_CHANNELS[1]]
    .map(u => (String(u || '').match(/@([\w.]+)/) || [])[1]).filter(Boolean);
  return [...new Set(users.length ? users : DEFAULT_CHANNELS)];
}

// TikTok hay trả 503 khi bị gọi liên tục → thử lại tối đa 4 lần, nghỉ 4s, 8s, 12s
async function readChannel(user, attempt = 1) {
  const res = await fetch('https://www.tiktok.com/embed/@' + user, { headers: { 'User-Agent': UA, 'Accept-Language': 'vi-VN,vi;q=0.9' } });
  if (!res.ok && attempt < 4) { await new Promise(r => setTimeout(r, attempt * 4000)); return readChannel(user, attempt + 1); }
  if (!res.ok) throw new Error('TikTok trả về lỗi ' + res.status);
  const m = /<script id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/.exec(await res.text());
  const data = m && JSON.parse(m[1]).source?.data;
  const page = data && (data['/embed/@' + user] || Object.values(data).find(x => x && x.videoList));
  if (!Array.isArray(page?.videoList)) throw new Error('TikTok không trả về danh sách video (có thể tạm chặn)');
  return page;
}

const feed = await readJSON(FEED, { videos: [], channels: {} });
const content = f => JSON.stringify([f.request || '', f.error || '', f.channels || {}, f.videos || []]);
const before = content(feed);
const videos = new Map((feed.videos || []).map(v => [v.id, v]));
const channels = feed.channels || {};
const errors = [];
let added = 0, updated = 0;

for (const user of await channelList()) {
  let page;
  try { page = await readChannel(user); } catch (e) { errors.push(`@${user}: ${e.message}`); continue; }
  const u = page.userInfo || {};
  const info = { name: clip(u.nickname, 60), followers: Number(u.followerCount) || 0, likes: Number(u.heartCount) || 0 };
  if (u.avatarThumbUrl) {
    try { await saveImage(u.avatarThumbUrl, path.join(IMG, `avatar-${user}.jpg`), 200); info.avatar = `assets/img/avatar-${user}.jpg`; } catch (e) { /* giữ ảnh đại diện cũ */ }
  }
  channels[user] = { ...channels[user], ...Object.fromEntries(Object.entries(info).filter(([, v]) => v)) };

  for (const v of page.videoList) {
    const id = String(v?.id || '');
    if (!/^\d{8,25}$/.test(id) || v.privateItem) continue;
    const cap = clip(String(v.desc || '').replace(/#\S+/g, '').replace(/\s+/g, ' '), 300);
    const file = path.join(IMG, `${id}.jpg`);
    if (!(await exists(file))) {
      if (!v.coverUrl) continue;
      try { await saveImage(v.coverUrl, file, 960); } catch (e) { errors.push(`ảnh bìa ${id}: ${e.message}`); continue; }
      added++;
    } else updated++;
    videos.set(id, { ...videos.get(id), id, cap, views: Number(v.playCount) || 0, ch: user });
  }
}

const request = (await fs.readFile(REQUEST, 'utf8').catch(() => '')).trim();
const out = {
  syncedAt: new Date().toISOString(), request, added, updated,
  ...(errors.length ? { error: errors.join(' · ') } : {}),
  channels, videos: [...videos.values()].sort((a, b) => b.id.length - a.id.length || b.id.localeCompare(a.id)),
};
// Không có gì mới (lần chạy định kỳ) → giữ nguyên file để khỏi tạo commit thừa
if (content(out) !== before) await fs.writeFile(FEED, JSON.stringify(out, null, 1) + '\n');
console.log(`Thêm ${added} video mới, cập nhật ${updated} video${errors.length ? ' — lỗi: ' + out.error : ''}`);
