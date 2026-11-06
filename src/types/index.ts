export type CompanyId = 'agency' | 'lam_song';

export type WageType = 'daily' | 'monthly' | 'piecework';

// Bảng đơn giá công việc chung cho toàn bộ nhân sự MS angency
export interface AgencyRateConfig {
  contentRate: number; // VNĐ / 1 bài Viết Content hoặc Kịch bản
  shootRate: number;   // VNĐ / 1 buổi (lần) Đi Quay
  editRate: number;    // VNĐ / 1 video Edit hoàn thiện
}

export interface Employee {
  id: string;
  companyId: CompanyId;
  name: string;
  phone: string;
  role: string;
  wageType: WageType;
  baseRate: number; // Lương cứng tháng hoặc Đơn giá công nhật (0 nếu chỉ tính theo việc)
  otRate: number;
  allowance: number;
  // Đơn giá tính tiền riêng theo từng đầu việc cho MS angency:
  contentRate?: number; // VNĐ / 1 bài Content hoặc Kịch bản
  shootRate?: number;   // VNĐ / 1 lần Đi Quay
  editRate?: number;    // VNĐ / 1 video Edit hoàn thiện
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
  // Số lượng công việc hoàn thành trong ngày (dành cho MS angency tính theo việc)
  contentCount?: number;
  shootCount?: number;
  editCount?: number;
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
  name: string;
  clientContact?: string;
  phone?: string;
  servicePackage?: string;
  monthlyRetainer?: number;
  targetPostsPerMonth?: number;
  startDate?: string;
  status: 'active' | 'completed' | 'paused';
  notes?: string;
  color?: string;
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
  // Thống kê công việc cho MS angency:
  contentCount?: number;
  shootCount?: number;
  editCount?: number;
  contentPay?: number;
  shootPay?: number;
  editPay?: number;
  basePay: number;
  otPay: number;
  allowancePay: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  details: AttendanceRecord[];
}

// ---------------- CẤU HÌNH ZALO & AI AGENT TỰ ĐỘNG HÓA ----------------
export interface ZaloConfig {
  webhookUrlBoss: string;      // Webhook Zalo gửi cho Sếp
  webhookUrlGroup: string;     // Webhook Zalo gửi vào Nhóm Công Ty
  bossPhoneOrId: string;       // SĐT hoặc Zalo ID của Sếp
  groupNameOrId: string;       // Tên hoặc ID Nhóm Zalo
  autoScheduleAlert: boolean;  // Tự động quét & nhắc lịch
  alertHour: string;           // Giờ nhắc mỗi ngày (VD: "08:00")
  lastAlertDate?: string;      // Ngày gần nhất đã gửi nhắc lịch
}

export type ScheduleItemCategory =
  | 'agency_shoot'
  | 'agency_deadline'
  | 'lam_song_schedule'
  | 'lam_song_deadline';

export interface AIAgentScheduleItem {
  id: string;
  category: ScheduleItemCategory;
  title: string;
  clientOrSite: string;
  assignees: string[];
  dateTime: string;
  timeStr?: string;
  status: string;
  isUrgent: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  isOverdue: boolean;
  notes?: string;
}

export interface AIPayrollReportResult {
  month: string;
  generatedAt: string;
  totalEmployees: number;
  totalPayroll: number;
  agencyPayroll: number;
  lamSongPayroll: number;
  totalWorkUnits: number;
  totalOtHours: number;
  totalVideosProduced: number;
  totalContentPieces: number;
  totalShootSessions: number;
  totalM2Finished: number;
  topEarners: { name: string; role: string; salary: number; company: string }[];
  employeeDetails: {
    id: string;
    name: string;
    role: string;
    companyId: CompanyId;
    wageType: WageType;
    workUnitsOrTasks: string;
    otHours: number;
    netSalary: number;
  }[];
  aiAssessment: string;
  budgetComparison: string;
  recommendations: string[];
}
