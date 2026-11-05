import React, { useState, useEffect, useMemo } from 'react';
import { CompanyId, Employee, AttendanceRecord, ConstructionSite } from '../types';
import { formatDateVN, formatCurrency } from '../services/db';
import {
  Clock,
  Camera,
  MapPin,
  CheckCircle,
  Users,
  Calendar,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Trash2,
  HardHat,
  Building,
  Save,
  Check,
  Zap,
  ChevronLeft,
  Briefcase,
  Layers,
  ArrowRight,
  Lock,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AttendanceManagerProps {
  currentCompany: CompanyId;
  employees: Employee[];
  sites: ConstructionSite[];
  attendance: AttendanceRecord[];
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onSaveAttendance: (record: AttendanceRecord) => void;
  onSaveBatchAttendance: (records: AttendanceRecord[]) => void;
  onDeleteAttendance: (id: string) => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  currentCompany,
  employees,
  sites,
  attendance,
  isAdmin = false,
  onRequireAdmin,
  onSaveAttendance,
  onSaveBatchAttendance,
  onDeleteAttendance,
}) => {
  const isAgency = currentCompany === 'agency';
  const companyEmployees = useMemo(
    () => employees.filter((e) => e.companyId === currentCompany && e.active),
    [employees, currentCompany]
  );
  const companySites = useMemo(
    () => sites.filter((s) => s.status !== 'completed'),
    [sites]
  );

  // Default site name
  const defaultSiteName = companySites[0]?.name || 'Kho xưởng sản xuất & gia công tấm';

  // ---------------- STATE CHO ỐP TƯỜNG LAM SÓNG (BẢNG QUẢN LÝ) ----------------
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Per-worker attendance row state for the selected date
  const [workerRows, setWorkerRows] = useState<{
    [empId: string]: {
      workUnits: number;
      otHours: number;
      siteName: string;
      customSite: string;
      isCustomSite: boolean;
      status: 'present' | 'half_day' | 'leave';
      note: string;
    };
  }>({});

  // Global site selector to quickly apply one site to all workers
  const [bulkSiteName, setBulkSiteName] = useState<string>(defaultSiteName);

  // Populate or re-hydrate workerRows whenever selectedDate or companyEmployees or attendance changes
  useEffect(() => {
    const existingDateRecords = attendance.filter(
      (a) => a.companyId === currentCompany && a.date === selectedDate
    );

    const newRows: typeof workerRows = {};
    companyEmployees.forEach((emp) => {
      const saved = existingDateRecords.find((a) => a.employeeId === emp.id);
      if (saved) {
        const isKnownSite = companySites.some((s) => s.name === saved.siteName) || saved.siteName === 'Kho xưởng sản xuất & gia công tấm';
        newRows[emp.id] = {
          workUnits: saved.workUnits,
          otHours: saved.otHours || 0,
          siteName: isKnownSite ? (saved.siteName || defaultSiteName) : 'custom',
          customSite: isKnownSite ? '' : (saved.siteName || ''),
          isCustomSite: !isKnownSite && !!saved.siteName,
          status: saved.workUnits === 0 ? 'leave' : saved.workUnits === 0.5 ? 'half_day' : 'present',
          note: saved.note || '',
        };
      } else {
        // Default new day values: 1.0 công, công trình mặc định, 0h OT
        newRows[emp.id] = {
          workUnits: 1,
          otHours: 0,
          siteName: defaultSiteName,
          customSite: '',
          isCustomSite: false,
          status: 'present',
          note: '',
        };
      }
    });

    setWorkerRows(newRows);
  }, [selectedDate, currentCompany, companyEmployees, attendance, defaultSiteName, companySites]);

  // Handler: Xóa bản ghi chấm công (Chỉ Admin)
  const handleDeleteAttendanceRecord = (id: string) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi chấm công này? Thao tác không thể hoàn tác.')) {
      onDeleteAttendance(id);
      setSuccessMessage('✓ Đã xóa bản ghi chấm công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Handler: Change single worker field
  const handleUpdateWorkerRow = (empId: string, fields: Partial<(typeof workerRows)[string]>) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setWorkerRows((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {
          workUnits: 1,
          otHours: 0,
          siteName: defaultSiteName,
          customSite: '',
          isCustomSite: false,
          status: 'present',
          note: '',
        }),
        ...fields,
      },
    }));
  };

  // Handler: Quick apply 1 công trình cho toàn bộ thợ
  const handleApplyBulkSite = (site: string) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setBulkSiteName(site);
    setWorkerRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((empId) => {
        updated[empId] = {
          ...updated[empId],
          siteName: site,
          isCustomSite: false,
        };
      });
      return updated;
    });
    setSuccessMessage(`Đã gán công trình "${site}" cho toàn bộ thợ!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Handler: Quick mark all workers 1.0 công
  const handleMarkAllFullDay = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setWorkerRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((empId) => {
        updated[empId] = {
          ...updated[empId],
          workUnits: 1,
          status: 'present',
        };
      });
      return updated;
    });
    setSuccessMessage('Đã tích 1.0 công cho tất cả thợ!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Handler: Save Lam Song Manager Attendance
  const handleSaveLamSongAttendance = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    const recordsToSave: AttendanceRecord[] = [];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    companyEmployees.forEach((emp) => {
      const row = workerRows[emp.id] || {
        workUnits: 1,
        otHours: 0,
        siteName: defaultSiteName,
        customSite: '',
        isCustomSite: false,
        status: 'present',
        note: '',
      };

      const resolvedSite =
        row.siteName === 'custom'
          ? (row.customSite.trim() || 'Công trình phụ')
          : (row.siteName || defaultSiteName);

      // Lưu cả người đi làm (>=0.5 công) và người nghỉ (0 công) để minh bạch bảng công
      recordsToSave.push({
        id: `att_ls_${emp.id}_${selectedDate}`,
        employeeId: emp.id,
        companyId: 'lam_song',
        date: selectedDate,
        checkInTime: row.status === 'leave' ? 'Nghỉ' : '07:30',
        checkOutTime: row.status === 'leave' ? 'Nghỉ' : row.otHours > 0 ? `17:30 (+${row.otHours}h OT)` : '17:30',
        workUnits: row.workUnits,
        otHours: Number(row.otHours) || 0,
        locationType: 'site',
        siteName: resolvedSite,
        status: row.workUnits === 0 ? 'leave' : row.workUnits === 0.5 ? 'half_day' : 'present',
        note: row.note,
        verifiedBy: 'Quản Lý Công Trình Xác Nhận',
      });
    });

    onSaveBatchAttendance(recordsToSave);

    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.7 } });
    } catch {
      // ignore
    }

    const workingCount = recordsToSave.filter((r) => r.workUnits > 0).length;
    setSuccessMessage(
      `Đã lưu bảng chấm công ngày ${formatDateVN(selectedDate)} thành công (${workingCount}/${recordsToSave.length} thợ đi làm)!`
    );
    setTimeout(() => setSuccessMessage(''), 4500);
  };

  // Quick Date Navigation
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Thống kê nhanh trong ngày
  const dailySummary = useMemo(() => {
    let totalWorkersPresent = 0;
    let totalUnits = 0;
    let totalOt = 0;
    let estimatedCost = 0;

    companyEmployees.forEach((emp) => {
      const row = workerRows[emp.id];
      if (row && row.workUnits > 0) {
        totalWorkersPresent += 1;
        totalUnits += row.workUnits;
        totalOt += row.otHours || 0;
        const baseCost = row.workUnits * emp.baseRate;
        const otCost = (row.otHours || 0) * emp.otRate;
        estimatedCost += baseCost + otCost;
      }
    });

    return {
      totalWorkersPresent,
      totalUnits,
      totalOt,
      estimatedCost,
    };
  }, [companyEmployees, workerRows]);

  // ---------------- STATE CHO AGENCY (VĂN PHÒNG & TỰ CHẤM CÔNG) ----------------
  const [agencySubTab, setAgencySubTab] = useState<'self' | 'history'>('self');
  const [agencyEmpId, setAgencyEmpId] = useState<string>(companyEmployees[0]?.id || '');
  const [agencyLocationType, setAgencyLocationType] = useState<'office' | 'remote' | 'site'>('office');
  const [agencyWorkUnits, setAgencyWorkUnits] = useState<number>(1);
  const [agencyOtHours, setAgencyOtHours] = useState<number>(0);
  const [agencyNote, setAgencyNote] = useState<string>('');
  const [agencyGps, setAgencyGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isAgencyGettingGps, setIsAgencyGettingGps] = useState(false);
  const [agencyPhoto, setAgencyPhoto] = useState<string | null>(null);

  // History table filter
  const [historyFilterDate, setHistoryFilterDate] = useState<string>(selectedDate);

  const filteredAttendance = attendance.filter(
    (a) => a.companyId === currentCompany && (historyFilterDate ? a.date === historyFilterDate : true)
  );

  // Agency Submit Check-in
  const handleAgencySelfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyEmpId) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];

    const newRecord: AttendanceRecord = {
      id: `att_agency_${agencyEmpId}_${dateStr}`,
      employeeId: agencyEmpId,
      companyId: 'agency',
      date: dateStr,
      checkInTime: timeStr,
      workUnits: agencyWorkUnits,
      otHours: Number(agencyOtHours),
      locationType: agencyLocationType,
      siteName:
        agencyLocationType === 'office'
          ? 'Văn phòng Agency'
          : agencyLocationType === 'remote'
          ? 'Làm việc từ xa (WFH)'
          : 'Đi quay / Hiện trường chụp hình',
      latitude: agencyGps?.lat,
      longitude: agencyGps?.lng,
      photoUrl: agencyPhoto || undefined,
      note: agencyNote,
      status: agencyWorkUnits === 0.5 ? 'half_day' : 'present',
      verifiedBy: agencyGps ? 'GPS Định Vị Hợp Lệ' : 'Tự Chấm Công',
    };

    onSaveAttendance(newRecord);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {
      // ignore
    }

    setSuccessMessage(`Đã chấm công Agency thành công lúc ${timeStr}!`);
    setTimeout(() => setSuccessMessage(''), 4000);
    setAgencyPhoto(null);
    setAgencyNote('');
  };

  // =========================================================================
  // GIAO DIỆN 1: DÀNH RIÊNG CHO ỐP TƯỜNG LAM SÓNG (1 BẢNG CHẤM CÔNG QUẢN LÝ DUY NHẤT)
  // =========================================================================
  if (!isAgency) {
    return (
      <div className="space-y-5 max-w-6xl mx-auto">
        {/* Banner thông báo quyền Admin */}
        {!isAdmin && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                  <span>Chế độ Xem Bảng Chấm Công (Chỉ Admin Mới Được Sửa)</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Chỉ xem</span>
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  Chỉ Quản Trị Viên (Admin) mới có quyền chỉnh sửa số công (1, 0.5, nghỉ), tăng ca OT, gán công trình, lưu chấm công và xóa nhật ký.
                </div>
              </div>
            </div>
            <button
              onClick={onRequireAdmin}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>🔑 Đăng Nhập Admin Để Sửa</span>
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 rounded-2xl text-center font-black text-sm flex items-center justify-center gap-2 shadow-md animate-bounce">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. THANH ĐIỀU HÀNH CHẤM CÔNG: CHỌN NGÀY & THỐNG KÊ NHANH */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md">
                  <HardHat className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    Bảng Chấm Công Quản Lý Ốp Lam Sóng
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chọn nhanh ai đi làm, làm bao nhiêu công và thi công tại công trình nào
                  </p>
                </div>
              </div>
            </div>

            {/* Quick date selector */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 shadow-sm transition"
                title="Lùi 1 ngày"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Hôm trước</span>
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-black text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 text-xs font-black rounded-xl border transition shadow-sm ${
                  selectedDate === todayStr
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Hôm nay
              </button>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 shadow-sm transition"
                title="Tới 1 ngày"
              >
                <span className="hidden sm:inline">Hôm sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* NÚT LƯU BẢNG CÔNG TO TRÊN ĐẦU */}
            <div>
              <button
                type="button"
                onClick={handleSaveLamSongAttendance}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm rounded-xl shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>LƯU BẢNG CHẤM CÔNG</span>
              </button>
            </div>
          </div>

          {/* 4 THẺ THỐNG KÊ TRONG NGÀY ĐANG CHỌN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-orange-700 block">Thợ đi làm hôm nay:</span>
              <span className="text-xl font-black text-orange-950">
                {dailySummary.totalWorkersPresent}{' '}
                <span className="text-xs font-bold text-orange-600">/ {companyEmployees.length} thợ</span>
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-emerald-700 block">Tổng số công tính:</span>
              <span className="text-xl font-black text-emerald-950">
                {dailySummary.totalUnits}{' '}
                <span className="text-xs font-bold text-emerald-600">công</span>
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-blue-700 block">Tăng ca (OT):</span>
              <span className="text-xl font-black text-blue-950">
                {dailySummary.totalOt}{' '}
                <span className="text-xs font-bold text-blue-600">giờ</span>
              </span>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3">
              <span className="text-[11px] font-bold text-purple-700 block">Tiền công ngày ước tính:</span>
              <span className="text-base sm:text-lg font-black text-purple-950">
                {formatCurrency(dailySummary.estimatedCost)}
              </span>
            </div>
          </div>

          {/* TOOLBAR THAO TÁC NHANH CHO CẢ ĐỘI */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
              <span className="text-slate-500">Thao tác nhanh cho cả đội:</span>
              <button
                type="button"
                onClick={handleMarkAllFullDay}
                className="bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chấm tất cả 1.0 công</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 w-full sm:w-auto">
              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 whitespace-nowrap">Áp dụng chung 1 công trình:</span>
              <select
                value={bulkSiteName}
                onChange={(e) => handleApplyBulkSite(e.target.value)}
                className="flex-1 sm:flex-initial bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-orange-500"
              >
                {companySites.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
                <option value="Kho xưởng sản xuất & gia công tấm">Kho xưởng sản xuất & gia công tấm</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. BẢNG CHẤM CÔNG TỪNG THỢ CHO QUẢN LÝ (GIAO DIỆN CHÍNH) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                <span>Danh Sách Thợ Thi Công ({companyEmployees.length} nhân sự)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Chỉ cần chọn công trình và tích số công cho từng người bên dưới
              </p>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Ngày: <span className="text-orange-700 font-black">{formatDateVN(selectedDate)}</span>
            </div>
          </div>

          {/* Desktop Table & Mobile Card hybrid */}
          <div className="divide-y divide-slate-100">
            {companyEmployees.map((emp) => {
              const row = workerRows[emp.id] || {
                workUnits: 1,
                otHours: 0,
                siteName: defaultSiteName,
                customSite: '',
                isCustomSite: false,
                status: 'present',
                note: '',
              };

              const currentDayWage =
                row.workUnits * emp.baseRate + (row.otHours || 0) * emp.otRate;

              return (
                <div
                  key={emp.id}
                  className={`p-4 sm:p-5 transition ${
                    row.workUnits === 0
                      ? 'bg-slate-50/70 opacity-60'
                      : 'hover:bg-orange-50/30'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* CỘT 1: THÔNG TIN THỢ (3/12) */}
                    <div className="lg:col-span-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                            row.workUnits === 0
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-orange-100 text-orange-800 border border-orange-200'
                          }`}
                        >
                          {emp.name
                            .split(' ')
                            .map((w) => w[0])
                            .slice(-2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-900">{emp.name}</div>
                          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <span className="text-orange-700">{emp.role}</span>
                            <span>•</span>
                            <span>{formatCurrency(emp.baseRate)}/công</span>
                          </div>
                          {emp.phone && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              SĐT: {emp.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CỘT 2: CÔNG TRÌNH NÀO (3/12) */}
                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-black text-slate-600 mb-1 lg:hidden">
                        Công trình thi công:
                      </label>
                      <div className="space-y-1.5">
                        <select
                          value={row.siteName}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateWorkerRow(emp.id, {
                              siteName: val,
                              isCustomSite: val === 'custom',
                            });
                          }}
                          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                        >
                          <optgroup label="Công trình đang thi công">
                            {companySites.map((s) => (
                              <option key={s.id} value={s.name}>
                                🏗️ {s.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Địa điểm khác">
                            <option value="Kho xưởng sản xuất & gia công tấm">
                              🏭 Kho xưởng sản xuất & gia công tấm
                            </option>
                            <option value="custom">✏️ Nhập tên công trình khác...</option>
                          </optgroup>
                        </select>

                        {row.siteName === 'custom' && (
                          <input
                            type="text"
                            placeholder="Nhập tên công trình/địa chỉ..."
                            value={row.customSite}
                            onChange={(e) =>
                              handleUpdateWorkerRow(emp.id, { customSite: e.target.value })
                            }
                            className="w-full bg-white border border-orange-400 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* CỘT 3: SỐ CÔNG (3/12) */}
                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-black text-slate-600 mb-1 lg:hidden">
                        Số công:
                      </label>
                      <div className="flex items-center gap-1.5">
                        {/* Nút 1.0 công */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateWorkerRow(emp.id, {
                              workUnits: 1,
                              status: 'present',
                            })
                          }
                          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition shadow-sm ${
                            row.workUnits === 1 && row.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-emerald-200 ring-2 ring-emerald-500'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          1.0 Công
                        </button>

                        {/* Nút 0.5 công */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateWorkerRow(emp.id, {
                              workUnits: 0.5,
                              status: 'half_day',
                            })
                          }
                          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition shadow-sm ${
                            row.workUnits === 0.5 && row.status === 'half_day'
                              ? 'bg-amber-600 text-white shadow-amber-200 ring-2 ring-amber-500'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          0.5 Công
                        </button>

                        {/* Nút 1.5 công */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateWorkerRow(emp.id, {
                              workUnits: 1.5,
                              status: 'present',
                            })
                          }
                          className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-black transition shadow-sm ${
                            row.workUnits === 1.5
                              ? 'bg-blue-600 text-white shadow-blue-200 ring-2 ring-blue-500'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          1.5
                        </button>

                        {/* Nút Nghỉ */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateWorkerRow(emp.id, {
                              workUnits: 0,
                              otHours: 0,
                              status: 'leave',
                            })
                          }
                          className={`py-2 px-2.5 rounded-xl text-xs font-black transition shadow-sm ${
                            row.workUnits === 0
                              ? 'bg-rose-600 text-white shadow-rose-200 ring-2 ring-rose-500'
                              : 'bg-slate-100 hover:bg-rose-100 text-rose-700'
                          }`}
                        >
                          Nghỉ
                        </button>
                      </div>

                      {/* Ô nhập số công linh hoạt nếu cần */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
                        <span>Nhập số lẻ:</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="3"
                          value={row.workUnits}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateWorkerRow(emp.id, {
                              workUnits: val,
                              status: val === 0 ? 'leave' : val <= 0.5 ? 'half_day' : 'present',
                            });
                          }}
                          className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-bold text-slate-900 text-xs focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* CỘT 4: TĂNG CA (OT) & TẠM TÍNH TIỀN CÔNG (3/12) */}
                    <div className="lg:col-span-3">
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                        {/* Selector OT */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span>Tăng ca tối (OT):</span>
                            <span className="text-orange-700 font-extrabold">
                              {row.otHours > 0 ? `+${row.otHours} giờ` : '0h'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[0, 1, 1.5, 2, 3, 4].map((h) => (
                              <button
                                key={h}
                                type="button"
                                disabled={row.workUnits === 0}
                                onClick={() => handleUpdateWorkerRow(emp.id, { otHours: h })}
                                className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                                  row.otHours === h && row.workUnits > 0
                                    ? 'bg-orange-500 text-white shadow'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40'
                                }`}
                              >
                                {h === 0 ? '0' : `${h}h`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tiền công ngày tạm tính */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="text-slate-500">Tiền công ngày:</span>
                          <span className="font-black text-slate-900">
                            {formatCurrency(currentDayWage)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DÒNG GHI CHÚ NHANH DƯỚI TỪNG THỢ */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                      Ghi chú:
                    </span>
                    <input
                      type="text"
                      placeholder="VD: Ốp vách tivi, lắp nẹp la inox, ứng xăng xe 50k..."
                      value={row.note}
                      onChange={(e) => handleUpdateWorkerRow(emp.id, { note: e.target.value })}
                      className="flex-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-400 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none transition"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* CHÂN BẢNG: NÚT LƯU TO BẢN ĐỂ BẤM TRÊN IPHONE CỰC NHẠY */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-50 to-amber-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-700 text-center sm:text-left">
              <span className="font-black text-slate-900">
                Đã sẵn sàng lưu cho {companyEmployees.length} thợ ngày {formatDateVN(selectedDate)}
              </span>
              <p className="text-slate-500 mt-0.5">
                Dữ liệu sẽ được tự động cộng dồn vào Bảng Lương tháng và báo cáo tiến độ công trình.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveLamSongAttendance}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-base rounded-xl shadow-xl shadow-orange-300/50 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <CheckCircle className="w-5 h-5" />
              <span>LƯU BẢNG CHẤM CÔNG HÔM NAY</span>
            </button>
          </div>
        </div>

        {/* 3. LỊCH SỬ CHẤM CÔNG CÁC NGÀY TRONG THÁNG (ĐỂ XEM LẠI & SỬA) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Nhật Ký Chấm Công Đã Lưu (Lịch Sử Công Trình)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Xem lại hoặc xóa/sửa bản ghi chấm công của các ngày trước
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Xem ngày:</label>
              <input
                type="date"
                value={historyFilterDate}
                onChange={(e) => setHistoryFilterDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          {filteredAttendance.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold">
                Chưa có dữ liệu chấm công ngày {formatDateVN(historyFilterDate)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Quản lý hãy chọn ngày và bấm "LƯU BẢNG CHẤM CÔNG" ở trên để ghi nhận.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3">Họ tên thợ</th>
                    <th className="py-2.5 px-3">Công trình</th>
                    <th className="py-2.5 px-3 text-center">Số công</th>
                    <th className="py-2.5 px-3 text-center">Tăng ca (OT)</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                    <th className="py-2.5 px-3">Người xác nhận</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.map((rec) => {
                    const emp = employees.find((e) => e.id === rec.employeeId);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-black text-slate-900">{emp?.name || 'Thợ'}</div>
                          <div className="text-[10px] text-slate-500">{emp?.role}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            <span>{rec.siteName || 'Công trình'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {rec.workUnits === 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs">
                              Nghỉ
                            </span>
                          ) : (
                            <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded text-xs">
                              {rec.workUnits} công
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {rec.otHours > 0 ? (
                            <span className="font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-xs">
                              +{rec.otHours}h
                            </span>
                          ) : (
                            <span className="text-slate-400">0h</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-600 text-xs italic">
                            {rec.note || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>{rec.verifiedBy || 'Quản lý'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteAttendanceRecord(rec.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Xóa bản ghi này (Chỉ Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN 2: DÀNH CHO AGENCY (CHẤM CÔNG VĂN PHÒNG, REMOTE WFH & ĐI QUAY)
  // =========================================================================
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Sub-tabs Agency */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl max-w-sm mx-auto">
        <button
          onClick={() => setAgencySubTab('self')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            agencySubTab === 'self'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📱 Chấm Công Agency
        </button>
        <button
          onClick={() => setAgencySubTab('history')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            agencySubTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📋 Lịch Sử Công
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {agencySubTab === 'self' && (
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6">
          <div className="text-center mb-5">
            <h2 className="text-lg font-black text-slate-900">
              Chấm Công Nhân Viên Agency
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ làm việc tại Văn phòng, Remote WFH và Đi quay hiện trường
            </p>
          </div>

          <form onSubmit={handleAgencySelfSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chọn nhân sự chấm công:
              </label>
              <select
                value={agencyEmpId}
                onChange={(e) => setAgencyEmpId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {companyEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role}) - {emp.wageType === 'daily' ? 'Công nhật' : 'Lương tháng'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hình thức làm việc hôm nay:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAgencyLocationType('office')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    agencyLocationType === 'office'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  🏢 Văn Phòng
                </button>
                <button
                  type="button"
                  onClick={() => setAgencyLocationType('remote')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    agencyLocationType === 'remote'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  🏡 Remote / WFH
                </button>
                <button
                  type="button"
                  onClick={() => setAgencyLocationType('site')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    agencyLocationType === 'site'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  🎬 Đi Quay Phim
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Số công:</label>
                <select
                  value={agencyWorkUnits}
                  onChange={(e) => setAgencyWorkUnits(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-800"
                >
                  <option value={1}>1.0 Công (Cả ngày)</option>
                  <option value={0.5}>0.5 Công (Nửa ngày)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tăng ca (OT):
                </label>
                <select
                  value={agencyOtHours}
                  onChange={(e) => setAgencyOtHours(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-800"
                >
                  <option value={0}>Không tăng ca (0h)</option>
                  <option value={1}>1 tiếng</option>
                  <option value={2}>2 tiếng</option>
                  <option value={3}>3 tiếng (quay đêm)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ghi chú công việc hôm nay:
              </label>
              <input
                type="text"
                value={agencyNote}
                onChange={(e) => setAgencyNote(e.target.value)}
                placeholder="VD: Đi quay video Feel Chicken số 05, dựng clip ngắn..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-white font-black text-base shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-200"
              >
                <CheckCircle className="w-5 h-5" />
                <span>XÁC NHẬN CHẤM CÔNG AGENCY</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {agencySubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>Bảng Ghi Nhận Chấm Công Agency</span>
            </h2>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Xem theo ngày:</label>
              <input
                type="date"
                value={historyFilterDate}
                onChange={(e) => setHistoryFilterDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {filteredAttendance.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Không có dữ liệu chấm công ngày {formatDateVN(historyFilterDate)}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <th className="py-2.5 px-3">Nhân sự</th>
                    <th className="py-2.5 px-3">Giờ vào</th>
                    <th className="py-2.5 px-3">Số công</th>
                    <th className="py-2.5 px-3">Tăng ca (OT)</th>
                    <th className="py-2.5 px-3">Hình thức</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                    <th className="py-2.5 px-3 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.map((rec) => {
                    const emp = employees.find((e) => e.id === rec.employeeId);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{emp?.name || 'Nhân sự'}</div>
                          <div className="text-[11px] text-slate-500">{emp?.role}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                          {rec.checkInTime}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {rec.workUnits} công
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {rec.otHours > 0 ? (
                            <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                              +{rec.otHours} giờ
                            </span>
                          ) : (
                            <span className="text-slate-400">0h</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {rec.siteName}
                        </td>
                        <td className="py-3 px-3 text-slate-500 italic">
                          {rec.note || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteAttendanceRecord(rec.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Xóa bản ghi (Chỉ Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
