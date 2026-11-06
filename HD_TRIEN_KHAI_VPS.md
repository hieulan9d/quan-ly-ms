# 🚀 HƯỚNG DẪN TRIỂN KHAI MS MANAGEMENT & ZALO AI BOT LÊN VPS 24/7

Tài liệu hướng dẫn triển khai toàn bộ hệ thống (Web Quản Lý + Zalo Bot AI Gemini 3.8) lên máy chủ ảo VPS để chạy liên tục 24/7 mà không cần mở máy tính cá nhân.

---

## 🌟 ĐIỂM TỐI ƯU CỦA BẢN ĐÓNG GÓI VPS:
* **Kiến trúc All-In-One (1 Process duy nhất):** Tích hợp Web App production (`dist/`) + API + Bot Zalo WebSocket vào đúng **1 tiến trình Node.js (`server.js`)**.
* **Cực kỳ nhẹ:** Tiêu tốn chỉ **~80MB - 120MB RAM**, chạy mượt mà ngay cả trên gói VPS rẻ nhất (1 Core - 1GB RAM, giá ~50k - 100k/tháng).
* **Không cần quét lại Zalo:** File session [`scripts/zalo-appstate.json`](file:///e:/antigravyti/ch%E1%BA%A5m%20c%C3%B4ng%20v%C3%A0%20ti%E1%BA%BFn%20%C4%91%E1%BB%99%20c%C3%B4ng%20vi%E1%BB%87c/scripts/zalo-appstate.json) đã có sẵn. Mang lên VPS là tự động đăng nhập ngầm vĩnh viễn.
* **Tự phục hồi 24/7 (PM2):** Tự khởi động lại nếu gặp sự cố hoặc khi VPS khởi động lại.

---

## 📁 CÁC FILE QUAN TRỌNG ĐÃ ĐÓNG GÓI:
1. [`server.js`](file:///e:/antigravyti/ch%E1%BA%A5m%20c%C3%B4ng%20v%C3%A0%20ti%E1%BA%BFn%20%C4%91%E1%BB%99%20c%C3%B4ng%20vi%E1%BB%87c/server.js): File máy chủ Master duy nhất phục vụ Web App + Zalo Bot AI.
2. [`ecosystem.config.cjs`](file:///e:/antigravyti/ch%E1%BA%A5m%20c%C3%B4ng%20v%C3%A0%20ti%E1%BA%BFn%20%C4%91%E1%BB%99%20c%C3%B4ng%20vi%E1%BB%87c/ecosystem.config.cjs): File cấu hình PM2 quản lý tiến độ và bộ nhớ.
3. [`deploy-vps.sh`](file:///e:/antigravyti/ch%E1%BA%A5m%20c%C3%B4ng%20v%C3%A0%20ti%E1%BA%BFn%20%C4%91%E1%BB%99%20c%C3%B4ng%20vi%E1%BB%87c/deploy-vps.sh): Script cài đặt tự động 1 lệnh cho Linux VPS (Ubuntu/Debian).
4. [`deploy-vps.bat`](file:///e:/antigravyti/ch%E1%BA%A5m%20c%C3%B4ng%20v%C3%A0%20ti%E1%BA%BFn%20%C4%91%E1%BB%99%20c%C3%B4ng%20vi%E1%BB%87c/deploy-vps.bat): Script cài đặt 1-click cho Windows VPS.
5. Thư mục [`scripts/`](file:///e:/antigravyti/ch%E1%BA%A5m%20c%C3%B4ng%20v%C3%A0%20ti%E1%BA%BFn%20%C4%91%E1%BB%99%20c%C3%B4ng%20vi%E1%BB%87c/scripts): Chứa session Zalo (`zalo-appstate.json`), cấu hình Gemini (`ai-config.json`) và ID nhóm Zalo.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT LÊN VPS LINUX (UBUNTU / DEBIAN)

### Bước 1: Sao chép thư mục dự án lên VPS
Nén thư mục dự án này (hoặc đẩy lên GitHub rồi clone về VPS):
```bash
# Trên VPS, di chuyển vào thư mục dự án
cd /var/www/ms-management
```
*(Đảm bảo thư mục `scripts/` có chứa file `zalo-appstate.json` để không phải quét lại mã)*

### Bước 2: Chạy script tự động triển khai
Chỉ cần chạy 1 dòng lệnh duy nhất:
```bash
bash deploy-vps.sh
```

Script sẽ tự động:
1. Cài đặt Node.js LTS (nếu máy chưa có)
2. Cài đặt PM2
3. Cài đặt thư viện (`npm install`)
4. Build Web App tối ưu (`npm run build`)
5. Khởi chạy server và duy trì 24/7 bằng PM2

### Bước 3: Cấu hình tự khởi động cùng VPS khi reboot
Chạy lệnh sau trên terminal VPS:
```bash
pm2 startup
pm2 save
```

---

## 🌐 CÁCH TRUY CẬP HỆ THỐNG:
* Truy cập Web App: `http://<IP_VPS_CỦA_BẠN>:5005`
* Kiểm tra trạng thái chạy:
  ```bash
  pm2 status
  ```
* Xem log bot theo thời gian thực:
  ```bash
  pm2 logs ms-management-app
  ```
* Khởi động lại khi cần:
  ```bash
  pm2 restart ms-management-app
  ```

---

## 🛡️ (TÙY CHỌN) TRỎ TÊN MIỀN QUA NGINX (CỔNG 80 / 443 HTTPS):
Nếu bạn muốn dùng tên miền riêng (ví dụ `quanly.msagency.vn`):

1. Cài đặt Nginx:
   ```bash
   sudo apt install -y nginx
   ```
2. Tạo file cấu hình: `sudo nano /etc/nginx/sites-available/ms-management`
   ```nginx
   server {
       listen 80;
       server_name quanly.msagency.vn; # Thay bằng tên miền của bạn

       location / {
           proxy_pass http://127.0.0.1:5005;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. Kích hoạt và reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ms-management /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Cài SSL miễn phí (Let's Encrypt):
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d quanly.msagency.vn
   ```
