/**
 * ==============================================================================
 * MASTER PRODUCTION SERVER CHO VPS & LOCAL (MS MANAGEMENT & ZALO AI BOT)
 * ==============================================================================
 * 1 Process duy nhất tối ưu hóa cho VPS (RAM < 120MB):
 * - Phục vụ Web App Production (từ thư mục dist/)
 * - Phục vụ REST API & Webhooks 2 chiều (/api/*, /webhook/*)
 * - Duy trì kết nối Zalo WebSocket 24/7 (tự động khôi phục session)
 * - Tích hợp AI Gemini 3.8 phản hồi tự nhiên, tạo dự án và báo cáo tiến độ
 * ==============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5005;
const DIST_DIR = path.join(__dirname, 'dist');
const SCRIPTS_DIR = path.join(__dirname, 'scripts');

const APPSTATE_PATH = path.join(SCRIPTS_DIR, 'zalo-appstate.json');
const QR_PATH = path.join(SCRIPTS_DIR, 'zalo-qr.png');
const ACTIVE_GROUP_PATH = path.join(SCRIPTS_DIR, 'zalo-active-group.json');
const AI_CONFIG_PATH = path.join(SCRIPTS_DIR, 'ai-config.json');
const SITES_STORE_PATH = path.join(SCRIPTS_DIR, 'zalo-created-sites.json');

// Đảm bảo thư mục scripts tồn tại
if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

let zaloApi = null;
let currentQrBase64 = null;
let loginStatus = 'INITIALIZING';
let ThreadTypeEnum = { User: 0, Group: 1 };

// Hàng đợi đồng bộ lệnh sang Web App
let pendingActions = [];

// Nạp danh sách dự án đã tạo từ file
let createdSites = [];
try {
  if (fs.existsSync(SITES_STORE_PATH)) {
    createdSites = JSON.parse(fs.readFileSync(SITES_STORE_PATH, 'utf-8'));
    createdSites.forEach(s => {
      pendingActions.push({
        id: `act_${s.id}`,
        type: 'create_site',
        site: s,
        timestamp: new Date().toISOString()
      });
    });
  }
} catch {}

// Cấu hình AI Gemini 3.8
let aiConfig = {
  apiKey: process.env.OMNIROUTER_API_KEY || process.env.GEMINI_API_KEY || '',
  baseUrl: process.env.OMNIROUTER_BASE_URL || 'https://api.omnirouter.ai/v1/chat/completions',
  model: process.env.OMNIROUTER_MODEL || 'antigravity/gemini-3.8-flash-medium'
};

function loadAIConfig() {
  try {
    if (fs.existsSync(AI_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(AI_CONFIG_PATH, 'utf-8'));
      aiConfig = { ...aiConfig, ...data };
      console.log(`🤖 [AI BRAIN] Đã nạp cấu hình Model: ${aiConfig.model} (API Key: ${aiConfig.apiKey ? '✓ Đã có' : 'Chưa có'})`);
    }
  } catch {}
}
loadAIConfig();

function saveAIConfig(newConfig) {
  aiConfig = { ...aiConfig, ...newConfig };
  try {
    fs.writeFileSync(AI_CONFIG_PATH, JSON.stringify(aiConfig, null, 2), 'utf-8');
    console.log(`💾 Đã lưu cấu hình AI Gemini mới vào ai-config.json (Model: ${aiConfig.model})`);
  } catch (e) {
    console.error('Lỗi lưu ai-config.json:', e.message);
  }
}

// Bộ nhớ ngữ cảnh hội thoại
const conversationMemories = new Map();

function getMemory(threadId) {
  if (!conversationMemories.has(threadId)) {
    conversationMemories.set(threadId, []);
  }
  return conversationMemories.get(threadId);
}

function addToMemory(threadId, role, content) {
  const mem = getMemory(threadId);
  mem.push({ role, content });
  if (mem.length > 8) {
    mem.shift();
  }
}

// Nhóm Zalo mục tiêu
let activeGroupId = '2576265856283387966';
try {
  if (fs.existsSync(ACTIVE_GROUP_PATH)) {
    const gData = JSON.parse(fs.readFileSync(ACTIVE_GROUP_PATH, 'utf-8'));
    if (gData.groupId) activeGroupId = gData.groupId;
  }
} catch {}

let lastBossUserId = null;

function saveActiveGroup(groupId, groupName = 'Nhóm Công Ty MS') {
  if (!groupId) return;
  activeGroupId = String(groupId);
  try {
    fs.writeFileSync(
      ACTIVE_GROUP_PATH,
      JSON.stringify({ groupId: activeGroupId, groupName, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch {}
}

/**
 * Phân tích câu lệnh tạo dự án
 */
function parseProjectCommand(text) {
  let address = 'Biệt Thự Ecopark';
  const addrMatch = text.match(/(?:địa chỉ|ở|tại)\s+(.*?)(?=\s+(?:số tiền|tiền|giá|ngân sách|chi phí|làm trong|trong vòng|trong|thời gian|$))/i);
  if (addrMatch && addrMatch[1].trim()) address = addrMatch[1].trim();

  let budget = '85.000.000đ';
  const budgetMatch = text.match(/(?:số tiền|tiền|giá|ngân sách|chi phí)\s+(.*?)(?=\s+(?:làm trong|trong vòng|trong|thời gian|địa chỉ|ở|tại|$))/i);
  if (budgetMatch && budgetMatch[1].trim()) budget = budgetMatch[1].trim();

  let estimatedDays = 4;
  const daysMatch = text.match(/(?:thời gian làm trong|làm trong|trong vòng|trong|thời gian)\s+([0-9]+)\s*(?:ngày)?/i);
  if (daysMatch) estimatedDays = parseInt(daysMatch[1], 10) || 4;

  let client = 'Chủ Nhà Ecopark';
  const clientMatch = text.match(/(?:khách hàng|khách|chủ nhà|anh|chị)\s+(.*?)(?=\s+(?:địa chỉ|ở|tại|số tiền|làm trong|$))/i);
  if (clientMatch && clientMatch[1].trim()) client = clientMatch[1].trim();

  return { address, budget, estimatedDays, client };
}

/**
 * Tạo dự án chuẩn ConstructionSite cho Web App
 */
function createProjectFromCommand(p) {
  const siteId = `site_zalo_${Date.now()}`;
  const todayStr = new Date().toISOString().split('T')[0];
  const endD = new Date();
  endD.setDate(endD.getDate() + (p.estimatedDays || 4));
  const endDStr = endD.toISOString().split('T')[0];

  const newSite = {
    id: siteId,
    name: `Ốp Tường ${p.address}`,
    clientName: p.client || 'Khách Hàng',
    phone: '',
    address: p.address,
    totalAreaM2: 85,
    completedAreaM2: 0,
    panelType: 'Tấm ốp Lam sóng & Nano cao cấp',
    estimatedDays: p.estimatedDays || 4,
    actualDays: 1,
    startDate: todayStr,
    expectedEndDate: endDStr,
    status: 'planning',
    assignedWorkers: ['emp_ls_1', 'emp_ls_2'],
    notes: `Ngân sách: ${p.budget}. Thời gian thi công: ${p.estimatedDays} ngày. Tạo tự động qua Zalo Bot.`,
    photos: [],
    dailySchedules: [
      {
        id: `sch_${Date.now()}`,
        siteId,
        date: todayStr,
        workHours: '07:30 - 17:30',
        workerIds: ['emp_ls_1', 'emp_ls_2'],
        taskDescription: 'Khảo sát mặt bằng & bắt đầu thi công khung xương',
        status: 'scheduled'
      }
    ]
  };

  createdSites = [newSite, ...createdSites.filter(s => s.address !== newSite.address)];
  try {
    fs.writeFileSync(SITES_STORE_PATH, JSON.stringify(createdSites, null, 2), 'utf-8');
  } catch {}

  pendingActions.push({
    id: `act_${Date.now()}`,
    type: 'create_site',
    site: newSite,
    timestamp: new Date().toISOString()
  });

  console.log(`✨ [ĐÃ TẠO DỰ ÁN MỚI TỪ ZALO]: ${newSite.name} -> Đang đợi Web App đồng bộ!`);
  return newSite;
}

/**
 * Đọc cấu hình Supabase (từ biến môi trường hoặc file .env) để bot lấy DỮ LIỆU THẬT của hệ thống.
 */
function getSupabaseEnv() {
  let url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  let key = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    try {
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
          if (!m) continue;
          if (!url && m[1] === 'VITE_SUPABASE_URL') url = m[2];
          if (!key && m[1] === 'VITE_SUPABASE_ANON_KEY') key = m[2];
        }
      }
    } catch {}
  }
  return { url: url.replace(/\/+$/, ''), key };
}

let appDataCache = { time: 0, data: null };

async function fetchAppData() {
  if (appDataCache.data && Date.now() - appDataCache.time < 30000) return appDataCache.data;
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/app_records?select=collection,id,data&limit=50000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.error('Không đọc được dữ liệu Supabase cho bot: HTTP', res.status);
      return null;
    }
    const rows = await res.json();
    const data = { employees: [], sites: [], tasks: [], calendar: [], projects: [], attendance: [], zalo_config: [] };
    for (const r of rows) {
      if (data[r.collection]) data[r.collection].push(r.data);
    }
    appDataCache = { time: Date.now(), data };
    return data;
  } catch (e) {
    console.error('Lỗi đọc dữ liệu Supabase cho bot:', e.message);
    return null;
  }
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SITE_STATUS_LABEL = {
  planning: 'Đang chuẩn bị',
  framing: 'Bắn khung xương',
  installing: 'Đang ốp',
  finishing: 'Hoàn thiện',
  completed: 'Đã xong',
};

/**
 * Ngữ cảnh dữ liệu THẬT từ Supabase cung cấp cho AI
 */
async function getSystemContext(scope = 'all') {
  const now = new Date();
  const todayStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const today = isoDate(now);
  const tomorrowD = new Date(now);
  tomorrowD.setDate(tomorrowD.getDate() + 1);
  const tomorrow = isoDate(tomorrowD);

  const data = await fetchAppData();
  if (!data) {
    return `HÔM NAY LÀ: ${todayStr}\n\n(Không đọc được dữ liệu hệ thống lúc này. KHÔNG được bịa số liệu; hãy nói với Sếp là chưa lấy được dữ liệu.)`;
  }

  const empName = (id) => data.employees.find((e) => e.id === id)?.name || id;
  const showOp = scope === 'all' || scope === 'op';
  const showAg = scope === 'all' || scope === 'agency';
  const lines = [`HÔM NAY LÀ: ${todayStr} (${today})`, '', 'DỮ LIỆU THẬT TRÊN HỆ THỐNG (lấy từ ứng dụng web):'];
  if (scope === 'op') lines.push('(Nhóm này CHỈ phụ trách khối Ốp Tường. Không bàn về Agency.)');
  if (scope === 'agency') lines.push('(Nhóm này CHỈ phụ trách khối Agency. Không bàn về Ốp Tường.)');

  if (showOp) lines.push('', '1. KHỐI ỐP TƯỜNG - CÔNG TRÌNH:');
  if (showOp && data.sites.length === 0) lines.push('- Hiện chưa có công trình nào.');
  for (const site of showOp ? data.sites : []) {
    const pct = site.totalAreaM2 ? Math.round((site.completedAreaM2 / site.totalAreaM2) * 100) : 0;
    lines.push(
      `- "${site.name}" tại ${site.address || '(chưa có địa chỉ)'}, khách: ${site.clientName || '(chưa có)'}`,
      `  + Khối lượng: ${site.completedAreaM2} / ${site.totalAreaM2} m² (${pct}%)`,
      `  + Trạng thái: ${SITE_STATUS_LABEL[site.status] || site.status}; dự tính ${site.estimatedDays} ngày, thực tế đang làm ${site.actualDays} ngày`,
      `  + Thợ phụ trách: ${(site.assignedWorkers || []).map(empName).join(', ') || '(chưa gán)'}`
    );
    for (const sch of site.dailySchedules || []) {
      if (sch.date === today || sch.date === tomorrow) {
        lines.push(
          `  + Lịch ${sch.date === today ? 'hôm nay' : 'ngày mai'} (${sch.date}): ${sch.workHours || ''} - ${sch.taskDescription || ''} - thợ: ${(sch.workerIds || []).map(empName).join(', ')}`
        );
      }
    }
    if (site.notes) lines.push(`  + Ghi chú: ${site.notes}`);
  }

  if (showAg) lines.push('', '2. KHỐI AGENCY - CÔNG VIỆC (chưa hoàn thành):');
  const openTasks = showAg ? data.tasks.filter((t) => t.status !== 'done') : [];
  if (showAg && openTasks.length === 0) lines.push('- Không có task nào đang mở.');
  for (const t of openTasks.slice(0, 25)) {
    lines.push(`- [${t.status}] ${t.title} (khách: ${t.client}; phụ trách: ${t.assignedTo ? empName(t.assignedTo) : 'chưa gán'}; hạn: ${t.deadline || 'không có'})`);
  }

  if (showAg) lines.push('', '3. LỊCH CONTENT / QUAY / EDIT:');
  const pending = showAg ? data.calendar.filter((c) => !c.isCompleted) : [];
  const overdue = pending.filter((c) => c.editDeadline && c.editDeadline < today);
  const upcoming = pending
    .filter((c) => c.editDeadline && c.editDeadline >= today)
    .sort((a, b) => a.editDeadline.localeCompare(b.editDeadline))
    .slice(0, 15);
  if (showAg) lines.push(`- Tổng ${data.calendar.length} mục, chưa xong ${pending.length}, trễ hạn ${overdue.length}.`);
  for (const c of upcoming) {
    lines.push(`- Hạn ${c.editDeadline}: ${c.title} (${c.loai || 'Khác'}, khách: ${c.client})`);
  }

  lines.push('', '4. NHÂN SỰ:');
  const staff = data.employees.filter(
    (x) => x.active !== false && (scope === 'all' || (scope === 'op' ? x.companyId === 'lam_song' : x.companyId === 'agency'))
  );
  if (staff.length === 0) lines.push('- Chưa có nhân sự nào.');
  for (const e of staff) {
    lines.push(`- ${e.name} (${e.role}, ${e.companyId === 'agency' ? 'Agency' : 'Ốp tường'})`);
  }

  return lines.join('\n');
}

// ----------------- BÁO CÁO LỊCH TỰ ĐỘNG (QUÉT LỊCH, TAG @all) -----------------
const SCHEDULE_STATE_PATH = path.join(SCRIPTS_DIR, 'zalo-schedule-state.json');
const DEFAULT_ALERT_TIMES = ['08:00', '20:00'];
let lastManualReportAt = 0;

function vnNowParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((x) => x.type === t).value;
  const hour = g('hour') === '24' ? '00' : g('hour');
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${hour}:${g('minute')}` };
}

function addDaysISO(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function formatVN(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const dow = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()];
  return `${dow}, ${d}/${m}/${y}`;
}

function buildDailyReport(data, today, scope = 'all') {
  const tomorrow = addDaysISO(today, 1);
  const empName = (id) => data.employees.find((e) => e.id === id)?.name || id;
  const cut = (t, n = 80) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t || '');
  const showOp = scope === 'all' || scope === 'op';
  const showAg = scope === 'all' || scope === 'agency';
  const title = scope === 'op' ? ' (ỐP TƯỜNG)' : scope === 'agency' ? ' (AGENCY)' : '';
  const out = [`📋 BÁO CÁO LỊCH NGÀY MAI${title} - ${formatVN(tomorrow)}`, ''];

  if (showOp) out.push('🪵 KHỐI ỐP TƯỜNG');
  const activeSites = showOp ? data.sites.filter((x) => x.status !== 'completed') : [];
  if (showOp && activeSites.length === 0) out.push('• Hiện không có công trình đang chạy.');
  for (const site of activeSites) {
    const pct = site.totalAreaM2 ? Math.round((site.completedAreaM2 / site.totalAreaM2) * 100) : 0;
    out.push(`• ${site.name}${site.address ? ' (' + site.address + ')' : ''}`);
    out.push(`   Tiến độ: ${site.completedAreaM2}/${site.totalAreaM2} m² (${pct}%), ngày ${site.actualDays}/${site.estimatedDays}`);
    const sch = (site.dailySchedules || []).filter((x) => x.date === tomorrow);
    if (sch.length === 0) out.push('   Lịch mai: chưa có lịch thợ.');
    for (const x of sch) {
      const who = (x.workerIds || []).map(empName).join(', ') || 'chưa gán thợ';
      out.push(`   Lịch mai: ${x.workHours || ''} - ${x.taskDescription || ''} - ${who}`);
    }
  }

  if (showOp && showAg) out.push('');
  if (showAg) out.push('🎬 KHỐI AGENCY');
  const pending = showAg ? data.calendar.filter((c) => !c.isCompleted) : [];
  const shoots = pending.filter((c) => c.shootDate === tomorrow);
  const dues = pending.filter((c) => c.editDeadline === tomorrow && c.shootDate !== tomorrow);
  const people = (c) =>
    [c.writerId && 'Content: ' + empName(c.writerId), c.shooterId && 'Quay: ' + empName(c.shooterId), c.editorId && 'Edit: ' + empName(c.editorId)]
      .filter(Boolean).join(' | ');
  for (const c of shoots) out.push(`• 🎥 Quay: ${cut(c.title)} [${c.client}]${people(c) ? ' - ' + people(c) : ''}`);
  for (const c of dues) out.push(`• ✂️ Hạn nộp/đăng: ${cut(c.title)} [${c.client}]${people(c) ? ' - ' + people(c) : ''}`);
  const tasksDue = showAg ? data.tasks.filter((t) => t.status !== 'done' && t.deadline === tomorrow) : [];
  for (const t of tasksDue) out.push(`• 📌 Task hạn mai: ${cut(t.title)} [${t.client}]${t.assignedTo ? ' - ' + empName(t.assignedTo) : ''}`);
  if (showAg && shoots.length + dues.length + tasksDue.length === 0) out.push('• Không có lịch quay, hạn nộp hay task đến hạn vào ngày mai.');

  const overdue = pending.filter((c) => c.editDeadline && c.editDeadline < today).length;
  const overdueTasks = showAg ? data.tasks.filter((t) => t.status !== 'done' && t.deadline && t.deadline < today).length : 0;
  if (overdue + overdueTasks > 0) {
    out.push('', `⚠️ Đang trễ hạn: ${overdue} mục lịch content, ${overdueTasks} task.`);
  }
  out.push('', '👉 Anh em xem chi tiết trên web và cập nhật tiến độ giúp em nhé!');
  return out.join('\n');
}

async function sendScheduledReport(config) {
  appDataCache.time = 0;
  const data = await fetchAppData();
  if (!data) {
    console.error('⚠️ Bỏ qua báo cáo lịch: không đọc được dữ liệu Supabase.');
    return false;
  }
  if (!zaloApi || typeof zaloApi.sendMessage !== 'function') return false;
  const { date } = vnNowParts();
  const mentionAll = !config || config.mentionAll !== false;
  const isId = (v) => /^\d+$/.test(String(v || '').trim());
  const targets = [];
  if (isId(config && config.groupOpTuongId)) targets.push({ id: String(config.groupOpTuongId).trim(), scope: 'op' });
  if (isId(config && config.groupAgencyId)) targets.push({ id: String(config.groupAgencyId).trim(), scope: 'agency' });
  if (targets.length === 0) {
    // Chưa cấu hình 2 nhóm riêng: gửi 1 báo cáo chung vào nhóm mặc định như cũ.
    const legacy = config && isId(config.groupNameOrId) ? String(config.groupNameOrId).trim() : activeGroupId;
    targets.push({ id: legacy, scope: 'all' });
  }
  let allOk = true;
  for (const t of targets) {
    try {
      const body = buildDailyReport(data, date, t.scope);
      const content = mentionAll ? { msg: '@all ' + body, mentions: [{ uid: '-1', pos: 0, len: 4 }] } : { msg: body };
      await zaloApi.sendMessage(content, t.id, ThreadTypeEnum.Group);
      console.log(`📅 Đã gửi báo cáo lịch ngày mai (${t.scope}) tới nhóm ${t.id}${mentionAll ? ' (tag @all)' : ''}`);
    } catch (e) {
      allOk = false;
      console.error(`❌ Lỗi gửi báo cáo lịch tới nhóm ${t.id}:`, e.message);
    }
  }
  return allOk;
}

function loadScheduleState() {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_STATE_PATH, 'utf-8'));
  } catch {
    return { sent: [] };
  }
}

async function scheduleTick() {
  try {
    if (!zaloApi) return;
    const data = await fetchAppData();
    if (!data) return;
    const config = data.zalo_config[0] || {};
    if (config.autoScheduleAlert === false) return;
    const times = Array.isArray(config.alertTimes) && config.alertTimes.length > 0 ? config.alertTimes : DEFAULT_ALERT_TIMES;
    const { date, time } = vnNowParts();
    const nowMin = parseInt(time.slice(0, 2), 10) * 60 + parseInt(time.slice(3), 10);
    const state = loadScheduleState();
    state.sent = (state.sent || []).filter((k) => k.slice(0, 10) >= addDaysISO(date, -2));
    for (const t of times) {
      if (!/^\d{2}:\d{2}$/.test(t)) continue;
      const tMin = parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);
      const key = `${date} ${t}`;
      // Chỉ gửi trong vòng 15 phút kể từ giờ hẹn, và mỗi mốc chỉ gửi 1 lần/ngày.
      if (nowMin >= tMin && nowMin < tMin + 15 && !state.sent.includes(key)) {
        state.sent.push(key);
        fs.writeFileSync(SCHEDULE_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
        await sendScheduledReport(config);
      }
    }
  } catch (e) {
    console.error('Lỗi bộ hẹn giờ báo cáo:', e.message);
  }
}

setInterval(scheduleTick, 30000);

/**
 * Gọi Model Gemini 3.8
 */
async function scopeForThread(threadId) {
  try {
    const data = await fetchAppData();
    const c = (data && data.zalo_config[0]) || {};
    if (String(c.groupOpTuongId || '') === String(threadId)) return 'op';
    if (String(c.groupAgencyId || '') === String(threadId)) return 'agency';
  } catch {}
  return 'all';
}

async function askGeminiAI(userMessage, threadId, senderName = 'Sếp', scope = 'all') {
  if (!aiConfig.apiKey || !aiConfig.apiKey.trim()) {
    if (/tạo.*(dự án|ốp tường|công trình|nano|lam sóng)/i.test(userMessage)) {
      const p = parseProjectCommand(userMessage);
      const newSite = createProjectFromCommand(p);
      return (
        `✅ Em đã nhận lệnh của Sếp và tạo dự án thành công trên Web!\n` +
        `🪵 Tên dự án: ${newSite.name}\n` +
        `📍 Địa chỉ: ${p.address}\n` +
        `💰 Ngân sách/Giá trị: ${p.budget}\n` +
        `⏳ Thời gian thi công: ${p.estimatedDays} ngày\n` +
        `👤 Khách hàng: ${p.client}\n` +
        `👉 Hồ sơ dự án đã được đồng bộ trực tiếp lên hệ thống Web MS Management! Sếp mở Web ra là thấy ngay nhé!`
      );
    }

    if (/(?:xem|kiểm tra|báo cáo|cho xem)?\s*tiến\s*độ/i.test(userMessage) || /làm\s*(?:đến đâu|xong chưa)/i.test(userMessage)) {
      const ctx = await getSystemContext(scope);
      return `📊 [BÁO CÁO TIẾN ĐỘ TỪ DỮ LIỆU THẬT CỦA HỆ THỐNG]

${ctx}`;
    }

    return (
      `👋 Dạ em chào ${senderName}!\n\n` +
      `Em là Trợ Lý AI của MS Management đang trực tuyến 24/7.\n` +
      `📌 Sếp có thể nhắn cho em:\n` +
      `1️⃣ "Xem tiến độ công trình" -> Em báo cáo chi tiết khối lượng, thợ, tiến độ.\n` +
      `2️⃣ "Tạo 1 dự án ốp tường mới địa chỉ Ecopark số tiền 85 triệu làm trong 4 ngày" -> Em tự lên dự án trên Web ngay!\n\n` +
      `💡 Để em trò chuyện tự nhiên và tư vấn sâu bằng model Gemini 3.8, Sếp hãy nhắn: setkey [MÃ_API_KEY] nhé!`
    );
  }

  let endpoint = (aiConfig.baseUrl || 'https://api.omnirouter.ai/v1/chat/completions').trim();
  if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('generateContent')) {
    endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
  }

  const activeModel = aiConfig.model || 'antigravity/gemini-3.8-flash-medium';

  let actionNote = '';
  if (/tạo.*(dự án|ốp tường|công trình|nano|lam sóng)/i.test(userMessage)) {
    const p = parseProjectCommand(userMessage);
    const newSite = createProjectFromCommand(p);
    actionNote = `[HỆ THỐNG ĐÃ TỰ ĐỘNG TẠO DỰ ÁN TRÊN WEB THÀNH CÔNG: Tên="${newSite.name}", Địa chỉ="${p.address}", Ngân sách="${p.budget}", Thời gian="${p.estimatedDays} ngày"]`;
  }

  const systemPrompt = `Bạn là Trợ Lý AI Điều Hành Cao Cấp (MS AI Assistant) phục vụ trực tiếp cho Ban Giám Đốc và Đội Ngũ Công Ty MS.
Công ty bao gồm:
1. MS Ốp Tường Lam Sóng: Thi công tấm ốp nhựa lam sóng & tấm phẳng Nano cao cấp.
2. MS Agency: Sản xuất video TikTok/Reels/YouTube, sáng tạo nội dung cho khách hàng.

Tính cách:
- Bạn là một CHATBOT AI thực thụ (${activeModel}), thông minh, tự nhiên, lễ phép (xưng "Em", gọi "Sếp" hoặc "anh/chị").
- Trả lời bằng tiếng Việt gãy gọn, có chiều sâu, kèm icon phù hợp.
- Hiểu ngữ cảnh và hỗ trợ tư vấn mọi vấn đề công việc.
${actionNote ? `\nLƯU Ý QUAN TRỌNG: ${actionNote}. Hãy thông báo xác nhận đầy đủ và chúc mừng Sếp!` : ''}

[NGỮ CẢNH DỮ LIỆU HIỆN TẠI]:
${await getSystemContext(scope)}

QUY TẮC BẮT BUỘC: Chỉ dùng số liệu, tên công trình, tên nhân sự có trong NGỮ CẢNH ở trên. TUYỆT ĐỐI không bịa thêm công trình, khối lượng m², tên người hay lịch. Nếu thông tin không có trong ngữ cảnh thì nói rõ là hệ thống chưa có dữ liệu đó.`;

  const history = getMemory(threadId);

  try {
    console.log(`🧠 [GEMINI 3.8] Đang xử lý: "${userMessage.slice(0, 80)}"...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '';
      if (reply) {
        addToMemory(threadId, 'user', userMessage);
        addToMemory(threadId, 'assistant', reply);
        return reply.trim();
      }
    }
  } catch (err) {
    console.error('Lỗi khi gọi model Gemini AI:', err.message);
  }

  return `Dạ em đã nhận được yêu cầu của Sếp và ghi nhận vào hệ thống rồi ạ!`;
}

/**
 * Khởi động Zalo
 */
async function initZaloConnection() {
  console.log('🔄 Đang khởi tạo kết nối Zalo...');

  let zcaModule;
  try {
    zcaModule = await import('zca-js');
  } catch (err) {
    console.log('\n⚠️ Chưa tìm thấy thư viện zca-js.');
    return;
  }

  const { Zalo, LoginQRCallbackEventType, ThreadType } = zcaModule;
  if (ThreadType) ThreadTypeEnum = ThreadType;

  if (Zalo) {
    try {
      const zalo = new Zalo();

      if (fs.existsSync(APPSTATE_PATH)) {
        console.log('🔑 Tìm thấy file zalo-appstate.json! Tự động đăng nhập ngầm...');
        const appState = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf-8'));
        zaloApi = await zalo.login(appState);
        loginStatus = 'LOGGED_IN';
        console.log('✅ ĐÃ ĐĂNG NHẬP ZALO THÀNH CÔNG VỚI TÀI KHOẢN CỐ ĐỊNH!');
        console.log(`🎯 Nhóm Zalo mục tiêu hiện tại: ${activeGroupId}`);
      } else {
        console.log('📱 Chưa có session. Đang sinh mã QR...');
        loginStatus = 'WAITING_QR';

        zaloApi = await zalo.loginQR(
          {
            qrPath: QR_PATH,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          async (event) => {
            if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
              loginStatus = 'WAITING_QR';
              if (event.data && event.data.image) {
                currentQrBase64 = event.data.image;
                fs.writeFileSync(QR_PATH, Buffer.from(event.data.image, 'base64'));
              }
              if (event.actions && typeof event.actions.saveToFile === 'function') {
                try { await event.actions.saveToFile(QR_PATH); } catch {}
              }
            } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
              loginStatus = 'LOGGED_IN';
              fs.writeFileSync(APPSTATE_PATH, JSON.stringify(event.data, null, 2), 'utf-8');
            }
          }
        );

        loginStatus = 'LOGGED_IN';
      }

      if (zaloApi && zaloApi.listener) {
        console.log('👂 Bot đang kích hoạt WebSocket lắng nghe tin nhắn Zalo 24/7...');

        zaloApi.listener.on('message', async (msg) => {
          try {
            const rawContent = (msg?.data?.content || msg?.content || '').trim();
            const threadId = String(msg.threadId);
            const isGroup = msg.type === ThreadTypeEnum.Group || !!msg.isGroup;

            console.log(`📩 [TIN NHẮN ĐẾN] [${isGroup ? 'Nhóm' : 'Chat riêng'}: ${threadId}]: ${rawContent}`);

            if (isGroup) {
              saveActiveGroup(threadId);
            } else {
              lastBossUserId = threadId;
            }

            if (!rawContent) return;
            if (msg.isSelf) return;

            const setKeyMatch = rawContent.match(/^(?:setkey|set_key|api_key|cài key|luu key)\s+([a-zA-Z0-9_\-\.\:\/]+)/i);
            if (setKeyMatch) {
              const newKey = setKeyMatch[1].trim();
              saveAIConfig({ apiKey: newKey });
              const confirmMsg = `✅ Em đã lưu thành công API Key của Gemini 3.8!\n🤖 Từ bây giờ em sẽ sử dụng trí tuệ nhân tạo Gemini 3.8 (${aiConfig.model}) để trò chuyện và trả lời tự nhiên mọi câu hỏi của Sếp và anh em 24/7! 🚀`;
              await sendMessageToZalo(threadId, confirmMsg, isGroup ? ThreadTypeEnum.Group : ThreadTypeEnum.User);
              return;
            }

            const cleanContent = rawContent.replace(/@\S+/g, '').trim() || rawContent;
            const aiReply = await askGeminiAI(cleanContent, threadId, isGroup ? 'Sếp và cả nhóm' : 'Sếp', isGroup ? await scopeForThread(threadId) : 'all');

            await sendMessageToZalo(threadId, aiReply, isGroup ? ThreadTypeEnum.Group : ThreadTypeEnum.User);
          } catch (mErr) {
            console.error('Lỗi xử lý tin nhắn đến:', mErr.message);
          }
        });

        zaloApi.listener.start({ retryOnClose: true });
        console.log('🚀 WebSocket Bot Zalo AI Gemini đã chạy và sẵn sàng nhận lệnh 24/7!');
      }
    } catch (err) {
      console.error('❌ Lỗi kết nối Zalo:', err.message);
      setTimeout(initZaloConnection, 15000);
    }
  }
}

/**
 * Gửi tin nhắn qua Zalo
 */
async function sendMessageToZalo(threadId, messageText, threadType = ThreadTypeEnum.Group) {
  let target = threadId;

  if (!target || !/^\d+$/.test(String(target).trim())) {
    target = activeGroupId;
    threadType = ThreadTypeEnum.Group;
  }

  target = String(target).trim();

  if (zaloApi && typeof zaloApi.sendMessage === 'function') {
    try {
      console.log(`📤 Đang gửi tin nhắn Zalo tới [${threadType === ThreadTypeEnum.Group ? 'Nhóm' : 'User'}: ${target}]...`);
      const res = await zaloApi.sendMessage(messageText, target, threadType);
      console.log(`✓ Đã gửi tin nhắn Zalo thành công tới: ${target}`);
      return res;
    } catch (e) {
      console.error(`❌ Lỗi gửi tin nhắn Zalo tới ${target}:`, e.message);
      if (threadType === ThreadTypeEnum.User && activeGroupId) {
        try {
          return await zaloApi.sendMessage(messageText, activeGroupId, ThreadTypeEnum.Group);
        } catch {}
      }
      return null;
    }
  } else {
    console.log(`\n───────────────────────────────────────────────────────`);
    console.log(`📱 [BOT SIMULATION TỚI ${target}]:`);
    console.log(messageText);
    console.log(`───────────────────────────────────────────────────────\n`);
    return true;
  }
}

/**
 * BỘ PHỤC VỤ TĨNH CHO WEB APP (STATIC SERVER - ZERO DEPENDENCY)
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function serveStaticFile(req, res) {
  if (!fs.existsSync(DIST_DIR)) return false;

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // An toàn đường dẫn
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  // SPA Fallback cho các route frontend
  if (!req.url.startsWith('/api') && !req.url.startsWith('/webhook') && !req.url.startsWith('/qr') && !req.url.startsWith('/health')) {
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return true;
    }
  }

  return false;
}

/**
 * SERVER HTTP TỔNG HỢP: WEB APP + API + WEBHOOKS + ZALO BOT
 */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. API cho Web App lấy các hành động đang chờ (như tạo dự án mới từ Zalo)
  if (req.method === 'GET' && req.url === '/api/pending-actions') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(pendingActions));
    return;
  }

  // 2. API xác nhận Web App đã xử lý xong hành động
  if (req.method === 'POST' && req.url === '/api/pending-actions/consume') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const ids = payload.ids || [];
        // Dự án đã được Web App nhận thì xóa khỏi file lưu, để khi khởi động lại bot không tạo lại.
        const consumedSiteIds = pendingActions.filter(a => ids.includes(a.id) && a.site).map(a => a.site.id);
        pendingActions = pendingActions.filter(a => !ids.includes(a.id));
        if (consumedSiteIds.length > 0) {
          createdSites = createdSites.filter(x => !consumedSiteIds.includes(x.id));
          try { fs.writeFileSync(SITES_STORE_PATH, JSON.stringify(createdSites, null, 2), 'utf-8'); } catch {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, remaining: pendingActions.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // 3. API lấy danh sách dự án do Bot tạo
  if (req.method === 'GET' && req.url === '/api/sites') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(createdSites));
    return;
  }

  // 4. Nhận đồng bộ cấu hình AI từ Web App
  if (req.method === 'POST' && (req.url === '/webhook/config' || req.url === '/api/config')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (payload.apiKey !== undefined || payload.baseUrl !== undefined || payload.model !== undefined) {
          saveAIConfig({
            apiKey: payload.apiKey !== undefined ? payload.apiKey : aiConfig.apiKey,
            baseUrl: payload.baseUrl !== undefined ? payload.baseUrl : aiConfig.baseUrl,
            model: payload.model !== undefined ? payload.model : aiConfig.model,
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, message: 'Đã cập nhật cấu hình AI thành công!', model: aiConfig.model }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // 4b. Trạng thái đăng nhập Zalo + mã QR (cho nút "Đăng nhập Zalo Bot" trên Web App)
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/zalo/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({
      loginStatus,
      zaloConnected: !!zaloApi,
      qr: loginStatus === 'WAITING_QR' && !zaloApi ? currentQrBase64 : null,
    }));
    return;
  }

  // 4d. Danh sách nhóm Zalo mà bot đang tham gia (để chọn trên Web App)
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/zalo/groups') {
    (async () => {
      let status = 200;
      let body = { groups: [] };
      if (!zaloApi) {
        status = 409;
        body = { groups: [], message: 'Bot chưa đăng nhập Zalo.' };
      } else {
        try {
          const all = await zaloApi.getAllGroups();
          const ids = Object.keys((all && all.gridVerMap) || {});
          const groups = [];
          for (let i = 0; i < ids.length; i += 50) {
            const info = await zaloApi.getGroupInfo(ids.slice(i, i + 50));
            for (const [gid, g] of Object.entries((info && info.gridInfoMap) || {})) {
              groups.push({ id: String(gid), name: g.name || String(gid) });
            }
          }
          groups.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          body = { groups };
        } catch (e) {
          status = 500;
          body = { groups: [], message: 'Không lấy được danh sách nhóm: ' + e.message };
        }
      }
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    })();
    return;
  }

  // 4c. Gửi báo cáo lịch ngay (nút "Gửi thử" trên Web App)
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/zalo/report-now') {
    (async () => {
      let status = 200;
      let result = { ok: false, message: '' };
      if (!zaloApi) {
        status = 409;
        result.message = 'Bot chưa đăng nhập Zalo.';
      } else if (Date.now() - lastManualReportAt < 30000) {
        status = 429;
        result.message = 'Vừa gửi xong, vui lòng đợi 30 giây.';
      } else {
        lastManualReportAt = Date.now();
        const data = await fetchAppData();
        const ok = await sendScheduledReport((data && data.zalo_config[0]) || {});
        result = { ok, message: ok ? 'Đã gửi báo cáo lên nhóm Zalo.' : 'Gửi thất bại, xem log máy chủ.' };
        if (!ok) status = 500;
      }
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
    })();
    return;
  }

  // 5. Health Check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'online',
      serverType: 'Unified VPS Master Server',
      loginStatus,
      zaloConnected: !!zaloApi,
      activeGroupId,
      pendingActionsCount: pendingActions.length,
      createdSitesCount: createdSites.length,
      aiModel: aiConfig.model,
      hasAIKey: !!aiConfig.apiKey,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 6. Nhận Webhook bắn tin nhắn từ Web App
  if (req.method === 'POST' && (req.url === '/webhook/command' || req.url === '/webhook/boss' || req.url === '/webhook/group' || req.url === '/webhook')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const isBoss = req.url === '/webhook/boss' || payload.recipientType === 'boss';

        console.log(`\n📬 [AI AGENT WEBHOOK] Gửi tới: ${isBoss ? 'Sếp' : 'Nhóm Zalo'}`);
        console.log(`📌 Tiêu đề: ${payload.title || 'Thông báo'}`);

        let targetId = isBoss ? (payload.target || lastBossUserId) : (payload.target || activeGroupId);
        const msgContent = payload.message || payload.text || 'Thông báo từ MS Management';

        await sendMessageToZalo(
          targetId,
          msgContent,
          isBoss && /^\d+$/.test(targetId) ? ThreadTypeEnum.User : ThreadTypeEnum.Group
        );

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `Bot đã chuyển tiếp tin nhắn thành công tới Zalo!`,
          target: targetId
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // 7. Phục vụ Web App Production từ thư mục dist/
  if (serveStaticFile(req, res)) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found - MS Management');
});

server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MASTER PRODUCTION SERVER ĐANG CHẠY CỔNG ${PORT}`);
  console.log(`🌐 Web App & API: http://localhost:${PORT}`);
  console.log(`🧠 AI Gemini Model: ${aiConfig.model}`);
  console.log(`🎯 Nhóm Zalo mục tiêu: ${activeGroupId}`);
  console.log(`======================================================\n`);
  await initZaloConnection();
});

// Xử lý tắt êm dịu khi restart trên VPS
process.on('SIGTERM', () => {
  console.log('🛑 Đang dừng server...');
  server.close(() => process.exit(0));
});
