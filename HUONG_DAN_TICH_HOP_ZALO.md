# 🤖 HƯỚNG DẪN TÍCH HỢP AI AGENT & TỰ ĐỘNG HÓA ZALO
### Báo Cáo Tiến Độ, Tự Động Tính Lương & Nhắc Lịch Nhóm Zalo

Tài liệu này hướng dẫn bạn cách sử dụng và cấu hình hệ thống **AI Agent tự động** tích hợp trực tiếp trong ứng dụng **MS Management** (Quản lý 2 Doanh nghiệp: *MS Agency* & *MS Thi Công Ốp Tường Lam Sóng*).

---

## 🌟 1. CÁC TÍNH NĂNG CỐT LÕI CỦA AI AGENT

### 1.1. 🔔 Quét & Nhắn Thông Báo Lên Nhóm Zalo Khi Sắp Đến Lịch
- **Lịch Thợ Thi Công Ốp Lam Sóng**:
  - Tự động phát hiện các công trình có lịch thi công hôm nay hoặc ngày mai (`dailySchedules`).
  - Gắn thẻ chi tiết: *Ai làm, ở đâu, khung giờ nào, ghi chú hiện trường*.
  - Cảnh báo các công trình sắp đến ngày bàn giao nghiệm thu hoặc đang trễ tiến độ số ngày.
- **Lịch Agency & Deadline Video**:
  - Quét kịch bản/video sắp đến hạn nộp bài edit (`editDeadline`) trong ngày hôm nay hoặc ngày mai.
  - Quét lịch đi quay ngoại cảnh hôm nay (`shootDate`, cameraman phụ trách).
- **Soạn sẵn thông điệp chuẩn đẹp**:
  - Có đầy đủ biểu tượng cảm xúc (Emoji), phân loại rõ ràng 2 khối, kèm lời nhắc an toàn lao động và khích lệ tinh thần đội ngũ.
  - Gửi tự động qua **Webhook Zalo** hoặc nút **Mở Zalo Gửi 1-Chạm**.

---

### 1.2. 💰 AI Tự Động Tính & Lập Báo Cáo Lương (Payroll Automation)
- **Tự động quét công việc tháng**:
  - **Khối Agency (Tính theo đầu việc)**: Đếm chính xác số bài content/kịch bản hoàn thành, số buổi đi quay, số video edit nghiệm thu $\times$ Bảng đơn giá chung + Giờ tăng ca OT + Phụ cấp $\rightarrow$ Lương thực nhận.
  - **Khối MS Ốp Tường (Công nhật / Lương tháng)**: Đếm tổng số ngày công thợ $\times$ Đơn giá công nhật (350k - 500k/ngày) + Giờ OT đêm $\times$ Đơn giá OT + Phụ cấp $\rightarrow$ Lương thực nhận.
- **Phân tích tài chính AI (CFO Insights)**:
  - Tự động so sánh tỷ trọng quỹ lương giữa 2 công ty.
  - Nhận xét hiệu quả chi trả trên mỗi $m^2$ ốp hoàn thiện và mỗi video xuất bản.
  - Đưa ra 3 khuyến nghị hành động tối ưu chi phí tăng ca và nhân sự.
- **Gửi Báo Cáo Cho Sếp Duyệt**:
  - Gửi trực tiếp bản tóm tắt lương và chi tiết từng nhân sự vào Zalo cá nhân của Sếp.

---

### 1.3. 📊 Báo Cáo Vận Hành & Tiến Độ Tuần / Tháng
- Tóm tắt tỷ lệ hoàn thành video của Agency.
- Khối lượng $m^2$ ốp tường đã nghiệm thu so với kế hoạch ban đầu.
- So sánh số ngày thi công thực tế so với số ngày dự tính ban đầu (phát hiện nhanh công trình bị trễ ngày gây tốn công thợ).

---

## 🚀 2. HƯỚNG DẪN SỬ DỤNG TRÊN GIAO DIỆN WEB / ĐIỆN THOẠI

### Bước 1: Mở Trợ Lý AI Agent
- Trên thanh menu (Header) hoặc ngay trên Dashboard, bạn bấm vào nút:
  👉 **`Trợ Lý AI & Zalo`** (biểu tượng chú Robot màu tím).

### Bước 2: Chọn Tính Năng Bạn Cần
Cửa sổ Trợ Lý AI mở ra với 4 Tab tiện ích:
1. **`1. Nhắc Lịch Nhóm Zalo`**: Xem danh sách các lịch thi công & deadline hôm nay. Bấm **Bắn Thông Báo Lên Nhóm Zalo Ngay**.
2. **`2. Tự Tạo Báo Cáo Lương`**: Chọn tháng cần tính (VD: 2026-11), bấm **Tính Lương** $\rightarrow$ AI tính toán chi tiết và tạo bản tin gửi Sếp duyệt.
3. **`3. Báo Cáo Tiến Độ (2 Cty)`**: Bấm **Báo Cáo Tuần** hoặc **Báo Cáo Tháng** để AI xuất báo cáo tổng quan.
4. **`4. Cài Đặt Zalo & AI`**: Nơi bạn cấu hình Webhook và API Key.

---

## 📲 3. HƯỚNG DẪN CẤU HÌNH GỬI TIN NHẮN ZALO

Bạn có thể chọn **1 trong 2 cách** tùy nhu cầu:

### 👉 CÁCH 1: Dùng Ngay Không Cần Cài Đặt (Khuyên Dùng Trên Điện Thoại)
- Khi bạn bấm nút **`Mở Zalo Gửi 1-Chạm`**:
  1. Ứng dụng tự động copy toàn bộ nội dung báo cáo (đã được AI định dạng chuẩn đẹp, emoji đầy đủ) vào bộ nhớ tạm (Clipboard).
  2. Tự động mở ứng dụng Zalo (hoặc trang Zalo Web `chat.zalo.me`).
  3. Bạn chỉ cần vào nhóm công ty hoặc chat với Sếp và bấm **Dán (Ctrl + V)** $\rightarrow$ **Gửi** là xong!

---

### 👉 CÁCH 2: Tự Động 100% Qua Webhook (Bắn Thẳng Vào Zalo)
Dành cho người muốn AI tự động gửi tin nhắn mà không cần phải dán thủ công:

#### A. Sử Dụng Server Mẫu Có Sẵn Trong Dự Án:
1. Mở PowerShell hoặc Terminal tại thư mục dự án, chạy lệnh:
   ```bash
   node scripts/zalo-webhook-server.cjs
   ```
2. Server sẽ khởi động tại cổng `5005`:
   - Webhook Sếp: `http://localhost:5005/webhook/boss`
   - Webhook Nhóm: `http://localhost:5005/webhook/group`
3. Mở ứng dụng $\rightarrow$ Vào **Trợ Lý AI & Zalo** $\rightarrow$ Tab **4. Cài Đặt Zalo & AI**:
   - Dán URL trên vào ô tương ứng.
   - Bấm nút **Test Webhook** để xác nhận kết nối thành công!

#### B. Sử Dụng n8n / Make / Chatbot Webhook:
- Nếu bạn có tài khoản **n8n** hoặc **Make.com**, chỉ cần tạo 1 Webhook Trigger:
  - Khi nhận Webhook từ App $\rightarrow$ Gửi tin nhắn qua Zalo OA (Official Account) hoặc Zalo Bot.
  - Dán Webhook URL của n8n vào Tab Cài Đặt của Web App.

---

## 🤖 4. CẤU HÌNH MÔ HÌNH AI (OMNIROUTER / GEMINI)

1. Mở **Trợ Lý AI & Zalo** $\rightarrow$ Tab **4. Cài Đặt Zalo & AI**.
2. Tại phần **Cấu Hình Mô Hình AI**:
   - **OmniRouter API Key**: Nhập key của bạn (VD: `sk-or-v1-...`).
   - **Base URL**: Mặc định là `https://api.omnirouter.ai/v1/chat/completions`.
   - **Model Name**: Mặc định là `antigravity/gemini-3.8-flash-medium` (hoặc `google/gemini-2.0-flash`).
3. Bấm nút **Kiểm tra AI**: Nếu phản hồi ping thành công, chúc mừng bạn đã kích hoạt bộ não AI thế hệ mới nhất!
4. *(Lưu ý: Nếu không có API Key, hệ thống vẫn có sẵn bộ máy phân tích nội bộ thông minh **Smart Synthesizer** để tự tính lương và nhắc lịch hoàn toàn miễn phí).*

---

## 📞 HỖ TRỢ & LIÊN HỆ
Mọi góp ý hoặc cần nâng cấp thêm tính năng Zalo Bot tự động trả lời tin nhắn nhân viên, xin vui lòng liên hệ Ban Quản Trị Hệ Thống.
