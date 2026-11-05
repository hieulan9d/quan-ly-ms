# 📚 TÀI LIỆU KIẾN THỨC VẬN HÀNH & PHÁT TRIỂN HỆ THỐNG
### Dành Cho Người Dùng, Quản Trị Viên & Lập Trình Viên (Open Source & GitHub)

Tài liệu này tóm tắt toàn bộ kiến thức nghiệp vụ, quy trình vận hành và kỹ thuật lập trình để bất kỳ ai khi tiếp cận dự án trên GitHub đều có thể hiểu nhanh, sử dụng thành thạo và trực tiếp chỉnh sửa mã nguồn.

---

## 🧭 1. KIẾN THỨC NGHIỆP VỤ (VÌ SAO CẦN PHẦN MỀM NÀY?)

Hệ thống được thiết kế theo tư duy **"One Owner - Two Businesses"** (Một chủ - Hai mô hình kinh doanh), tối ưu cho người làm chủ vận hành song song:
1. **Một Agency Sáng Tạo / Marketing**:
   - Nhân sự: Content Creator, Quay dựng video (Editor/Cameraman), Graphic Designer.
   - Sản phẩm: Kế hoạch nội dung tháng, bài đăng Facebook/TikTok, video ngắn.
   - Vấn đề hay gặp: Nhân viên trễ deadline kịch bản, trễ hẹn dựng clip, khó kiểm soát KPI hợp đồng khách hàng (15 triệu/tháng hay 20 triệu/tháng).
   - Giải pháp: **Lịch Kế Hoạch Ô Đa Sự Kiện**, nạp tự động file Excel / Google Sheets, gắn trách nhiệm rõ ràng cho từng khâu (Content, Quay, Edit, Deadline) và nhấp nháy cảnh báo trễ hạn.

2. **Một Đơn Vị Thi Công Ốp Tường Lam Sóng Nano**:
   - Nhân sự: Thợ chính, thợ phụ, thợ học việc phân bổ tại nhiều nhà dân, biệt thự, dự án.
   - Sản phẩm: Mét vuông ($m^2$) ốp hoàn thiện, thẩm mỹ nẹp chỉ, nghiệm thu bàn giao.
   - Vấn đề hay gặp: Chấm công thủ công trên sổ tay dễ thất lạc; thợ làm kéo dài vượt quá ngày dự tính gây lỗ chi phí công thợ; không biết hôm nay ai đi đâu, mấy giờ.
   - Giải pháp: **Bảng Chấm Công 1 Chạm Cho Quản Lý** (điểm danh cả đội trong 10 giây), **Theo dõi Ngày Dự Tính vs Thực Tế** và lịch thợ hôm nay (*Ai làm - Ở đâu - Mấy giờ*).

---

## ⚙️ 2. BẢNG TRA CỨU CÁC FILE TRONG MÃ NGUỒN (AI MUỐN SỬA GÌ THÌ SỬA Ở ĐÂU?)

| Bạn Muốn Chỉnh Sửa Gì? | Mở File Này Để Sửa | Mô Tả Chi Tiết |
| :--- | :--- | :--- |
| **Giao diện Kế Hoạch Nội Dung Agency** | [`src/components/AgencyContentCalendar.tsx`](file:///src/components/AgencyContentCalendar.tsx) | Hiển thị 31 ô ngày, sự kiện quay/edit, nạp Excel, sửa ngân sách khách hàng. |
| **Giao diện Chấm Công Ốp Lam Sóng** | [`src/components/AttendanceManager.tsx`](file:///src/components/AttendanceManager.tsx) | Bảng điểm danh 1 chạm của thợ, chọn số công (1, 0.5, nghỉ), tăng ca OT. |
| **Giao diện Dự Án & Lịch Thợ Lam Sóng** | [`src/components/ConstructionScheduleTracker.tsx`](file:///src/components/ConstructionScheduleTracker.tsx) | So sánh ngày dự tính vs thực tế, phân công lịch làm việc hôm nay, sửa dự án. |
| **Quản Lý Tiền Lương & Đơn Giá Công** | [`src/components/StaffAndWageManager.tsx`](file:///src/components/StaffAndWageManager.tsx) | Đơn giá công nhật (350k - 500k/ngày), lương cứng, đơn giá giờ OT, phụ cấp. |
| **Bảng Lương Tháng & Xuất Excel** | [`src/components/PayrollManager.tsx`](file:///src/components/PayrollManager.tsx) | Công thức cộng dồn công, tính lương thực nhận, xuất file Excel `.xlsx`, xem phiếu lương. |
| **Tiến Độ $m^2$ & Ảnh Hiện Trường** | [`src/components/WorkProgressManager.tsx`](file:///src/components/WorkProgressManager.tsx) | Cập nhật $m^2$ hoàn thành, tải ảnh thi công khung xương và ốp tấm. |
| **Trợ Lý AI Tự Động Báo Cáo** | [`src/services/aiReporter.ts`](file:///src/services/aiReporter.ts) & [`src/components/AIReportingModal.tsx`](file:///src/components/AIReportingModal.tsx) | Thuật toán quét dữ liệu và tạo báo cáo tiến độ tuần/tháng. |
| **Mã PIN & Quyền Quản Trị Admin** | [`src/services/auth.ts`](file:///src/services/auth.ts) & [`src/components/AdminLoginModal.tsx`](file:///src/components/AdminLoginModal.tsx) | Quản lý mã PIN bí mật (mặc định: `8888`), lưu trạng thái đăng nhập. |
| **Khai Báo Dữ Liệu & Interface** | [`src/types/index.ts`](file:///src/types/index.ts) | Định nghĩa toàn bộ kiểu dữ liệu: Thợ, Điểm danh, Công trình, Task, Kế hoạch. |
| **Đọc File Excel & Link Google Sheet** | [`src/services/calendarParser.ts`](file:///src/services/calendarParser.ts) | Logic bóc tách dữ liệu từ file Excel hoặc link Google Sheet thành kế hoạch. |

---

## 🔐 3. BẢO MẬT & PHÂN QUYỀN (RBAC GUIDE)

Hệ thống hoạt động theo mô hình 2 tầng quyền:
- **Tầng Người Xem (Thợ, nhân viên, khách)**:
  - Xem được kế hoạch nội dung, lịch làm việc của mình.
  - Xem được tiến độ công trình $m^2$, xem bảng công.
  - Tuyệt đối **KHÔNG THỂ**: Thay đổi số công, lưu chấm công, sửa mức tiền lương công nhật, thêm/xóa dự án hoặc sửa ngân sách hợp đồng.
  - Khi cố tình click vào các nút sửa/xóa, màn hình tự động hiển thị popup yêu cầu nhập mã PIN Admin.
- **Tầng Quản Trị Viên (Admin)**:
  - Nhập mã PIN mặc định: **`8888`** (hoặc `admin` / `admin123`).
  - Toàn quyền tạo/sửa/xóa dự án, đổi ngân sách khách hàng (từ 15M $\rightarrow$ 20M), đổi đơn giá công thợ, lưu chấm công và xóa nhật ký.

---

## 🚀 4. CÁC BƯỚC ĐẨY LÊN GITHUB DÀNH CHO BẠN (COPY & PASTE LÀ XONG)

Khi bạn muốn đẩy dự án này lên GitHub cá nhân của mình, hãy mở **PowerShell** hoặc **Terminal** và chạy các lệnh sau:

```bash
# Bước 1: Khởi tạo git
git init

# Bước 2: Thêm tất cả file mã nguồn
git add .

# Bước 3: Đóng gói commit đầu tiên
git commit -m "feat: he thong quan ly cham cong va tien do cho 2 cong ty (Agency & Op Lam Song)"

# Bước 4: Chuyển tên nhánh thành main
git branch -M main

# Bước 5: Tạo một Repository mới trên github.com và gắn link vào đây:
# (Thay your-username và your-repo-name bằng tài khoản của bạn)
git remote add origin https://github.com/your-username/your-repo-name.git

# Bước 6: Đẩy lên GitHub
git push -u origin main
```

---

## 💡 5. CÂU HỎI THƯỜNG GẶP (FAQ DÀNH CHO DEVELOPER MỚI)

**Q1: Dự án này có cần cài đặt cơ sở dữ liệu MySQL hay MongoDB phức tạp không?**  
*Trả lời:* **Không cần!** Mặc định dự án sử dụng `LocalStorage Engine` đã được tối ưu hóa cực nhanh, dữ liệu lưu ngay trên thiết bị và không sợ mất kể cả khi tắt trình duyệt. Nếu muốn đồng bộ giữa nhiều điện thoại qua internet, bạn chỉ cần tạo 1 tài khoản Supabase (PostgreSQL) miễn phí và dán API key vào file `.env` hoặc bấm nút **Cấu Hình Supabase** trên Header là xong!

**Q2: Làm sao để mở trên điện thoại iPhone của tôi ngay bây giờ?**  
*Trả lời:* Chỉ cần chạy lệnh `npm run dev` trên máy tính. Mở Safari trên iPhone gõ địa chỉ IP nội bộ (ví dụ: `http://192.168.1.230:5173`), sau đó bấm nút **Chia sẻ** $\rightarrow$ **Thêm vào Màn hình chính (Add to Home Screen)** là bạn đã có một chiếc App thực thụ!

**Q3: Tôi muốn sửa lại tên công ty và logo thì sửa ở đâu?**  
*Trả lời:* Mở file [`src/components/Header.tsx`](file:///src/components/Header.tsx), bạn sẽ thấy phần khai báo tên 2 công ty:
- *"Creative Media & Content Agency"*
- *"Công Ty Thi Công Tấm Ốp Lam Sóng & Nano Cao Cấp"*  
Bạn có thể sửa lại thành tên thương hiệu của bạn!
