import { getStoredOmniRouterConfig, DEFAULT_OMNIROUTER_BASE_URL, DEFAULT_OMNIROUTER_MODEL } from './db';
import {
  AgencyTask,
  ConstructionSite,
  ContentCalendarItem,
  Employee,
} from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatAction =
  | { type: 'update_site_progress'; site: string; addM2?: number; setM2?: number }
  | {
      type: 'create_site';
      name: string;
      address?: string;
      clientName?: string;
      totalAreaM2?: number;
      estimatedDays?: number;
    }
  | {
      type: 'create_task';
      title: string;
      client?: string;
      assignee?: string;
      deadline?: string;
      priority?: 'low' | 'medium' | 'high';
      notes?: string;
    }
  | { type: 'update_task_status'; task: string; status: 'todo' | 'in_progress' | 'review' | 'done' }
  | { type: 'set_calendar_done'; item: string; done: boolean };

export interface ChatTurnResult {
  reply: string;
  actions: ChatAction[];
}

export interface ChatSnapshotInput {
  employees: Employee[];
  sites: ConstructionSite[];
  tasks: AgencyTask[];
  calendar: ContentCalendarItem[];
}

function isoToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Tóm tắt dữ liệu thật của web gửi kèm cho AI (kèm id để AI chỉ đúng đối tượng). */
export function buildChatSnapshot(input: ChatSnapshotInput): string {
  const { employees, sites, tasks, calendar } = input;
  const emp = (id?: string) => employees.find((e) => e.id === id)?.name || id || '';
  const lines: string[] = [`HÔM NAY: ${isoToday()}`, ''];

  lines.push('NHÂN SỰ:');
  employees
    .filter((e) => e.active !== false)
    .forEach((e) => lines.push(`- ${e.name} (${e.role}, ${e.companyId === 'agency' ? 'Agency' : 'Ốp tường'})`));

  lines.push('', 'CÔNG TRÌNH ỐP TƯỜNG:');
  if (sites.length === 0) lines.push('- (chưa có)');
  sites.forEach((s) => {
    const pct = s.totalAreaM2 ? Math.round((s.completedAreaM2 / s.totalAreaM2) * 100) : 0;
    lines.push(
      `- [${s.id}] ${s.name} | ${s.address || ''} | ${s.completedAreaM2}/${s.totalAreaM2} m² (${pct}%) | ngày ${s.actualDays}/${s.estimatedDays} | trạng thái ${s.status} | thợ: ${(s.assignedWorkers || []).map(emp).join(', ') || 'chưa gán'}`
    );
  });

  lines.push('', 'TASK AGENCY (chưa xong):');
  const openTasks = tasks.filter((t) => t.status !== 'done');
  if (openTasks.length === 0) lines.push('- (không có)');
  openTasks.slice(0, 40).forEach((t) =>
    lines.push(`- [${t.id}] ${t.title} | khách ${t.client} | ${emp(t.assignedTo) || 'chưa gán'} | hạn ${t.deadline || '-'} | ${t.status}`)
  );

  lines.push('', 'LỊCH CONTENT/QUAY/EDIT (chưa xong, gần hạn nhất):');
  const pending = calendar
    .filter((c) => !c.isCompleted)
    .sort((a, b) => (a.editDeadline || '').localeCompare(b.editDeadline || ''));
  const today = isoToday();
  lines.push(`- Tổng ${calendar.length} mục, chưa xong ${pending.length}, trễ hạn ${pending.filter((c) => c.editDeadline < today).length}`);
  pending
    .filter((c) => c.editDeadline >= today)
    .slice(0, 20)
    .forEach((c) => lines.push(`- [${c.id}] hạn ${c.editDeadline} | ${(c.title || '').slice(0, 70)} | ${c.client} | ${c.loai || ''}`));

  return lines.join('\n');
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI tích hợp trong phần mềm quản lý của công ty MS (khối Ốp Tường Lam Sóng và khối Agency).
Xưng "em", gọi người dùng là "Sếp". Trả lời tiếng Việt, ngắn gọn, rõ ràng.

QUY TẮC:
- Chỉ dùng số liệu trong phần DỮ LIỆU. Không bịa công trình, nhân sự, số liệu. Thiếu dữ liệu thì nói rõ.
- Khi Sếp muốn THAY ĐỔI dữ liệu, KHÔNG nói là đã làm xong. Hãy đề xuất hành động; Sếp sẽ bấm "Áp dụng" trên màn hình.
- Không có hành động xóa dữ liệu. Nếu được nhờ xóa, hướng dẫn Sếp tự xóa trên giao diện.

ĐỊNH DẠNG TRẢ LỜI: chỉ một đối tượng JSON, không kèm chữ nào ngoài JSON:
{"reply": "<nội dung trả lời>", "actions": [ ... ]}
"actions" là mảng rỗng nếu không cần thay đổi dữ liệu. Các loại hành động:
- {"type":"update_site_progress","site":"<id hoặc tên công trình>","addM2":<số m² làm thêm>}  hoặc  "setM2":<tổng m² đã xong>
- {"type":"create_site","name":"...","address":"...","clientName":"...","totalAreaM2":<số>,"estimatedDays":<số>}
- {"type":"create_task","title":"...","client":"...","assignee":"<tên nhân sự>","deadline":"YYYY-MM-DD","priority":"low|medium|high","notes":"..."}
- {"type":"update_task_status","task":"<id hoặc tiêu đề>","status":"todo|in_progress|review|done"}
- {"type":"set_calendar_done","item":"<id hoặc tiêu đề>","done":true|false}`;

function parseModelJson(text: string): ChatTurnResult {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      const obj = JSON.parse(t.slice(first, last + 1));
      return {
        reply: typeof obj.reply === 'string' ? obj.reply : '',
        actions: Array.isArray(obj.actions) ? obj.actions : [],
      };
    } catch {
      // rơi xuống dưới
    }
  }
  return { reply: text.trim(), actions: [] };
}

export async function runChatTurn(history: ChatMessage[], snapshot: string): Promise<ChatTurnResult> {
  const cfg = getStoredOmniRouterConfig();
  if (!cfg.apiKey.trim()) {
    return {
      reply:
        'Em chưa có API key của model AI. Sếp vào Trợ Lý AI → tab Cài đặt, nhập OmniRouter API Key rồi bấm "Lưu Tất Cả Cấu Hình" nhé.',
      actions: [],
    };
  }

  let endpoint = (cfg.baseUrl || DEFAULT_OMNIROUTER_BASE_URL).trim();
  if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('generateContent')) {
    endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey.trim()}` },
      body: JSON.stringify({
        model: cfg.model || DEFAULT_OMNIROUTER_MODEL,
        messages: [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\n=== DỮ LIỆU HIỆN TẠI ===\n${snapshot}` },
          ...history.slice(-12),
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { reply: `Em chưa gọi được model AI (lỗi ${res.status}). Sếp kiểm tra lại API key và model trong phần Cài đặt nhé.`, actions: [] };
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || '';
    if (!text) return { reply: 'Model AI không trả lời. Sếp thử lại giúp em.', actions: [] };
    return parseModelJson(text);
  } catch (e: any) {
    return {
      reply: e?.name === 'AbortError' ? 'Model AI trả lời quá lâu, Sếp thử lại nhé.' : 'Không kết nối được model AI: ' + (e?.message || 'lỗi mạng'),
      actions: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
