import React, { useState, useEffect } from 'react';
import {
  CompanyId,
  Employee,
  AttendanceRecord,
  PayrollSummaryItem,
  ContentCalendarItem,
  AgencyRateConfig,
} from '../types';
import { formatCurrency, DEFAULT_AGENCY_RATES } from '../services/db';
import {
  DollarSign,
  Download,
  FileText,
  Calendar,
  CheckCircle,
  X,
  Video,
  Scissors,
  Plus,
  Minus,
  Save,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PayrollManagerProps {
  currentCompany: CompanyId;
  employees: Employee[];
  attendance: AttendanceRecord[];
  calendarItems?: ContentCalendarItem[];
  agencyRates?: AgencyRateConfig;
  onSaveAgencyRates?: (rates: AgencyRateConfig) => void;
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
}

const AGENCY_TASK_COUNTS_KEY = 'app_agency_payroll_task_counts';

type CustomTaskCounts = {
  [monthAndEmpKey: string]: {
    contentCount?: number;
    shootCount?: number;
    editCount?: number;
  };
};

export const PayrollManager: React.FC<PayrollManagerProps> = ({
  currentCompany,
  employees,
  attendance,
  calendarItems = [],
  agencyRates = DEFAULT_AGENCY_RATES,
  onSaveAgencyRates,
  isAdmin = false,
  onRequireAdmin,
}) => {
  const isAgency = currentCompany === 'agency';
  const companyEmployees = employees.filter((e) => e.companyId === currentCompany && e.active);

  // Selected Month (YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // State cho Bảng đơn giá chung ngay trên trang tính lương
  const [sharedRatesForm, setSharedRatesForm] = useState<AgencyRateConfig>(agencyRates);
  const [rateSavedNotice, setRateSavedNotice] = useState<string>('');

  useEffect(() => {
    setSharedRatesForm(agencyRates);
  }, [agencyRates]);

  const handleSaveSharedRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    onSaveAgencyRates?.({
      contentRate: Number(sharedRatesForm.contentRate || 0),
      shootRate: Number(sharedRatesForm.shootRate || 0),
      editRate: Number(sharedRatesForm.editRate || 0),
    });
    setRateSavedNotice('Đã cập nhật Bảng Đơn Giá Chung và tính lại lương toàn bộ nhân sự!');
    setTimeout(() => setRateSavedNotice(''), 3500);
  };

  // Lưu số lượng công việc điều chỉnh trực tiếp trên bảng lương MS angency
  const [customTaskCounts, setCustomTaskCounts] = useState<CustomTaskCounts>(() => {
    const saved = localStorage.getItem(AGENCY_TASK_COUNTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(AGENCY_TASK_COUNTS_KEY, JSON.stringify(customTaskCounts));
  }, [customTaskCounts]);

  // Custom bonus / deduction for this month
  const [adjustments] = useState<{
    [empId: string]: { bonus: number; deduction: number };
  }>({});

  // Payslip modal state
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollSummaryItem | null>(null);

  // Hàm tính số lượng việc tự động từ Lịch Kế Hoạch + Chấm Công cho từng nhân sự MS angency
  const getAutoTaskCounts = (empId: string) => {
    const empAttendance = attendance.filter(
      (a) => a.employeeId === empId && a.date.startsWith(selectedMonth)
    );

    const attContent = empAttendance.reduce((sum, a) => sum + (a.contentCount || 0), 0);
    const attShoot = empAttendance.reduce((sum, a) => sum + (a.shootCount || 0), 0);
    const attEdit = empAttendance.reduce((sum, a) => sum + (a.editCount || 0), 0);

    // Đếm từ Lịch Kế Hoạch (ContentCalendarItem) đã hoàn thành
    const completedCal = calendarItems.filter((item) => {
      if (!item.isCompleted) return false;
      const matchesSelectedMonth =
        item.month === selectedMonth ||
        (item.editDeadline && item.editDeadline.startsWith(selectedMonth)) ||
        (item.shootDate && item.shootDate.startsWith(selectedMonth));
      // Nếu đang xem tháng hiện tại thì tính cả các bài mẫu đã tích hoàn thành
      if (selectedMonth === currentMonthStr) {
        return matchesSelectedMonth || item.month === '2026-10';
      }
      return matchesSelectedMonth;
    });

    const calContent = completedCal.filter((c) => c.writerId === empId).length;
    const calShoot = completedCal.filter((c) => c.shooterId === empId).length;
    const calEdit = completedCal.filter((c) => c.editorId === empId).length;

    return {
      contentCount: attContent + calContent,
      shootCount: attShoot + calShoot,
      editCount: attEdit + calEdit,
    };
  };

  // Hàm cập nhật số lượng công việc (Content / Đi quay / Edit) trực tiếp trên bảng lương
  const handleUpdateTaskCount = (
    empId: string,
    field: 'contentCount' | 'shootCount' | 'editCount',
    value: number
  ) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    const key = `${selectedMonth}_${empId}`;
    const autoCounts = getAutoTaskCounts(empId);
    const current = customTaskCounts[key] || {};

    setCustomTaskCounts((prev) => ({
      ...prev,
      [key]: {
        contentCount: current.contentCount ?? autoCounts.contentCount,
        shootCount: current.shootCount ?? autoCounts.shootCount,
        editCount: current.editCount ?? autoCounts.editCount,
        [field]: Math.max(0, value),
      },
    }));
  };

  // Tính toán bảng lương chi tiết cho từng nhân viên
  const payrollList: PayrollSummaryItem[] = companyEmployees.map((emp) => {
    const empAttendance = attendance.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(selectedMonth)
    );

    const totalWorkUnits = empAttendance.reduce((sum, a) => sum + a.workUnits, 0);
    const totalOtHours = empAttendance.reduce((sum, a) => sum + a.otHours, 0);

    // Nếu là MS angency hoặc hình thức tính lương theo việc (piecework) -> ÁP DỤNG BẢNG ĐƠN GIÁ CHUNG
    if (isAgency || emp.wageType === 'piecework') {
      const key = `${selectedMonth}_${emp.id}`;
      const autoCounts = getAutoTaskCounts(emp.id);
      const override = customTaskCounts[key];

      const contentCount = override?.contentCount ?? autoCounts.contentCount;
      const shootCount = override?.shootCount ?? autoCounts.shootCount;
      const editCount = override?.editCount ?? autoCounts.editCount;

      const contentPay = contentCount * (agencyRates.contentRate || 0);
      const shootPay = shootCount * (agencyRates.shootRate || 0);
      const editPay = editCount * (agencyRates.editRate || 0);

      // Lương cứng hỗ trợ (nếu có cài đặt > 0)
      const basePay = emp.baseRate || 0;
      const otPay = totalOtHours * (emp.otRate || 0);
      const allowancePay = emp.allowance || 0;
      const bonus = adjustments[emp.id]?.bonus || 0;
      const deduction = adjustments[emp.id]?.deduction || 0;

      const netSalary = Math.max(
        0,
        contentPay + shootPay + editPay + basePay + otPay + allowancePay + bonus - deduction
      );

      return {
        employee: emp,
        totalWorkUnits,
        totalOtHours,
        contentCount,
        shootCount,
        editCount,
        contentPay,
        shootPay,
        editPay,
        basePay,
        otPay,
        allowancePay,
        bonus,
        deduction,
        netSalary,
        details: empAttendance,
      };
    }

    // Nếu là MS ốp tường (Công nhật hoặc Lương tháng)
    let basePay = 0;
    if (emp.wageType === 'daily') {
      basePay = totalWorkUnits * emp.baseRate;
    } else {
      const standardDays = 26;
      basePay = Math.round((emp.baseRate / standardDays) * totalWorkUnits);
    }

    const otPay = totalOtHours * emp.otRate;
    const allowancePay = emp.allowance;
    const bonus = adjustments[emp.id]?.bonus || 0;
    const deduction = adjustments[emp.id]?.deduction || 0;

    const netSalary = Math.max(0, basePay + otPay + allowancePay + bonus - deduction);

    return {
      employee: emp,
      totalWorkUnits,
      totalOtHours,
      basePay,
      otPay,
      allowancePay,
      bonus,
      deduction,
      netSalary,
      details: empAttendance,
    };
  });

  const totalPayroll = payrollList.reduce((sum, item) => sum + item.netSalary, 0);
  const totalCompanyWorkUnits = payrollList.reduce((sum, item) => sum + item.totalWorkUnits, 0);
  const totalAgencyTasksDone = payrollList.reduce(
    (sum, item) =>
      sum + (item.contentCount || 0) + (item.shootCount || 0) + (item.editCount || 0),
    0
  );

  // Xuất file Excel chuẩn cho từng công ty
  const handleExportExcel = () => {
    const rows = isAgency
      ? payrollList.map((item, index) => ({
          STT: index + 1,
          'Họ và tên': item.employee.name,
          'Vị trí': item.employee.role,
          'Đơn giá Content chung (đ/bài)': agencyRates.contentRate,
          'Số bài Content': item.contentCount || 0,
          'Tiền Content': item.contentPay || 0,
          'Đơn giá Đi Quay chung (đ/lần)': agencyRates.shootRate,
          'Số lần Đi Quay': item.shootCount || 0,
          'Tiền Đi Quay': item.shootPay || 0,
          'Đơn giá Edit chung (đ/video)': agencyRates.editRate,
          'Số video Edit': item.editCount || 0,
          'Tiền Edit Video': item.editPay || 0,
          'Lương cứng hỗ trợ': item.basePay,
          'Phụ cấp': item.allowancePay,
          'LƯƠNG THỰC NHẬN': item.netSalary,
        }))
      : payrollList.map((item, index) => ({
          STT: index + 1,
          'Họ và tên': item.employee.name,
          'Chức vụ / Vị trí': item.employee.role,
          'Hình thức tính': item.employee.wageType === 'daily' ? 'Công nhật' : 'Lương tháng',
          'Đơn giá / Lương cơ bản': item.employee.baseRate,
          'Tổng số công': item.totalWorkUnits,
          'Tiền công / Lương': item.basePay,
          'Giờ tăng ca (OT)': item.totalOtHours,
          'Tiền tăng ca': item.otPay,
          'Phụ cấp (Xăng xe/Ăn trưa)': item.allowancePay,
          'Thưởng thêm': item.bonus,
          'Phạt / Trừ': item.deduction,
          'LƯƠNG THỰC NHẬN': item.netSalary,
        }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Luong_${isAgency ? 'MS_Agency' : 'MS_OpTuong'}_${selectedMonth}`
    );

    XLSX.writeFile(
      workbook,
      `Bang_Luong_${isAgency ? 'MS_Agency' : 'MS_OpTuong'}_Thang_${selectedMonth}.xlsx`
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Controls & Totals */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <DollarSign className={`w-5 h-5 shrink-0 ${isAgency ? 'text-purple-600' : 'text-orange-600'}`} />
            <span>Bảng Lương & Tính Công ({isAgency ? 'MS angency' : 'MS ốp tường'})</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isAgency
              ? 'Tính lương theo số lượng công việc hoàn thành (Content, Đi Quay, Edit) nhân với Bảng Đơn Giá Chung'
              : 'Tự động tổng hợp từ dữ liệu chấm công hàng ngày, giờ tăng ca & phụ cấp'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Chọn tháng */}
          <div className="flex-1 sm:flex-initial flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border-none bg-transparent font-bold text-slate-800 focus:outline-none"
            />
          </div>

          {/* Nút xuất Excel */}
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Tổng Quỹ Lương Thực Trả:</span>
          <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 truncate">
            {formatCurrency(totalPayroll)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Áp dụng cho {companyEmployees.length} nhân sự
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">
            {isAgency ? 'Tổng Đầu Việc (Content / Quay / Edit):' : 'Tổng Số Công Nhật Đội Thợ:'}
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-600">
            {isAgency ? totalAgencyTasksDone : totalCompanyWorkUnits}{' '}
            <span className="text-sm sm:text-base font-normal">
              {isAgency ? 'đầu việc' : 'công'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Trong tháng {selectedMonth}</div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Cơ Chế Tính Lương:</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-sm font-bold text-slate-800">
              {isAgency ? 'Theo Bảng Đơn Giá Chung' : 'Theo ngày công & OT'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {isAgency ? 'Bấm +/- để điều chỉnh số bài/video' : 'Đã chốt dữ liệu chấm công'}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BẢNG ĐƠN GIÁ CÔNG VIỆC CHUNG (MS ANGENCY) NGAY TRÊN BẢNG TÍNH LƯƠNG    */}
      {/* ===================================================================== */}
      {isAgency && (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-purple-200 shadow-sm p-4">
          <form onSubmit={handleSaveSharedRates}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm font-black text-purple-950 flex items-center gap-2">
                  <span>📋 BẢNG ĐƠN GIÁ CÔNG VIỆC CHUNG (Tính chung cho toàn bộ nhân sự)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thay đổi đơn giá tại đây sẽ tự động nhân với số lượng việc của tất cả nhân sự bên dưới.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-2xl">
                <div className="bg-orange-50/70 border border-orange-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-orange-950 whitespace-nowrap">✍️ Content:</span>
                  <input
                    type="number"
                    step={10000}
                    min={0}
                    disabled={!isAdmin}
                    value={sharedRatesForm.contentRate}
                    onChange={(e) =>
                      setSharedRatesForm({
                        ...sharedRatesForm,
                        contentRate: Number(e.target.value),
                      })
                    }
                    className="w-28 bg-white border border-orange-300 rounded-lg px-2 py-1 text-xs font-black text-right text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-950 whitespace-nowrap">🎬 Đi Quay:</span>
                  <input
                    type="number"
                    step={10000}
                    min={0}
                    disabled={!isAdmin}
                    value={sharedRatesForm.shootRate}
                    onChange={(e) =>
                      setSharedRatesForm({
                        ...sharedRatesForm,
                        shootRate: Number(e.target.value),
                      })
                    }
                    className="w-28 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-black text-right text-indigo-900 disabled:bg-slate-100"
                  />
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-950 whitespace-nowrap">✂️ Edit:</span>
                  <input
                    type="number"
                    step={10000}
                    min={0}
                    disabled={!isAdmin}
                    value={sharedRatesForm.editRate}
                    onChange={(e) =>
                      setSharedRatesForm({
                        ...sharedRatesForm,
                        editRate: Number(e.target.value),
                      })
                    }
                    className="w-28 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-right text-amber-900 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {isAdmin ? (
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Đơn Giá</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRequireAdmin}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sửa giá (Admin)</span>
                </button>
              )}
            </div>

            {rateSavedNotice && (
              <div className="mt-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                ✅ {rateSavedNotice}
              </div>
            )}
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* A. GIAO DIỆN BẢNG LƯƠNG MS ANGENCY (TÍNH TIỀN RIÊNG CONTENT / QUAY / EDIT) */}
      {/* ===================================================================== */}
      {isAgency ? (
        <>
          {/* Mobile & Tablet Cards cho MS angency (< 1024px) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:hidden">
            {payrollList.map((item) => (
              <div
                key={item.employee.id}
                className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">{item.employee.name}</div>
                    <div className="text-xs text-slate-500">{item.employee.role}</div>
                  </div>
                  <button
                    onClick={() => setSelectedPayslip(item)}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Phiếu lương</span>
                  </button>
                </div>

                {/* 3 Đầu việc tính tiền riêng theo Bảng Đơn Giá Chung */}
                <div className="space-y-2 bg-purple-50/50 rounded-xl p-3 border border-purple-100 text-xs">
                  {/* 1. Content */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800 block">✍️ Viết Content</span>
                      <span className="text-[10px] text-slate-500">
                        {formatCurrency(agencyRates.contentRate)}/bài
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskCount(
                            item.employee.id,
                            'contentCount',
                            (item.contentCount || 0) - 1
                          )
                        }
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-black text-slate-900">
                        {item.contentCount || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskCount(
                            item.employee.id,
                            'contentCount',
                            (item.contentCount || 0) + 1
                          )
                        }
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-bold text-slate-900 min-w-[85px] text-right">
                      {formatCurrency(item.contentPay || 0)}
                    </div>
                  </div>

                  {/* 2. Đi Quay */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-purple-100">
                    <div>
                      <span className="font-bold text-indigo-800 block">🎬 Đi Quay</span>
                      <span className="text-[10px] text-slate-500">
                        {formatCurrency(agencyRates.shootRate)}/lần
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskCount(
                            item.employee.id,
                            'shootCount',
                            (item.shootCount || 0) - 1
                          )
                        }
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-black text-indigo-700">
                        {item.shootCount || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskCount(
                            item.employee.id,
                            'shootCount',
                            (item.shootCount || 0) + 1
                          )
                        }
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-bold text-indigo-700 min-w-[85px] text-right">
                      {formatCurrency(item.shootPay || 0)}
                    </div>
                  </div>

                  {/* 3. Edit Video */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-purple-100">
                    <div>
                      <span className="font-bold text-amber-800 block">✂️ Edit Video</span>
                      <span className="text-[10px] text-slate-500">
                        {formatCurrency(agencyRates.editRate)}/video
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskCount(
                            item.employee.id,
                            'editCount',
                            (item.editCount || 0) - 1
                          )
                        }
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-black text-amber-700">
                        {item.editCount || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskCount(
                            item.employee.id,
                            'editCount',
                            (item.editCount || 0) + 1
                          )
                        }
                        className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-bold text-amber-700 min-w-[85px] text-right">
                      {formatCurrency(item.editPay || 0)}
                    </div>
                  </div>
                </div>

                {/* Phụ cấp & Tổng thực nhận */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">
                    Phụ cấp {item.basePay > 0 ? '+ Lương cứng' : ''}:{' '}
                    <b className="text-emerald-600">
                      +{formatCurrency(item.allowancePay + item.basePay)}
                    </b>
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">THỰC NHẬN:</span>
                    <span className="font-black text-sm text-slate-900">
                      {formatCurrency(item.netSalary)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table cho MS angency (>= 1024px) */}
          <div className="hidden lg:block bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs lg:text-sm">
                <thead>
                  <tr className="bg-purple-50/70 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-3.5 px-4">Nhân Sự MS angency</th>
                    <th className="py-3.5 px-3 text-center">
                      <div>✍️ Viết Content</div>
                      <div className="text-[10px] font-semibold text-orange-700">
                        ({formatCurrency(agencyRates.contentRate)}/bài)
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-center">
                      <div>🎬 Đi Quay</div>
                      <div className="text-[10px] font-semibold text-indigo-700">
                        ({formatCurrency(agencyRates.shootRate)}/lần)
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-center">
                      <div>✂️ Edit Video</div>
                      <div className="text-[10px] font-semibold text-amber-700">
                        ({formatCurrency(agencyRates.editRate)}/video)
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right">Phụ Cấp / Cứng</th>
                    <th className="py-3.5 px-4 text-right font-black text-slate-900">Thực Nhận</th>
                    <th className="py-3.5 px-3 text-center">Phiếu Lương</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollList.map((item) => (
                    <tr key={item.employee.id} className="hover:bg-purple-50/20 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.employee.name}</div>
                        <div className="text-[11px] text-slate-500">{item.employee.role}</div>
                      </td>

                      {/* Cột 1: Content */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskCount(
                                  item.employee.id,
                                  'contentCount',
                                  (item.contentCount || 0) - 1
                                )
                              }
                              className="w-5 h-5 rounded bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100"
                              title="Giảm 1 bài Content"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black text-slate-900 min-w-[45px] text-xs">
                              {item.contentCount || 0} bài
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskCount(
                                  item.employee.id,
                                  'contentCount',
                                  (item.contentCount || 0) + 1
                                )
                              }
                              className="w-5 h-5 rounded bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100"
                              title="Tăng 1 bài Content"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[11px] font-bold text-slate-700 mt-1">
                            {formatCurrency(item.contentPay || 0)}
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Đi Quay */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center bg-indigo-50/50 border border-indigo-200 rounded-xl px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskCount(
                                  item.employee.id,
                                  'shootCount',
                                  (item.shootCount || 0) - 1
                                )
                              }
                              className="w-5 h-5 rounded bg-white border border-indigo-300 flex items-center justify-center hover:bg-indigo-100"
                              title="Giảm 1 lần Đi Quay"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black text-indigo-800 min-w-[45px] text-xs">
                              {item.shootCount || 0} lần
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskCount(
                                  item.employee.id,
                                  'shootCount',
                                  (item.shootCount || 0) + 1
                                )
                              }
                              className="w-5 h-5 rounded bg-white border border-indigo-300 flex items-center justify-center hover:bg-indigo-100"
                              title="Tăng 1 lần Đi Quay"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[11px] font-bold text-indigo-700 mt-1">
                            {formatCurrency(item.shootPay || 0)}
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Edit Video */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center bg-amber-50/60 border border-amber-200 rounded-xl px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskCount(
                                  item.employee.id,
                                  'editCount',
                                  (item.editCount || 0) - 1
                                )
                              }
                              className="w-5 h-5 rounded bg-white border border-amber-300 flex items-center justify-center hover:bg-amber-100"
                              title="Giảm 1 video Edit"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black text-amber-800 min-w-[55px] text-xs">
                              {item.editCount || 0} video
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskCount(
                                  item.employee.id,
                                  'editCount',
                                  (item.editCount || 0) + 1
                                )
                              }
                              className="w-5 h-5 rounded bg-white border border-amber-300 flex items-center justify-center hover:bg-amber-100"
                              title="Tăng 1 video Edit"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[11px] font-bold text-amber-700 mt-1">
                            {formatCurrency(item.editPay || 0)}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-medium text-emerald-600">
                          +{formatCurrency(item.allowancePay)}
                        </div>
                        {item.basePay > 0 && (
                          <div className="text-[11px] text-slate-500">
                            Cứng: +{formatCurrency(item.basePay)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-black text-sm text-slate-900">
                          {formatCurrency(item.netSalary)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedPayslip(item)}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Xem phiếu</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ===================================================================== */
        /* B. GIAO DIỆN BẢNG LƯƠNG MS ỐP TƯỜNG (CÔNG NHẬT & TĂNG CA OT)          */
        /* ===================================================================== */
        <>
          {/* Mobile Card List (Hiển thị trên Điện thoại < 768px) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {payrollList.map((item) => (
              <div
                key={item.employee.id}
                className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">{item.employee.name}</div>
                    <div className="text-xs text-slate-500">{item.employee.role}</div>
                  </div>
                  <span className="font-black text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    {item.totalWorkUnits} công
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Tiền công ({item.employee.wageType === 'daily' ? 'ngày' : 'tháng'}):
                    </span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.basePay)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Tăng ca ({item.totalOtHours}h):
                    </span>
                    <span className="font-bold text-orange-600">+{formatCurrency(item.otPay)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phụ cấp:</span>
                    <span className="font-bold text-emerald-600">
                      +{formatCurrency(item.allowancePay)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Thực nhận:</span>
                    <span className="font-black text-slate-900 text-sm">
                      {formatCurrency(item.netSalary)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPayslip(item)}
                  className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-blue-200"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Xem Phiếu Lương Chi Tiết</span>
                </button>
              </div>
            ))}
          </div>

          {/* Tablet & Desktop Table (Hiển thị từ Tablet >= 768px trở lên) */}
          <div className="hidden md:block bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs lg:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="py-3 px-3.5">Họ & Tên</th>
                    <th className="py-3 px-3">Mức Tiền Công / Lương</th>
                    <th className="py-3 px-3 text-center">Tổng Công</th>
                    <th className="py-3 px-3 text-center">Tăng Ca (OT)</th>
                    <th className="py-3 px-3 text-right">Tiền Công</th>
                    <th className="py-3 px-3 text-right">Phụ Cấp</th>
                    <th className="py-3 px-3 text-right font-black text-slate-900">Thực Nhận</th>
                    <th className="py-3 px-3 text-center">Phiếu Lương</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollList.map((item) => (
                    <tr key={item.employee.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{item.employee.name}</div>
                        <div className="text-[11px] text-slate-500">{item.employee.role}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {formatCurrency(item.employee.baseRate)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.employee.wageType === 'daily' ? 'đ/ngày' : 'đ/tháng'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                          {item.totalWorkUnits} công
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {item.totalOtHours > 0 ? (
                          <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded whitespace-nowrap">
                            {item.totalOtHours}h (+{formatCurrency(item.otPay)})
                          </span>
                        ) : (
                          <span className="text-slate-400">0h</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatCurrency(item.basePay)}
                      </td>

                      <td className="py-3 px-3 text-right font-medium text-emerald-600 whitespace-nowrap">
                        +{formatCurrency(item.allowancePay)}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="font-black text-sm text-slate-900">
                          {formatCurrency(item.netSalary)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedPayslip(item)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Xem phiếu</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ---------------- MODAL PHIẾU LƯƠNG ĐIỆN TỬ (PAYSLIP) ---------------- */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPayslip(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header phiếu lương */}
            <div className="text-center pb-4 border-b border-dashed border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                PHIẾU LƯƠNG NHÂN SỰ
              </span>
              <h3 className="font-black text-lg text-slate-900 mt-0.5">
                {isAgency ? 'MS angency' : 'MS ốp tường'}
              </h3>
              <p className="text-xs text-slate-500">Tháng: {selectedMonth}</p>
            </div>

            {/* Thông tin nhân viên */}
            <div className="py-3 border-b border-dashed border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-bold text-slate-900 text-right">
                  {selectedPayslip.employee.name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Vị trí công tác:</span>
                <span className="font-semibold text-slate-700 text-right">
                  {selectedPayslip.employee.role}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Hình thức tính:</span>
                <span className="font-semibold text-purple-700 text-right">
                  {isAgency || selectedPayslip.employee.wageType === 'piecework'
                    ? 'Theo Bảng Đơn Giá Chung (Content / Quay / Edit)'
                    : selectedPayslip.employee.wageType === 'daily'
                    ? `Công nhật (${formatCurrency(selectedPayslip.employee.baseRate)}/ngày)`
                    : `Lương tháng (${formatCurrency(selectedPayslip.employee.baseRate)})`}
                </span>
              </div>
            </div>

            {/* Chi tiết tính công hoặc tính theo đầu việc */}
            {isAgency || selectedPayslip.employee.wageType === 'piecework' ? (
              <div className="py-3 border-b border-dashed border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>
                      ✍️ Viết Content ({selectedPayslip.contentCount || 0} bài ×{' '}
                      {formatCurrency(agencyRates.contentRate)}):
                    </span>
                  </span>
                  <span className="font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(selectedPayslip.contentPay || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      🎬 Đi Quay ({selectedPayslip.shootCount || 0} lần ×{' '}
                      {formatCurrency(agencyRates.shootRate)}):
                    </span>
                  </span>
                  <span className="font-bold text-indigo-700 whitespace-nowrap">
                    {formatCurrency(selectedPayslip.shootPay || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      ✂️ Edit Video ({selectedPayslip.editCount || 0} video ×{' '}
                      {formatCurrency(agencyRates.editRate)}):
                    </span>
                  </span>
                  <span className="font-bold text-amber-700 whitespace-nowrap">
                    {formatCurrency(selectedPayslip.editPay || 0)}
                  </span>
                </div>

                {selectedPayslip.basePay > 0 && (
                  <div className="flex justify-between gap-2 pt-1 border-t border-slate-100">
                    <span className="text-slate-600">Lương cứng hỗ trợ:</span>
                    <span className="font-bold text-slate-800 whitespace-nowrap">
                      +{formatCurrency(selectedPayslip.basePay)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-slate-600">Phụ cấp cố định:</span>
                  <span className="font-bold text-emerald-600 whitespace-nowrap">
                    +{formatCurrency(selectedPayslip.allowancePay)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-3 border-b border-dashed border-slate-200 text-xs space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">
                    Số công đi làm ({selectedPayslip.totalWorkUnits} công):
                  </span>
                  <span className="font-bold text-slate-800 whitespace-nowrap">
                    {formatCurrency(selectedPayslip.basePay)}
                  </span>
                </div>

                {selectedPayslip.totalOtHours > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">
                      Tăng ca ({selectedPayslip.totalOtHours}h ×{' '}
                      {formatCurrency(selectedPayslip.employee.otRate)}/h):
                    </span>
                    <span className="font-bold text-orange-600 whitespace-nowrap">
                      +{formatCurrency(selectedPayslip.otPay)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Phụ cấp xăng xe & ăn trưa:</span>
                  <span className="font-bold text-emerald-600 whitespace-nowrap">
                    +{formatCurrency(selectedPayslip.allowancePay)}
                  </span>
                </div>
              </div>
            )}

            {/* Tổng thực nhận */}
            <div className="py-4 bg-slate-50 rounded-xl p-3 my-3 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">THỰC NHẬN KỲ LƯƠNG:</span>
                <div className="text-xl font-black text-emerald-700">
                  {formatCurrency(selectedPayslip.netSalary)}
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600 opacity-80 shrink-0" />
            </div>

            <p className="text-[11px] text-center text-slate-400 italic mb-4">
              Bạn có thể chụp màn hình phiếu này để gửi qua Zalo cho nhân sự.
            </p>

            <button
              onClick={() => setSelectedPayslip(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
            >
              Đóng Phiếu Lương
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
