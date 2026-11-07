import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  CompanyId,
  Employee,
  AttendanceRecord,
  ConstructionSite,
  AgencyTask,
  ContentCalendarItem,
  AgencyProject,
  AgencyRateConfig,
  SiteMaterials,
} from './types';
import {
  loadEmployees,
  saveEmployees,
  loadSites,
  saveSites,
  loadTasks,
  saveTasks,
  loadAttendance,
  saveAttendance,
  loadCalendar,
  saveCalendar,
  loadAgencyProjects,
  saveAgencyProjects,
  loadAgencyRates,
  loadMaterials,
  saveMaterials,
  pullRemote,
  syncCollection,
  hasPendingSync,
  cacheCollectionLocally,
  getSyncVersion,
  markSeedDone,
  markRemoteSeeded,
  saveAgencyRates,
  getStoredOmniRouterConfig,
} from './services/db';

import { resolveBotUrl } from './services/zaloService';
import { Header } from './components/Header';
import { AuraBackground } from './components/AuraBackground';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { WorkProgressManager } from './components/WorkProgressManager';
import { AgencyContentCalendar } from './components/AgencyContentCalendar';
import { ConstructionScheduleTracker } from './components/ConstructionScheduleTracker';
import { MaterialManager } from './components/MaterialManager';
import { StaffAndWageManager } from './components/StaffAndWageManager';
import { PayrollManager } from './components/PayrollManager';
import { SupabaseModal } from './components/SupabaseModal';
import { IphoneGuideModal } from './components/IphoneGuideModal';
import { AIReportingModal } from './components/AIReportingModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { isAdminLoggedIn, logoutAdmin } from './services/auth';

import {
  LayoutDashboard,
  Clock,
  Layers,
  Users,
  DollarSign,
  Calendar,
  Hammer,
  Package,
} from 'lucide-react';

export function App() {
  const [currentCompany, setCurrentCompany] = useState<CompanyId>(() => {
    const saved = localStorage.getItem('app_current_company');
    return (saved as CompanyId) || 'agency';
  });

  // Current active tab
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'calendar' | 'schedule' | 'materials' | 'attendance' | 'progress' | 'staff' | 'payroll'
  >('dashboard');

  // Modals
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isIphoneGuideOpen, setIsIphoneGuideOpen] = useState(false);
  const [isAIReportModalOpen, setIsAIReportModalOpen] = useState(false);
  const [aiReportInitialTab, setAiReportInitialTab] = useState<'command' | 'schedule' | 'payroll' | 'progress' | 'settings'>('command');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const handleOpenAIAgent = (tab: 'command' | 'schedule' | 'payroll' | 'progress' | 'settings' = 'command') => {
    setAiReportInitialTab(tab);
    setIsAIReportModalOpen(true);
  };

  // Admin Role State
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminLoggedIn);

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
  };

  const handleRequireAdmin = () => {
    setIsAdminModalOpen(true);
  };

  // App data state
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [sites, setSites] = useState<ConstructionSite[]>(loadSites);
  const [tasks, setTasks] = useState<AgencyTask[]>(loadTasks);
  const [agencyProjects, setAgencyProjects] = useState<AgencyProject[]>(loadAgencyProjects);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(loadAttendance);
  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>(loadCalendar);
  const [agencyRates, setAgencyRates] = useState<AgencyRateConfig>(loadAgencyRates);
  const [materials, setMaterials] = useState<SiteMaterials[]>(loadMaterials);

  // Đồng bộ Supabase: tải khi mở app, tải lại mỗi 20 giây và khi quay lại tab.
  const localRef = useRef({ employees, sites, tasks, agencyProjects, attendance, calendarItems, agencyRates, materials });
  localRef.current = { employees, sites, tasks, agencyProjects, attendance, calendarItems, agencyRates, materials };
  useEffect(() => {
    let cancelled = false;
    let first = true;
    const refresh = async () => {
      const versionBefore = getSyncVersion();
      const remote = await pullRemote();
      if (!remote || cancelled || hasPendingSync() || getSyncVersion() !== versionBefore) return;
      const local = localRef.current;
      const apply = <T extends { id: string }>(
        name: 'employees' | 'sites' | 'tasks' | 'attendance' | 'calendar' | 'projects' | 'materials',
        localItems: T[],
        setter: (v: T[]) => void
      ) => {
        const remoteItems = remote[name] as T[];
        if (remoteItems.length === 0) {
          if (!remote.seeded) {
            // Lần khởi tạo đầu tiên: Supabase còn trống thì đẩy dữ liệu đang có trên máy lên.
            if (first && localItems.length > 0) void syncCollection(name, localItems);
          } else if (localItems.length > 0) {
            // Đã khởi tạo: Supabase rỗng nghĩa là đã bị xoá hết, theo đó.
            cacheCollectionLocally(name, []);
            setter([]);
          }
          return;
        }
        if (JSON.stringify(remoteItems) !== JSON.stringify(localItems)) {
          cacheCollectionLocally(name, remoteItems);
          setter(remoteItems);
        }
      };
      apply('employees', local.employees, setEmployees);
      apply('sites', local.sites, setSites);
      apply('tasks', local.tasks, setTasks);
      apply('attendance', local.attendance, setAttendance);
      apply('calendar', local.calendarItems, setCalendarItems);
      apply('projects', local.agencyProjects, setAgencyProjects);
      apply('materials', local.materials, setMaterials);
      const r = remote.rates[0];
      if (!r) {
        if (first && !remote.seeded) void syncCollection('rates', [{ id: 'default', ...local.agencyRates }]);
      } else if (
        r.contentRate !== local.agencyRates.contentRate ||
        r.shootRate !== local.agencyRates.shootRate ||
        r.editRate !== local.agencyRates.editRate
      ) {
        const rates = { contentRate: r.contentRate, shootRate: r.shootRate, editRate: r.editRate };
        cacheCollectionLocally('rates', [rates]);
        setAgencyRates(rates);
      }
      if (first) {
        markSeedDone();
        if (!remote.seeded) void markRemoteSeeded();
      }
      first = false;
    };
    void refresh();
    const timer = window.setInterval(refresh, 20000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Tự động đồng bộ cấu hình AI Gemini sang Bot Zalo port 5005
  useEffect(() => {
    try {
      const cfg = getStoredOmniRouterConfig();
      if (cfg.apiKey) {
        fetch('http://localhost:5005/webhook/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg),
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const handleSaveAgencyRates = (rates: AgencyRateConfig) => {
    setAgencyRates(rates);
    saveAgencyRates(rates);
  };

  // Switch company handler
  const handleSwitchCompany = (company: CompanyId) => {
    setCurrentCompany(company);
    localStorage.setItem('app_current_company', company);
    // Khi đổi công ty, nếu đang ở tab chuyên biệt thì về dashboard hoặc tab tương ứng
    if (currentTab === 'calendar' && company === 'lam_song') {
      setCurrentTab('schedule');
    } else if ((currentTab === 'schedule' || currentTab === 'materials') && company === 'agency') {
      setCurrentTab('calendar');
    }
  };

  // --- Handlers for Attendance ---
  const handleSaveAttendance = (record: AttendanceRecord) => {
    const key = `${record.employeeId}_${record.date}`;
    const filtered = attendance.filter((a) => a.id !== record.id && `${a.employeeId}_${a.date}` !== key);
    const updated = [record, ...filtered];
    setAttendance(updated);
    saveAttendance(updated);
  };

  const handleSaveBatchAttendance = (records: AttendanceRecord[]) => {
    const newKeys = new Set(records.map((r) => `${r.employeeId}_${r.date}`));
    const remaining = attendance.filter((a) => !newKeys.has(`${a.employeeId}_${a.date}`));
    const updated = [...records, ...remaining];
    setAttendance(updated);
    saveAttendance(updated);
  };

  const handleDeleteAttendance = (id: string) => {
    const updated = attendance.filter((a) => a.id !== id);
    setAttendance(updated);
    saveAttendance(updated);
  };

  // --- Handlers for Sites (Lam Sóng) ---
  const handleSaveSite = (site: ConstructionSite) => {
    const exists = sites.some((s) => s.id === site.id);
    const updated = exists ? sites.map((s) => (s.id === site.id ? site : s)) : [site, ...sites];
    setSites(updated);
    saveSites(updated);
  };

  const handleDeleteSite = (id: string) => {
    const updated = sites.filter((s) => s.id !== id);
    setSites(updated);
    saveSites(updated);
  };

  // Lắng nghe và đồng bộ tự động 2 chiều từ Zalo Bot (port 5005)
  useEffect(() => {
    let isCancelled = false;
    const pollZaloActions = async () => {
      try {
        const res = await fetch(resolveBotUrl('http://localhost:5005/api/pending-actions'));
        if (!res.ok) return;
        const actions = await res.json();
        if (Array.isArray(actions) && actions.length > 0 && !isCancelled) {
          const consumedIds: string[] = [];
          for (const act of actions) {
            if (act.type === 'create_site' && act.site) {
              setSites((prev) => {
                const siteAddress = (act.site.address || '').toLowerCase().trim();
                const siteName = (act.site.name || '').toLowerCase().trim();
                const exists = prev.some(
                  (s) =>
                    s.id === act.site.id ||
                    (siteAddress && s.address.toLowerCase().trim() === siteAddress) ||
                    (siteName && s.name.toLowerCase().trim() === siteName)
                );
                if (exists) return prev;
                const next = [act.site, ...prev];
                saveSites(next);
                return next;
              });
              consumedIds.push(act.id);
            }
          }
          if (consumedIds.length > 0) {
            await fetch(resolveBotUrl('http://localhost:5005/api/pending-actions/consume'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: consumedIds }),
            }).catch(() => {});
            try { confetti({ particleCount: 60, spread: 60 }); } catch {}
          }
        }
      } catch {}
    };

    pollZaloActions();
    const interval = setInterval(pollZaloActions, 2500);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // --- Handlers for Materials (Lam Sóng) ---
  const handleSaveMaterials = (record: SiteMaterials) => {
    const exists = materials.some((m) => m.id === record.id);
    const updated = exists ? materials.map((m) => (m.id === record.id ? record : m)) : [record, ...materials];
    setMaterials(updated);
    saveMaterials(updated);
  };

  // --- Handlers for Content Calendar (Agency) ---
  const handleSaveCalendarItem = (item: ContentCalendarItem) => {
    const exists = calendarItems.some((c) => c.id === item.id);
    const updated = exists
      ? calendarItems.map((c) => (c.id === item.id ? item : c))
      : [item, ...calendarItems];
    setCalendarItems(updated);
    saveCalendar(updated);
  };

  const handleDeleteCalendarItem = (id: string) => {
    const updated = calendarItems.filter((c) => c.id !== id);
    setCalendarItems(updated);
    saveCalendar(updated);
  };

  const handleBatchImportCalendar = (items: ContentCalendarItem[]) => {
    const itemIds = new Set(items.map((i) => i.id));
    const remaining = calendarItems.filter((c) => !itemIds.has(c.id));
    const updated = [...items, ...remaining];
    setCalendarItems(updated);
    saveCalendar(updated);
  };

  // --- Handlers for Agency Projects (Khách Hàng) ---
  const handleSaveAgencyProject = (project: AgencyProject) => {
    const exists = agencyProjects.some((p) => p.id === project.id);
    const updated = exists
      ? agencyProjects.map((p) => (p.id === project.id ? project : p))
      : [project, ...agencyProjects];
    setAgencyProjects(updated);
    saveAgencyProjects(updated);
  };

  const handleDeleteAgencyProject = (id: string) => {
    const updated = agencyProjects.filter((p) => p.id !== id);
    setAgencyProjects(updated);
    saveAgencyProjects(updated);
  };

  const handleClearAllAgencyData = () => {
    setAgencyProjects([]);
    saveAgencyProjects([]);
    setCalendarItems([]);
    saveCalendar([]);
  };

  // --- Handlers for Tasks (Agency) ---
  const handleSaveTask = (task: AgencyTask) => {
    const exists = tasks.some((t) => t.id === task.id);
    const updated = exists ? tasks.map((t) => (t.id === task.id ? task : t)) : [task, ...tasks];
    setTasks(updated);
    saveTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
  };

  // --- Handlers for Employees & Wages ---
  const handleSaveEmployee = (emp: Employee) => {
    const exists = employees.some((e) => e.id === emp.id);
    const updated = exists ? employees.map((e) => (e.id === emp.id ? emp : e)) : [...employees, emp];
    setEmployees(updated);
    saveEmployees(updated);
  };

  const handleDeleteEmployee = (id: string) => {
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    saveEmployees(updated);
  };

  const isAgency = currentCompany === 'agency';

  return (
    <AuraBackground>
      {/* 1. Header with Company Switcher & Tools */}
      <Header
        currentCompany={currentCompany}
        isAdmin={isAdmin}
        onSwitchCompany={handleSwitchCompany}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenMobileGuide={() => setIsIphoneGuideOpen(true)}
        onOpenAIReportModal={() => handleOpenAIAgent('schedule')}
        onOpenAdminLogin={() => setIsAdminModalOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {/* 2. Tablet & Desktop Navigation Tab Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 hidden md:block">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
          <nav className="flex space-x-3 lg:space-x-6 text-xs lg:text-sm font-bold overflow-x-auto no-scrollbar">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Tổng Quan</span>
            </button>

            {/* TAB CHUYÊN BIỆT AGENCY: KẾ HOẠCH NỘI DUNG */}
            {isAgency && (
              <button
                onClick={() => setCurrentTab('calendar')}
                className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                  currentTab === 'calendar'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Kế Hoạch</span>
              </button>
            )}

            {/* TAB CHUYÊN BIỆT LAM SÓNG: DỰ TÍNH VS THỰC TẾ & LỊCH ĐIỀU THỢ */}
            {!isAgency && (
              <button
                onClick={() => setCurrentTab('schedule')}
                className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                  currentTab === 'schedule'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Hammer className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Lịch Thợ & Dự Tính vs Thực Tế</span>
              </button>
            )}

            {/* TAB VẬT TƯ ỐP TƯỜNG */}
            {!isAgency && (
              <button
                onClick={() => setCurrentTab('materials')}
                className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                  currentTab === 'materials'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Vật Tư & Hao Hụt</span>
              </button>
            )}

            <button
              onClick={() => setCurrentTab('attendance')}
              className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                currentTab === 'attendance'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Chấm Công & Điểm Danh</span>
            </button>

            <button
              onClick={() => setCurrentTab('progress')}
              className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                currentTab === 'progress'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>{isAgency ? 'Tasks Kanban' : 'Tiến Độ m² & Ảnh'}</span>
            </button>

            <button
              onClick={() => setCurrentTab('staff')}
              className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                currentTab === 'staff'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Nhân Sự & Tiền Công</span>
            </button>

            <button
              onClick={() => setCurrentTab('payroll')}
              className={`py-3 lg:py-3.5 border-b-2 transition flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                currentTab === 'payroll'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Tính Lương & Xuất Excel</span>
            </button>
          </nav>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            currentCompany={currentCompany}
            employees={employees}
            attendance={attendance}
            sites={sites}
            tasks={tasks}
            calendar={calendarItems}
            agencyRates={agencyRates}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
            onOpenAIAgent={handleOpenAIAgent}
          />
        )}

        {/* Màn hình Content Calendar cho Agency */}
        {currentTab === 'calendar' && (
          <AgencyContentCalendar
            calendarItems={calendarItems}
            employees={employees}
            projects={agencyProjects}
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
            onSaveItem={handleSaveCalendarItem}
            onDeleteItem={handleDeleteCalendarItem}
            onBatchImport={handleBatchImportCalendar}
            onSaveProject={handleSaveAgencyProject}
            onDeleteProject={handleDeleteAgencyProject}
            onClearAll={handleClearAllAgencyData}
          />
        )}

        {/* Màn hình Lịch Thợ & Dự tính vs Thực tế cho Lam Sóng */}
        {currentTab === 'schedule' && (
          <ConstructionScheduleTracker
            sites={sites}
            employees={employees}
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
            onSaveSite={handleSaveSite}
            onDeleteSite={handleDeleteSite}
          />
        )}

        {currentTab === 'materials' && !isAgency && (
          <MaterialManager
            sites={sites}
            materials={materials}
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
            onSaveMaterials={handleSaveMaterials}
          />
        )}

        {currentTab === 'attendance' && (
          <AttendanceManager
            currentCompany={currentCompany}
            employees={employees}
            sites={sites}
            attendance={attendance}
            agencyRates={agencyRates}
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
            onSaveAttendance={handleSaveAttendance}
            onSaveBatchAttendance={handleSaveBatchAttendance}
            onDeleteAttendance={handleDeleteAttendance}
          />
        )}

        {currentTab === 'progress' && (
          <WorkProgressManager
            currentCompany={currentCompany}
            sites={sites}
            tasks={tasks}
            employees={employees}
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
            onSaveSite={handleSaveSite}
            onSaveTask={handleSaveTask}
            onDeleteSite={handleDeleteSite}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {currentTab === 'staff' && (
          <StaffAndWageManager
            currentCompany={currentCompany}
            employees={employees}
            agencyRates={agencyRates}
            onSaveAgencyRates={handleSaveAgencyRates}
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {currentTab === 'payroll' && (
          <PayrollManager
            currentCompany={currentCompany}
            employees={employees}
            attendance={attendance}
            calendarItems={calendarItems}
            agencyRates={agencyRates}
            onSaveAgencyRates={handleSaveAgencyRates}
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
            onOpenAIAgent={handleOpenAIAgent}
          />
        )}
      </main>

      {/* 4. Mobile Bottom Navigation Bar (Full 6 Tabs) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg md:hidden pb-safe">
        <div className={`grid ${isAgency ? 'grid-cols-6' : 'grid-cols-7'} text-center py-1.5 px-0.5`}>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
              currentTab === 'dashboard'
                ? isAgency
                  ? 'text-purple-600 bg-purple-50/70'
                  : 'text-orange-600 bg-orange-50/70'
                : 'text-slate-500 active:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate max-w-full px-0.5">Tổng quan</span>
          </button>

          {/* Nút chuyên biệt theo công ty */}
          {isAgency ? (
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
                currentTab === 'calendar'
                  ? 'text-purple-600 bg-purple-50/70'
                  : 'text-slate-500 active:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate max-w-full px-0.5">Kế hoạch</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('schedule')}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
                currentTab === 'schedule'
                  ? 'text-orange-600 bg-orange-50/70'
                  : 'text-slate-500 active:bg-slate-100'
              }`}
            >
              <Hammer className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate max-w-full px-0.5">Lịch thợ</span>
            </button>
          )}

          {!isAgency && (
            <button
              onClick={() => setCurrentTab('materials')}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
                currentTab === 'materials'
                  ? 'text-orange-600 bg-orange-50/70'
                  : 'text-slate-500 active:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate max-w-full px-0.5">Vật tư</span>
            </button>
          )}

          <button
            onClick={() => setCurrentTab('attendance')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
              currentTab === 'attendance'
                ? isAgency
                  ? 'text-purple-600 bg-purple-50/70'
                  : 'text-orange-600 bg-orange-50/70'
                : 'text-slate-500 active:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate max-w-full px-0.5">Chấm công</span>
          </button>

          <button
            onClick={() => setCurrentTab('progress')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
              currentTab === 'progress'
                ? isAgency
                  ? 'text-purple-600 bg-purple-50/70'
                  : 'text-orange-600 bg-orange-50/70'
                : 'text-slate-500 active:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate max-w-full px-0.5">{isAgency ? 'Kanban' : 'Tiến độ'}</span>
          </button>

          <button
            onClick={() => setCurrentTab('staff')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
              currentTab === 'staff'
                ? isAgency
                  ? 'text-purple-600 bg-purple-50/70'
                  : 'text-orange-600 bg-orange-50/70'
                : 'text-slate-500 active:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate max-w-full px-0.5">Nhân sự</span>
          </button>

          <button
            onClick={() => setCurrentTab('payroll')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold transition ${
              currentTab === 'payroll'
                ? isAgency
                  ? 'text-purple-600 bg-purple-50/70'
                  : 'text-orange-600 bg-orange-50/70'
                : 'text-slate-500 active:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate max-w-full px-0.5">Lương</span>
          </button>
        </div>
      </div>

      {/* 5. Modals */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <IphoneGuideModal
        isOpen={isIphoneGuideOpen}
        onClose={() => setIsIphoneGuideOpen(false)}
      />

      <AIReportingModal
        isOpen={isAIReportModalOpen}
        onClose={() => setIsAIReportModalOpen(false)}
        employees={employees}
        sites={sites}
        calendar={calendarItems}
        tasks={tasks}
        attendance={attendance}
        agencyRates={agencyRates}
        initialTab={aiReportInitialTab}
        onSaveSite={handleSaveSite}
      />

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        isAdmin={isAdmin}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        onLogout={handleAdminLogout}
      />
    </AuraBackground>
  );
}

export default App;
