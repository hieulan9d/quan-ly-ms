export type CompanyId = 'agency' | 'lam_song';

export type WageType = 'daily' | 'monthly' | 'piecework';

export interface Employee {
  id: string;
  companyId: CompanyId;
  name: string;
  phone: string;
  role: string;
  wageType: WageType;
  baseRate: number;
  otRate: number;
  allowance: number;
  avatar?: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  companyId: CompanyId;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  workUnits: number;
  otHours: number;
  locationType: 'office' | 'remote' | 'site';
  siteName?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  note?: string;
  status: 'present' | 'half_day' | 'late' | 'leave' | 'absent';
  verifiedBy?: string;
}

// ---------------- AGENCY KẾ HOẠCH NỘI DUNG & GRID Ô LỊCH ----------------
export interface ContentCalendarItem {
  id: string;
  stt?: string;
  title: string;
  client: string;
  channel: 'tiktok' | 'facebook' | 'youtube' | 'website';
  month: string; // YYYY-MM
  
  // Thông tin ngày giờ theo ô lịch
  dayOfWeek?: string; // "Thứ 2", "Thứ 3"...
  dayNumber?: string; // "05/10", "07/10"...
  timeStr?: string; // "10h30", "16h30"...
  loai?: 'Bài đăng' | 'Video' | 'Lịch quay' | 'Lịch edit' | 'Khác' | string;
  truc?: 'series' | 'ct' | 'le' | 'backup'; // Tag phân loại
  score?: { diem: number; kl: string; gc?: string };

  // 3 Người đang thực hiện theo yêu cầu:
  writerId?: string; // Content: a (Người viết content/kịch bản)
  shooterId?: string; // Quay: b (Người đi quay)
  editorId?: string; // Edit: B (Người edit video / thiết kế ảnh)

  // Thời hạn & Trạng thái hoàn thành
  editDeadline: string; // Thời hạn (VD: 2026-11-06). Quá thì trễ!
  shootDate?: string; // Ngày đi quay
  isCompleted: boolean; // 1 NÚT XONG / CHƯA XONG

  // Kịch bản & Caption
  caption?: string;
  voiceText?: string;
  notes?: string;
  videoLink?: string;

  // Backward compatibility
  shootCompleted?: boolean;
  editCompleted?: boolean;
  publishDate?: string;
  status?: 'planning' | 'shooting' | 'editing' | 'review' | 'completed';
}

// ---------------- ỐP TƯỜNG LAM SÓNG ----------------
export interface DailySiteSchedule {
  id: string;
  siteId: string;
  date: string;
  workHours: string;
  workerIds: string[];
  taskDescription: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface ConstructionSite {
  id: string;
  name: string;
  clientName: string;
  phone: string;
  address: string;
  totalAreaM2: number;
  completedAreaM2: number;
  panelType: string;
  estimatedDays: number;
  actualDays: number;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  status: 'planning' | 'framing' | 'installing' | 'finishing' | 'completed';
  assignedWorkers: string[];
  notes?: string;
  photos: {
    id: string;
    url: string;
    caption: string;
    stage: 'khung_xuong' | 'dang_op' | 'nghiem_thu';
    date: string;
  }[];
  dailySchedules?: DailySiteSchedule[];
}

// ---------------- AGENCY DỰ ÁN & KHÁCH HÀNG ----------------
export interface AgencyProject {
  id: string;
  name: string; // Tên dự án / Khách hàng (VD: "Feel Chicken", "TocoTea Vietnam", "Nha Khoa Flora"...)
  clientContact?: string; // Người liên hệ / Chức vụ
  phone?: string; // SĐT liên hệ
  servicePackage?: string; // Gói dịch vụ (VD: "Gói TikTok & Fanpage 25 bài", "Gói Video Chuyển Đổi"...)
  monthlyRetainer?: number; // Ngân sách / Phí dịch vụ hàng tháng
  targetPostsPerMonth?: number; // KPI số bài hoặc video trong tháng (VD: 25)
  startDate?: string;
  status: 'active' | 'completed' | 'paused';
  notes?: string;
  color?: string; // Màu nhận diện thương hiệu
}

export interface AgencyTask {
  id: string;
  title: string;
  client: string;
  assignedTo: string;
  deadline: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  link?: string;
}

export interface PayrollSummaryItem {
  employee: Employee;
  totalWorkUnits: number;
  totalOtHours: number;
  basePay: number;
  otPay: number;
  allowancePay: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  details: AttendanceRecord[];
}
