import React, { useState } from 'react';
import { ConstructionSite, Employee, DailySiteSchedule } from '../types';
import { formatDateVN } from '../services/db';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Hammer,
  TrendingUp,
  Award,
  ChevronRight,
  Trash2,
  Phone,
  Building2,
  FileText,
  Edit3,
  Lock,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ConstructionScheduleTrackerProps {
  sites: ConstructionSite[];
  employees: Employee[];
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onSaveSite: (site: ConstructionSite) => void;
  onDeleteSite?: (id: string) => void;
}

export const ConstructionScheduleTracker: React.FC<ConstructionScheduleTrackerProps> = ({
  sites,
  employees,
  isAdmin = false,
  onRequireAdmin,
  onSaveSite,
  onDeleteSite,
}) => {
  const workers = employees.filter((e) => e.companyId === 'lam_song' && e.active);

  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || '');
  const [showAddDispatchModal, setShowAddDispatchModal] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ConstructionSite | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // New Project Form State
  const [newProject, setNewProject] = useState<Partial<ConstructionSite>>({
    name: '',
    clientName: '',
    phone: '',
    address: '',
    totalAreaM2: 60,
    panelType: 'Lam sóng Nano 4 sóng cao cấp',
    estimatedDays: 5,
    startDate: todayStr,
    expectedEndDate: '',
    notes: '',
  });

  // New daily schedule dispatch form
  const [newSchedule, setNewSchedule] = useState<{
    date: string;
    workHours: string;
    workerIds: string[];
    taskDescription: string;
  }>({
    date: todayStr,
    workHours: '07:30 - 17:30',
    workerIds: [workers[0]?.id || '', workers[1]?.id || ''],
    taskDescription: '',
  });

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  // Mở modal tạo dự án (Kiểm tra quyền Admin)
  const handleOpenAddProject = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setShowAddProjectModal(true);
  };

  // Mở modal phân công lịch thợ (Kiểm tra quyền Admin)
  const handleOpenAddDispatch = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setShowAddDispatchModal(true);
  };

  // Mở modal chỉnh sửa dự án (Chỉ Admin)
  const handleOpenEditProject = (site: ConstructionSite, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setEditingProject({ ...site });
  };

  // Lưu thông tin chỉnh sửa dự án (Chỉ Admin)
  const handleSaveEditedProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!editingProject) return;

    onSaveSite(editingProject);
    setNoticeMessage(`✓ Đã cập nhật thông tin dự án "${editingProject.name}" thành công!`);
    setTimeout(() => setNoticeMessage(''), 4000);
    try {
      confetti({ particleCount: 60, spread: 60 });
    } catch {}
    setEditingProject(null);
  };

  // Xóa dự án (Chỉ Admin)
  const handleDeleteProject = (siteId: string, siteName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa dự án "${siteName}" không? Thao tác này sẽ xóa toàn bộ lịch thi công của dự án.`)) {
      onDeleteSite?.(siteId);
      if (selectedSiteId === siteId) {
        const remaining = sites.filter((s) => s.id !== siteId);
        setSelectedSiteId(remaining[0]?.id || '');
      }
      setNoticeMessage(`✓ Đã xóa dự án "${siteName}" thành công!`);
      setTimeout(() => setNoticeMessage(''), 4000);
    }
  };

  // Tạo Dự Án / Công Trình Mới (Chỉ Admin)
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!newProject.name || !newProject.clientName) return;

    const site: ConstructionSite = {
      id: `site_${Date.now()}`,
      name: newProject.name!,
      clientName: newProject.clientName!,
      phone: newProject.phone || '',
      address: newProject.address || '',
      totalAreaM2: Number(newProject.totalAreaM2 || 0),
      completedAreaM2: 0,
      panelType: newProject.panelType || 'Lam sóng Nano cao cấp',
      estimatedDays: Number(newProject.estimatedDays || 5),
      actualDays: 1,
      startDate: newProject.startDate || todayStr,
      expectedEndDate: newProject.expectedEndDate || '',
      status: 'framing',
      assignedWorkers: [],
      photos: [],
      dailySchedules: [],
      notes: newProject.notes || '',
    };

    onSaveSite(site);
    setSelectedSiteId(site.id);
    setShowAddProjectModal(false);
    try {
      confetti({ particleCount: 70, spread: 70 });
    } catch {}
    setNoticeMessage(`✓ Đã tạo thành công dự án mới: "${site.name}"!`);
    setTimeout(() => setNoticeMessage(''), 4000);

    setNewProject({
      name: '',
      clientName: '',
      phone: '',
      address: '',
      totalAreaM2: 60,
      panelType: 'Lam sóng Nano 4 sóng cao cấp',
      estimatedDays: 5,
      startDate: todayStr,
      expectedEndDate: '',
      notes: '',
    });
  };

  // Thêm lịch điều thợ mới vào công trình (Chỉ Admin)
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!selectedSite || !newSchedule.taskDescription) return;

    const newDispatch: DailySiteSchedule = {
      id: `ds_${Date.now()}`,
      siteId: selectedSite.id,
      date: newSchedule.date,
      workHours: newSchedule.workHours,
      workerIds: newSchedule.workerIds,
      taskDescription: newSchedule.taskDescription,
      status: 'scheduled',
    };

    const currentSchedules = selectedSite.dailySchedules || [];
    const updatedSite: ConstructionSite = {
      ...selectedSite,
      dailySchedules: [newDispatch, ...currentSchedules],
    };

    onSaveSite(updatedSite);
    setShowAddDispatchModal(false);
    setNoticeMessage(`✓ Đã thêm lịch làm việc ngày ${formatDateVN(newSchedule.date)} cho thợ tại "${selectedSite.name}"!`);
    setTimeout(() => setNoticeMessage(''), 4000);
    setNewSchedule({
      date: todayStr,
      workHours: '07:30 - 17:30',
      workerIds: [workers[0]?.id || '', workers[1]?.id || ''],
      taskDescription: '',
    });
  };

  // Tích hoàn thành lịch làm việc trong ngày
  const handleToggleScheduleStatus = (scheduleId: string) => {
    if (!selectedSite) return;

    const currentSchedules = selectedSite.dailySchedules || [];
    const updatedSchedules = currentSchedules.map((item) => {
      if (item.id === scheduleId) {
        const nextStatus = item.status === 'completed' ? 'in_progress' : 'completed';
        if (nextStatus === 'completed') {
          try {
            confetti({ particleCount: 50, spread: 60 });
          } catch {}
        }
        return { ...item, status: nextStatus as any };
      }
      return item;
    });

    onSaveSite({ ...selectedSite, dailySchedules: updatedSchedules });
  };

  // Cập nhật số ngày thực tế / dự tính của công trình (Chỉ Admin)
  const handleUpdateDuration = (estimated: number, actual: number) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!selectedSite) return;
    onSaveSite({
      ...selectedSite,
      estimatedDays: estimated,
      actualDays: actual,
    });
    setNoticeMessage(`✓ Đã cập nhật số ngày dự tính (${estimated} ngày) và thực tế (${actual} ngày)!`);
    setTimeout(() => setNoticeMessage(''), 3000);
  };

  // Tổng hợp tất cả lịch làm việc của TẤT CẢ các công trình cho HÔM NAY
  const allTodaySchedules: { site: ConstructionSite; schedule: DailySiteSchedule }[] = [];
  sites.forEach((site) => {
    (site.dailySchedules || []).forEach((ds) => {
      if (ds.date === todayStr) {
        allTodaySchedules.push({ site, schedule: ds });
      }
    });
  });

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
                <span>Chế độ Xem Dự Án Ốp Tường (Chỉ Admin Mới Sửa Được)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Chỉ xem</span>
              </div>
              <div className="text-xs text-amber-800 mt-0.5">
                Chỉ Quản Trị Viên (Admin) mới có quyền tạo dự án mới, sửa diện tích m², loại tấm, ngày dự tính/thực tế và xóa công trình.
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

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Hammer className="w-5 h-5 text-orange-600" />
            <span>Quản Lý Dự Án Ốp Tường & Lịch Điều Đội Thợ</span>
          </h2>
          <p className="text-xs text-slate-500">
            Tạo dự án mới, theo dõi số ngày dự tính vs thực tế, phân công lịch làm việc chi tiết
          </p>
        </div>

        {/* NÚT TẠO DỰ ÁN MỚI NỔI BẬT */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddProject}
            className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Dự Án / Công Trình Mới</span>
          </button>

          <button
            onClick={handleOpenAddDispatch}
            className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="hidden sm:inline">Phân Công Lịch Thợ</span>
          </button>
        </div>
      </div>

      {noticeMessage && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* ---------------- 1. BẢNG SO SÁNH DỰ TÍNH VS THỰC TẾ CHO TỪNG CÔNG TRÌNH ---------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-orange-600" />
            <span>Danh Sách Dự Án / Công Trình Đang Quản Lý ({sites.length} công trình)</span>
          </h3>
          <button
            onClick={handleOpenAddProject}
            className="text-xs font-bold text-orange-600 hover:text-orange-800"
          >
            + Thêm công trình khác
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sites.map((site) => {
            const estimated = site.estimatedDays || 5;
            const actual = site.actualDays || 3;
            const isCompleted = site.status === 'completed';

            // Đánh giá hiệu suất thời gian:
            let diffDays = estimated - actual;
            let statusText = '';
            let badgeColor = '';

            if (isCompleted) {
              if (diffDays > 0) {
                statusText = `Về đích sớm ${diffDays} ngày (Vượt tiến độ)`;
                badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              } else if (diffDays === 0) {
                statusText = 'Đúng tiến độ chuẩn';
                badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
              } else {
                statusText = `Bị trễ ${Math.abs(diffDays)} ngày so với dự kiến`;
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
              }
            } else {
              if (actual > estimated) {
                statusText = `Đã làm quá dự tính ${actual - estimated} ngày!`;
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse';
              } else {
                statusText = `Đang làm ngày ${actual}/${estimated} (Đúng kế hoạch)`;
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
              }
            }

            const isSelected = selectedSite?.id === site.id;

            return (
              <div
                key={site.id}
                onClick={() => setSelectedSiteId(site.id)}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-200 shadow-md'
                    : 'border-slate-200 hover:border-orange-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1">{site.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      {isCompleted ? '✓ Bàn giao' : 'Đang chạy'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{site.address}</span>
                  </div>

                  {/* Hộp so sánh số ngày */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2 text-xs mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Dự tính ban đầu:</span>
                      <span className="font-bold text-slate-800">{estimated} ngày</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">
                        {isCompleted ? 'Thực tế hoàn thành:' : 'Thực tế đang làm:'}
                      </span>
                      <span className="font-black text-orange-600 text-sm">{actual} ngày</span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-slate-500">Khối lượng m²:</span>
                      <span className="font-bold text-emerald-600">
                        {site.completedAreaM2} / {site.totalAreaM2} m²
                      </span>
                    </div>
                  </div>

                  {/* Badge đánh giá tiến độ */}
                  <div
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-extrabold text-center border ${badgeColor}`}
                  >
                    {statusText}
                  </div>
                </div>

                {/* Thanh thao tác sửa / xóa dành cho Admin */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditProject(site, e)}
                    className="text-xs font-bold text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 active:scale-95"
                    title="Chỉnh sửa dự án này (Admin)"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                    <span>Sửa Dự Án</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteProject(site.id, site.name, e)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition active:scale-95"
                    title="Xóa dự án (Chỉ Admin)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- 2. LỊCH LÀM VIỆC CHI TIẾT HÔM NAY (AI LÀM - Ở ĐÂU - MẤY GIỜ) ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-extrabold text-base text-slate-900">
                Lịch Làm Việc Hôm Nay ({formatDateVN(todayStr)})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân công thợ thi công tại các công trình trong ngày hôm nay
            </p>
          </div>

          <span className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded-full border border-orange-200">
            {allTodaySchedules.length} công trình đang có thợ làm
          </span>
        </div>

        {allTodaySchedules.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Hôm nay chưa có lịch điều thợ cụ thể. Bạn có thể bấm nút <b>"+ Phân Công Lịch Thợ"</b> ở góc trên để tạo lịch!
          </div>
        ) : (
          <div className="space-y-3">
            {allTodaySchedules.map(({ site, schedule }) => {
              const assignedStaff = employees.filter((e) => schedule.workerIds.includes(e.id));

              return (
                <div
                  key={schedule.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full uppercase">
                        {site.name}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">
                        {schedule.taskDescription}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleToggleScheduleStatus(schedule.id)}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                        schedule.status === 'completed'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{schedule.status === 'completed' ? 'Đã hoàn thành' : 'Đang thi công'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 mt-3 pt-2.5 border-t border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        Giờ làm: <b>{schedule.workHours}</b>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate">
                        Địa chỉ: <b>{site.address}</b>
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 font-semibold">Thợ phụ trách:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedStaff.map((w) => (
                        <span
                          key={w.id}
                          className="bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-800 text-[11px]"
                        >
                          {w.name} ({w.role.split('(')[0].trim()})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- 3. TẤT CẢ LỊCH LÀM VIỆC CỦA CÔNG TRÌNH ĐANG CHỌN ---------------- */}
      {selectedSite && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Toàn Bộ Lịch Thi Công: {selectedSite.name}
              </h3>
              <p className="text-xs text-slate-500">
                Địa chỉ: {selectedSite.address} • Liên hệ: {selectedSite.clientName} ({selectedSite.phone})
              </p>
            </div>

            {/* Chỉnh sửa nhanh số ngày dự tính & thực tế */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleOpenEditProject(selectedSite, e)}
                className="text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 border border-orange-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                title="Chỉnh sửa chi tiết dự án này"
              >
                <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                <span>Sửa Dự Án (Admin)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUpdateDuration(
                    selectedSite.estimatedDays || 5,
                    (selectedSite.actualDays || 1) + 1
                  )
                }
                className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1.5 rounded-lg active:scale-95"
              >
                +1 Ngày Thực Tế
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {(selectedSite.dailySchedules || []).length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Chưa có lịch làm việc nào được gán cho công trình này.
              </div>
            ) : (
              (selectedSite.dailySchedules || []).map((ds) => {
                const assignedStaff = employees.filter((e) => ds.workerIds.includes(e.id));
                return (
                  <div
                    key={ds.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                          {formatDateVN(ds.date)}
                        </span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {ds.workHours}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 text-sm mt-1">
                        {ds.taskDescription}
                      </div>
                      <div className="text-slate-500 mt-1 flex items-center gap-1">
                        <span>Thợ:</span>
                        <span className="font-semibold text-slate-700">
                          {assignedStaff.map((w) => w.name).join(', ')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleScheduleStatus(ds.id)}
                      className={`font-bold px-3 py-1.5 rounded-xl transition ${
                        ds.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {ds.status === 'completed' ? '✓ Đã xong' : 'Chưa xong'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------- MODAL TẠO DỰ ÁN / CÔNG TRÌNH MỚI ---------------- */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-base text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <span>Tạo Dự Án / Công Trình Ốp Lam Sóng Mới</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập thông tin công trình, diện tích m² và số ngày dự tính làm xong
            </p>

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên dự án / công trình:</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="VD: Biệt thự Ecopark - Phòng khách & Vách tivi..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên chủ nhà / Khách hàng:</label>
                  <input
                    type="text"
                    value={newProject.clientName}
                    onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                    placeholder="VD: Anh Tuấn Anh..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ:</label>
                  <input
                    type="tel"
                    value={newProject.phone}
                    onChange={(e) => setNewProject({ ...newProject, phone: e.target.value })}
                    placeholder="VD: 0903..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ thi công cụ thể:</label>
                <input
                  type="text"
                  value={newProject.address}
                  onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                  placeholder="Số nhà, đường, toà nhà, quận/huyện, tỉnh..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tổng khối lượng cần ốp (m²):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newProject.totalAreaM2}
                    onChange={(e) => setNewProject({ ...newProject, totalAreaM2: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dự tính làm xong trong (ngày):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newProject.estimatedDays}
                    onChange={(e) => setNewProject({ ...newProject, estimatedDays: Number(e.target.value) })}
                    placeholder="VD: 5 ngày"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-orange-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại tấm lam sóng / vật tư:</label>
                <input
                  type="text"
                  value={newProject.panelType}
                  onChange={(e) => setNewProject({ ...newProject, panelType: e.target.value })}
                  placeholder="VD: Lam sóng Nano 4 sóng vân gỗ óc chó, than tre kim loại..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu khởi công:</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hạn chót bàn giao:</label>
                  <input
                    type="date"
                    value={newProject.expectedEndDate}
                    onChange={(e) => setNewProject({ ...newProject, expectedEndDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú yêu cầu kỹ thuật:</label>
                <input
                  type="text"
                  value={newProject.notes}
                  onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                  placeholder="Yêu cầu nẹp nhôm mạ vàng, đi led âm trần, chỉ dán tường..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-black hover:bg-orange-700 shadow-md"
                >
                  LƯU DỰ ÁN MỚI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL THÊM LỊCH ĐIỀU THỢ MỚI ---------------- */}
      {showAddDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl">
            <h3 className="font-black text-base text-slate-900 mb-1">
              Phân Công Lịch Làm Việc & Điều Đội Thợ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chỉ định ngày làm, mấy giờ, làm ở đâu và giao cho thợ nào
            </p>

            <form onSubmit={handleAddSchedule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn công trình & Địa chỉ:
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày bao nhiêu:
                  </label>
                  <input
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mấy giờ (Khung giờ làm):
                  </label>
                  <input
                    type="text"
                    value={newSchedule.workHours}
                    onChange={(e) => setNewSchedule({ ...newSchedule, workHours: e.target.value })}
                    placeholder="VD: 07:30 - 17:30"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ai làm (Chọn những thợ được điều đến):
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {workers.map((w) => {
                    const isChecked = newSchedule.workerIds.includes(w.id);
                    return (
                      <label
                        key={w.id}
                        className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1 rounded transition"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSchedule({
                                ...newSchedule,
                                workerIds: [...newSchedule.workerIds, w.id],
                              });
                            } else {
                              setNewSchedule({
                                ...newSchedule,
                                workerIds: newSchedule.workerIds.filter((id) => id !== w.id),
                              });
                            }
                          }}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        <span className="font-semibold text-slate-800">{w.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Công việc cụ thể cần làm hôm đó:
                </label>
                <input
                  type="text"
                  value={newSchedule.taskDescription}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, taskDescription: e.target.value })
                  }
                  placeholder="VD: Bắn hệ xương sắt hộp, ốp vách tivi và đi nẹp bo viền..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDispatchModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-md"
                >
                  Lưu & Phân Công Lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL CHỈNH SỬA DỰ ÁN (CHỈ ADMIN) ---------------- */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900">
                      Chỉnh Sửa Dự Án / Công Trình
                    </h3>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                      👑 Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cập nhật tiến độ m², số ngày dự tính/thực tế, loại vật tư và thông tin khách hàng
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên dự án / công trình:
                </label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, name: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chủ nhà / Khách hàng:
                  </label>
                  <input
                    type="text"
                    value={editingProject.clientName}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, clientName: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="tel"
                    value={editingProject.phone || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, phone: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ công trình:
                </label>
                <input
                  type="text"
                  value={editingProject.address}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, address: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Loại tấm / Vật tư ốp tường:
                </label>
                <input
                  type="text"
                  value={editingProject.panelType || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, panelType: e.target.value })
                  }
                  placeholder="VD: Lam sóng Nano 4 sóng cao cấp, vân gỗ sồi, nẹp đồng bo viền..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              {/* Diện tích & Số ngày */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tổng diện tích (m²):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingProject.totalAreaM2}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        totalAreaM2: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Đã ốp xong (m²):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingProject.completedAreaM2}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        completedAreaM2: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Dự tính (ngày):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingProject.estimatedDays || 5}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        estimatedDays: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Thực tế (ngày):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingProject.actualDays || 1}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        actualDays: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-orange-700"
                    required
                  />
                </div>
              </div>

              {/* Trạng thái tiến độ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiến độ công trình:
                  </label>
                  <select
                    value={editingProject.status}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="planning">Khảo sát & Lên phương án</option>
                    <option value="framing">Đang đi khung xương sắt hộp</option>
                    <option value="installing">Đang ốp tấm lam sóng</option>
                    <option value="finishing">Gắn nẹp phào chỉ & Vệ sinh</option>
                    <option value="completed">Đã hoàn thành bàn giao</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày bắt đầu:
                  </label>
                  <input
                    type="date"
                    value={editingProject.startDate || todayStr}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, startDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú thi công / Yêu cầu đặc biệt:
                </label>
                <textarea
                  rows={2}
                  value={editingProject.notes || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, notes: e.target.value })
                  }
                  placeholder="Ghi chú về nguồn điện, giàn giáo, yêu cầu gia chủ..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Nút hành động */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={(e) => {
                    handleDeleteProject(editingProject.id, editingProject.name, e);
                    setEditingProject(null);
                  }}
                  className="px-3.5 py-2 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Dự Án Này</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-orange-700 hover:to-amber-700 transition"
                  >
                    Lưu Cập Nhật Dự Án
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
