import React, { useState } from 'react';
import {
  CompanyId,
  Employee,
  AttendanceRecord,
  ConstructionSite,
  AgencyTask,
  ContentCalendarItem,
  AgencyProject,
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
} from './services/db';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { WorkProgressManager } from './components/WorkProgressManager';
import { AgencyContentCalendar } from './components/AgencyContentCalendar';
import { ConstructionScheduleTracker } from './components/ConstructionScheduleTracker';
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
  Bot
} from 'lucide-react';

export function App() {
  const [currentCompany, setCurrentCompany] = useState<CompanyId>(() => {
    const saved = localStorage.getItem('app_current_company');
    return (saved as CompanyId) || 'agency';
  });

  // Current active tab
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'calendar' | 'schedule' | 'attendance' | 'progress' | 'staff' | 'payroll'
  >('dashboard');

  // Modals
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isIphoneGuideOpen, setIsIphoneGuideOpen] = useState(false);
  const [isAIReportModalOpen, setIsAIReportModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

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

  // Switch company handler
  const handleSwitchCompany = (company: CompanyId) => {
    setCurrentCompany(company);
    localStorage.setItem('app_current_company', company);
    // Khi đổi công ty, nếu đang ở tab chuyên biệt thì về dashboard hoặc tab tương ứng
    if (currentTab === 'calendar' && company === 'lam_song') {
      setCurrentTab('schedule');
    } else if (currentTab === 'schedule' && company === 'agency') {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-8 flex flex-col font-sans">
      {/* 1. Header with Company Switcher & Tools */}
      <Header
        currentCompany={currentCompany}
        isAdmin={isAdmin}
        onSwitchCompany={handleSwitchCompany}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenMobileGuide={() => setIsIphoneGuideOpen(true)}
        onOpenAIReportModal={() => setIsAIReportModalOpen(true)}
        onOpenAdminLogin={() => setIsAdminModalOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {/* 2. Desktop Navigation Tab Bar */}
      <div className="bg-white border-b border-slate-200 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-5 text-sm font-bold overflow-x-auto">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`py-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng Quan</span>
            </button>

            {/* TAB CHUYÊN BIỆT AGENCY: KẾ HOẠCH NỘI DUNG */}
            {isAgency && (
              <button
                onClick={() => setCurrentTab('calendar')}
                className={`py-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  currentTab === 'calendar'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Kế Hoạch</span>
              </button>
            )}

            {/* TAB CHUYÊN BIỆT LAM SÓNG: DỰ TÍNH VS THỰC TẾ & LỊCH ĐIỀU THỢ */}
            {!isAgency && (
              <button
                onClick={() => setCurrentTab('schedule')}
                className={`py-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  currentTab === 'schedule'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Hammer className="w-4 h-4 text-orange-600" />
                <span>Lịch Thợ & Dự Tính vs Thực Tế</span>
              </button>
            )}

            <button
              onClick={() => setCurrentTab('attendance')}
              className={`py-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'attendance'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Chấm Công & Điểm Danh</span>
            </button>

            <button
              onClick={() => setCurrentTab('progress')}
              className={`py-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'progress'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{isAgency ? 'Tasks Kanban' : 'Tiến Độ m² & Ảnh'}</span>
            </button>

            <button
              onClick={() => setCurrentTab('staff')}
              className={`py-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'staff'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Nhân Sự & Tiền Công</span>
            </button>

            <button
              onClick={() => setCurrentTab('payroll')}
              className={`py-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'payroll'
                  ? isAgency
                    ? 'border-purple-600 text-purple-600'
                    : 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Tính Lương & Xuất Excel</span>
            </button>
          </nav>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5">
        {currentTab === 'dashboard' && (
          <Dashboard
            currentCompany={currentCompany}
            employees={employees}
            attendance={attendance}
            sites={sites}
            tasks={tasks}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
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

        {currentTab === 'attendance' && (
          <AttendanceManager
            currentCompany={currentCompany}
            employees={employees}
            sites={sites}
            attendance={attendance}
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
            isAdmin={isAdmin}
            onRequireAdmin={handleRequireAdmin}
          />
        )}
      </main>

      {/* 4. iPhone Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden pb-safe">
        <div className="grid grid-cols-5 text-center py-2 px-1">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'dashboard'
                ? isAgency
                  ? 'text-purple-600'
                  : 'text-orange-600'
                : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Tổng quan</span>
          </button>

          {/* Nút chuyên biệt giữa màn hình mobile */}
          {isAgency ? (
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                currentTab === 'calendar' ? 'text-purple-600' : 'text-slate-500'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Kế Hoạch</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('schedule')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                currentTab === 'schedule' ? 'text-orange-600' : 'text-slate-500'
              }`}
            >
              <Hammer className="w-5 h-5" />
              <span>Lịch Thợ</span>
            </button>
          )}

          <button
            onClick={() => setCurrentTab('attendance')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'attendance'
                ? isAgency
                  ? 'text-purple-600'
                  : 'text-orange-600'
                : 'text-slate-500'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Chấm công</span>
          </button>

          <button
            onClick={() => setCurrentTab('staff')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'staff'
                ? isAgency
                  ? 'text-purple-600'
                  : 'text-orange-600'
                : 'text-slate-500'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Tiền công</span>
          </button>

          <button
            onClick={() => setCurrentTab('payroll')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'payroll'
                ? isAgency
                  ? 'text-purple-600'
                  : 'text-orange-600'
                : 'text-slate-500'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Bảng lương</span>
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
      />

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}

export default App;
