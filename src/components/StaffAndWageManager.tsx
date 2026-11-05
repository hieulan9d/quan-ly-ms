import React, { useState, useEffect } from 'react';
import { CompanyId, Employee, WageType, AgencyRateConfig } from '../types';
import { formatCurrency } from '../services/db';
import {
  Edit3,
  Plus,
  DollarSign,
  Phone,
  Briefcase,
  CheckCircle2,
  Trash2,
  Lock,
  Video,
  FileText,
  Scissors,
  Save,
} from 'lucide-react';

interface StaffAndWageManagerProps {
  currentCompany: CompanyId;
  employees: Employee[];
  agencyRates: AgencyRateConfig;
  onSaveAgencyRates: (rates: AgencyRateConfig) => void;
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const StaffAndWageManager: React.FC<StaffAndWageManagerProps> = ({
  currentCompany,
  employees,
  agencyRates,
  onSaveAgencyRates,
  isAdmin = false,
  onRequireAdmin,
  onSaveEmployee,
  onDeleteEmployee,
}) => {
  const isAgency = currentCompany === 'agency';
  const companyEmployees = employees.filter((e) => e.companyId === currentCompany);

  // State cho Bảng đơn giá công việc chung (MS angency)
  const [sharedRatesForm, setSharedRatesForm] = useState<AgencyRateConfig>(agencyRates);

  useEffect(() => {
    setSharedRatesForm(agencyRates);
  }, [agencyRates]);

  // Edit employee state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>('');

  const getDefaultNewEmp = (agencyMode: boolean): Partial<Employee> => ({
    name: '',
    phone: '',
    role: agencyMode ? 'Content / Quay / Edit' : 'Thợ Chính',
    wageType: agencyMode ? 'piecework' : 'daily',
    baseRate: agencyMode ? 0 : 500000,
    otRate: agencyMode ? 80000 : 70000,
    allowance: agencyMode ? 500000 : 300000,
    active: true,
  });

  // New employee state
  const [newEmp, setNewEmp] = useState<Partial<Employee>>(() => getDefaultNewEmp(isAgency));

  // Sync defaults when switching company
  useEffect(() => {
    setNewEmp(getDefaultNewEmp(isAgency));
  }, [isAgency]);

  const handleSaveSharedRatesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    onSaveAgencyRates({
      contentRate: Number(sharedRatesForm.contentRate || 0),
      shootRate: Number(sharedRatesForm.shootRate || 0),
      editRate: Number(sharedRatesForm.editRate || 0),
    });
    setSaveSuccessNotice('Đã lưu Bảng Đơn Giá Công Việc Chung cho toàn bộ nhân sự MS angency!');
    setTimeout(() => setSaveSuccessNotice(''), 3500);
  };

  const handleOpenAddModal = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setNewEmp(getDefaultNewEmp(isAgency));
    setShowAddModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setEditingEmployee({ ...emp });
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
    setSaveSuccessNotice(`Đã cập nhật thông tin nhân sự ${editingEmployee.name} thành công!`);
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
      role: newEmp.role || (isAgency ? 'Content / Quay / Edit' : 'Thợ thi công'),
      wageType: (newEmp.wageType as WageType) || (isAgency ? 'piecework' : 'daily'),
      baseRate: Number(newEmp.baseRate || 0),
      otRate: Number(newEmp.otRate || 0),
      allowance: Number(newEmp.allowance || 0),
      active: true,
    };

    onSaveEmployee(emp);
    setShowAddModal(false);
    setSaveSuccessNotice(`Đã thêm nhân sự mới ${emp.name}!`);
    setTimeout(() => setSaveSuccessNotice(''), 3500);
    setNewEmp(getDefaultNewEmp(isAgency));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Banner thông báo quyền Admin */}
      {!isAdmin && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="font-extrabold text-amber-950 text-xs sm:text-sm flex flex-wrap items-center gap-1.5">
                <span>Chế độ Xem Tiền Công & Lương (Chỉ Admin Mới Sửa Được)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Chỉ xem</span>
              </div>
              <div className="text-xs text-amber-800 mt-0.5">
                Chỉ Quản Trị Viên (Admin) mới có quyền chỉnh sửa Bảng Đơn Giá Công Việc Chung (Content, Đi quay, Edit), công nhật, lương cứng, phụ cấp và thêm/xóa nhân viên.
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <DollarSign className={`w-5 h-5 shrink-0 ${isAgency ? 'text-purple-600' : 'text-orange-600'}`} />
            <span>Quản Lý Nhân Sự & Cấu Hình Tiền Công ({isAgency ? 'MS angency' : 'MS ốp tường'})</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isAgency
              ? 'Bảng đơn giá Viết Content, Đi Quay, Edit Video tính chung cho toàn bộ nhân sự MS angency'
              : 'Tùy chỉnh tiền công nhật, lương tháng, tiền OT và phụ cấp xăng xe cho từng thợ bất cứ lúc nào'}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className={`w-full sm:w-auto justify-center text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
            isAgency ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{isAgency ? '+ Thêm Nhân Sự MS angency' : '+ Thêm Thợ Mới'}</span>
        </button>
      </div>

      {/* Thông báo cập nhật thành công */}
      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* ==================== BẢNG ĐƠN GIÁ CÔNG VIỆC CHUNG (MS ANGENCY) ==================== */}
      {isAgency && (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-purple-200 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 px-4 sm:px-6 py-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>📋 BẢNG ĐƠN GIÁ CÔNG VIỆC CHUNG (MS angency)</span>
                <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                  Áp dụng toàn bộ nhân sự
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-purple-100 mt-0.5">
                Đơn giá dưới đây được tính chung cho tất cả nhân sự khi hoàn thành từng hạng mục: Viết Content, Đi Quay, Edit Video.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSharedRatesSubmit} className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {/* 1. Đơn giá Viết Content */}
              <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-orange-950">✍️ Viết Content</div>
                      <div className="text-[10px] text-orange-700 font-semibold">Tính theo 1 bài / kịch bản</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                    {formatCurrency(sharedRatesForm.contentRate)}/bài
                  </span>
                </div>
                <div className="relative">
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
                    className="w-full bg-white border border-orange-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-slate-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    VNĐ / bài
                  </span>
                </div>
              </div>

              {/* 2. Đơn giá Đi Quay */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-indigo-950">🎬 Đi Quay (Shoot)</div>
                      <div className="text-[10px] text-indigo-700 font-semibold">Tính theo 1 buổi / lần quay</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                    {formatCurrency(sharedRatesForm.shootRate)}/lần
                  </span>
                </div>
                <div className="relative">
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
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    VNĐ / lần
                  </span>
                </div>
              </div>

              {/* 3. Đơn giá Edit Video */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-950">✂️ Edit Video</div>
                      <div className="text-[10px] text-amber-700 font-semibold">Tính theo 1 video hoàn thiện</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    {formatCurrency(sharedRatesForm.editRate)}/video
                  </span>
                </div>
                <div className="relative">
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
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-black text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    VNĐ / video
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                💡 Khi thay đổi đơn giá tại bảng này, tiền công của <strong>toàn bộ nhân sự MS angency</strong> bên tab Chấm Công và Tính Lương sẽ tự động cập nhật theo mức giá mới.
              </div>
              {isAdmin ? (
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Bảng Đơn Giá Chung</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRequireAdmin}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Mở khóa Admin để sửa đơn giá</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Danh sách thẻ nhân viên & tiền công: 1 col (Phone) / 2 cols (Tablet) / 3 cols (PC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companyEmployees.map((emp) => {
          const isPiecework = emp.wageType === 'piecework' || isAgency;

          return (
            <div
              key={emp.id}
              className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                {/* Employee info header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-base text-white shrink-0 ${
                        isAgency ? 'bg-purple-600' : 'bg-orange-500'
                      }`}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">{emp.name}</h3>
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.role}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                      emp.wageType === 'piecework'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : emp.wageType === 'daily'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {emp.wageType === 'piecework'
                      ? 'Theo bảng giá chung'
                      : emp.wageType === 'daily'
                      ? 'Công nhật'
                      : 'Lương tháng'}
                  </span>
                </div>

                {emp.phone && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}

                {/* Wage Breakdown Box */}
                {isPiecework ? (
                  <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-200/80 space-y-2 mb-4 text-xs">
                    <div className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wide pb-1 border-b border-purple-200/70 flex items-center justify-between">
                      <span>Áp dụng Bảng Đơn Giá Chung:</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>✍️ Viết Content:</span>
                      </span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                        {formatCurrency(agencyRates.contentRate)}/bài
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                        <Video className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>🎬 Đi Quay:</span>
                      </span>
                      <span className="font-black text-indigo-700 text-xs sm:text-sm whitespace-nowrap">
                        {formatCurrency(agencyRates.shootRate)}/lần
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                        <Scissors className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>✂️ Edit Video:</span>
                      </span>
                      <span className="font-black text-amber-700 text-xs sm:text-sm whitespace-nowrap">
                        {formatCurrency(agencyRates.editRate)}/video
                      </span>
                    </div>

                    {emp.baseRate > 0 && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-200/60">
                        <span className="text-slate-600">Lương cứng hỗ trợ:</span>
                        <span className="font-bold text-slate-800 whitespace-nowrap">
                          +{formatCurrency(emp.baseRate)}/tháng
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-200/60">
                      <span className="text-slate-600">Phụ cấp cố định:</span>
                      <span className="font-semibold text-emerald-600 whitespace-nowrap">
                        +{formatCurrency(emp.allowance)}/tháng
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">
                        {emp.wageType === 'daily' ? 'Tiền công nhật:' : 'Lương cơ bản:'}
                      </span>
                      <span className="font-black text-slate-900 text-sm whitespace-nowrap">
                        {formatCurrency(emp.baseRate)}
                        {emp.wageType === 'daily' ? '/ngày' : '/tháng'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">Tiền tăng ca (OT):</span>
                      <span className="font-bold text-orange-600 whitespace-nowrap">
                        {formatCurrency(emp.otRate)}/giờ
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">
                        {emp.wageType === 'daily' ? 'Phụ cấp xăng xe:' : 'Phụ cấp ăn trưa:'}
                      </span>
                      <span className="font-semibold text-emerald-600 whitespace-nowrap">
                        {formatCurrency(emp.allowance)}/tháng
                      </span>
                    </div>
                  </div>
                )}
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
                  title="Chỉnh sửa thông tin nhân sự & phụ cấp (Admin)"
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>{isAgency ? 'Sửa thông tin & phụ cấp' : 'Chỉnh sửa tiền công'}</span>
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

      {/* ---------------- MODAL CHỈNH SỬA NHÂN SỰ / PHỤ CẤP ---------------- */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="font-black text-base text-slate-900 mb-1">
              Chỉnh Sửa Nhân Sự: {editingEmployee.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {isAgency
                ? 'Đơn giá Content / Đi quay / Edit được lấy tự động từ Bảng Đơn Giá Chung ở ngoài'
                : 'Cập nhật mức công nhật, giờ OT và phụ cấp áp dụng cho nhân sự này'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại:</label>
                  <input
                    type="tel"
                    value={editingEmployee.phone || ''}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, phone: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

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
                  <option value="piecework">Tính theo công việc (Áp dụng Bảng Đơn Giá Chung)</option>
                  <option value="daily">Công nhật (theo ngày)</option>
                  <option value="monthly">Lương tháng cố định</option>
                </select>
              </div>

              {/* Thông tin Bảng Đơn Giá Chung đang áp dụng */}
              {editingEmployee.wageType === 'piecework' && (
                <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="font-black text-purple-900">
                    📋 Đang áp dụng Bảng Đơn Giá Chung:
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-white rounded-lg p-1.5 border border-purple-100">
                      <div className="text-[10px] text-slate-500">✍️ Content</div>
                      <div className="font-black text-orange-700">{formatCurrency(agencyRates.contentRate)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 border border-purple-100">
                      <div className="text-[10px] text-slate-500">🎬 Đi Quay</div>
                      <div className="font-black text-indigo-700">{formatCurrency(agencyRates.shootRate)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 border border-purple-100">
                      <div className="text-[10px] text-slate-500">✂️ Edit</div>
                      <div className="font-black text-amber-700">{formatCurrency(agencyRates.editRate)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingEmployee.wageType === 'piecework'
                    ? 'Lương cứng hỗ trợ thêm (đ/tháng - để 0 nếu chỉ tính theo việc):'
                    : editingEmployee.wageType === 'daily'
                    ? 'Mức tiền công 1 ngày (VNĐ/ngày):'
                    : 'Mức lương cứng hàng tháng (VNĐ/tháng):'}
                </label>
                <input
                  type="number"
                  step={10000}
                  min={0}
                  value={editingEmployee.baseRate}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      baseRate: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {editingEmployee.wageType !== 'piecework' && (
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
                )}

                <div className={editingEmployee.wageType === 'piecework' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phụ cấp cố định hàng tháng (VNĐ/tháng):
                  </label>
                  <input
                    type="number"
                    step={10000}
                    min={0}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="font-black text-base text-slate-900 mb-1">
              {isAgency ? 'Thêm Nhân Sự MS angency' : 'Thêm Thợ Thi Công MS ốp tường'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {isAgency
                ? 'Nhân sự mới sẽ tự động áp dụng Bảng Đơn Giá Công Việc Chung (Content / Đi quay / Edit)'
                : 'Nhập thông tin thợ và cài đặt mức tiền công nhật khởi điểm'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    placeholder={isAgency ? 'VD: Content / Quay / Edit' : 'VD: Thợ chính ốp vách'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức lương:</label>
                <select
                  value={newEmp.wageType}
                  onChange={(e) => {
                    const wt = e.target.value as WageType;
                    setNewEmp({
                      ...newEmp,
                      wageType: wt,
                      baseRate: wt === 'piecework' ? 0 : wt === 'daily' ? 500000 : 10000000,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="piecework">Tính theo công việc (Áp dụng Bảng Đơn Giá Chung)</option>
                  <option value="daily">Công nhật (theo ngày)</option>
                  <option value="monthly">Lương tháng cố định</option>
                </select>
              </div>

              {newEmp.wageType === 'piecework' && (
                <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="font-black text-purple-900">
                    📋 Tự động áp dụng Bảng Đơn Giá Chung:
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-white rounded-lg p-1.5 border border-purple-100">
                      <div className="text-[10px] text-slate-500">✍️ Content</div>
                      <div className="font-black text-orange-700">{formatCurrency(agencyRates.contentRate)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 border border-purple-100">
                      <div className="text-[10px] text-slate-500">🎬 Đi Quay</div>
                      <div className="font-black text-indigo-700">{formatCurrency(agencyRates.shootRate)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 border border-purple-100">
                      <div className="text-[10px] text-slate-500">✂️ Edit</div>
                      <div className="font-black text-amber-700">{formatCurrency(agencyRates.editRate)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {newEmp.wageType === 'piecework'
                      ? 'Lương cứng hỗ trợ (đ/tháng):'
                      : newEmp.wageType === 'daily'
                      ? 'Tiền công (đ/ngày):'
                      : 'Lương cứng (đ/tháng):'}
                  </label>
                  <input
                    type="number"
                    step={10000}
                    min={0}
                    value={newEmp.baseRate}
                    onChange={(e) => setNewEmp({ ...newEmp, baseRate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phụ cấp (đ/tháng):
                  </label>
                  <input
                    type="number"
                    step={10000}
                    min={0}
                    value={newEmp.allowance ?? 0}
                    onChange={(e) => setNewEmp({ ...newEmp, allowance: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
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
