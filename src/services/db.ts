import { createClient } from '@supabase/supabase-js';
import {
  Employee,
  ConstructionSite,
  AgencyTask,
  AttendanceRecord,
  ContentCalendarItem,
  AgencyProject,
  AgencyRateConfig,
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_CONSTRUCTION_SITES,
  INITIAL_AGENCY_TASKS,
  INITIAL_ATTENDANCE,
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
const AGENCY_RATES_KEY = 'app_agency_shared_rates';
const SUPABASE_CONFIG_KEY = 'app_supabase_config';
const GEMINI_API_KEY = 'app_gemini_api_key';
const SEED_DONE_KEY = 'app_seed_done'; // đã khởi tạo xong: không tự nạp lại dữ liệu mẫu

export const DEFAULT_AGENCY_RATES: AgencyRateConfig = {
  contentRate: 100000, // 100.000đ / 1 bài Content
  shootRate: 300000,   // 300.000đ / 1 lần Đi Quay
  editRate: 200000,    // 200.000đ / 1 video Edit
};

export function loadAgencyRates(): AgencyRateConfig {
  const data = localStorage.getItem(AGENCY_RATES_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.contentRate === 'number') {
        return {
          contentRate: Number(parsed.contentRate || 0),
          shootRate: Number(parsed.shootRate || 0),
          editRate: Number(parsed.editRate || 0),
        };
      }
    } catch {
      // fallback
    }
  }
  localStorage.setItem(AGENCY_RATES_KEY, JSON.stringify(DEFAULT_AGENCY_RATES));
  return DEFAULT_AGENCY_RATES;
}

export function saveAgencyRates(rates: AgencyRateConfig) {
  localStorage.setItem(AGENCY_RATES_KEY, JSON.stringify(rates));
  void syncCollection('rates', [{ id: 'default', ...rates }]);
}

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


// Sau khi đã khởi tạo, danh sách rỗng là do người dùng xoá, không nạp lại dữ liệu mẫu nữa.
function loadSeeded<T>(key: string): T[] | null {
  if (!localStorage.getItem(SEED_DONE_KEY)) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadEmployees(): Employee[] {
  const seeded = loadSeeded<Employee>(EMPLOYEES_KEY);
  if (seeded) return seeded;
  const data = localStorage.getItem(EMPLOYEES_KEY);
  if (data) {
    try {
      const parsed: Employee[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let needsSave = false;
        const migrated = parsed.map((emp) => {
          if (emp.companyId === 'agency' && emp.contentRate === undefined && emp.shootRate === undefined && emp.editRate === undefined) {
            needsSave = true;
            return {
              ...emp,
              wageType: 'piecework' as const,
              baseRate: 0,
              contentRate: emp.id === 'emp_ag_2' ? 150000 : 100000,
              shootRate: emp.id === 'emp_ag_1' ? 400000 : 300000,
              editRate: emp.id === 'emp_ag_3' ? 250000 : 200000,
            };
          }
          return emp;
        });
        if (needsSave) {
          localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(migrated));
        }
        return migrated;
      }
    } catch {
      // fallback
    }
  }
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
  return INITIAL_EMPLOYEES;
}

export function saveEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  void syncCollection('employees', employees);
}

export function loadSites(): ConstructionSite[] {
  const seeded = loadSeeded<ConstructionSite>(SITES_KEY);
  if (seeded) return seeded;
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
  void syncCollection('sites', sites);
}

export function loadTasks(): AgencyTask[] {
  const seeded = loadSeeded<AgencyTask>(TASKS_KEY);
  if (seeded) return seeded;
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
  void syncCollection('tasks', tasks);
}

// ---------------- AGENCY PROJECTS / KHÁCH HÀNG ----------------
export function loadAgencyProjects(): AgencyProject[] {
  const seeded = loadSeeded<AgencyProject>(PROJECTS_KEY);
  if (seeded) return seeded;
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
  void syncCollection('projects', projects);
}

export function loadAttendance(): AttendanceRecord[] {
  const seeded = loadSeeded<AttendanceRecord>(ATTENDANCE_KEY);
  if (seeded) return seeded;
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
  void syncCollection('attendance', attendance);
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
  const seeded = loadSeeded<ContentCalendarItem>(CALENDAR_KEY);
  if (seeded) return seeded;
  const data = localStorage.getItem(CALENDAR_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
  void syncCollection('calendar', calendar);
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

// ----------------- ĐỒNG BỘ SUPABASE (bảng app_records) -----------------
// Mỗi phần tử của mỗi danh sách là 1 dòng: (collection, id, data JSON).
// Không cấu hình Supabase thì tất cả hàm bên dưới không làm gì, app chạy bằng localStorage như cũ.

export type SyncCollection = 'employees' | 'sites' | 'tasks' | 'attendance' | 'calendar' | 'projects' | 'rates';

const COLLECTION_KEYS: Record<SyncCollection, string> = {
  employees: EMPLOYEES_KEY,
  sites: SITES_KEY,
  tasks: TASKS_KEY,
  attendance: ATTENDANCE_KEY,
  calendar: CALENDAR_KEY,
  projects: PROJECTS_KEY,
  rates: AGENCY_RATES_KEY,
};

const syncSnapshots: Partial<Record<SyncCollection, Map<string, string>>> = {};
let syncQueue: Promise<void> = Promise.resolve();
let pendingSyncs = 0;
let syncVersion = 0;

export function getSyncVersion(): number {
  return syncVersion;
}

export function markSeedDone() {
  localStorage.setItem(SEED_DONE_KEY, '1');
}

export function hasPendingSync(): boolean {
  return pendingSyncs > 0;
}

export function syncCollection(collection: SyncCollection, items: { id: string }[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return Promise.resolve();
  pendingSyncs++;
  syncVersion++;
  syncQueue = syncQueue
    .then(async () => {
      const snap = syncSnapshots[collection] ?? new Map<string, string>();
      const next = new Map(items.map((i) => [i.id, JSON.stringify(i)] as [string, string]));
      const now = new Date().toISOString();
      const upserts = items
        .filter((i) => snap.get(i.id) !== next.get(i.id))
        .map((i) => ({ collection, id: i.id, data: i, updated_at: now }));
      const removed = [...snap.keys()].filter((id) => !next.has(id));

      if (upserts.length > 0) {
        const { error } = await client.from('app_records').upsert(upserts, { onConflict: 'collection,id' });
        if (error) throw error;
      }
      if (removed.length > 0) {
        const { error } = await client.from('app_records').delete().eq('collection', collection).in('id', removed);
        if (error) throw error;
      }
      syncSnapshots[collection] = next;
    })
    .catch((e) => {
      console.error('Supabase sync error (' + collection + '):', e);
    })
    .finally(() => {
      pendingSyncs--;
    });
  return syncQueue;
}

export type RemoteData = Record<SyncCollection, any[]> & { seeded: boolean };

// Tải toàn bộ dữ liệu từ Supabase. Trả về null nếu chưa cấu hình hoặc lỗi.
export async function pullRemote(): Promise<RemoteData | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('app_records').select('collection,id,data').limit(50000);
  if (error) {
    console.error('Supabase pull error:', error.message);
    return null;
  }
  const result: RemoteData = { employees: [], sites: [], tasks: [], attendance: [], calendar: [], projects: [], rates: [], seeded: false };
  (['employees', 'sites', 'tasks', 'attendance', 'calendar', 'projects', 'rates'] as SyncCollection[]).forEach((c) => {
    syncSnapshots[c] = new Map();
  });
  for (const row of data || []) {
    if (row.collection === 'meta' && row.id === 'seeded') {
      result.seeded = true;
      continue;
    }
    const c = row.collection as SyncCollection;
    if (!Array.isArray(result[c])) continue;
    result[c].push(row.data);
    syncSnapshots[c]!.set(row.id, JSON.stringify(row.data));
  }
  return result;
}

// Lưu bản dữ liệu vừa tải từ Supabase vào localStorage (để lần mở sau hiện ngay).
export function cacheCollectionLocally(collection: SyncCollection, items: any[]) {
  if (collection === 'rates') {
    const r = items[0];
    if (r) {
      localStorage.setItem(AGENCY_RATES_KEY, JSON.stringify({ contentRate: r.contentRate, shootRate: r.shootRate, editRate: r.editRate }));
    }
    return;
  }
  localStorage.setItem(COLLECTION_KEYS[collection], JSON.stringify(items));
}

// Đánh dấu trên Supabase là đã khởi tạo xong.
export async function markRemoteSeeded() {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('app_records')
    .upsert({ collection: 'meta', id: 'seeded', data: { done: true }, updated_at: new Date().toISOString() }, { onConflict: 'collection,id' });
  if (error) console.error('Supabase seed marker error:', error.message);
}
