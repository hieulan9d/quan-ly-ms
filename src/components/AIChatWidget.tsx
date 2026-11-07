import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, X, Check, Loader2 } from 'lucide-react';
import { AgencyTask, ConstructionSite, ContentCalendarItem, Employee } from '../types';
import { ChatAction, ChatMessage, buildChatSnapshot, runChatTurn } from '../services/chatAgent';

interface AIChatWidgetProps {
  employees: Employee[];
  sites: ConstructionSite[];
  tasks: AgencyTask[];
  calendar: ContentCalendarItem[];
  isAdmin: boolean;
  onRequireAdmin: () => void;
  onSaveSite: (site: ConstructionSite) => void;
  onSaveTask: (task: AgencyTask) => void;
  onSaveCalendarItem: (item: ContentCalendarItem) => void;
}

interface UiMessage extends ChatMessage {
  id: number;
  actions?: { action: ChatAction; state: 'pending' | 'applied' | 'skipped' | 'error'; note?: string }[];
}

const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();

function findByIdOrName<T extends { id: string }>(list: T[], key: string, nameOf: (x: T) => string): T | undefined {
  if (!key) return undefined;
  const byId = list.find((x) => x.id === key);
  if (byId) return byId;
  const k = norm(key);
  return list.find((x) => norm(nameOf(x)) === k) || list.find((x) => norm(nameOf(x)).includes(k) || k.includes(norm(nameOf(x))));
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function describeAction(a: ChatAction): string {
  switch (a.type) {
    case 'update_site_progress':
      return a.addM2 !== undefined
        ? `Cộng thêm ${a.addM2} m² cho công trình "${a.site}"`
        : `Đặt khối lượng đã xong = ${a.setM2} m² cho công trình "${a.site}"`;
    case 'create_site':
      return `Tạo công trình "${a.name}"${a.address ? ' tại ' + a.address : ''}${a.totalAreaM2 ? ', ' + a.totalAreaM2 + ' m²' : ''}`;
    case 'create_task':
      return `Tạo task "${a.title}"${a.assignee ? ' giao cho ' + a.assignee : ''}${a.deadline ? ', hạn ' + a.deadline : ''}`;
    case 'update_task_status':
      return `Chuyển task "${a.task}" sang trạng thái ${a.status}`;
    case 'set_calendar_done':
      return `${a.done ? 'Đánh dấu XONG' : 'Bỏ đánh dấu xong'} lịch "${a.item}"`;
    default:
      return 'Hành động không hỗ trợ';
  }
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({
  employees,
  sites,
  tasks,
  calendar,
  isAdmin,
  onRequireAdmin,
  onSaveSite,
  onSaveTask,
  onSaveCalendarItem,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 0,
      role: 'assistant',
      content:
        'Dạ em là trợ lý AI của phần mềm. Sếp có thể hỏi tiến độ, lịch, task, hoặc nhờ em cập nhật số liệu (em sẽ đề xuất, Sếp bấm "Áp dụng" mới thay đổi).',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const snapshot = useMemo(
    () => buildChatSnapshot({ employees, sites, tasks, calendar }),
    [employees, sites, tasks, calendar]
  );

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const userMsg: UiMessage = { id: idRef.current++, role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setBusy(true);
    const result = await runChatTurn(
      history.filter((m) => m.id !== 0).map((m) => ({ role: m.role, content: m.content })),
      snapshot
    );
    setMessages((prev) => [
      ...prev,
      {
        id: idRef.current++,
        role: 'assistant',
        content: result.reply || '...',
        actions: result.actions.map((action) => ({ action, state: 'pending' as const })),
      },
    ]);
    setBusy(false);
  };

  const setActionState = (msgId: number, idx: number, state: 'applied' | 'skipped' | 'error', note?: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.actions
          ? { ...m, actions: m.actions.map((a, i) => (i === idx ? { ...a, state, note } : a)) }
          : m
      )
    );
  };

  const applyAction = (msgId: number, idx: number, a: ChatAction) => {
    if (!isAdmin) {
      onRequireAdmin();
      return;
    }
    try {
      if (a.type === 'update_site_progress') {
        const site = findByIdOrName(sites, a.site, (s) => s.name);
        if (!site) return setActionState(msgId, idx, 'error', 'Không tìm thấy công trình.');
        const current = Number(site.completedAreaM2) || 0;
        let next = a.setM2 !== undefined ? Number(a.setM2) : current + Number(a.addM2 || 0);
        if (!isFinite(next) || next < 0) return setActionState(msgId, idx, 'error', 'Số m² không hợp lệ.');
        if (site.totalAreaM2 > 0) next = Math.min(next, site.totalAreaM2);
        onSaveSite({
          ...site,
          completedAreaM2: next,
          status: site.totalAreaM2 > 0 && next >= site.totalAreaM2 ? 'completed' : site.status,
        });
        return setActionState(msgId, idx, 'applied', `${site.name}: ${next}/${site.totalAreaM2} m²`);
      }

      if (a.type === 'create_site') {
        if (!a.name) return setActionState(msgId, idx, 'error', 'Thiếu tên công trình.');
        const days = Number(a.estimatedDays) > 0 ? Number(a.estimatedDays) : 5;
        const today = isoToday();
        const end = new Date();
        end.setDate(end.getDate() + days);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        const site: ConstructionSite = {
          id: `site_${Date.now()}`,
          name: a.name,
          clientName: a.clientName || '',
          phone: '',
          address: a.address || '',
          totalAreaM2: Number(a.totalAreaM2) > 0 ? Number(a.totalAreaM2) : 0,
          completedAreaM2: 0,
          panelType: '',
          estimatedDays: days,
          actualDays: 1,
          startDate: today,
          expectedEndDate: endStr,
          status: 'planning',
          assignedWorkers: [],
          photos: [],
          dailySchedules: [],
        };
        onSaveSite(site);
        return setActionState(msgId, idx, 'applied', 'Đã tạo công trình.');
      }

      if (a.type === 'create_task') {
        if (!a.title) return setActionState(msgId, idx, 'error', 'Thiếu tiêu đề task.');
        const emp = a.assignee ? findByIdOrName(employees, a.assignee, (e) => e.name) : undefined;
        const task: AgencyTask = {
          id: `task_${Date.now()}`,
          title: a.title,
          client: a.client || '',
          assignedTo: emp?.id || '',
          deadline: a.deadline || '',
          status: 'todo',
          priority: a.priority || 'medium',
          notes: a.notes || '',
        };
        onSaveTask(task);
        return setActionState(msgId, idx, 'applied', emp ? `Giao cho ${emp.name}.` : 'Chưa gán người (không tìm thấy tên).');
      }

      if (a.type === 'update_task_status') {
        const task = findByIdOrName(tasks, a.task, (t) => t.title);
        if (!task) return setActionState(msgId, idx, 'error', 'Không tìm thấy task.');
        onSaveTask({ ...task, status: a.status });
        return setActionState(msgId, idx, 'applied', `${task.title} → ${a.status}`);
      }

      if (a.type === 'set_calendar_done') {
        const item = findByIdOrName(calendar, a.item, (c) => c.title);
        if (!item) return setActionState(msgId, idx, 'error', 'Không tìm thấy lịch.');
        onSaveCalendarItem({ ...item, isCompleted: !!a.done });
        return setActionState(msgId, idx, 'applied', 'Đã cập nhật lịch.');
      }

      setActionState(msgId, idx, 'error', 'Hành động không hỗ trợ.');
    } catch (e: any) {
      setActionState(msgId, idx, 'error', e?.message || 'Lỗi không xác định.');
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-xl hover:scale-105 transition"
          title="Trợ lý AI"
        >
          <Bot className="w-5 h-5" />
          <span className="hidden sm:inline">Trợ lý AI</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] sm:w-[400px] h-[70vh] max-h-[640px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Bot className="w-5 h-5" /> Trợ lý AI
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[88%] space-y-2">
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {m.content}
                  </div>

                  {m.actions && m.actions.length > 0 && (
                    <div className="space-y-1.5">
                      {m.actions.map((a, i) => (
                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs space-y-1.5">
                          <div className="font-bold text-amber-900">{describeAction(a.action)}</div>
                          {a.state === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => applyAction(m.id, i, a.action)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                              >
                                <Check className="w-3.5 h-3.5" /> Áp dụng
                              </button>
                              <button
                                onClick={() => setActionState(m.id, i, 'skipped')}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-600 font-bold"
                              >
                                Bỏ qua
                              </button>
                            </div>
                          )}
                          {a.state === 'applied' && <div className="text-emerald-700 font-bold">✓ Đã áp dụng. {a.note}</div>}
                          {a.state === 'skipped' && <div className="text-slate-500">Đã bỏ qua.</div>}
                          {a.state === 'error' && <div className="text-rose-600 font-bold">✗ {a.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Em đang xử lý...
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi tiến độ, giao việc, cập nhật m²..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="p-2.5 rounded-xl bg-purple-600 text-white disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
