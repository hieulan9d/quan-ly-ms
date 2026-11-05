import React from 'react';
import { CompanyId, Employee, AttendanceRecord, ConstructionSite, AgencyTask } from '../types';
import { formatCurrency, formatDateVN } from '../services/db';
import {
  Users,
  CheckCircle2,
  Clock,
  Hammer,
  Building2,
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
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentCompany,
  employees,
  attendance,
  sites,
  tasks,
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
    return sum + emp.baseRate + emp.allowance;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className={`rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden ${
          isAgency
            ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600'
            : 'bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600'
        }`}
      >
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {isAgency ? '🏢 Khối Văn Phòng Agency' : '🪵 Khối Thi Công Hiện Trường'}
                </span>
                <span className="text-xs text-white/80 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateVN(todayStr)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black">
                {isAgency
                  ? 'Bảng Điều Khiển Agency & Dự Án Khách Hàng'
                  : 'Bảng Quản Lý Công Trình & Đội Thợ Ốp Tường'}
              </h1>
              <p className="text-sm text-white/90 mt-1 max-w-xl">
                {isAgency
                  ? 'Theo dõi chấm công nhân viên văn phòng, tiến độ dự án marketing & bảng lương.'
                  : 'Theo dõi điểm danh thợ tại công trình, tiến độ m² hoàn thiện & tính công nhật.'}
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              {!isAgency && (
                <button
                  onClick={() => onNavigateTab('schedule')}
                  className="bg-white text-orange-700 hover:bg-orange-50 font-black px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-1.5"
                >
                  <Hammer className="w-4 h-4 text-orange-600" />
                  <span>+ Tạo Dự Án Mới</span>
                </button>
              )}

              <button
                onClick={() => onNavigateTab('attendance')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Chấm công</span>
              </button>

              <button
                onClick={() => onNavigateTab(isAgency ? 'calendar' : 'schedule')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold px-3 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5"
              >
                <span>{isAgency ? 'Kế Hoạch' : 'Lịch Thợ'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Nhân sự */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng nhân sự</span>
            <div className={`p-2 rounded-lg ${isAgency ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{companyEmployees.length}</span>
            <span className="text-xs text-slate-500 ml-1">người</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hôm nay đi làm: {todayAttendance.length}/{companyEmployees.length}</span>
          </div>
        </div>

        {/* Card 2: Tiến độ công việc */}
        {isAgency ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Việc đang triển khai</span>
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-indigo-600">{activeTasks.length}</span>
              <span className="text-xs text-slate-500 ml-1">tasks</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Đã hoàn thành: <span className="font-semibold text-emerald-600">{doneTasks.length} task</span>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Công trình đang thi công</span>
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Hammer className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-600">{activeSites.length}</span>
              <span className="text-xs text-slate-500 ml-1">công trình</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Tổng số công trình: <span className="font-semibold">{sites.length}</span>
            </div>
          </div>
        )}

        {/* Card 3: Khối lượng m2 hoặc Dự án */}
        {isAgency ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Hiệu suất dự án</span>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-blue-600">
                {tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">Tỷ lệ task đúng hạn</div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Khối lượng ốp tường</span>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-600">{totalM2Finished}</span>
              <span className="text-xs text-slate-500 ml-1">/ {totalM2Required} m²</span>
            </div>
            <div className="mt-2 text-xs text-emerald-600 font-semibold">
              Đạt {completionPercentage}% tổng khối lượng
            </div>
          </div>
        )}

        {/* Card 4: Quỹ lương dự kiến */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Quỹ lương tháng này</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              {formatCurrency(estimatedPayroll)}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('payroll')}
            className="mt-2 text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
          >
            <span>Xem chi tiết bảng lương</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Content Area - Split into 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Chấm công & Tình trạng hôm nay */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-bold text-slate-900 text-base">
                Tình Hình Chấm Công Hôm Nay ({formatDateVN(todayStr)})
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('attendance')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
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
            <div className="space-y-3">
              {todayAttendance.map((rec) => {
                const emp = employees.find((e) => e.id === rec.employeeId);
                return (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {emp?.name.charAt(0) || 'N'}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{emp?.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span className="font-medium text-slate-600">{emp?.role}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {rec.checkInTime}
                            {rec.checkOutTime ? ` - ${rec.checkOutTime}` : ' (đang làm)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {rec.workUnits} công {rec.otHours > 0 ? `+ ${rec.otHours}h OT` : ''}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-base">
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
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {task.client}
                    </span>
                    <span className="text-slate-500">Hạn: {formatDateVN(task.deadline)}</span>
                  </div>
                  <div className="font-medium text-sm text-slate-900 line-clamp-2">
                    {task.title}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Phụ trách: {employees.find((e) => e.id === task.assignedTo)?.name || 'Chưa gán'}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded ${
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
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {site.name}
                      </span>
                      <span className="font-bold text-orange-600">{pct}%</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{site.completedAreaM2} / {site.totalAreaM2} m²</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {site.clientName}
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
