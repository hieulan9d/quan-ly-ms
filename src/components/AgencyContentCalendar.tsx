import React, { useState, useMemo } from 'react';
import { ContentCalendarItem, Employee, AgencyProject } from '../types';
import { formatDateVN, formatCurrency } from '../services/db';
import {
  parseHtmlContentCalendar,
  parseExcelCalendar,
  fetchAndParseGoogleSheet,
  downloadSampleExcelTemplate,
} from '../services/calendarParser';
import {
  FEEL_CHICKEN_ITEMS,
  FEEL_CHICKEN_SHOOTS,
  FEEL_CHICKEN_TODOS,
} from '../data/feelChickenCalendar';
import { INITIAL_AGENCY_PROJECTS } from '../data/mockData';
import {
  Calendar,
  Video,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Upload,
  UserCheck,
  X,
  Sparkles,
  Camera,
  CheckSquare,
  FileText,
  Star,
  ChevronRight,
  Trash2,
  Copy,
  Check,
  FileSpreadsheet,
  Globe,
  Download,
  Loader2,
  Clapperboard,
  Film,
  CalendarPlus,
  Layers,
  Briefcase,
  Building2,
  FolderPlus,
  Phone,
  Target,
  Edit,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AgencyContentCalendarProps {
  calendarItems: ContentCalendarItem[];
  employees: Employee[];
  projects?: AgencyProject[];
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onSaveItem: (item: ContentCalendarItem) => void;
  onDeleteItem: (id: string) => void;
  onBatchImport: (items: ContentCalendarItem[]) => void;
  onSaveProject?: (project: AgencyProject) => void;
  onDeleteProject?: (id: string) => void;
  onClearAll?: () => void;
}

export const AgencyContentCalendar: React.FC<AgencyContentCalendarProps> = ({
  calendarItems,
  employees,
  projects = INITIAL_AGENCY_PROJECTS,
  isAdmin = false,
  onRequireAdmin,
  onSaveItem,
  onDeleteItem,
  onBatchImport,
  onSaveProject,
  onDeleteProject,
  onClearAll,
}) => {
  const agencyStaff = employees.filter((e) => e.companyId === 'agency' && e.active);

  // ---------------- 1. DỰ ÁN & KHÁCH HÀNG (QUẢN LÝ TỪNG KHÁCH HÀNG CHO ĐỠ LỘN) ----------------
  // Default project: 'Feel Chicken'
  const [selectedProjectName, setSelectedProjectName] = useState<string>('Feel Chicken');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<AgencyProject | null>(null);

  // View Mode: 'grid' (Lịch ô 7 cột) vs 'list' (Danh sách)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selected item modal when user clicks on an event
  const [selectedItem, setSelectedItem] = useState<ContentCalendarItem | null>(null);

  // Month filter
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [showImportModal, setShowImportModal] = useState(false);

  // Add event modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDayInitial, setAddDayInitial] = useState<string>('05/10');
  const [addDayOfWeekInitial, setAddDayOfWeekInitial] = useState<string>('Thứ 2');
  const [addEventType, setAddEventType] = useState<'shoot' | 'edit' | 'post' | 'other'>('shoot');
  const [addEventClient, setAddEventClient] = useState<string>('Feel Chicken');

  const [noticeMessage, setNoticeMessage] = useState<string>('');
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  // Import modal tab: 'excel' | 'sheet' | 'html'
  const [importTab, setImportTab] = useState<'excel' | 'sheet' | 'html'>('excel');
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string>('');
  const [importTargetClient, setImportTargetClient] = useState<string>('Feel Chicken');

  // Today for overdue calculation
  const todayStr = new Date().toISOString().split('T')[0];

  // ---------------- LỌC BÀI ĐĂNG THEO DỰ ÁN / KHÁCH HÀNG ĐANG CHỌN ----------------
  const allItems = calendarItems;

  const activeItems = useMemo(() => {
    if (selectedProjectName === 'all') return allItems;
    return allItems.filter((item) => {
      const itemClient = (item.client || '').trim().toLowerCase();
      const targetClient = selectedProjectName.trim().toLowerCase();
      return (
        itemClient === targetClient ||
        itemClient.includes(targetClient) ||
        targetClient.includes(itemClient)
      );
    });
  }, [allItems, selectedProjectName]);

  // Thông tin chi tiết của dự án đang chọn
  const currentProject = useMemo(() => {
    return projects.find(
      (p) =>
        p.name.trim().toLowerCase() === selectedProjectName.trim().toLowerCase() ||
        selectedProjectName.toLowerCase().includes(p.name.toLowerCase())
    );
  }, [projects, selectedProjectName]);

  // ---------------- TẠO DANH SÁCH 35 Ô LỊCH (5 TUẦN × 7 NGÀY) THEO THÁNG 10–11 ----------------
  const daysGrid: { dayOfWeek: string; dayNumber: string; dateStr: string }[] = useMemo(() => {
    const grid: { dayOfWeek: string; dayNumber: string; dateStr: string }[] = [];
    const startDay = new Date(2026, 9, 5); // 05/10/2026 (Thứ 2)
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    for (let i = 0; i < 35; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const dayOfMonth = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayNumber = `${dayOfMonth}/${month}`;
      const dayOfWeek = dayNames[i % 7];
      const dateStr = `${d.getFullYear()}-${month}-${dayOfMonth}`;
      grid.push({ dayOfWeek, dayNumber, dateStr });
    }
    return grid;
  }, []);

  // ---------------- HỖ TRỢ NHIỀU SỰ KIỆN TRONG 1 NGÀY (ITEMS BY DAY) ----------------
  const itemsByDay = useMemo(() => {
    const map: { [dayNumber: string]: ContentCalendarItem[] } = {};
    activeItems.forEach((item) => {
      let key = item.dayNumber;
      if (!key && item.publishDate) {
        const parts = item.publishDate.split('-');
        if (parts.length === 3) {
          key = `${parts[2]}/${parts[1]}`;
        }
      }
      if (key) {
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(item);
      }
    });
    return map;
  }, [activeItems]);

  // TÍNH TOÁN CÁC BÀI TRỄ HẠN
  const overdueItems = activeItems.filter((item) => {
    if (item.isCompleted) return false;
    return item.editDeadline && item.editDeadline < todayStr;
  });

  // Số lượng bài đã xong của dự án đang chọn
  const completedCount = activeItems.filter((i) => i.isCompleted).length;
  const targetKpi = currentProject?.targetPostsPerMonth || activeItems.length || 20;
  const kpiPercent = Math.min(100, Math.round((completedCount / targetKpi) * 100));

  // ---------------- HÀM ĐỔI TRẠNG THÁI: NÚT XONG / CHƯA XONG ----------------
  const handleToggleCompleted = (item: ContentCalendarItem) => {
    const nextState = !item.isCompleted;
    const updated: ContentCalendarItem = {
      ...item,
      isCompleted: nextState,
      status: nextState ? 'completed' : 'editing',
      editCompleted: nextState,
      shootCompleted: nextState ? true : item.shootCompleted,
    };

    onSaveItem(updated);
    setSelectedItem(updated);

    if (nextState) {
      try {
        confetti({ particleCount: 80, spread: 70 });
      } catch {}
      setNoticeMessage(`🎉 Đã đánh dấu HOÀN THÀNH: "${item.title}"!`);
    } else {
      setNoticeMessage(`Đã chuyển về trạng thái: Chưa xong.`);
    }
    setTimeout(() => setNoticeMessage(''), 3500);
  };

  // Cập nhật người thực hiện (Content a, Quay b, Edit B) & Thời hạn
  const handleUpdateAssignment = (
    item: ContentCalendarItem,
    field: 'writerId' | 'shooterId' | 'editorId' | 'editDeadline',
    value: string
  ) => {
    const updated = { ...item, [field]: value };
    onSaveItem(updated);
    setSelectedItem(updated);
  };

  // Mở modal thêm lịch cho 1 ngày cụ thể
  const handleOpenAddModalForDay = (dayNumber: string, dayOfWeek: string) => {
    setAddDayInitial(dayNumber);
    setAddDayOfWeekInitial(dayOfWeek);
    setAddEventType('shoot');
    setAddEventClient(selectedProjectName === 'all' ? 'Feel Chicken' : selectedProjectName);
    setShowAddModal(true);
  };

  // Xóa 1 sự kiện riêng lẻ
  const handleDeleteItemConfirmed = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lịch này không?')) {
      onDeleteItem(id);
      setSelectedItem(null);
      setNoticeMessage('Đã xóa sự kiện thành công.');
      setTimeout(() => setNoticeMessage(''), 3000);
    }
  };

  // 1. Nạp từ File Excel (.xlsx, .xls, .csv)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        const targetClient = importTargetClient || selectedProjectName || 'Feel Chicken';
        const items = parseExcelCalendar(buffer, targetClient);
        if (items.length > 0) {
          onBatchImport(items);
          setShowImportModal(false);
          try {
            confetti({ particleCount: 90, spread: 70 });
          } catch {}
          setNoticeMessage(`✓ Đã nạp thành công ${items.length} bài cho khách hàng "${targetClient}" từ file Excel!`);
          setTimeout(() => setNoticeMessage(''), 4500);
        } else {
          alert('Không đọc được dữ liệu từ file Excel. Hãy kiểm tra file có các cột: Tiêu đề, Ngày, Giờ, Loại, Kênh...');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // 2. Nạp từ link Google Sheet
  const handleImportGoogleSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleSheetUrl.trim()) return;

    setIsFetchingSheet(true);
    setSheetError('');
    try {
      const items = await fetchAndParseGoogleSheet(googleSheetUrl.trim());
      if (items.length > 0) {
        // Gán đúng khách hàng được chọn
        const targetClient = importTargetClient || selectedProjectName || 'Feel Chicken';
        const clientItems = items.map((it) => ({ ...it, client: targetClient }));
        onBatchImport(clientItems);
        setShowImportModal(false);
        setGoogleSheetUrl('');
        try {
          confetti({ particleCount: 90, spread: 70 });
        } catch {}
        setNoticeMessage(`✓ Đã kết nối và nạp thành công ${clientItems.length} bài cho khách hàng "${targetClient}" từ Google Sheet!`);
        setTimeout(() => setNoticeMessage(''), 4500);
      } else {
        setSheetError('Google Sheet chưa có dữ liệu hoặc không đọc được các cột. Vui lòng kiểm tra lại bảng tính.');
      }
    } catch (err: any) {
      console.error(err);
      setSheetError(err.message || 'Lỗi kết nối tới Google Sheet. Đảm bảo sheet đã bật chia sẻ: "Bất kỳ ai có liên kết đều xem được".');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // 3. Nạp 25 bài Feel Chicken có sẵn
  const handleLoadFeelChicken = () => {
    onBatchImport(FEEL_CHICKEN_ITEMS);
    setSelectedProjectName('Feel Chicken');
    setShowImportModal(false);
    try {
      confetti({ particleCount: 90, spread: 80 });
    } catch {}
    setNoticeMessage(`✓ Đã nạp thành công 25 lịch Feel Chicken (bao gồm lịch quay & edit Thứ 2)!`);
    setTimeout(() => setNoticeMessage(''), 4000);
  };

  // 4. Đọc file HTML được tải lên
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseHtmlContentCalendar(text);
        if (parsed && parsed.items.length > 0) {
          onBatchImport(parsed.items);
          setSelectedProjectName(parsed.clientName || 'Feel Chicken');
          setShowImportModal(false);
          try {
            confetti({ particleCount: 90, spread: 80 });
          } catch {}
          setNoticeMessage(`✓ Đã đọc thành công ${parsed.items.length} bài từ file "${file.name}"!`);
          setTimeout(() => setNoticeMessage(''), 4500);
        } else {
          alert('Không thể đọc dữ liệu từ file này. Vui lòng chọn đúng file HTML Content Calendar.');
        }
      };
      reader.readAsText(file);
    }
  };

  // ---------------- 5. TẠO DỰ ÁN / KHÁCH HÀNG MỚI ----------------
  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const name = form.name.value.trim();
    if (!name) return;

    const newProject: AgencyProject = {
      id: `proj_${Date.now()}`,
      name: name,
      clientContact: form.clientContact.value.trim(),
      phone: form.phone.value.trim(),
      servicePackage: form.servicePackage.value.trim() || 'Gói Content & Video Mạng Xã Hội',
      monthlyRetainer: Number(form.monthlyRetainer.value) || 15000000,
      targetPostsPerMonth: Number(form.targetPostsPerMonth.value) || 20,
      startDate: form.startDate.value || todayStr,
      status: 'active',
      notes: form.notes.value.trim(),
      color: form.color.value || '#8b5cf6',
    };

    if (onSaveProject) {
      onSaveProject(newProject);
    }

    // Chuyển ngay sang khách hàng mới vừa tạo
    setSelectedProjectName(newProject.name);
    setShowCreateProjectModal(false);

    try {
      confetti({ particleCount: 90, spread: 80 });
    } catch {}

    setNoticeMessage(`🎉 Đã tạo thành công Dự Án / Khách Hàng mới: "${newProject.name}"! Giờ bạn có thể lên lịch riêng cho khách hàng này.`);
    setTimeout(() => setNoticeMessage(''), 5000);
  };

  // ---------------- 5.2 CHỈNH SỬA DỰ ÁN / KHÁCH HÀNG (CHỈ ADMIN) ----------------
  const handleEditProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    const form = e.target as any;

    const updated: AgencyProject = {
      ...editingProject,
      name: form.name.value.trim() || editingProject.name,
      clientContact: form.clientContact.value.trim(),
      phone: form.phone.value.trim(),
      servicePackage: form.servicePackage.value.trim(),
      monthlyRetainer: Number(form.monthlyRetainer.value) || editingProject.monthlyRetainer || 15000000,
      targetPostsPerMonth: Number(form.targetPostsPerMonth.value) || editingProject.targetPostsPerMonth || 20,
      status: form.status.value,
      notes: form.notes.value.trim(),
      color: form.color.value || editingProject.color,
    };

    if (onSaveProject) {
      onSaveProject(updated);
    }

    setSelectedProjectName(updated.name);
    setEditingProject(null);

    try {
      confetti({ particleCount: 70, spread: 60 });
    } catch {}

    setNoticeMessage(`✓ Đã cập nhật thông tin dự án "${updated.name}" thành công! Ngân sách: ${formatCurrency(updated.monthlyRetainer || 0)}.`);
    setTimeout(() => setNoticeMessage(''), 4500);
  };

  return (
    <div className="space-y-4">
      {/* ---------------- 0. THANH ĐIỀU HÀNH DỰ ÁN & KHÁCH HÀNG (QUẢN LÝ RIÊNG BIỆT) ---------------- */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-purple-800/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-purple-500/30 border border-purple-400/40 text-purple-200">
                <Briefcase className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                Hệ Thống Quản Lý Dự Án & Khách Hàng Agency
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Đang quản lý:</span>
              <span className="text-amber-300 underline decoration-amber-400 underline-offset-4">
                {selectedProjectName === 'all' ? 'Tất Cả Khách Hàng' : selectedProjectName}
              </span>
            </h2>
            <p className="text-xs text-purple-200/80 mt-1">
              Mỗi khách hàng có 1 lịch trình & kế hoạch nội dung riêng biệt, không bị lẫn lộn dữ liệu!
            </p>
          </div>

          {/* Nút Tạo Dự Án Mới to bản (Chỉ Admin) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!isAdmin) {
                  onRequireAdmin?.();
                  return;
                }
                setShowCreateProjectModal(true);
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
            >
              <FolderPlus className="w-4 h-4 text-slate-950" />
              <span>+ TẠO DỰ ÁN / KHÁCH HÀNG MỚI</span>
            </button>
            {onClearAll && (
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    onRequireAdmin?.();
                    return;
                  }
                  if (
                    window.confirm(
                      'Xóa TẤT CẢ khách hàng và toàn bộ lịch content? Việc này không thể hoàn tác.'
                    )
                  ) {
                    onClearAll();
                    setSelectedProjectName('all');
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-red-200 transition flex items-center gap-2 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>XÓA TẤT CẢ</span>
              </button>
            )}
          </div>
        </div>

        {/* DANH SÁCH CÁC KHÁCH HÀNG ĐỂ CHỌN NHANH (TABS / PILLS) */}
        <div className="mt-4 pt-3 border-t border-purple-700/50 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-purple-300 whitespace-nowrap flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Chọn khách hàng:</span>
          </span>

          {/* Nút Xem tất cả */}
          <button
            onClick={() => setSelectedProjectName('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm ${
              selectedProjectName === 'all'
                ? 'bg-white text-purple-900 font-black ring-2 ring-amber-400'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🌐 Tất Cả Khách Hàng ({allItems.length})
          </button>

          {/* Từng khách hàng */}
          {projects.map((proj) => {
            const isSelected =
              selectedProjectName.toLowerCase() === proj.name.toLowerCase() ||
              selectedProjectName.toLowerCase().includes(proj.name.toLowerCase());

            const clientItemCount = allItems.filter((it) => {
              const itc = (it.client || '').toLowerCase();
              const pnc = proj.name.toLowerCase();
              return itc === pnc || itc.includes(pnc) || pnc.includes(itc);
            }).length;

            return (
              <button
                key={proj.id}
                onClick={() => setSelectedProjectName(proj.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-white shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span>{proj.name.includes('Chicken') ? '🍗' : proj.name.includes('Tea') ? '🧋' : proj.name.includes('Men') ? '👗' : '🏢'}</span>
                <span>{proj.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-black/30 text-purple-200'
                  }`}
                >
                  {clientItemCount} bài
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- BANNER THÔNG TIN DỰ ÁN ĐANG CHỌN (NẾU CHỌN 1 KHÁCH HÀNG) ---------------- */}
      {currentProject && selectedProjectName !== 'all' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                {currentProject.servicePackage || 'Gói Chăm Sóc Đa Kênh'}
              </span>
              {currentProject.phone && (
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentProject.clientContact || 'Liên hệ'}: <b>{currentProject.phone}</b></span>
                </span>
              )}
            </div>
            {currentProject.notes && (
              <p className="text-xs text-slate-500 italic">
                "{currentProject.notes}"
              </p>
            )}
          </div>

          {/* Tiến độ KPI & Ngân sách */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-0.5 flex items-center justify-between">
                <span>Tiến độ KPI tháng:</span>
                <span className="font-black text-purple-700 ml-2">{completedCount}/{targetKpi} bài ({kpiPercent}%)</span>
              </div>
              <div className="w-36 sm:w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${kpiPercent}%` }}
                />
              </div>
            </div>

            {currentProject.monthlyRetainer && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block">Ngân sách:</span>
                <span className="text-sm font-black text-slate-900">
                  {formatCurrency(currentProject.monthlyRetainer)}
                </span>
              </div>
            )}

            {/* Nút Sửa Dự Án & Ngân Sách (Chỉ Admin) */}
            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  onRequireAdmin?.();
                  return;
                }
                setEditingProject(currentProject);
              }}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 flex items-center gap-1.5 transition shadow-xs active:scale-95"
              title="Admin chỉnh sửa ngân sách (VD 15tr -> 20tr), tăng KPI bài đăng và gói dịch vụ"
            >
              <Edit className="w-3.5 h-3.5 text-purple-600" />
              <span>Sửa Dự Án</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 2. HEADER & THANH ĐIỀU KHIỂN CHÍNH ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>KẾ HOẠCH NỘI DUNG & LỊCH QUAY / EDIT</span>
              </h3>
              <span className="bg-purple-100 text-purple-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-purple-300">
                {selectedProjectName === 'all' ? 'TẤT CẢ KHÁCH HÀNG' : selectedProjectName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {selectedProjectName === 'all'
                ? 'Đang xem tổng hợp sự kiện của tất cả các khách hàng.'
                : `Lịch trình riêng biệt của khách hàng "${selectedProjectName}".`} Bấm <b>+ Thêm lịch</b> vào từng ngày để phân công Content, Quay, Edit.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOpenAddModalForDay('05/10', 'Thứ 2')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Thêm Lịch Mới</span>
            </button>

            <button
              onClick={() => {
                setImportTargetClient(selectedProjectName === 'all' ? 'Feel Chicken' : selectedProjectName);
                setShowImportModal(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>+ Nạp Kế Hoạch (Excel / Sheet)</span>
            </button>

            {/* Toggle Lịch / Danh Sách */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📅 Lịch</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋 Danh sách</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" />
              <span>🎬 Lịch Đi Quay</span>
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
              <span>✂️ Lịch Edit Video</span>
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" />
              <span>Bài Đăng / Content</span>
            </span>
            <span className="text-slate-400 font-medium hidden lg:inline">
              👆 Nhấp vào từng sự kiện để xem người làm (Content, Quay, Edit), thời hạn và bấm nút xong/chưa xong
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Tổng: {activeItems.length} sự kiện</span>
            <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-[11px]">
              Đã xong: {completedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Thông báo Real-time */}
      {noticeMessage && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* ---------------- CẢNH BÁO ĐỎ: CÁC BÀI ĐANG TRỄ HẠN DEADLINE ---------------- */}
      {overdueItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 text-rose-800 font-black text-sm mb-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>CẢNH BÁO TRỄ HẠN: CÓ {overdueItems.length} MỤC QUÁ THỜI HẠN CHƯA HOÀN THÀNH!</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {overdueItems.map((item) => {
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between cursor-pointer hover:bg-rose-50 transition"
                >
                  <span className="font-bold text-slate-800 truncate max-w-[280px]">
                    [{item.client}] {item.dayNumber}: {item.title}
                  </span>
                  <span className="font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded whitespace-nowrap">
                    Hạn: {formatDateVN(item.editDeadline)} (Trễ!)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- 3. GIAO DIỆN LỊCH DẠNG Ô 7 CỘT (THEO DỰ ÁN) ---------------- */}
      {viewMode === 'grid' && (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm overflow-x-auto">
          <div className="md:hidden text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5 mb-2.5 flex items-center justify-between gap-2">
            <span>↔️ Vuốt ngang để xem lịch 7 cột hoặc chọn chế độ Danh sách</span>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="bg-purple-600 text-white font-bold px-2 py-0.5 rounded-lg text-[10px] shrink-0"
            >
              📋 Xem Danh sách
            </button>
          </div>
          {/* 7 Tiêu đề thứ: Thứ 2 -> Chủ nhật */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[740px] lg:min-w-[950px] mb-2 text-center">
            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((name) => (
              <div
                key={name}
                className="text-xs font-black text-slate-600 uppercase tracking-wider py-1 bg-slate-50 rounded-lg border border-slate-100"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Lưới 35 ô ngày */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[740px] lg:min-w-[950px]">
            {daysGrid.map((cell, idx) => {
              const dayItems = itemsByDay[cell.dayNumber] || [];
              const hasEvents = dayItems.length > 0;

              return (
                <div
                  key={idx}
                  className={`min-h-[195px] rounded-xl border p-2 flex flex-col justify-between text-left transition-all relative bg-white ${
                    hasEvents
                      ? 'border-slate-200 shadow-xs hover:border-slate-400'
                      : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/70'
                  }`}
                >
                  {/* HEADER CỦA TỪNG Ô NGÀY: THỨ, SỐ SỰ KIỆN, NGÀY TO & NÚT THÊM [+] */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold truncate">
                        {cell.dayOfWeek}
                      </span>
                      {dayItems.length > 1 && (
                        <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full border border-purple-200">
                          {dayItems.length} sự kiện
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <strong className="text-sm font-black text-slate-900 tracking-tight">
                        {cell.dayNumber}
                      </strong>

                      {/* Nút [+] Thêm sự kiện nhanh trên đầu ô */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModalForDay(cell.dayNumber, cell.dayOfWeek);
                        }}
                        className="w-5 h-5 rounded-md bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-500 flex items-center justify-center transition shadow-xs text-xs font-bold"
                        title={`Thêm lịch cho ${cell.dayOfWeek} ${cell.dayNumber}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* THÂN Ô NGÀY: DANH SÁCH CÁC SỰ KIỆN CỦA DỰ ÁN */}
                  {hasEvents ? (
                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[220px] pr-0.5">
                      {dayItems.map((item) => {
                        const isVideo = item.loai === 'Video';
                        const isShoot = item.loai === 'Lịch quay' || (item.title && item.title.includes('Lịch đi quay'));
                        const isEdit = item.loai === 'Lịch edit' || (item.title && item.title.includes('Lịch edit'));
                        const isLate = !item.isCompleted && item.editDeadline && item.editDeadline < todayStr;
                        const isCompleted = item.isCompleted;

                        let stripeColor = 'bg-orange-500';
                        let badgeBg = 'bg-amber-100 text-amber-800 border-amber-200';
                        let badgeText = 'Soi Menu Feel';

                        if (isShoot) {
                          stripeColor = 'bg-indigo-600';
                          badgeBg = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                          badgeText = '🎬 Đi Quay';
                        } else if (isEdit) {
                          stripeColor = 'bg-amber-500';
                          badgeBg = 'bg-amber-100 text-amber-900 border-amber-300';
                          badgeText = '✂️ Edit Video';
                        } else if (isVideo) {
                          stripeColor = 'bg-slate-900';
                          badgeBg = 'bg-slate-900 text-white';
                          badgeText = '▶ VIDEO';
                        } else if (item.truc === 'ct') {
                          stripeColor = 'bg-rose-600';
                          badgeBg = 'bg-rose-100 text-rose-800';
                          badgeText = 'Chương trình';
                        } else if (item.truc === 'le') {
                          stripeColor = 'bg-purple-600';
                          badgeBg = 'bg-purple-100 text-purple-800';
                          badgeText = '20/10';
                        }

                        const shooter = employees.find((e) => e.id === item.shooterId);
                        const editor = employees.find((e) => e.id === item.editorId);
                        const writer = employees.find((e) => e.id === item.writerId);

                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all relative overflow-hidden bg-white hover:shadow-sm hover:border-purple-400 ${
                              selectedItem?.id === item.id
                                ? 'border-purple-600 ring-2 ring-purple-500 shadow-sm'
                                : isLate
                                ? 'border-rose-400 bg-rose-50/20'
                                : isCompleted
                                ? 'border-emerald-300 bg-emerald-50/20'
                                : 'border-slate-200'
                            }`}
                          >
                            {/* Sọc màu bên trái */}
                            <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r ${stripeColor}`} />

                            <div className="pl-1.5">
                              {/* Header của thẻ con: Badge loại & Khách hàng nếu xem All */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1">
                                  <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border ${badgeBg}`}>
                                    {badgeText}
                                  </span>
                                  {selectedProjectName === 'all' && item.client && (
                                    <span className="text-[8px] font-bold bg-slate-100 text-slate-700 px-1 rounded truncate max-w-[60px]">
                                      {item.client}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {item.timeStr && (
                                    <span className="text-[9px] font-bold text-slate-500">
                                      {item.timeStr}
                                    </span>
                                  )}

                                  {isCompleted ? (
                                    <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1 rounded">
                                      ✓ Xong
                                    </span>
                                  ) : isLate ? (
                                    <span className="text-[8px] font-black text-rose-600 bg-rose-100 px-1 rounded animate-pulse">
                                      Trễ!
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {/* Tiêu đề sự kiện */}
                              <div className="font-bold text-[11px] text-slate-900 leading-snug line-clamp-2">
                                {item.title}
                              </div>

                              {/* Nhân sự phụ trách */}
                              <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500">
                                {isShoot ? (
                                  <span className="font-semibold text-indigo-700 truncate max-w-[85px]">
                                    🎥 {shooter?.name ? shooter.name.split(' ').slice(-1)[0] : 'An'}
                                  </span>
                                ) : isEdit ? (
                                  <span className="font-semibold text-amber-700 truncate max-w-[85px]">
                                    ✂️ {editor?.name ? editor.name.split(' ').slice(-1)[0] : 'Nam'}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-slate-600 truncate max-w-[85px]">
                                    ✍️ {writer?.name ? writer.name.split(' ').slice(-1)[0] : 'Mai'}
                                  </span>
                                )}

                                {item.score && (
                                  <span className="font-bold text-amber-600 flex items-center gap-0.5">
                                    ★{item.score.diem.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Ô NGÀY TRỐNG: NÚT "+ THÊM" */
                    <div
                      onClick={() => handleOpenAddModalForDay(cell.dayNumber, cell.dayOfWeek)}
                      className="flex-1 flex flex-col items-center justify-center cursor-pointer group py-4"
                    >
                      <div className="text-center text-slate-400 group-hover:text-purple-600 text-xs font-black transition flex items-center gap-1 bg-white/70 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 group-hover:border-purple-400">
                        <Plus className="w-3.5 h-3.5 text-purple-500" />
                        <span>+ Thêm</span>
                      </div>
                      <span className="text-[10px] text-slate-300 mt-1">—</span>
                    </div>
                  )}

                  {/* NÚT BẤM DƯỚI ĐÁY: "+ Thêm lịch" */}
                  {hasEvents && (
                    <div className="pt-1.5 mt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModalForDay(cell.dayNumber, cell.dayOfWeek);
                        }}
                        className="w-full text-center text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 py-1 rounded transition flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Thêm lịch ngày này</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- 4. GIAO DIỆN DANH SÁCH ---------------- */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-3">Ngày & Giờ</th>
                  <th className="py-3 px-3">Khách hàng</th>
                  <th className="py-3 px-3">Loại sự kiện</th>
                  <th className="py-3 px-3">Tiêu đề nội dung</th>
                  <th className="py-3 px-3">Người làm</th>
                  <th className="py-3 px-3">Thời hạn</th>
                  <th className="py-3 px-3 text-center">Nút Xong / Chưa Xong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeItems.map((item) => {
                  const writer = employees.find((e) => e.id === item.writerId);
                  const shooter = employees.find((e) => e.id === item.shooterId);
                  const editor = employees.find((e) => e.id === item.editorId);
                  const isLate = !item.isCompleted && item.editDeadline && item.editDeadline < todayStr;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {item.dayNumber} ({item.dayOfWeek})
                        <div className="text-[11px] font-normal text-slate-400">{item.timeStr || '10h30'}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {item.client || 'Agency'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.loai === 'Lịch quay'
                              ? 'bg-indigo-100 text-indigo-800'
                              : item.loai === 'Lịch edit'
                              ? 'bg-amber-100 text-amber-800'
                              : item.loai === 'Video'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.loai || 'Bài đăng'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900 max-w-xs">
                        {item.title}
                        {item.score && (
                          <span className="ml-2 text-emerald-600 text-xs font-semibold">
                            ⭐ {item.score.diem.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs text-slate-600">
                        <div>✍️ Content: <b>{writer?.name || 'Mai'}</b></div>
                        <div>🎥 Quay: <b>{shooter?.name || 'An'}</b></div>
                        <div>✂️ Edit: <b>{editor?.name || 'Nam'}</b></div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`font-bold ${isLate ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatDateVN(item.editDeadline)}
                        </span>
                        {isLate && <div className="text-[10px] text-rose-600 font-black">QUÁ HẠN!</div>}
                      </td>

                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleCompleted(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                            item.isCompleted
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {item.isCompleted ? '✓ ĐÃ XONG' : 'CHƯA XONG'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- 5. MODAL CHI TIẾT SỰ KIỆN ---------------- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-3 border-b border-slate-100 pr-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-2 py-0.5 rounded">
                  {selectedItem.dayOfWeek} · {selectedItem.dayNumber} ({selectedItem.timeStr || '10h30'})
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Khách hàng: {selectedItem.client}
                </span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  {selectedItem.loai || 'Sự kiện'}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                {selectedItem.title}
              </h3>
            </div>

            {/* NÚT TO BẢN: XONG / CHƯA XONG */}
            <div className="my-4">
              <button
                type="button"
                onClick={() => handleToggleCompleted(selectedItem)}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                  selectedItem.isCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 ring-4 ring-emerald-100'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>
                  {selectedItem.isCompleted ? '✓ ĐÃ HOÀN THÀNH XONG (BẤM ĐỔI)' : 'CHƯA XONG (BẤM ĐỂ ĐÁNH DẤU HOÀN THÀNH)'}
                </span>
              </button>
            </div>

            {/* PHÂN CÔNG & DEADLINE */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 mb-4">
              <span className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                👥 Phân Công Người Thực Hiện & Thời Hạn:
              </span>

              {/* 1. Content: a */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-slate-700">✍️ Content / Kịch bản:</span>
                <select
                  value={selectedItem.writerId || 'emp_ag_2'}
                  onChange={(e) => handleUpdateAssignment(selectedItem, 'writerId', e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
                >
                  {agencyStaff.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role.split('&')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Quay: b */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-slate-700">🎥 Quay phim:</span>
                <select
                  value={selectedItem.shooterId || 'emp_ag_1'}
                  onChange={(e) => handleUpdateAssignment(selectedItem, 'shooterId', e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
                >
                  {agencyStaff.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role.split('&')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Edit: B */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-slate-700">✂️ Edit video / Dựng:</span>
                <select
                  value={selectedItem.editorId || 'emp_ag_3'}
                  onChange={(e) => handleUpdateAssignment(selectedItem, 'editorId', e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
                >
                  {agencyStaff.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role.split('&')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Thời hạn */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>Thời hạn (Deadline):</span>
                  </span>
                  <input
                    type="date"
                    value={selectedItem.editDeadline || todayStr}
                    onChange={(e) => handleUpdateAssignment(selectedItem, 'editDeadline', e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 text-xs"
                  />
                </div>

                {!selectedItem.isCompleted && selectedItem.editDeadline && selectedItem.editDeadline < todayStr && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 font-black text-xs flex items-center gap-2 animate-bounce">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>CẢNH BÁO: ĐÃ QUÁ THỜI HẠN ({formatDateVN(selectedItem.editDeadline)}) MÀ CHƯA XONG!</span>
                  </div>
                )}
              </div>
            </div>

            {selectedItem.caption && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Nội dung Caption mẫu:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItem.caption || '');
                      setCopiedCaption(true);
                      setTimeout(() => setCopiedCaption(false), 2000);
                    }}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCaption ? 'Đã sao chép' : 'Sao chép caption'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                  {selectedItem.caption}
                </div>
              </div>
            )}

            {/* Bottom Actions: Xóa sự kiện & Đóng */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDeleteItemConfirmed(selectedItem.id)}
                className="py-2.5 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition"
                title="Xóa sự kiện này khỏi lịch"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa sự kiện này</span>
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                Đóng Chi Tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 6. MODAL THÊM LỊCH MỚI (CHỌN KHÁCH HÀNG & LOẠI LỊCH) ---------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full inline-block mb-1">
                📅 Thêm Sự Kiện Mới
              </span>
              <h3 className="font-black text-lg text-slate-900">
                Thêm Lịch Cho {addDayOfWeekInitial} - Ngày {addDayInitial}
              </h3>
              <p className="text-xs text-slate-500">
                Phân công Lịch quay, Lịch edit hoặc Bài đăng cho đúng khách hàng
              </p>
            </div>

            {/* CHỌN KHÁCH HÀNG CẦN THÊM LỊCH */}
            <div className="mb-3.5 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
              <label className="block text-xs font-bold text-purple-900 mb-1">
                🏢 Áp dụng cho Dự án / Khách hàng nào:
              </label>
              <select
                value={addEventClient}
                onChange={(e) => setAddEventClient(e.target.value)}
                className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-black text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.servicePackage || 'Gói Agency'})
                  </option>
                ))}
              </select>
            </div>

            {/* CHỌN LOẠI SỰ KIỆN */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn loại lịch:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setAddEventType('shoot')}
                  className={`py-2 px-2 rounded-xl text-xs font-black border transition flex flex-col items-center gap-1 ${
                    addEventType === 'shoot'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>🎬 Lịch Đi Quay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddEventType('edit')}
                  className={`py-2 px-2 rounded-xl text-xs font-black border transition flex flex-col items-center gap-1 ${
                    addEventType === 'edit'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Scissors className="w-4 h-4 text-amber-600" />
                  <span>✂️ Lịch Edit Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddEventType('post')}
                  className={`py-2 px-2 rounded-xl text-xs font-black border transition flex flex-col items-center gap-1 ${
                    addEventType === 'post'
                      ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4 text-orange-600" />
                  <span>📝 Bài Đăng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddEventType('other')}
                  className={`py-2 px-2 rounded-xl text-xs font-black border transition flex flex-col items-center gap-1 ${
                    addEventType === 'other'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>📌 Lịch Khác</span>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const title = form.title.value;
                if (!title) return;

                let loaiStr = 'Lịch quay';
                if (addEventType === 'edit') loaiStr = 'Lịch edit';
                else if (addEventType === 'post') loaiStr = form.mediaType?.value || 'Bài đăng';
                else if (addEventType === 'other') loaiStr = 'Khác';

                const newItem: ContentCalendarItem = {
                  id: `cal_event_${Date.now()}`,
                  title: title,
                  client: addEventClient || selectedProjectName || 'Feel Chicken',
                  channel: form.channel?.value || 'tiktok',
                  month: selectedMonth,
                  dayNumber: addDayInitial,
                  dayOfWeek: addDayOfWeekInitial,
                  timeStr: form.timeStr?.value || '09h00',
                  loai: loaiStr,
                  truc: 'series',
                  writerId: form.writerId?.value,
                  shooterId: form.shooterId?.value,
                  editorId: form.editorId?.value,
                  editDeadline: form.deadline?.value || todayStr,
                  shootDate: form.shootDate?.value || todayStr,
                  isCompleted: false,
                  notes: form.notes?.value || '',
                };

                onSaveItem(newItem);
                setShowAddModal(false);
                try {
                  confetti({ particleCount: 70, spread: 60 });
                } catch {}
                setNoticeMessage(
                  `✓ Đã thêm lịch mới cho khách hàng "${newItem.client}" vào ngày ${addDayInitial}!`
                );
                setTimeout(() => setNoticeMessage(''), 4500);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu đề công việc / sự kiện:
                </label>
                <input
                  name="title"
                  type="text"
                  placeholder={
                    addEventType === 'shoot'
                      ? 'VD: Đi quay video Mì Cay Hải Sản tại Cơ sở 2...'
                      : addEventType === 'edit'
                      ? 'VD: Edit video Soi Menu #01 hoàn thiện lồng nhạc...'
                      : 'VD: Bài đăng review gà rán giòn rụm...'
                  }
                  defaultValue={
                    addEventType === 'shoot'
                      ? `Lịch đi quay video cho ${addEventClient} (${addDayInitial})`
                      : addEventType === 'edit'
                      ? `Lịch edit video cho ${addEventClient} (${addDayInitial})`
                      : ''
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Khung giờ thực hiện:
                  </label>
                  <select
                    name="timeStr"
                    defaultValue={addEventType === 'shoot' ? '09h00' : '14h00'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                  >
                    <option value="08h30">08h30 Sáng</option>
                    <option value="09h00">09h00 Sáng</option>
                    <option value="10h30">10h30 Sáng</option>
                    <option value="14h00">14h00 Chiều</option>
                    <option value="16h30">16h30 Chiều</option>
                    <option value="18h00">18h00 Tối</option>
                    <option value="20h00">20h00 Tối</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Thời hạn hoàn thành (Deadline):
                  </label>
                  <input
                    name="deadline"
                    type="date"
                    defaultValue={todayStr}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Phân công nhân sự */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-black text-slate-700 block uppercase">
                  👥 Phân công nhân sự thực hiện:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Content (a):</label>
                    <select
                      name="writerId"
                      defaultValue={agencyStaff[1]?.id || ''}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-xs text-slate-800"
                    >
                      {agencyStaff.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Quay (b):</label>
                    <select
                      name="shooterId"
                      defaultValue={agencyStaff[0]?.id || ''}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-xs text-slate-800"
                    >
                      {agencyStaff.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">Edit (B):</label>
                    <select
                      name="editorId"
                      defaultValue={agencyStaff[2]?.id || ''}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-xs text-slate-800"
                    >
                      {agencyStaff.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Kênh & Ghi chú */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kênh phát hành:</label>
                  <select
                    name="channel"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook Fanpage</option>
                    <option value="youtube">YouTube Shorts</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ghi chú / Địa điểm:
                  </label>
                  <input
                    name="notes"
                    type="text"
                    placeholder="VD: Quay tại cơ sở 1, chuẩn bị mic và đèn..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>XÁC NHẬN THÊM LỊCH</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 7.2 MODAL CHỈNH SỬA DỰ ÁN / KHÁCH HÀNG (CHỈ ADMIN) ---------------- */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in">
            <button
              onClick={() => setEditingProject(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
                👑 Quản Trị Viên (Admin)
              </span>
              <h3 className="font-black text-lg text-slate-900">
                Chỉnh Sửa Dự Án: {editingProject.name}
              </h3>
              <p className="text-xs text-slate-500">
                Admin có quyền điều chỉnh ngân sách hợp đồng (VD: từ 15tr lên 20tr), tăng KPI bài viết/video, và cập nhật thông tin khách hàng.
              </p>
            </div>

            <form onSubmit={handleEditProjectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Thương Hiệu / Khách Hàng (*):
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingProject.name}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Người liên hệ / Chủ thương hiệu:
                  </label>
                  <input
                    name="clientContact"
                    type="text"
                    defaultValue={editingProject.clientContact || ''}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số điện thoại / Zalo:
                  </label>
                  <input
                    name="phone"
                    type="text"
                    defaultValue={editingProject.phone || ''}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Gói dịch vụ hợp đồng:
                </label>
                <input
                  name="servicePackage"
                  type="text"
                  defaultValue={editingProject.servicePackage || 'Gói Content & Video TikTok'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              {/* Ngân Sách & Mục tiêu KPI (Trọng tâm yêu cầu: Khách muốn tăng từ 15tr lên 20tr) */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                <span className="text-[11px] font-black text-amber-900 block uppercase tracking-wide">
                  💰 Ngân Sách Hợp Đồng & Chỉ Tiêu KPI Tháng:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">
                      Phí dịch vụ tháng (VNĐ):
                    </label>
                    <input
                      name="monthlyRetainer"
                      type="number"
                      defaultValue={editingProject.monthlyRetainer || 15000000}
                      step={1000000}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-black text-amber-950 text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 mb-1">
                      Mục tiêu KPI (Số bài/tháng):
                    </label>
                    <input
                      name="targetPostsPerMonth"
                      type="number"
                      defaultValue={editingProject.targetPostsPerMonth || 20}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-black text-amber-950 text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trạng thái hợp đồng:
                  </label>
                  <select
                    name="status"
                    defaultValue={editingProject.status || 'active'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="active">Đang triển khai (Active)</option>
                    <option value="paused">Tạm dừng (Paused)</option>
                    <option value="completed">Đã kết thúc hợp đồng</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Màu nhận diện thương hiệu:
                  </label>
                  <select
                    name="color"
                    defaultValue={editingProject.color || '#ea580c'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="#ea580c">🟠 Cam (F&B / Đồ Ăn)</option>
                    <option value="#0284c7">🔵 Xanh Nước Biển (Trà Sữa / Tech)</option>
                    <option value="#8b5cf6">🟣 Tím Sang Trọng</option>
                    <option value="#059669">🟢 Xanh Ngọc (Nha Khoa / Spa)</option>
                    <option value="#e11d48">🔴 Đỏ Nổi Bật</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú định hướng thương hiệu / Tone giọng:
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingProject.notes || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                {onDeleteProject && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${editingProject.name}" không?`)) {
                        onDeleteProject(editingProject.id);
                        setEditingProject(null);
                        setSelectedProjectName('all');
                        setNoticeMessage('Đã xóa dự án thành công.');
                        setTimeout(() => setNoticeMessage(''), 3000);
                      }
                    }}
                    className="py-3 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1"
                    title="Xóa dự án này"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>LƯU THAY ĐỔI DỰ ÁN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 7. MODAL TẠO DỰ ÁN / KHÁCH HÀNG MỚI (CHÍNH THEO YÊU CẦU CỦA BẠN) ---------------- */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in">
            <button
              onClick={() => setShowCreateProjectModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
                🏢 Tạo Khách Hàng Mới
              </span>
              <h3 className="font-black text-lg text-slate-900">
                Thêm Dự Án / Khách Hàng Agency Mới
              </h3>
              <p className="text-xs text-slate-500">
                Tạo một dự án độc lập để quản lý riêng biệt cho khách hàng mới, không bị lẫn lộn lịch trình.
              </p>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Thương Hiệu / Khách Hàng (*):
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="VD: Gà Nướng Ba Hưng, Trà Sữa KOI Thé, Spa Vivian..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Người liên hệ / Chủ thương hiệu:
                  </label>
                  <input
                    name="clientContact"
                    type="text"
                    placeholder="VD: Anh Hưng (Chủ quán)..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số điện thoại / Zalo:
                  </label>
                  <input
                    name="phone"
                    type="text"
                    placeholder="VD: 0912345678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Gói dịch vụ hợp đồng:
                </label>
                <input
                  name="servicePackage"
                  type="text"
                  defaultValue="Gói Content & Video TikTok 20 bài/tháng"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngân sách / Phí tháng (VNĐ):
                  </label>
                  <input
                    name="monthlyRetainer"
                    type="number"
                    defaultValue={15000000}
                    step={1000000}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mục tiêu KPI (Số bài/tháng):
                  </label>
                  <input
                    name="targetPostsPerMonth"
                    type="number"
                    defaultValue={20}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày bắt đầu hợp đồng:
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={todayStr}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Màu nhận diện thương hiệu:
                  </label>
                  <select
                    name="color"
                    defaultValue="#8b5cf6"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="#8b5cf6">🟣 Tím Sang Trọng</option>
                    <option value="#ea580c">🟠 Cam Năng Động (F&B / Đồ Ăn)</option>
                    <option value="#0284c7">🔵 Xanh Nước Biển (Trà Sữa / Tech)</option>
                    <option value="#059669">🟢 Xanh Lá / Ngọc (Nha Khoa / Spa)</option>
                    <option value="#e11d48">🔴 Đỏ Nổi Bật</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú định hướng thương hiệu / Tone giọng:
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="VD: Tone giọng trẻ trung, bắt trend TikTok, tập trung quay món ăn nóng giòn..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>TẠO DỰ ÁN NGAY</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 7.2 MODAL CHỈNH SỬA DỰ ÁN / KHÁCH HÀNG (CHỈ ADMIN) ---------------- */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in">
            <button
              onClick={() => setEditingProject(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
                👑 Quản Trị Viên (Admin)
              </span>
              <h3 className="font-black text-lg text-slate-900">
                Chỉnh Sửa Dự Án: {editingProject.name}
              </h3>
              <p className="text-xs text-slate-500">
                Admin có quyền điều chỉnh ngân sách hợp đồng (VD: từ 15tr lên 20tr), tăng KPI bài viết/video, và cập nhật thông tin khách hàng.
              </p>
            </div>

            <form onSubmit={handleEditProjectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Thương Hiệu / Khách Hàng (*):
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingProject.name}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Người liên hệ / Chủ thương hiệu:
                  </label>
                  <input
                    name="clientContact"
                    type="text"
                    defaultValue={editingProject.clientContact || ''}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số điện thoại / Zalo:
                  </label>
                  <input
                    name="phone"
                    type="text"
                    defaultValue={editingProject.phone || ''}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Gói dịch vụ hợp đồng:
                </label>
                <input
                  name="servicePackage"
                  type="text"
                  defaultValue={editingProject.servicePackage || 'Gói Content & Video TikTok'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                />
              </div>

              {/* Ngân Sách & Mục tiêu KPI (Trọng tâm yêu cầu: Khách muốn tăng từ 15tr lên 20tr) */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                <span className="text-[11px] font-black text-amber-900 block uppercase tracking-wide">
                  💰 Ngân Sách Hợp Đồng & Chỉ Tiêu KPI Tháng:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1">
                      Phí dịch vụ tháng (VNĐ):
                    </label>
                    <input
                      name="monthlyRetainer"
                      type="number"
                      defaultValue={editingProject.monthlyRetainer || 15000000}
                      step={1000000}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-black text-amber-950 text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-900 mb-1">
                      Mục tiêu KPI (Số bài/tháng):
                    </label>
                    <input
                      name="targetPostsPerMonth"
                      type="number"
                      defaultValue={editingProject.targetPostsPerMonth || 20}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-black text-amber-950 text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trạng thái hợp đồng:
                  </label>
                  <select
                    name="status"
                    defaultValue={editingProject.status || 'active'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="active">Đang triển khai (Active)</option>
                    <option value="paused">Tạm dừng (Paused)</option>
                    <option value="completed">Đã kết thúc hợp đồng</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Màu nhận diện thương hiệu:
                  </label>
                  <select
                    name="color"
                    defaultValue={editingProject.color || '#ea580c'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  >
                    <option value="#ea580c">🟠 Cam (F&B / Đồ Ăn)</option>
                    <option value="#0284c7">🔵 Xanh Nước Biển (Trà Sữa / Tech)</option>
                    <option value="#8b5cf6">🟣 Tím Sang Trọng</option>
                    <option value="#059669">🟢 Xanh Ngọc (Nha Khoa / Spa)</option>
                    <option value="#e11d48">🔴 Đỏ Nổi Bật</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú định hướng thương hiệu / Tone giọng:
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingProject.notes || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                {onDeleteProject && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${editingProject.name}" không?`)) {
                        onDeleteProject(editingProject.id);
                        setEditingProject(null);
                        setSelectedProjectName('all');
                        setNoticeMessage('Đã xóa dự án thành công.');
                        setTimeout(() => setNoticeMessage(''), 3000);
                      }
                    }}
                    className="py-3 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1"
                    title="Xóa dự án này"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>LƯU THAY ĐỔI DỰ ÁN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 8. MODAL NẠP KẾ HOẠCH (EXCEL, GOOGLE SHEET & HTML) ---------------- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-base sm:text-lg text-slate-900 mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              <span>Nạp Kế Hoạch Content Calendar Vào Lịch</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Hỗ trợ nạp từ File Excel, Link Google Sheet trực tiếp hoặc File HTML của AI
            </p>

            {/* CHỌN KHÁCH HÀNG ĐỂ NẠP */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nạp vào Dự án / Khách hàng:
              </label>
              <select
                value={importTargetClient}
                onChange={(e) => setImportTargetClient(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3 Tabs chọn cách nạp */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                onClick={() => setImportTab('excel')}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  importTab === 'excel'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>File Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => setImportTab('sheet')}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  importTab === 'sheet'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Link Google Sheet</span>
              </button>

              <button
                onClick={() => setImportTab('html')}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  importTab === 'html'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-purple-600" />
                <span>File HTML / Mẫu AI</span>
              </button>
            </div>

            {/* TAB 1: FILE EXCEL (.XLSX) */}
            {importTab === 'excel' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-black text-emerald-900 block mb-1 text-sm">
                    Tải lên file Excel (.xlsx / .xls / .csv)
                  </span>
                  <p className="text-slate-600 mb-3">
                    Chọn file bảng tính từ máy tính hoặc điện thoại. Hệ thống sẽ tự động quét các cột Tiêu đề, Ngày, Giờ, Content, Quay, Edit, Thời hạn và nạp vào khách hàng "{importTargetClient}"!
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Chưa có file mẫu?</span>
                    <span className="text-[11px] text-slate-500">Tải file Excel mẫu chuẩn đầy đủ cột về nhập</span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleExcelTemplate}
                    className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tải Mẫu Excel</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: LINK GOOGLE SHEET TRỰC TIẾP */}
            {importTab === 'sheet' && (
              <form onSubmit={handleImportGoogleSheet} className="space-y-3.5 text-xs">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <span className="font-black text-blue-900 block text-sm">
                    Dán đường link Google Sheet:
                  </span>
                  <p className="text-slate-600">
                    Phần mềm sẽ tự động kết nối và kéo toàn bộ kế hoạch nội dung từ Google Sheet về máy của bạn cho khách hàng "{importTargetClient}"!
                  </p>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit?usp=sharing"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <div className="p-2 bg-white/80 rounded-lg text-[11px] text-blue-800 border border-blue-100">
                    💡 <b>Lưu ý nhỏ:</b> Hãy mở Google Sheet, bấm nút <b>Chia sẻ (Share)</b> ở góc trên và chọn <b>"Bất kỳ ai có đường liên kết đều có thể xem"</b> nhé.
                  </div>
                </div>

                {sheetError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{sheetError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isFetchingSheet}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isFetchingSheet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kết nối & tải dữ liệu từ Google Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>KẾT NỐI & NẠP LÊN LỊCH NGAY</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 3: FILE HTML TỪ AI AGENT / MẪU FEEL CHICKEN */}
            {importTab === 'html' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="font-black text-purple-900 block mb-1 text-sm">
                    Nạp nhanh 25 sự kiện Feel Chicken có sẵn
                  </span>
                  <p className="text-slate-600 mb-3">
                    Bao gồm 23 bài content và các sự kiện Lịch quay & Edit video ngày Thứ 2!
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadFeelChicken}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition"
                  >
                    🍗 BẤM NẠP 25 SỰ KIỆN FEEL CHICKEN NGAY
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">
                    Hoặc chọn file HTML khác từ máy tính:
                  </span>
                  <input
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowImportModal(false)}
              className="w-full mt-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-100"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
