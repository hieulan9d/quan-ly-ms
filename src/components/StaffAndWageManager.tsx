import React, { useState } from 'react';
import { CompanyId, Employee, WageType } from '../types';
import { formatCurrency } from '../services/db';
import {
  Users,
  Edit3,
  Plus,
  DollarSign,
  Phone,
  Briefcase,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  Sparkles,
  Lock
} from 'lucide-react';

interface StaffAndWageManagerProps {
  currentCompany: CompanyId;
  employees: Employee[];
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const StaffAndWageManager: React.FC<StaffAndWageManagerProps> = ({
  currentCompany,
  employees,
  isAdmin = false,
  onRequireAdmin,
  onSaveEmployee,
  onDeleteEmployee,
}) => {
  const isAgency = currentCompany === 'agency';
  const companyEmployees = employees.filter((e) => e.companyId === currentCompany);

  // Edit employee state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>('');

  // New employee state
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    name: '',
    phone: '',
    role: isAgency ? 'Graphic Designer' : 'Thợ Chính',
    wageType: isAgency ? 'monthly' : 'daily',
    baseRate: isAgency ? 10000000 : 500000,
    otRate: isAgency ? 80000 : 70000,
    allowance: isAgency ? 1000000 : 300000,
    active: true,
  });

  const handleOpenAddModal = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setShowAddModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setEditingEmployee(emp);
  };

  const handleDeleteEmp = (empId: string, empName: string) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa nhân sự "${empName}" khỏi hệ thống không?`)) {
      onDeleteEmployee(empId);
      setSaveSuccessNotice(`Đã xóa nhân sự ${empName}!`);
      setTimeout(() => setSaveSuccessNotice(''), 3500);
    }
  };

  const handleUpdateWage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!editingEmployee) return;

    onSaveEmployee(editingEmployee);
    setSaveSuccessNotice(`Đã cập nhật mức tiền công của ${editingEmployee.name} thành công!`);
    setTimeout(() => setSaveSuccessNotice(''), 3500);
    setEditingEmployee(null);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!newEmp.name) return;

    const emp: Employee = {
      id: `emp_${currentCompany}_${Date.now()}`,
      companyId: currentCompany,
      name: newEmp.name!,
      phone: newEmp.phone || '',
      role: newEmp.role || (isAgency ? 'Nhân viên' : 'Thợ thi công'),
      wageType: (newEmp.wageType as WageType) || (isAgency ? 'monthly' : 'daily'),
      baseRate: Number(newEmp.baseRate || 0),
      otRate: Number(newEmp.otRate || 0),
      allowance: Number(newEmp.allowance || 0),
      active: true,
    };

    onSaveEmployee(emp);
    setShowAddModal(false);
    setSaveSuccessNotice(`Đã thêm nhân viên mới ${emp.name}!`);
    setTimeout(() => setSaveSuccessNotice(''), 3500);
    setNewEmp({
      name: '',
      phone: '',
      role: isAgency ? 'Graphic Designer' : 'Thợ Chính',
      wageType: isAgency ? 'monthly' : 'daily',
      baseRate: isAgency ? 10000000 : 500000,
      otRate: isAgency ? 80000 : 70000,
      allowance: isAgency ? 1000000 : 300000,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner thông báo quyền Admin */}
      {!isAdmin && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                <span>Chế độ Xem Tiền Công & Lương (Chỉ Admin Mới Sửa Được)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Chỉ xem</span>
              </div>
              <div className="text-xs text-amber-800 mt-0.5">
                Chỉ Quản Trị Viên (Admin) mới có quyền chỉnh sửa đơn giá công nhật, lương cứng, giờ OT, phụ cấp và thêm/xóa nhân viên.
              </div>
            </div>
          </div>
          <button
            onClick={onRequireAdmin}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>🔑 Đăng Nhập Admin</span>
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <DollarSign className={`w-5 h-5 ${isAgency ? 'text-purple-600' : 'text-orange-600'}`} />
            <span>Quản Lý Nhân Sự & Cấu Hình Tiền Công ({isAgency ? 'Agency' : 'Ốp Tường Lam Sóng'})</span>
          </h2>
          <p className="text-xs text-slate-500">
            Bạn có thể tùy chỉnh tiền công nhật, lương tháng, tiền OT và phụ cấp xăng xe cho từng người bất cứ lúc nào
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className={`text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 ${
            isAgency ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Nhân Viên / Thợ Mới</span>
        </button>
      </div>

      {/* Thông báo cập nhật thành công */}
      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Danh sách thẻ nhân viên & tiền công */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companyEmployees.map((emp) => {
          return (
            <div
              key={emp.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                {/* Employee info header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base text-white ${
                        isAgency ? 'bg-purple-600' : 'bg-orange-500'
                      }`}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{emp.name}</h3>
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>{emp.role}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      emp.wageType === 'daily'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {emp.wageType === 'daily' ? 'Công nhật' : 'Lương tháng'}
                  </span>
                </div>

                {emp.phone && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.phone}</span>
                  </div>
                )}

                {/* Wage Breakdown Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2 mb-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {emp.wageType === 'daily' ? 'Tiền công nhật (1 ngày):' : 'Lương cứng cơ bản:'}
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {formatCurrency(emp.baseRate)}
                      {emp.wageType === 'daily' ? '/ngày' : '/tháng'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Tiền tăng ca (OT):</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(emp.otRate)}/giờ
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {emp.wageType === 'daily' ? 'Phụ cấp xăng xe/công trình:' : 'Phụ cấp ăn trưa:'}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(emp.allowance)}/tháng
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(emp)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    isAgency
                      ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                  }`}
                  title="Chỉnh sửa đơn giá công nhật / lương cứng (Admin)"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa tiền công</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteEmp(emp.id, emp.name)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition active:scale-95"
                  title="Xóa nhân sự (Chỉ Admin)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------- MODAL CHỈNH SỬA TIỀN CÔNG ---------------- */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <h3 className="font-black text-base text-slate-900 mb-1">
              Chỉnh Sửa Tiền Công: {editingEmployee.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cập nhật mức công nhật, giờ OT và phụ cấp áp dụng cho nhân sự này
            </p>

            <form onSubmit={handleUpdateWage} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên:</label>
                <input
                  type="text"
                  value={editingEmployee.name}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, name: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vị trí / Vai trò:</label>
                  <input
                    type="text"
                    value={editingEmployee.role}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, role: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức lương:</label>
                  <select
                    value={editingEmployee.wageType}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        wageType: e.target.value as WageType,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="daily">Công nhật (theo ngày)</option>
                    <option value="monthly">Lương tháng cố định</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingEmployee.wageType === 'daily'
                    ? 'Mức tiền công 1 ngày (VNĐ/ngày):'
                    : 'Mức lương cứng hàng tháng (VNĐ/tháng):'}
                </label>
                <input
                  type="number"
                  step={10000}
                  value={editingEmployee.baseRate}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      baseRate: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-black text-slate-900"
                  required
                />
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tương đương: {formatCurrency(editingEmployee.baseRate)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiền tăng ca (VNĐ/giờ OT):
                  </label>
                  <input
                    type="number"
                    step={5000}
                    value={editingEmployee.otRate}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        otRate: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phụ cấp xăng xe/ăn trưa:
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={editingEmployee.allowance}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        allowance: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md ${
                    isAgency ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL THÊM NHÂN VIÊN MỚI ---------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <h3 className="font-black text-base text-slate-900 mb-1">
              Thêm Nhân Viên / Thợ Thi Công
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập thông tin nhân sự và cài đặt mức tiền công khởi điểm
            </p>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên:</label>
                <input
                  type="text"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại:</label>
                  <input
                    type="tel"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    placeholder="VD: 0988..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vị trí:</label>
                  <input
                    type="text"
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    placeholder={isAgency ? 'VD: Designer' : 'VD: Thợ chính ốp vách'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức lương:</label>
                  <select
                    value={newEmp.wageType}
                    onChange={(e) => setNewEmp({ ...newEmp, wageType: e.target.value as WageType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="daily">Công nhật (theo ngày)</option>
                    <option value="monthly">Lương tháng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {newEmp.wageType === 'daily' ? 'Tiền công (đ/ngày):' : 'Lương (đ/tháng):'}
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={newEmp.baseRate}
                    onChange={(e) => setNewEmp({ ...newEmp, baseRate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md ${
                    isAgency ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  Thêm Nhân Sự
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
