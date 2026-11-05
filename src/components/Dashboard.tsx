import React from 'react';
import { CompanyId, Employee, AttendanceRecord, ConstructionSite, AgencyTask, AgencyRateConfig } from '../types';
import { formatCurrency, formatDateVN, DEFAULT_AGENCY_RATES } from '../services/db';
import {
  Users,
  CheckCircle2,
  Clock,
  Hammer,
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  currentCompany: CompanyId;
  employees: Employee[];
  attendance: AttendanceRecord[];
  sites: ConstructionSite[];
  tasks: AgencyTask[];
  agencyRates?: AgencyRateConfig;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentCompany,
  employees,
  attendance,
  sites,
  tasks,
  agencyRates = DEFAULT_AGENCY_RATES,
  onNavigateTab,
}) => {
  const isAgency = currentCompany === 'agency';
  const companyEmployees = employees.filter((e) => e.companyId === currentCompany && e.active);

  // Lọc chấm công hôm nay
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(
    (a) => a.companyId === currentCompany && a.date === todayStr
  );

  // Thống kê Agency
  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  // Thống kê Lam Sóng
  const activeSites = sites.filter((s) => s.status !== 'completed');
  const totalM2Required = sites.reduce((sum, s) => sum + s.totalAreaM2, 0);
  const totalM2Finished = sites.reduce((sum, s) => sum + s.completedAreaM2, 0);
  const completionPercentage = totalM2Required > 0 ? Math.round((totalM2Finished / totalM2Required) * 100) : 0;

  // Ước tính lương tháng sơ bộ
  const estimatedPayroll = companyEmployees.reduce((sum, emp) => {
    if (emp.wageType === 'daily') {
      // Giả sử trung bình 24 công/tháng
      return sum + emp.baseRate * 24 + emp.allowance;
    }
    if (emp.wageType === 'piecework') {
      // Ước tính trung bình theo công việc tháng (10 bài content, 6 buổi quay, 8 video edit) nhân Bảng Đơn Giá Chung
      const estTaskPay =
        (agencyRates.contentRate || 0) * 10 +
        (agencyRates.shootRate || 0) * 6 +
        (agencyRates.editRate || 0) * 8;
      return sum + estTaskPay + (emp.baseRate || 0) + (emp.allowance || 0);
    }
    return sum + emp.baseRate + emp.allowance;
  }, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden ${
          isAgency
            ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600'
            : 'bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600'
        }`}
      >
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold">
                  {isAgency ? '🏢 Khối Văn Phòng MS angency' : '🪵 Khối Thi Công MS ốp tường'}
                </span>
                <span className="text-xs text-white/80 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateVN(todayStr)}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black leading-snug">
                {isAgency
                  ? 'Bảng Điều Khiển MS angency & Dự Án Khách Hàng'
                  : 'Bảng Quản Lý Công Trình & Đội Thợ MS ốp tường'}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
                {isAgency
                  ? 'Theo dõi chấm công nhân viên văn phòng, tiến độ dự án marketing & bảng lương.'
                  : 'Theo dõi điểm danh thợ tại công trình, tiến độ m² hoàn thiện & tính công nhật.'}
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {!isAgency && (
                <button
                  onClick={() => onNavigateTab('schedule')}
                  className="flex-1 sm:flex-initial justify-center bg-white text-orange-700 hover:bg-orange-50 font-black px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Hammer className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>+ Tạo Dự Án Mới</span>
                </button>
              )}

              <button
                onClick={() => onNavigateTab('attendance')}
                className="flex-1 sm:flex-initial justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Chấm công</span>
              </button>

              <button
                onClick={() => onNavigateTab(isAgency ? 'calendar' : 'schedule')}
                className="flex-1 sm:flex-initial justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>{isAgency ? 'Kế Hoạch' : 'Lịch Thợ'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Nhân sự */}
        <div className="bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">Tổng nhân sự</span>
            <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${isAgency ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{companyEmployees.length}</span>
            <span className="text-xs text-slate-500 ml-1">người</span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Đi làm: {todayAttendance.length}/{companyEmployees.length}</span>
          </div>
        </div>

        {/* Card 2: Tiến độ công việc */}
        {isAgency ? (
          <div className="bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">Việc đang chạy</span>
              <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <span className="text-xl sm:text-2xl font-bold text-indigo-600">{activeTasks.length}</span>
              <span className="text-xs text-slate-500 ml-1">tasks</span>
            </div>
            <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 truncate">
              Đã xong: <span className="font-semibold text-emerald-600">{doneTasks.length} task</span>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">Đang thi công</span>
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                <Hammer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <span className="text-xl sm:text-2xl font-bold text-amber-600">{activeSites.length}</span>
              <span className="text-xs text-slate-500 ml-1">công trình</span>
            </div>
            <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 truncate">
              Tổng số: <span className="font-semibold">{sites.length} công trình</span>
            </div>
          </div>
        )}

        {/* Card 3: Khối lượng m2 hoặc Dự án */}
        {isAgency ? (
          <div className="bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">Hiệu suất dự án</span>
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <span className="text-xl sm:text-2xl font-bold text-blue-600">
                {tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0}%
              </span>
            </div>
            <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 truncate">Tỷ lệ task đúng hạn</div>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500">Khối lượng ốp</span>
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 truncate">
              <span className="text-lg sm:text-2xl font-bold text-emerald-600">{totalM2Finished}</span>
              <span className="text-xs text-slate-500 ml-1">/ {totalM2Required} m²</span>
            </div>
            <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-emerald-600 font-semibold truncate">
              Đạt {completionPercentage}% tổng KL
            </div>
          </div>
        )}

        {/* Card 4: Quỹ lương dự kiến */}
        <div className="bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">Quỹ lương tháng</span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-base sm:text-xl lg:text-2xl font-bold text-slate-900 block truncate">
              {formatCurrency(estimatedPayroll)}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('payroll')}
            className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
          >
            <span className="truncate">Chi tiết bảng lương</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
          </button>
        </div>
      </div>

      {/* Main Content Area - Responsive 1 col (Phone) / 2 cols (Tablet) / 3 cols (PC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Chấm công & Tình trạng hôm nay */}
        <div className="md:col-span-1 lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h2 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                Tình Hình Chấm Công Hôm Nay ({formatDateVN(todayStr)})
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('attendance')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Xem tất cả →
            </button>
          </div>

          {todayAttendance.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Hôm nay chưa có dữ liệu chấm công nào.</p>
              <button
                onClick={() => onNavigateTab('attendance')}
                className={`mt-3 px-4 py-2 rounded-lg text-xs font-bold text-white transition ${
                  isAgency ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                + Bấm chấm công ngay bây giờ
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {todayAttendance.map((rec) => {
                const emp = employees.find((e) => e.id === rec.employeeId);
                return (
                  <div
                    key={rec.id}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                        {emp?.name.charAt(0) || 'N'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">{emp?.name}</div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1 sm:gap-1.5">
                          <span className="font-medium text-slate-600">{emp?.role}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            {rec.checkInTime}
                            {rec.checkOutTime ? ` - ${rec.checkOutTime}` : ' (đang làm)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto pl-11 sm:pl-0 flex sm:block items-center justify-between">
                      <span className="inline-block px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                        {rec.workUnits} công {rec.otHours > 0 ? `+ ${rec.otHours}h OT` : ''}
                      </span>
                      <div className="text-[11px] text-slate-400 sm:mt-0.5 truncate max-w-[160px]">
                        {rec.siteName || (rec.locationType === 'office' ? 'Văn phòng' : 'Remote')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Công việc / Công trình nổi bật */}
        <div className="md:col-span-1 lg:col-span-1 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              {isAgency ? 'Việc Cần Ưu Tiên' : 'Tiến Độ Công Trình'}
            </h2>
            <button
              onClick={() => onNavigateTab('progress')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Quản lý →
            </button>
          </div>

          {isAgency ? (
            <div className="space-y-3">
              {tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-purple-300 transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded truncate">
                      {task.client}
                    </span>
                    <span className="text-slate-500 whitespace-nowrap">Hạn: {formatDateVN(task.deadline)}</span>
                  </div>
                  <div className="font-medium text-sm text-slate-900 line-clamp-2">
                    {task.title}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-500 truncate">
                      Phụ trách: {employees.find((e) => e.id === task.assignedTo)?.name || 'Chưa gán'}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                        task.status === 'done'
                          ? 'bg-emerald-100 text-emerald-700'
                          : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {task.status === 'done'
                        ? 'Hoàn thành'
                        : task.status === 'in_progress'
                        ? 'Đang làm'
                        : 'Chờ duyệt'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => {
                const pct = site.totalAreaM2 > 0 ? Math.round((site.completedAreaM2 / site.totalAreaM2) * 100) : 0;
                return (
                  <div
                    key={site.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {site.name}
                      </span>
                      <span className="font-bold text-orange-600 shrink-0">{pct}%</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
                      <span className="whitespace-nowrap">{site.completedAreaM2} / {site.totalAreaM2} m²</span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{site.clientName}</span>
                      </span>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => onNavigateTab('schedule')}
                className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>+ Thêm Dự Án / Công Trình Mới</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
