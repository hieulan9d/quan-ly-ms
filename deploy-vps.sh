#!/bin/bash
# ==============================================================================
# SCRIPT TRIỂN KHAI TỰ ĐỘNG LÊN VPS (UBUNTU / DEBIAN)
# MS MANAGEMENT & ZALO AI BOT 24/7
# ==============================================================================

set -e

echo "======================================================================"
echo "🚀 ĐANG TRIỂN KHAI MS MANAGEMENT & ZALO AI BOT LÊN VPS..."
echo "======================================================================"

# 1. Cập nhật hệ thống & cài đặt Node.js LTS nếu chưa có
if ! command -v node &> /dev/null; then
    echo "📦 Đang cài đặt Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "✓ Node.js version: $(node -v)"
echo "✓ NPM version: $(npm -v)"

# 2. Cài đặt PM2 toàn cục nếu chưa có
if ! command -v pm2 &> /dev/null; then
    echo "📦 Đang cài đặt PM2..."
    npm install -g pm2
fi

# 3. Tạo thư mục logs
mkdir -p logs

# 4. Cài đặt thư viện dự án
echo "📦 Đang cài đặt dependencies..."
npm install

# 5. Build Web App thành static files trong dist/
echo "🔨 Đang build Web App production..."
npm run build

# 6. Khởi động ứng dụng bằng PM2
echo "🚀 Đang khởi động hệ thống bằng PM2..."
pm2 delete ms-management-app 2> /dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "======================================================================"
echo "🎉 CHÚC MỪNG! HỆ THỐNG ĐÃ CHẠY THÀNH CÔNG 24/7 TRÊN VPS!"
echo "======================================================================"
echo "🌐 Truy cập Web App: http://$(curl -s ifconfig.me):5005"
echo "📊 Kiểm tra trạng thái: pm2 status"
echo "📜 Xem nhật ký Bot:     pm2 logs ms-management-app"
echo "🔄 Khởi động cùng VPS:  pm2 startup"
echo "======================================================================"
