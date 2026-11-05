import { createClient } from '@supabase/supabase-js';
import {
  Employee,
  ConstructionSite,
  AgencyTask,
  AttendanceRecord,
  ContentCalendarItem,
  AgencyProject,
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_CONSTRUCTION_SITES,
  INITIAL_AGENCY_TASKS,
  INITIAL_ATTENDANCE,
  INITIAL_CONTENT_CALENDAR,
  INITIAL_AGENCY_PROJECTS,
} from '../data/mockData';
import { FEEL_CHICKEN_ITEMS } from '../data/feelChickenCalendar';

// Storage Keys
const EMPLOYEES_KEY = 'app_employees_data';
const SITES_KEY = 'app_sites_data';
const TASKS_KEY = 'app_tasks_data';
const ATTENDANCE_KEY = 'app_attendance_data';
const CALENDAR_KEY = 'app_calendar_data';
const PROJECTS_KEY = 'app_agency_projects_data';
const SUPABASE_CONFIG_KEY = 'app_supabase_config';
const GEMINI_API_KEY = 'app_gemini_api_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return {
    url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
    anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
}

export function getStoredGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_API_KEY) || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

export function saveGeminiApiKey(key: string) {
  localStorage.setItem(GEMINI_API_KEY, key.trim());
}

export function getSupabaseClient() {
  const config = getStoredSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      return createClient(config.url, config.anonKey);
    } catch (e) {
      console.error('Supabase init error:', e);
    }
  }
  return null;
}

// ----------------- LOCAL DATA STORE WITH SUPABASE SYNC -----------------

export function loadEmployees(): Employee[] {
  const data = localStorage.getItem(EMPLOYEES_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
  return INITIAL_EMPLOYEES;
}

export function saveEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
}

export function loadSites(): ConstructionSite[] {
  const data = localStorage.getItem(SITES_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(SITES_KEY, JSON.stringify(INITIAL_CONSTRUCTION_SITES));
  return INITIAL_CONSTRUCTION_SITES;
}

export function saveSites(sites: ConstructionSite[]) {
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
}

export function loadTasks(): AgencyTask[] {
  const data = localStorage.getItem(TASKS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(TASKS_KEY, JSON.stringify(INITIAL_AGENCY_TASKS));
  return INITIAL_AGENCY_TASKS;
}

export function saveTasks(tasks: AgencyTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ---------------- AGENCY PROJECTS / KHÁCH HÀNG ----------------
export function loadAgencyProjects(): AgencyProject[] {
  const data = localStorage.getItem(PROJECTS_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(INITIAL_AGENCY_PROJECTS));
  return INITIAL_AGENCY_PROJECTS;
}

export function saveAgencyProjects(projects: AgencyProject[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadAttendance(): AttendanceRecord[] {
  const data = localStorage.getItem(ATTENDANCE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(INITIAL_ATTENDANCE));
  return INITIAL_ATTENDANCE;
}

export function saveAttendance(attendance: AttendanceRecord[]) {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
}

const TOCOTEA_SAMPLE_ITEMS: ContentCalendarItem[] = [
  {
    id: 'cal_tocotea_1',
    stt: 'TC1',
    title: '🧋 Series 3 Video ngắn bắt trend Trà Sữa Mùa Thu Đông',
    client: 'TocoTea Vietnam',
    channel: 'tiktok',
    month: '2026-10',
    dayOfWeek: 'Thứ 4',
    dayNumber: '07/10',
    timeStr: '14h00',
    loai: 'Lịch quay',
    truc: 'series',
    writerId: 'emp_ag_2',
    shooterId: 'emp_ag_1',
    editorId: 'emp_ag_3',
    shootDate: '2026-10-07',
    editDeadline: '2026-10-08',
    isCompleted: false,
    notes: 'Quay tại cơ sở Bà Triệu lúc 14h chiều, mang theo đèn phụ.',
    publishDate: '2026-10-07',
    status: 'shooting',
  },
  {
    id: 'cal_tocotea_2',
    stt: 'TC2',
    title: '✂️ Dựng Video Review Trà Sữa Khoai Môn Kem Cheese',
    client: 'TocoTea Vietnam',
    channel: 'tiktok',
    month: '2026-10',
    dayOfWeek: 'Thứ 6',
    dayNumber: '09/10',
    timeStr: '16h00',
    loai: 'Lịch edit',
    truc: 'series',
    writerId: 'emp_ag_2',
    shooterId: 'emp_ag_1',
    editorId: 'emp_ag_3',
    shootDate: '2026-10-07',
    editDeadline: '2026-10-10',
    isCompleted: false,
    notes: 'Dựng effect kem cheese sánh mịn, chèn nhạc trend TikTok.',
    publishDate: '2026-10-09',
    status: 'editing',
  },
];

// ---------------- CONTENT CALENDAR (AGENCY) ----------------
export function loadCalendar(): ContentCalendarItem[] {
  const data = localStorage.getItem(CALENDAR_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Đảm bảo các sự kiện Lịch quay & Lịch edit Thứ 2 và TocoTea luôn có mặt để xem ngay
        const hasMondayShoot = parsed.some((p: any) => p.id === 'cal_fc_shoot_monday');
        const hasTocoTea = parsed.some((p: any) => p.client === 'TocoTea Vietnam');
        
        let merged = [...parsed];
        if (!hasMondayShoot) {
          const mondayExtra = FEEL_CHICKEN_ITEMS.filter(
            (f) => f.id === 'cal_fc_shoot_monday' || f.id === 'cal_fc_edit_monday'
          );
          merged = [...mondayExtra, ...merged];
        }
        if (!hasTocoTea) {
          merged = [...TOCOTEA_SAMPLE_ITEMS, ...merged];
        }

        if (!hasMondayShoot || !hasTocoTea) {
          localStorage.setItem(CALENDAR_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    } catch {
      // fallback
    }
  }
  const initial = [...FEEL_CHICKEN_ITEMS, ...TOCOTEA_SAMPLE_ITEMS];
  localStorage.setItem(CALENDAR_KEY, JSON.stringify(initial));
  return initial;
}

export function saveCalendar(calendar: ContentCalendarItem[]) {
  localStorage.setItem(CALENDAR_KEY, JSON.stringify(calendar));
}

// Format tiền tệ VND tiện lợi
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Format ngày tháng tiếng Việt
export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
