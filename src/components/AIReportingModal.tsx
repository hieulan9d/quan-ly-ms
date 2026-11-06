import React, { useState, useEffect, useMemo } from 'react';
import {
  Employee,
  ConstructionSite,
  AgencyTask,
  AttendanceRecord,
  ContentCalendarItem,
  AgencyRateConfig,
  ZaloConfig,
  AIPayrollReportResult,
} from '../types';
import {
  generateAIReport,
  AIReportResult,
  testOmniRouterConnection,
  OmniRouterTestResult,
} from '../services/aiReporter';
import {
  scanUpcomingSchedules,
  formatScheduleAlertMessage,
  calculateAIPayroll,
  formatPayrollZaloMessage,
  executeNaturalLanguageCommand,
  AICommandResult,
} from '../services/aiAgent';
import {
  sendZaloWebhook,
  copyAndOpenZalo,
  testZaloWebhookConnection,
} from '../services/zaloService';
import {
  getStoredOmniRouterConfig,
  saveOmniRouterConfig,
  getStoredZaloConfig,
  saveZaloConfig,
  DEFAULT_OMNIROUTER_BASE_URL,
  DEFAULT_OMNIROUTER_MODEL,
  DEFAULT_AGENCY_RATES,
  formatCurrency,
  formatDateVN,
} from '../services/db';
import {
  Bot,
  Sparkles,
  Send,
  BellRing,
  DollarSign,
  BarChart3,
  Settings,
  X,
  Copy,
  Check,
  Calendar,
  Layers,
  Video,
  Clock,
  AlertTriangle,
  Award,
  Key,
  Cpu,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Share2,
  Hammer,
  Plus,
  Wand2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AIReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  sites: ConstructionSite[];
  calendar: ContentCalendarItem[];
  tasks: AgencyTask[];
  attendance: AttendanceRecord[];
  agencyRates?: AgencyRateConfig;
  initialTab?: 'command' | 'schedule' | 'payroll' | 'progress' | 'settings';
  onSaveSite?: (site: ConstructionSite) => void;
}

export const AIReportingModal: React.FC<AIReportingModalProps> = ({
  isOpen,
  onClose,
  employees,
  sites,
  calendar,
  tasks,
  attendance,
  agencyRates = DEFAULT_AGENCY_RATES,
  initialTab = 'command',
  onSaveSite,
}) => {
  if (!isOpen) return null;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'command' | 'schedule' | 'payroll' | 'progress' | 'settings'>(initialTab);

  // Zalo & AI Config States
  const [zaloConfig, setZaloConfig] = useState<ZaloConfig>(getStoredZaloConfig);
  const [omniConfig, setOmniConfig] = useState(getStoredOmniRouterConfig);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string>('');

  // ---------------- TAB 0: GIAO VIỆC CHO AI BẰNG CÂU LỆNH ----------------
  const [commandInput, setCommandInput] = useState<string>('');
  const [isExecutingCommand, setIsExecutingCommand] = useState<boolean>(false);
  const [commandResult, setCommandResult] = useState<AICommandResult | null>(null);

  const handleExecuteCommand = async (textToRun?: string) => {
    const text = textToRun || commandInput;
    if (!text.trim()) return;
    setIsExecutingCommand(true);
    setCommandResult(null);

    try {
      const res = await executeNaturalLanguageCommand({
        commandText: text,
        employees,
        sites,
        calendar,
      });

      setCommandResult(res);

      if (res.success && res.newSite) {
        onSaveSite?.(res.newSite);
        try { confetti({ particleCount: 80, spread: 70 }); } catch {}
      }
    } catch (e: any) {
      setCommandResult({
        success: false,
        message: `Lỗi xử lý câu lệnh: ${e.message}`,
        action: 'unknown',
      });
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // ---------------- TAB 1: NHẮC LỊCH & BÁO NHÓM ZALO ----------------
  const upcomingSchedules = useMemo(
    () => scanUpcomingSchedules(calendar, sites, employees),
    [calendar, sites, employees]
  );

  const [customGroupName, setCustomGroupName] = useState<string>(zaloConfig.groupNameOrId || 'Nhóm Công Ty MS');
  const [scheduleNotice, setScheduleNotice] = useState<string>('');
  const [isSendingGroupZalo, setIsSendingGroupZalo] = useState<boolean>(false);
  const [groupCopied, setGroupCopied] = useState<boolean>(false);

  // Nội dung tin nhắn gửi nhóm
  const scheduleZaloMessage = useMemo(
    () => formatScheduleAlertMessage(upcomingSchedules, customGroupName),
    [upcomingSchedules, customGroupName]
  );

  const handleSendScheduleToZaloGroup = async () => {
    setIsSendingGroupZalo(true);
    setScheduleNotice('');
    try {
      if (!zaloConfig.webhookUrlGroup.trim()) {
        await copyAndOpenZalo({
          message: scheduleZaloMessage,
          isGroup: true,
        });
        setScheduleNotice('✓ Đã sao chép tin nhắn chuẩn đẹp & mở Zalo! Bạn hãy dán (Ctrl+V) vào nhóm nhé.');
        try { confetti({ particleCount: 50, spread: 50 }); } catch {}
        return;
      }

      const res = await sendZaloWebhook({
        webhookUrl: zaloConfig.webhookUrlGroup,
        recipientType: 'group',
        targetNameOrId: customGroupName,
        title: 'Thông Báo Lịch & Deadline Hôm Nay',
        message: scheduleZaloMessage,
      });

      if (res.success) {
        setScheduleNotice(`✓ ${res.message}`);
        try { confetti({ particleCount: 70, spread: 60 }); } catch {}
      } else {
        setScheduleNotice(`⚠️ ${res.message}`);
      }
    } catch (err: any) {
      setScheduleNotice(`Lỗi gửi: ${err.message || 'Không thể kết nối'}`);
    } finally {
      setIsSendingGroupZalo(false);
    }
  };

  const handleCopyScheduleMessage = async () => {
    try {
      await navigator.clipboard.writeText(scheduleZaloMessage);
      setGroupCopied(true);
      setTimeout(() => setGroupCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------- TAB 2: TỰ TÍNH & BÁO CÁO LƯƠNG ----------------
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [payrollMonth, setPayrollMonth] = useState<string>(currentMonthStr);
  const [payrollReport, setPayrollReport] = useState<AIPayrollReportResult | null>(null);
  const [isCalculatingPayroll, setIsCalculatingPayroll] = useState<boolean>(false);
  const [payrollNotice, setPayrollNotice] = useState<string>('');
  const [isSendingPayrollBoss, setIsSendingPayrollBoss] = useState<boolean>(false);
  const [payrollCopied, setPayrollCopied] = useState<boolean>(false);

  const handleGeneratePayroll = async () => {
    setIsCalculatingPayroll(true);
    setPayrollNotice('');
    try {
      const result = await calculateAIPayroll({
        month: payrollMonth,
        employees,
        attendance,
        calendar,
        sites,
        agencyRates,
      });
      setPayrollReport(result);
      try { confetti({ particleCount: 60, spread: 60 }); } catch {}
    } catch (err: any) {
      setPayrollNotice(`Lỗi tính lương: ${err.message || 'Không xác định'}`);
    } finally {
      setIsCalculatingPayroll(false);
    }
  };

  const handleSendPayrollToBoss = async () => {
    if (!payrollReport) return;
    setIsSendingPayrollBoss(true);
    setPayrollNotice('');
    const message = formatPayrollZaloMessage(payrollReport);

    try {
      if (!zaloConfig.webhookUrlBoss.trim()) {
        await copyAndOpenZalo({
          message,
          phoneOrId: zaloConfig.bossPhoneOrId,
          isGroup: false,
        });
        setPayrollNotice('✓ Đã sao chép bảng lương & mở Zalo Sếp! Bạn chỉ cần bấm Gửi (Ctrl+V).');
        return;
      }

      const res = await sendZaloWebhook({
        webhookUrl: zaloConfig.webhookUrlBoss,
        recipientType: 'boss',
        targetNameOrId: zaloConfig.bossPhoneOrId || 'Sếp Tổng',
        title: `Báo Cáo Bảng Lương Tháng ${payrollMonth}`,
        message,
      });

      if (res.success) {
        setPayrollNotice(`✓ ${res.message}`);
        try { confetti({ particleCount: 70, spread: 60 }); } catch {}
      } else {
        setPayrollNotice(`⚠️ ${res.message}`);
      }
    } catch (err: any) {
      setPayrollNotice(`Lỗi: ${err.message || 'Không thể gửi'}`);
    } finally {
      setIsSendingPayrollBoss(false);
    }
  };

  const handleCopyPayrollText = async () => {
    if (!payrollReport) return;
    try {
      const msg = formatPayrollZaloMessage(payrollReport);
      await navigator.clipboard.writeText(msg);
      setPayrollCopied(true);
      setTimeout(() => setPayrollCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------- TAB 3: BÁO CÁO TIẾN ĐỘ 2 CÔNG TY ----------------
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [progressReport, setProgressReport] = useState<AIReportResult | null>(null);
  const [isGeneratingProgress, setIsGeneratingProgress] = useState<boolean>(false);
  const [progressNotice, setProgressNotice] = useState<string>('');
  const [progressCopied, setProgressCopied] = useState<boolean>(false);

  const handleGenerateProgress = async (selectedPeriod: 'weekly' | 'monthly') => {
    setIsGeneratingProgress(true);
    setPeriod(selectedPeriod);
    setProgressNotice('');
    try {
      const result = await generateAIReport(
        selectedPeriod,
        employees,
        sites,
        calendar,
        tasks,
        attendance
      );
      setProgressReport(result);
    } catch (e: any) {
      setProgressNotice(`Lỗi tạo báo cáo: ${e.message || 'Không xác định'}`);
    } finally {
      setIsGeneratingProgress(false);
    }
  };

  const formatProgressZaloText = (r: AIReportResult) => {
    return `
📊 ${r.title.toUpperCase()}
🕒 Lập lúc: ${r.generatedAt} | AI: ${r.modelUsed || 'Smart Synthesizer'}

1. ĐÁNH GIÁ TỔNG QUAN:
${r.executiveSummary}

2. KHỐI MS AGENCY (TRUYỀN THÔNG & VIDEO):
- Tiến độ hoàn thành: ${r.agencySection.completionRate}
- Đã quay: ${r.agencySection.videosShot} video | Đã dựng: ${r.agencySection.videosEdited} video
${r.agencySection.overdueTasks.length > 0 ? `⚠️ Trễ hạn: ${r.agencySection.overdueTasks.join('; ')}` : '✓ Không có việc trễ hạn.'}
- Đánh giá: ${r.agencySection.commentary}

3. KHỐI MS ỐP TƯỜNG LAM SÓNG:
- Khối lượng hoàn thiện: ${r.lamSongSection.totalM2Finished} / ${r.lamSongSection.totalM2Planned} m²
- Số công trình: ${r.lamSongSection.completedSitesCount} đã giao, ${r.lamSongSection.activeSitesCount} đang làm
- Đánh giá: ${r.lamSongSection.durationAssessment}
- Tổng ngày công thợ: ${r.lamSongSection.workerManDays} công

4. TÀI CHÍNH & QUỸ LƯƠNG:
- Ước tính quỹ lương 2 khối: ${formatCurrency(r.financialSummary.estimatedPayroll)}
- Ghi chú: ${r.financialSummary.notes}

5. ĐỀ XUẤT HÀNH ĐỘNG CỦA AI:
${r.strategicRecommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
    `.trim();
  };

  const handleSendProgressToBoss = async () => {
    if (!progressReport) return;
    const msg = formatProgressZaloText(progressReport);

    try {
      if (!zaloConfig.webhookUrlBoss.trim()) {
        await copyAndOpenZalo({
          message: msg,
          phoneOrId: zaloConfig.bossPhoneOrId,
          isGroup: false,
        });
        setProgressNotice('✓ Đã copy báo cáo tiến độ & mở Zalo gửi cho Sếp!');
        return;
      }

      const res = await sendZaloWebhook({
        webhookUrl: zaloConfig.webhookUrlBoss,
        recipientType: 'boss',
        targetNameOrId: zaloConfig.bossPhoneOrId || 'Sếp Tổng',
        title: progressReport.title,
        message: msg,
      });

      if (res.success) {
        setProgressNotice(`✓ ${res.message}`);
        try { confetti({ particleCount: 70, spread: 60 }); } catch {}
      } else {
        setProgressNotice(`⚠️ ${res.message}`);
      }
    } catch (err: any) {
      setProgressNotice(`Lỗi: ${err.message}`);
    }
  };

  // ---------------- TAB 4: CÀI ĐẶT ZALO & AI ----------------
  const [isTestingZaloBoss, setIsTestingZaloBoss] = useState(false);
  const [isTestingZaloGroup, setIsTestingZaloGroup] = useState(false);
  const [testZaloNotice, setTestZaloNotice] = useState<{ type: 'boss' | 'group'; msg: string; ok: boolean } | null>(null);

  const [isTestingModel, setIsTestingModel] = useState(false);
  const [testModelResult, setTestModelResult] = useState<OmniRouterTestResult | null>(null);

  const handleSaveAllSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedZalo = saveZaloConfig(zaloConfig);
    setZaloConfig(updatedZalo);

    saveOmniRouterConfig({
      apiKey: omniConfig.apiKey,
      baseUrl: omniConfig.baseUrl || DEFAULT_OMNIROUTER_BASE_URL,
      model: omniConfig.model || DEFAULT_OMNIROUTER_MODEL,
    });

    setSaveNotice('✓ Đã lưu thành công Cấu hình Zalo & AI Agent!');
    try { confetti({ particleCount: 50, spread: 50 }); } catch {}
    setTimeout(() => setSaveNotice(''), 3000);
  };

  const handleTestBossWebhook = async () => {
    setIsTestingZaloBoss(true);
    setTestZaloNotice(null);
    try {
      const res = await testZaloWebhookConnection(
        zaloConfig.webhookUrlBoss,
        'boss',
        zaloConfig.bossPhoneOrId || 'Sếp'
      );
      setTestZaloNotice({ type: 'boss', msg: res.message, ok: res.success });
    } finally {
      setIsTestingZaloBoss(false);
    }
  };

  const handleTestGroupWebhook = async () => {
    setIsTestingZaloGroup(true);
    setTestZaloNotice(null);
    try {
      const res = await testZaloWebhookConnection(
        zaloConfig.webhookUrlGroup,
        'group',
        zaloConfig.groupNameOrId || 'Nhóm Công Ty'
      );
      setTestZaloNotice({ type: 'group', msg: res.message, ok: res.success });
    } finally {
      setIsTestingZaloGroup(false);
    }
  };

  const handleTestAIConnection = async () => {
    setIsTestingModel(true);
    setTestModelResult(null);
    try {
      const res = await testOmniRouterConnection({
        apiKey: omniConfig.apiKey,
        baseUrl: omniConfig.baseUrl,
        model: omniConfig.model,
      });
      setTestModelResult(res);
      if (res.success) {
        try { confetti({ particleCount: 60, spread: 60 }); } catch {}
      }
    } finally {
      setIsTestingModel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col border border-slate-100">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition z-10"
          title="Đóng popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Trợ Lý AI Agent & Tự Động Hóa Báo Cáo Zalo
              </h2>
              <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-white" /> Pro
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Giao việc bằng 1 câu lệnh, nhắc báo lịch nhóm Zalo, tự tạo báo cáo lương & tiến độ
            </p>
          </div>
        </div>

        {/* 5 Tabs Điều Hướng */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-3 pb-2 border-b border-slate-100 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('command')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'command'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>💬 Giao Việc Bằng Câu Nói</span>
            <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              Mới
            </span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>1. Nhắc Lịch Nhóm Zalo</span>
            {upcomingSchedules.filter((s) => s.isToday || s.isOverdue).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {upcomingSchedules.filter((s) => s.isToday || s.isOverdue).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'payroll'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>2. Tự Tạo Báo Cáo Lương</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>3. Báo Cáo Tiến Độ (2 Cty)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>4. Cài Đặt Zalo & AI</span>
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* ======================= TAB 0: GIAO VIỆC CHO AI BẰNG CÂU LỆNH ======================= */}
          {activeTab === 'command' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      Giao Việc Tự Động Cho AI (Tạo Dự Án, Lịch Làm Việc)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Chỉ cần gõ hoặc nói một câu tự nhiên như bạn đang nhắn tin cho thư ký. AI sẽ tự động phân tích địa chỉ, số tiền, số ngày thi công và tạo dự án ngay trên Web!
                    </p>
                  </div>
                </div>

                {/* Ô nhập câu lệnh */}
                <div className="mt-4 space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      placeholder="Ví dụ: tạo 1 dự án ốp tường mới địa chỉ 120 Hoàng Hoa Thám, số tiền 35 triệu, thời gian làm trong 4 ngày, khách anh Tuấn"
                      className="w-full px-3.5 py-3 text-xs sm:text-sm border-2 border-purple-300 rounded-2xl bg-white focus:outline-none focus:border-purple-600 shadow-sm resize-none font-medium text-slate-800"
                    />
                    <button
                      onClick={() => handleExecuteCommand()}
                      disabled={isExecutingCommand || !commandInput.trim()}
                      className="absolute right-3 bottom-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {isExecutingCommand ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Giao Việc Cho AI</span>
                    </button>
                  </div>

                  {/* Câu lệnh mẫu bấm 1 chạm */}
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      💡 Hoặc bấm vào câu lệnh mẫu để thử ngay:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const cmd = 'tạo 1 dự án ốp tường mới địa chỉ 120 Hoàng Hoa Thám, số tiền 35 triệu, thời gian làm trong 4 ngày, khách anh Tuấn';
                          setCommandInput(cmd);
                          handleExecuteCommand(cmd);
                        }}
                        className="text-[11px] font-semibold text-purple-700 bg-white hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition"
                      >
                        + Ốp tường 120 Hoàng Hoa Thám (35tr, 4 ngày, a Tuấn)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cmd = 'tạo dự án ốp tường Biệt thự Gamuda Yên Sở, địa chỉ Hoàng Mai, số tiền 55 triệu, làm trong 5 ngày, khách chị Thảo';
                          setCommandInput(cmd);
                          handleExecuteCommand(cmd);
                        }}
                        className="text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition"
                      >
                        + Biệt thự Gamuda (55tr, 5 ngày, c Thảo)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cmd = 'tạo công trình ốp Nano tại 45 Nguyễn Trãi, số tiền 28 triệu, làm trong 3 ngày, khách anh Hùng';
                          setCommandInput(cmd);
                          handleExecuteCommand(cmd);
                        }}
                        className="text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition"
                      >
                        + Ốp Nano 45 Nguyễn Trãi (28tr, 3 ngày, a Hùng)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cmd = 'xem tiến độ dự án Biệt Thự Gamuda Yên Sở';
                          setCommandInput(cmd);
                          handleExecuteCommand(cmd);
                        }}
                        className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition"
                      >
                        🔍 Xem tiến độ Gamuda
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cmd = 'xem tiến độ các dự án đang thi công';
                          setCommandInput(cmd);
                          handleExecuteCommand(cmd);
                        }}
                        className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition"
                      >
                        📊 Tiến độ tất cả dự án
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kết quả sau khi AI xử lý câu lệnh */}
              {commandResult && (
                <div
                  className={`p-4 rounded-2xl border transition animate-in fade-in duration-300 ${
                    commandResult.action === 'query_progress'
                      ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                      : commandResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {commandResult.action === 'query_progress' ? (
                        <BarChart3 className="w-5 h-5 text-blue-600 shrink-0" />
                      ) : commandResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <h4 className="font-black text-sm">
                        {commandResult.action === 'query_progress'
                          ? 'Báo Cáo Tiến Độ Dự Án (AI Tra Cứu)'
                          : commandResult.success
                          ? 'Thành Công: AI Đã Tự Động Tạo Dự Án Mới!'
                          : 'Không Thể Xử Lý Câu Lệnh'}
                      </h4>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      commandResult.action === 'query_progress'
                        ? 'bg-blue-600 text-white'
                        : commandResult.success
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}>
                      {commandResult.action === 'query_progress' ? 'Tra Cứu Tiến Độ' : 'Đã Lưu Lên Web'}
                    </span>
                  </div>

                  <pre className="whitespace-pre-wrap font-sans text-xs mt-2.5 leading-relaxed bg-white/90 p-3 rounded-xl border border-slate-200 shadow-inner">
                    {commandResult.message}
                  </pre>

                  {/* Thanh tiến độ trực quan nếu tra cứu dự án cụ thể */}
                  {commandResult.action === 'query_progress' && commandResult.queriedSite && (
                    <div className="mt-3 bg-white p-3 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                        <span className="text-slate-700">Khối lượng hoàn thiện:</span>
                        <span className="text-blue-700">
                          {commandResult.queriedSite.completedAreaM2} / {commandResult.queriedSite.totalAreaM2} m² (
                          {commandResult.queriedSite.totalAreaM2 > 0
                            ? Math.round((commandResult.queriedSite.completedAreaM2 / commandResult.queriedSite.totalAreaM2) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              commandResult.queriedSite.totalAreaM2 > 0
                                ? Math.min(
                                    100,
                                    Math.round((commandResult.queriedSite.completedAreaM2 / commandResult.queriedSite.totalAreaM2) * 100)
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Nút hành động */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-600 font-semibold">
                      {commandResult.action === 'query_progress'
                        ? 'Bạn có thể gửi ngay báo cáo tiến độ này qua Zalo'
                        : 'Dự án đã xuất hiện tại tab: Tiến Độ m² và Lịch Thợ'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await copyAndOpenZalo({ message: commandResult.message, isGroup: false });
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Mở Zalo Gửi Báo Cáo</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 1: NHẮC LỊCH & BÁO NHÓM ZALO ======================= */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-blue-950 text-sm sm:text-base flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-blue-600" />
                      Lịch Trình & Deadline Đang Đến Hạn
                    </h3>
                    <p className="text-xs text-blue-800/80 mt-0.5">
                      Hệ thống tự động phát hiện lịch thợ thi công hôm nay, lịch đi quay và hạn nộp video edit Agency.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Tên nhóm Zalo:</span>
                    <input
                      type="text"
                      value={customGroupName}
                      onChange={(e) => setCustomGroupName(e.target.value)}
                      placeholder="VD: Nhóm Công Ty MS"
                      className="px-2.5 py-1 text-xs border border-blue-300 rounded-lg bg-white font-bold text-blue-950 focus:outline-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Danh sách thẻ sự kiện sắp tới */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingSchedules.length === 0 ? (
                  <div className="col-span-2 text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-500">
                      ✓ Tuyệt vời! Hiện tại không có sự kiện trễ hạn hoặc lịch khẩn cấp trong ngày hôm nay.
                    </p>
                  </div>
                ) : (
                  upcomingSchedules.slice(0, 6).map((sch) => {
                    const isShoot = sch.category === 'agency_shoot';
                    const isDeadline = sch.category === 'agency_deadline';
                    const isLamSong = sch.category === 'lam_song_schedule';

                    return (
                      <div
                        key={sch.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          sch.isOverdue
                            ? 'bg-rose-50/60 border-rose-200'
                            : sch.isToday
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              sch.isOverdue
                                ? 'bg-rose-100 text-rose-700'
                                : sch.isToday
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sch.isOverdue ? '⚠️ Quá Hạn' : sch.isToday ? '🔥 Hôm Nay' : 'Ngày Mai'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {sch.timeStr || formatDateVN(sch.dateTime)}
                          </span>
                        </div>

                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-1">
                          {isShoot && '🎥 '}
                          {isDeadline && '⚡ '}
                          {isLamSong && '🪵 '}
                          {sch.title}
                        </div>

                        <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                          <span className="font-semibold text-slate-700">Địa chỉ / Khách:</span>
                          <span className="truncate">{sch.clientOrSite}</span>
                        </div>

                        <div className="text-[11px] text-indigo-700 mt-0.5 font-semibold">
                          Phụ trách: {sch.assignees.join(', ')}
                        </div>

                        {sch.notes && (
                          <div className="text-[10px] text-slate-500 mt-1 italic line-clamp-1">
                            {sch.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bản xem trước tin nhắn Zalo */}
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-xs font-mono relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-sans font-bold flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    Bản tin nhắn Zalo định dạng sẵn (sẵn sàng bắn lên nhóm):
                  </span>
                  <button
                    onClick={handleCopyScheduleMessage}
                    className="text-[11px] font-sans font-bold bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-slate-200 transition flex items-center gap-1"
                  >
                    {groupCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{groupCopied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-200 leading-relaxed max-h-48 overflow-y-auto">
                  {scheduleZaloMessage}
                </pre>
              </div>

              {/* Thông báo kết quả gửi */}
              {scheduleNotice && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold animate-in fade-in">
                  {scheduleNotice}
                </div>
              )}

              {/* Hàng nút bấm hành động */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>
                    Webhook nhóm: {zaloConfig.webhookUrlGroup ? 'Đã cài đặt' : 'Chưa cài đặt (sẽ mở Zalo 1-chạm)'}
                  </span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={async () => {
                      await copyAndOpenZalo({ message: scheduleZaloMessage, isGroup: true });
                      setScheduleNotice('✓ Đã chép tin nhắn & mở Zalo! Bạn hãy dán (Ctrl+V) vào nhóm nhé.');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Mở Zalo Gửi 1-Chạm</span>
                  </button>

                  <button
                    onClick={handleSendScheduleToZaloGroup}
                    disabled={isSendingGroupZalo}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition active:scale-95 disabled:opacity-50"
                  >
                    {isSendingGroupZalo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Bắn Thông Báo Lên Nhóm Zalo Ngay</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================= TAB 2: TỰ TÍNH & BÁO CÁO LƯƠNG ======================= */}
          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-emerald-950 text-sm sm:text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      AI Tự Động Tính & Lập Báo Cáo Lương 2 Công Ty
                    </h3>
                    <p className="text-xs text-emerald-800/80 mt-0.5">
                      Tự động quét toàn bộ ngày công thợ, giờ tăng ca OT, số kịch bản/buổi quay/video hoàn thành, tính lương chi tiết và phân tích quỹ lương.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">Chọn tháng:</span>
                    <input
                      type="month"
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-emerald-300 rounded-lg bg-white font-bold text-emerald-950 focus:outline-emerald-500"
                    />
                    <button
                      onClick={handleGeneratePayroll}
                      disabled={isCalculatingPayroll}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
                    >
                      {isCalculatingPayroll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                      <span>Tính Lương</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bảng kết quả tính lương */}
              {payrollReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                      <div className="text-[11px] text-slate-500 font-semibold">Tổng Quỹ Lương</div>
                      <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        {formatCurrency(payrollReport.totalPayroll)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{payrollReport.totalEmployees} nhân sự</div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl">
                      <div className="text-[11px] text-purple-700 font-semibold">Khối MS Agency</div>
                      <div className="text-sm sm:text-base font-black text-purple-950 mt-0.5">
                        {formatCurrency(payrollReport.agencyPayroll)}
                      </div>
                      <div className="text-[10px] text-purple-600 mt-0.5">{payrollReport.totalVideosProduced} video hoàn thiện</div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-2xl">
                      <div className="text-[11px] text-orange-700 font-semibold">Khối MS Ốp Tường</div>
                      <div className="text-sm sm:text-base font-black text-orange-950 mt-0.5">
                        {formatCurrency(payrollReport.lamSongPayroll)}
                      </div>
                      <div className="text-[10px] text-orange-600 mt-0.5">{payrollReport.totalWorkUnits} công ({payrollReport.totalOtHours}h OT)</div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                      <div className="text-[11px] text-emerald-700 font-semibold">Đánh Giá Ngân Sách</div>
                      <div className="text-xs font-bold text-emerald-800 mt-1 line-clamp-2">
                        {payrollReport.budgetComparison}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        Top Nhân Sự Thu Nhập Cao Nhất
                      </h4>
                      <div className="space-y-1.5">
                        {payrollReport.topEarners.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                            <div>
                              <span className="font-bold text-slate-900">{t.name}</span>
                              <span className="text-[11px] text-slate-400 ml-1.5">({t.role})</span>
                            </div>
                            <span className="font-black text-emerald-600">{formatCurrency(t.salary)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl">
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Nhận Xét Tài Chính Của AI (CFO)
                      </h4>
                      <p className="text-xs text-indigo-950 leading-relaxed">
                        {payrollReport.aiAssessment}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-xs font-mono relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="text-slate-400 font-sans font-bold flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        Bản tin gửi Zalo cho Sếp duyệt lương:
                      </span>
                      <button
                        onClick={handleCopyPayrollText}
                        className="text-[11px] font-sans font-bold bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-slate-200 transition flex items-center gap-1"
                      >
                        {payrollCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{payrollCopied ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-200 leading-relaxed max-h-48 overflow-y-auto">
                      {formatPayrollZaloMessage(payrollReport)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-slate-600 font-bold">
                    Chưa có bảng tính lương tháng {payrollMonth}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Bấm nút "Tính Lương" phía trên để AI tự động quét dữ liệu và tạo báo cáo lương chuẩn gửi Sếp.
                  </p>
                  <button
                    onClick={handleGeneratePayroll}
                    disabled={isCalculatingPayroll}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    <Bot className="w-4 h-4" />
                    <span>AI Bắt Đầu Tính Lương Ngay</span>
                  </button>
                </div>
              )}

              {payrollNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold animate-in fade-in">
                  {payrollNotice}
                </div>
              )}

              {payrollReport && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="text-xs text-slate-500">
                    Người nhận: <span className="font-bold text-slate-800">{zaloConfig.bossPhoneOrId || 'Sếp Tổng (Zalo)'}</span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={async () => {
                        await copyAndOpenZalo({
                          message: formatPayrollZaloMessage(payrollReport),
                          phoneOrId: zaloConfig.bossPhoneOrId,
                          isGroup: false,
                        });
                        setPayrollNotice('✓ Đã chép báo cáo lương & mở Zalo gửi cho Sếp!');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Mở Zalo Gửi Sếp 1-Chạm</span>
                    </button>

                    <button
                      onClick={handleSendPayrollToBoss}
                      disabled={isSendingPayrollBoss}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition active:scale-95 disabled:opacity-50"
                    >
                      {isSendingPayrollBoss ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Gửi Báo Cáo Lương Cho Sếp (Zalo)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 3: BÁO CÁO TIẾN ĐỘ ======================= */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-purple-950 text-sm sm:text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      Báo Cáo Tiến Độ & Năng Suất 2 Công Ty
                    </h3>
                    <p className="text-xs text-purple-800/80 mt-0.5">
                      Tổng hợp m² ốp hoàn thành, số ngày thi công dự tính vs thực tế, và tiến độ kế hoạch video Agency.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200">
                    <button
                      onClick={() => handleGenerateProgress('weekly')}
                      disabled={isGeneratingProgress}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        period === 'weekly' && progressReport
                          ? 'bg-purple-600 text-white'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      Báo Cáo Tuần
                    </button>
                    <button
                      onClick={() => handleGenerateProgress('monthly')}
                      disabled={isGeneratingProgress}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        period === 'monthly' && progressReport
                          ? 'bg-purple-600 text-white'
                          : 'text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      Báo Cáo Tháng
                    </button>
                  </div>
                </div>
              </div>

              {progressReport ? (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
                    <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-purple-600" />
                      Tóm Tắt Vận Hành Của AI ({progressReport.modelUsed || 'Smart Synthesizer'})
                    </h4>
                    <p className="text-xs text-purple-950 leading-relaxed">
                      {progressReport.executiveSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl">
                      <div className="font-extrabold text-xs text-slate-800 uppercase mb-2 flex items-center justify-between">
                        <span>🏢 MS Agency</span>
                        <span className="text-purple-600">{progressReport.agencySection.completionRate}</span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>Đã quay: {progressReport.agencySection.videosShot} video | Đã dựng: {progressReport.agencySection.videosEdited} video</div>
                        <div className="text-slate-500 italic text-[11px] mt-1">{progressReport.agencySection.commentary}</div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl">
                      <div className="font-extrabold text-xs text-slate-800 uppercase mb-2 flex items-center justify-between">
                        <span>🪵 MS Ốp Tường</span>
                        <span className="text-orange-600">
                          {progressReport.lamSongSection.totalM2Finished}/{progressReport.lamSongSection.totalM2Planned} m²
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>Giao: {progressReport.lamSongSection.completedSitesCount} công trình | Đang làm: {progressReport.lamSongSection.activeSitesCount}</div>
                        <div className="text-slate-500 italic text-[11px] mt-1">{progressReport.lamSongSection.commentary}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(formatProgressZaloText(progressReport));
                        setProgressCopied(true);
                        setTimeout(() => setProgressCopied(false), 2500);
                      }}
                      className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                    >
                      {progressCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{progressCopied ? 'Đã sao chép' : 'Sao chép văn bản'}</span>
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={async () => {
                          await copyAndOpenZalo({
                            message: formatProgressZaloText(progressReport),
                            phoneOrId: zaloConfig.bossPhoneOrId,
                            isGroup: false,
                          });
                          setProgressNotice('✓ Đã chép báo cáo & mở Zalo gửi cho Sếp!');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Mở Zalo Gửi 1-Chạm</span>
                      </button>

                      <button
                        onClick={handleSendProgressToBoss}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 transition active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>Gửi Báo Cáo Tiến Độ (Zalo)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-slate-600 font-bold">
                    Chưa tạo báo cáo tiến độ gần nhất
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Bấm nút "Báo Cáo Tuần" hoặc "Báo Cáo Tháng" để AI phân tích số liệu thực tế.
                  </p>
                  <button
                    onClick={() => handleGenerateProgress('weekly')}
                    disabled={isGeneratingProgress}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    <Bot className="w-4 h-4" />
                    <span>AI Quét Dữ Liệu & Tạo Báo Cáo Tuần</span>
                  </button>
                </div>
              )}

              {progressNotice && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold animate-in fade-in">
                  {progressNotice}
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 4: CÀI ĐẶT ZALO & AI ======================= */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveAllSettings} className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Cấu Hình Zalo Webhook & Người Nhận
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Hỗ trợ Webhook, n8n, Make hoặc Zalo OpenAPI</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Webhook Zalo Báo Cáo Cho Sếp</span>
                      <button
                        type="button"
                        onClick={handleTestBossWebhook}
                        disabled={isTestingZaloBoss || !zaloConfig.webhookUrlBoss}
                        className="text-[10px] text-blue-600 hover:underline font-bold disabled:opacity-40"
                      >
                        {isTestingZaloBoss ? 'Đang test...' : 'Test Webhook'}
                      </button>
                    </label>
                    <input
                      type="url"
                      value={zaloConfig.webhookUrlBoss}
                      onChange={(e) => setZaloConfig({ ...zaloConfig, webhookUrlBoss: e.target.value })}
                      placeholder="https://your-webhook-service.com/boss-zalo"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Dùng để AI gửi báo cáo lương và báo cáo tiến độ riêng cho Sếp.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Webhook Gửi Lên Nhóm Zalo Công Ty</span>
                      <button
                        type="button"
                        onClick={handleTestGroupWebhook}
                        disabled={isTestingZaloGroup || !zaloConfig.webhookUrlGroup}
                        className="text-[10px] text-blue-600 hover:underline font-bold disabled:opacity-40"
                      >
                        {isTestingZaloGroup ? 'Đang test...' : 'Test Webhook'}
                      </button>
                    </label>
                    <input
                      type="url"
                      value={zaloConfig.webhookUrlGroup}
                      onChange={(e) => setZaloConfig({ ...zaloConfig, webhookUrlGroup: e.target.value })}
                      placeholder="https://your-webhook-service.com/group-zalo"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Dùng để AI tự động nhắn thông báo lịch thi công & nhắc deadline.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Số Điện Thoại Zalo Của Sếp (để mở nhanh)</label>
                    <input
                      type="text"
                      value={zaloConfig.bossPhoneOrId}
                      onChange={(e) => setZaloConfig({ ...zaloConfig, bossPhoneOrId: e.target.value })}
                      placeholder="VD: 0912345678"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Tên Nhóm Zalo Công Ty</label>
                    <input
                      type="text"
                      value={zaloConfig.groupNameOrId}
                      onChange={(e) => setZaloConfig({ ...zaloConfig, groupNameOrId: e.target.value })}
                      placeholder="VD: Nhóm Công Ty MS (Agency & Ốp Lam Sóng)"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-blue-500"
                    />
                  </div>
                </div>

                {testZaloNotice && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    testZaloNotice.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {testZaloNotice.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{testZaloNotice.msg}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-600" />
                    Cấu Hình Mô Hình AI (OmniRouter / Gemini 3.8 Flash)
                  </h4>
                  <button
                    type="button"
                    onClick={handleTestAIConnection}
                    disabled={isTestingModel || !omniConfig.apiKey}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 px-2.5 py-1 rounded-lg transition disabled:opacity-40"
                  >
                    {isTestingModel ? 'Đang test ping...' : 'Kiểm tra AI'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">OmniRouter API Key</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={omniConfig.apiKey}
                        onChange={(e) => setOmniConfig({ ...omniConfig, apiKey: e.target.value })}
                        placeholder="sk-or-v1-..."
                        className="w-full px-3 py-2 pr-10 text-xs border border-slate-300 rounded-xl bg-white focus:outline-purple-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Base URL</label>
                      <input
                        type="text"
                        value={omniConfig.baseUrl}
                        onChange={(e) => setOmniConfig({ ...omniConfig, baseUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Model Name</label>
                      <input
                        type="text"
                        value={omniConfig.model}
                        onChange={(e) => setOmniConfig({ ...omniConfig, model: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {testModelResult && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    testModelResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {testModelResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{testModelResult.message} ({testModelResult.latencyMs}ms)</span>
                  </div>
                )}
              </div>

              {saveNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black animate-in fade-in">
                  {saveNotice}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
                >
                  Lưu Tất Cả Cấu Hình
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
