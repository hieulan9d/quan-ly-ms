import React, { useState } from 'react';
import { CompanyId, Employee, AttendanceRecord, PayrollSummaryItem } from '../types';
import { formatCurrency, formatDateVN } from '../services/db';
import {
  DollarSign,
  Download,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Printer,
  X,
  Share2,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PayrollManagerProps {
  currentCompany: CompanyId;
  employees: Employee[];
  attendance: AttendanceRecord[];
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
}

export const PayrollManager: React.FC<PayrollManagerProps> = ({
  currentCompany,
  employees,
  attendance,
  isAdmin = false,
  onRequireAdmin,
}) => {
  const isAgency = currentCompany === 'agency';
  const companyEmployees = employees.filter((e) => e.companyId === currentCompany && e.active);

  // Selected Month (YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Custom bonus / deduction for this month
  const [adjustments, setAdjustments] = useState<{
    [empId: string]: { bonus: number; deduction: number };
  }>({});

  // Payslip modal state
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollSummaryItem | null>(null);

  // Tính toán bảng lương chi tiết cho từng nhân viên
  const payrollList: PayrollSummaryItem[] = companyEmployees.map((emp) => {
    // Lọc các bản ghi chấm công của nhân viên này trong tháng được chọn
    const empAttendance = attendance.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(selectedMonth)
    );

    const totalWorkUnits = empAttendance.reduce((sum, a) => sum + a.workUnits, 0);
    const totalOtHours = empAttendance.reduce((sum, a) => sum + a.otHours, 0);

    let basePay = 0;
    if (emp.wageType === 'daily') {
      // Công nhật = Số công * Đơn giá công/ngày
      basePay = totalWorkUnits * emp.baseRate;
    } else {
      // Lương tháng = (Lương cứng / 26 công chuẩn) * Số công thực tế
      // Nếu làm đủ >= 24 công coi như nhận trọn lương cứng
      const standardDays = 26;
      basePay = Math.round((emp.baseRate / standardDays) * totalWorkUnits);
    }

    const otPay = totalOtHours * emp.otRate;
    const allowancePay = emp.allowance; // Phụ cấp trọn tháng
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

  // Xuất file Excel chuẩn
  const handleExportExcel = () => {
    const rows = payrollList.map((item, index) => ({
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
      `Luong_${isAgency ? 'Agency' : 'LamSong'}_${selectedMonth}`
    );

    XLSX.writeFile(
      workbook,
      `Bang_Luong_${isAgency ? 'Agency' : 'LamSong'}_Thang_${selectedMonth}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Totals */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <DollarSign className={`w-5 h-5 ${isAgency ? 'text-purple-600' : 'text-orange-600'}`} />
            <span>Bảng Lương & Tính Công ({isAgency ? 'Agency' : 'Ốp Tường Lam Sóng'})</span>
          </h2>
          <p className="text-xs text-slate-500">
            Tự động tổng hợp từ dữ liệu chấm công hàng ngày, giờ tăng ca & phụ cấp
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Chọn tháng */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border-none bg-transparent font-bold text-slate-800 focus:outline-none"
            />
          </div>

          {/* Nút xuất Excel */}
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Tổng Quỹ Lương Thực Trả:</span>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {formatCurrency(totalPayroll)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Áp dụng cho {companyEmployees.length} nhân sự
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">
            {isAgency ? 'Tổng Ngày Công Văn Phòng:' : 'Tổng Số Công Nhật Đội Thợ:'}
          </span>
          <div className="mt-1 text-2xl font-black text-emerald-600">
            {totalCompanyWorkUnits} <span className="text-base font-normal">công</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Trong tháng {selectedMonth}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Trạng Thái Kỳ Lương:</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-800">Sẵn sàng chi trả</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Đã chốt dữ liệu chấm công</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
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
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {item.totalWorkUnits} công
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    {item.totalOtHours > 0 ? (
                      <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                        {item.totalOtHours}h (+{formatCurrency(item.otPay)})
                      </span>
                    ) : (
                      <span className="text-slate-400">0h</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-semibold text-slate-800">
                    {formatCurrency(item.basePay)}
                  </td>

                  <td className="py-3 px-3 text-right font-medium text-emerald-600">
                    +{formatCurrency(item.allowancePay)}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <span className="font-black text-sm text-slate-900">
                      {formatCurrency(item.netSalary)}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => setSelectedPayslip(item)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto"
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

      {/* ---------------- MODAL PHIẾU LƯƠNG ĐIỆN TỬ (PAYSLIP) ---------------- */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative">
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
                {isAgency ? 'AGENCY SÁNG TẠO' : 'CÔNG TY THI CÔNG ỐP LAM SÓNG'}
              </h3>
              <p className="text-xs text-slate-500">Tháng: {selectedMonth}</p>
            </div>

            {/* Thông tin nhân viên */}
            <div className="py-3 border-b border-dashed border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-bold text-slate-900">{selectedPayslip.employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vị trí công tác:</span>
                <span className="font-semibold text-slate-700">{selectedPayslip.employee.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hình thức tính:</span>
                <span className="font-semibold text-slate-700">
                  {selectedPayslip.employee.wageType === 'daily'
                    ? `Công nhật (${formatCurrency(selectedPayslip.employee.baseRate)}/ngày)`
                    : `Lương tháng (${formatCurrency(selectedPayslip.employee.baseRate)})`}
                </span>
              </div>
            </div>

            {/* Chi tiết tính công */}
            <div className="py-3 border-b border-dashed border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Số công đi làm ({selectedPayslip.totalWorkUnits} công):
                </span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(selectedPayslip.basePay)}
                </span>
              </div>

              {selectedPayslip.totalOtHours > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Tăng ca ({selectedPayslip.totalOtHours}h × {formatCurrency(selectedPayslip.employee.otRate)}/h):
                  </span>
                  <span className="font-bold text-orange-600">
                    +{formatCurrency(selectedPayslip.otPay)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-600">Phụ cấp xăng xe & ăn trưa:</span>
                <span className="font-bold text-emerald-600">
                  +{formatCurrency(selectedPayslip.allowancePay)}
                </span>
              </div>
            </div>

            {/* Tổng thực nhận */}
            <div className="py-4 bg-slate-50 rounded-xl p-3 my-3 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">THỰC NHẬN KỲ LƯƠNG:</span>
                <div className="text-xl font-black text-emerald-700">
                  {formatCurrency(selectedPayslip.netSalary)}
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600 opacity-80" />
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
