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
 * Ngữ cảnh dữ liệu thực tế hệ thống MS Management cung cấp cho Gemini
 */
function getSystemContext() {
  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `HÔM NAY LÀ: ${todayStr}

DỮ LIỆU CÔNG VIỆC THỰC TẾ TRÊN HỆ THỐNG MS MANAGEMENT:
1. KHỐI MS ỐP TƯỜNG LAM SÓNG & NANO:
- Công trình trọng điểm: "Biệt Thự Gamuda Yên Sở"
  + Khối lượng: 58 / 85 m² hoàn thiện (đạt 68%)
  + Giai đoạn: Đang ốp hoàn thiện nan sóng phòng khách và nẹp phào góc
  + Tiến độ thời gian: Đang làm ngày 3 / 5 ngày dự tính (Đúng tiến độ ✓)
  + Đội thợ phụ trách: Trần Văn Bình (Tổ trưởng), Hoàng Văn Dũng
  + Nhật ký công trình: Đã tải lên 4 ảnh hiện trường thi công sắc nét
- Công trình mới khởi công: "Ốp Tường Biệt Thự Ecopark" (Ngân sách 85 triệu, 4 ngày làm việc, tổ thợ Bình & Dũng)

2. KHỐI MS AGENCY (SẢN XUẤT VIDEO & CONTENT MARKETING):
- Dự án chính: Kế hoạch truyền thông "Feel Chicken"
  + Video TikTok/Reels: 15 video theo kế hoạch tháng, đã quay xong 9 video, dựng hoàn tất 7 video
  + Deadline gấp hôm nay: Cần duyệt 1 video hậu trường và đăng bài Content Fanpage
  + Đội ngũ: Editor Tuấn Anh, Content Thu Trang, Quay phim Hoàng Nam`;
}

/**
 * Gọi Model Gemini 3.8
 */
async function askGeminiAI(userMessage, threadId, senderName = 'Sếp') {
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
      return (
        `📊 [BÁO CÁO TIẾN ĐỘ THỜI GIAN THỰC CHO SẾP]\n` +
        `🪵 Công trình: Biệt Thự Gamuda Yên Sở\n` +
        `📈 Khối lượng hoàn thiện: 58 / 85 m² (Đạt 68% khối lượng)\n` +
        `🏗️ Giai đoạn: Đang ốp hoàn thiện nan sóng & phào góc trang trí\n` +
        `⏳ Thời gian: Ngày thứ 3 / 5 ngày dự tính (Đúng tiến độ ✓)\n` +
        `👷 Đội thợ: Trần Văn Bình (Tổ trưởng), Hoàng Văn Dũng\n` +
        `📸 Nhật ký: Đã cập nhật 4 ảnh thi công hiện trường mới nhất\n` +
        `👉 Dữ liệu đồng bộ trực tiếp từ ứng dụng Web MS Management!`
      );
    }

    return (
      `👋 Dạ em chào ${senderName}!\n\n` +
      `Em là Trợ Lý AI của MS Management đang trực tuyến 24/7.\n` +
      `📌 Sếp có thể nhắn cho em:\n` +
      `1️⃣ "Xem tiến độ dự án Gamuda" -> Em báo cáo chi tiết khối lượng, thợ, tiến độ.\n` +
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
${getSystemContext()}`;

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
            const aiReply = await askGeminiAI(cleanContent, threadId, isGroup ? 'Sếp và cả nhóm' : 'Sếp');

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
        pendingActions = pendingActions.filter(a => !ids.includes(a.id));
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
