# HƯỚNG DẪN TRIỂN KHAI PHẦN MỀM CHẤM CÔNG & TIẾN ĐỘ CHO 2 CÔNG TY
### (Agency Sáng Tạo & Công Ty Thi Công Ốp Tường Lam Sóng)

---

## 🚀 1. CÁCH CHẠY VÀ TEST NGAY TRÊN IPHONE CỦA BẠN (HÔM NAY)

Hệ thống đã được lập trình hoàn chỉnh trên máy của bạn. Để test trực tiếp bằng chiếc iPhone:

1. Đảm bảo điện thoại iPhone và máy tính của bạn **cùng kết nối chung một mạng Wi-Fi**.
2. Trên máy tính, mở terminal và gõ:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt **Safari** trên iPhone và gõ đường link:
   ```text
   http://192.168.1.230:5173
   ```
4. **Cài đặt như App chính thức ngoài màn hình iPhone**:
   - Ở thanh công cụ dưới đáy Safari, bấm nút **Chia sẻ** (biểu tượng ô vuông có mũi tên chỉ lên $\uparrow$).
   - Cuộn xuống chọn **"Thêm vào Màn hình chính"** (Add to Home Screen).
   - Bấm **Thêm** ở góc trên bên phải.
   - Giờ bạn đã có một icon App riêng ngoài màn hình, mở ra chạy toàn màn hình cực nhanh!

---

## 🌐 2. TRIỂN KHAI LÊN ĐÁM MÂY (VERCEL + SUPABASE - MIỄN PHÍ 100%)

Để nhân viên và thợ ra ngoài công trình dùng được 24/7 qua sóng 4G/5G:

### Bước 1: Tạo Database Supabase
1. Vào trang web [https://supabase.com](https://supabase.com) bấm **Start your project** (đăng nhập bằng tài khoản Google).
2. Tạo 1 dự án mới (New Project), chọn vùng Singapore (gần Việt Nam nhất, tốc độ cao nhất).
3. Vào mục **SQL Editor** ở thanh bên trái của Supabase.
4. Mở file `supabase_schema.sql` trong thư mục dự án này, copy toàn bộ nội dung và dán vào SQL Editor, sau đó bấm nút **Run**.
   *(Lệnh này sẽ tự động tạo bảng Nhân viên, Chấm công, Công trình m², Bảng lương và bật bảo mật).*
5. Vào mục **Project Settings ➔ API**, copy 2 thông tin:
   - **Project URL**
   - **anon public API Key**

### Bước 2: Đưa lên Vercel để lấy link HTTPS
1. Đẩy mã nguồn này lên tài khoản GitHub của bạn (hoặc tải thư mục lên).
2. Vào [https://vercel.com](https://vercel.com), đăng nhập bằng GitHub.
3. Bấm **Add New... ➔ Project** và chọn kho code này.
4. Trong phần **Environment Variables**, điền:
   - `VITE_SUPABASE_URL` = (Dán Project URL từ Bước 1)
   - `VITE_SUPABASE_ANON_KEY` = (Dán Anon Key từ Bước 1)
5. Bấm **Deploy**. Sau khoảng 1 phút, Vercel sẽ cấp cho bạn một đường link HTTPS chính thức (ví dụ: `https://ten-cong-ty.vercel.app`).
6. Bạn chỉ cần gửi link này cho nhân viên Agency và đội thợ thi công là xong!

---

## 🎯 3. CÁC TÍNH NĂNG ĐÃ HOÀN THIỆN TRONG ỨNG DỤNG

1. **Nút Chuyển Đổi 1 Chạm Giữa 2 Công Ty**:
   - **Agency**: Theo dõi Task Kanban khách hàng, chấm công văn phòng/remote, tính lương tháng + KPI.
   - **Ốp Tường Lam Sóng**: Theo dõi tiến độ khối lượng m² các công trình, điểm danh thợ hiện trường, tính lương công nhật.
2. **Chấm Công Đa Dạng**:
   - Tự chấm công bằng GPS và camera iPhone.
   - **Tổ trưởng điểm danh cả đội**: Tổ trưởng/giám sát mở danh sách, tích nhanh 1 công, nửa công, tăng ca cho cả tổ thợ trong 10 giây.
3. **Quản Lý Tiến Độ Công Trình**:
   - Cập nhật số m² hoàn thành từng ngày.
   - Thư viện ảnh hiện trường: Thợ chụp ảnh khung xương, ảnh ốp tấm lam sóng, ảnh nẹp phào nghiệm thu.
4. **Chỉnh Sửa Tiền Công Nhân Viên**:
   - Bấm sửa tiền công bất cứ lúc nào: Tiền công nhật (VD: 550k/ngày), lương tháng (VD: 15tr/tháng), tiền giờ OT, phụ cấp xăng xe công trình xa.
5. **Tính Công & Bảng Lương Tự Động**:
   - Tự động cộng số công, giờ tăng ca, tính ra lương thực nhận.
   - **Xem phiếu lương cá nhân** gửi Zalo cho thợ.
   - **Xuất file Excel (.xlsx)** cho kế toán.
