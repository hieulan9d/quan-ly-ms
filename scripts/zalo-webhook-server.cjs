/**
 * ==============================================================================
 * ZALO WEBHOOK RELAY SERVER CHO AI AGENT (MS MANAGEMENT)
 * ==============================================================================
 * Server trung gian nhận tin nhắn từ AI Agent trong Web App và chuyển tiếp vào Zalo.
 * 
 * Hướng dẫn chạy nhanh:
 * 1. Chạy lệnh: node scripts/zalo-webhook-server.cjs
 * 2. Mở Web App -> Bấm "Trợ Lý AI & Zalo" -> Tab "4. Cài Đặt Zalo & AI"
 * 3. Điền Webhook URL:
 *    - Webhook Sếp: http://localhost:5005/webhook/boss
 *    - Webhook Nhóm: http://localhost:5005/webhook/group
 * 4. Bấm "Test Webhook" -> Tin nhắn sẽ bắn ngay vào server này!
 * ==============================================================================
 */

const http = require('http');

const PORT = process.env.PORT || 5005;

const server = http.createServer((req, res) => {
  // Bật CORS để Web App (trên trình duyệt) có thể gửi request mà không bị chặn
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route kiểm tra trạng thái server
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'Zalo AI Agent Webhook Relay Server',
      timestamp: new Date().toISOString(),
      endpoints: {
        boss: '/webhook/boss',
        group: '/webhook/group',
      }
    }));
    return;
  }

  // Route nhận Webhook từ AI Agent
  if (req.method === 'POST' && (req.url === '/webhook/boss' || req.url === '/webhook/group' || req.url === '/webhook')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const isBoss = req.url === '/webhook/boss' || payload.recipientType === 'boss';
        const targetType = isBoss ? '👑 BÁO CÁO CHO SẾP (PRIVATE)' : '👥 THÔNG BÁO LÊN NHÓM ZALO (GROUP)';

        console.log('\n' + '='.repeat(60));
        console.log(`🤖 [AI AGENT NHẬN YÊU CẦU GỬI ZALO] - ${new Date().toLocaleString('vi-VN')}`);
        console.log(`🎯 Kênh đích: ${targetType}`);
        console.log(`📌 Tiêu đề: ${payload.title || 'Không có tiêu đề'}`);
        console.log(`👤 Người/Nhóm nhận: ${payload.target || 'Mặc định'}`);
        console.log('-'.repeat(60));
        console.log(payload.message || payload.text || '(Trống)');
        console.log('='.repeat(60) + '\n');

        /**
         * 💡 TÍCH HỢP GỬI ZALO THẬT TẠI ĐÂY:
         * 
         * 1. Nếu bạn dùng Zalo Official Account (OA Open API):
         *    const zaloAccessToken = process.env.ZALO_ACCESS_TOKEN;
         *    await fetch('https://openapi.zalo.me/v2.0/oa/message', {
         *      method: 'POST',
         *      headers: { 'access_token': zaloAccessToken, 'Content-Type': 'application/json' },
         *      body: JSON.stringify({ recipient: { user_id: payload.target }, message: { text: payload.message } })
         *    });
         * 
         * 2. Nếu bạn dùng n8n / Make / Bot Telegram phụ trợ:
         *    Chỉ cần đổi URL Webhook trong Web App trỏ trực tiếp vào n8n/Make Webhook.
         */

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: `Server đã nhận thành công tin nhắn và chuyển tiếp tới Zalo (${isBoss ? 'Sếp' : 'Nhóm'})!`,
          receivedAt: new Date().toISOString(),
          title: payload.title,
        }));
      } catch (err) {
        console.error('❌ Lỗi xử lý JSON Webhook:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          message: `Lỗi định dạng JSON: ${err.message}`,
        }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Endpoint không tồn tại. Vui lòng gửi tới /webhook/boss hoặc /webhook/group' }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 Zalo AI Agent Webhook Server đang lắng nghe tại cổng ${PORT}`);
  console.log(`📡 URL Test: http://localhost:${PORT}/health`);
  console.log(`📬 Webhook Báo Cáo Sếp:  http://localhost:${PORT}/webhook/boss`);
  console.log(`📢 Webhook Thông Báo Nhóm: http://localhost:${PORT}/webhook/group`);
  console.log(`💡 Mở Web App và dán URL trên vào Cài Đặt Zalo để nhận báo cáo tự động!\n`);
});
