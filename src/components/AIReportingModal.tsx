import React, { useState } from 'react';
import {
  Employee,
  ConstructionSite,
  AgencyTask,
  AttendanceRecord,
  ContentCalendarItem,
} from '../types';
import { generateAIReport, AIReportResult } from '../services/aiReporter';
import {
  getStoredOmniRouterConfig,
  saveOmniRouterConfig,
  DEFAULT_OMNIROUTER_BASE_URL,
  DEFAULT_OMNIROUTER_MODEL,
  formatCurrency,
} from '../services/db';
import {
  Sparkles,
  Bot,
  Copy,
  Check,
  Calendar,
  Layers,
  Video,
  Clock,
  AlertTriangle,
  Award,
  DollarSign,
  X,
  Key,
  Cpu,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';

interface AIReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  sites: ConstructionSite[];
  calendar: ContentCalendarItem[];
  tasks: AgencyTask[];
  attendance: AttendanceRecord[];
}

export const AIReportingModal: React.FC<AIReportingModalProps> = ({
  isOpen,
  onClose,
  employees,
  sites,
  calendar,
  tasks,
  attendance,
}) => {
  if (!isOpen) return null;

  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [report, setReport] = useState<AIReportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // OmniRouter Config States
  const [omniConfig, setOmniConfig] = useState(getStoredOmniRouterConfig);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string>('');

  // Tạo báo cáo AI
  const handleGenerate = async (selectedPeriod: 'weekly' | 'monthly') => {
    setLoading(true);
    setPeriod(selectedPeriod);
    try {
      const result = await generateAIReport(
        selectedPeriod,
        employees,
        sites,
        calendar,
        tasks,
        attendance
      );
      setReport(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Lưu cấu hình OmniRouter
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveOmniRouterConfig({
      apiKey: omniConfig.apiKey,
      baseUrl: omniConfig.baseUrl || DEFAULT_OMNIROUTER_BASE_URL,
      model: omniConfig.model || DEFAULT_OMNIROUTER_MODEL,
    });
    setSaveNotice('✓ Đã lưu cấu hình OmniRouter thành công!');
    setTimeout(() => {
      setSaveNotice('');
      setShowConfig(false);
    }, 1500);
  };

  // Sao chép nội dung báo cáo để gửi Zalo cho Sếp / Cổ đông / Nhóm công ty
  const handleCopyZalo = () => {
    if (!report) return;

    const text = `
📊 ${report.title.toUpperCase()}
🤖 Mô hình AI: ${report.modelUsed || DEFAULT_OMNIROUTER_MODEL}
🕒 Thời gian lập: ${report.generatedAt}

1. ĐÁNH GIÁ CHUNG:
${report.executiveSummary}

2. KHỐI MS AGENCY (TRUYỀN THÔNG & VIDEO):
- Tiến độ hoàn thành: ${report.agencySection.completionRate}
- Đã quay: ${report.agencySection.videosShot} video | Đã edit xong: ${report.agencySection.videosEdited} video
${
  report.agencySection.overdueTasks.length > 0
    ? `⚠️ Việc trễ hạn: ${report.agencySection.overdueTasks.join(', ')}`
    : '✓ Không có việc nào trễ hạn.'
}
- Đánh giá: ${report.agencySection.commentary}

3. KHỐI MS THI CÔNG ỐP TƯỜNG LAM SÓNG:
- Khối lượng hoàn thiện: ${report.lamSongSection.totalM2Finished} / ${report.lamSongSection.totalM2Planned} m²
- Số công trình đã bàn giao: ${report.lamSongSection.completedSitesCount} | Đang thi công: ${report.lamSongSection.activeSitesCount}
- Đánh giá tiến độ (Dự tính vs Thực tế): ${report.lamSongSection.durationAssessment}
- Tổng công thợ đã tiêu hao: ${report.lamSongSection.workerManDays} công nhật

4. TÀI CHÍNH & QUỸ LƯƠNG DỰ KIẾN:
- Tạm tính quỹ lương 2 công ty: ${formatCurrency(report.financialSummary.estimatedPayroll)}
- Ghi chú: ${report.financialSummary.notes}

5. ĐỀ XUẤT HÀNH ĐỘNG CỦA AI:
${report.strategicRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isConfigured = !!omniConfig.apiKey.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-1.5">
              <span>Trợ Lý AI Phân Tích & Báo Cáo Tiến Độ</span>
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span>Được hỗ trợ bởi:</span>
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-mono text-[11px]">
                antigravity/gemini-3.8-flash-medium
              </span>
            </p>
          </div>
        </div>

        {/* Action button bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerate('weekly')}
              disabled={loading}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 ${
                period === 'weekly' && report
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>Báo Cáo Tuần</span>
            </button>

            <button
              onClick={() => handleGenerate('monthly')}
              disabled={loading}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 ${
                period === 'monthly' && report
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>Báo Cáo Tháng</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 active:scale-95 ${
              isConfigured
                ? 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{isConfigured ? '✓ OmniRouter: gemini-3.8' : '⚙️ Cài đặt OmniRouter'}</span>
          </button>
        </div>

        {/* Cấu hình OmniRouter AI */}
        {showConfig && (
          <form onSubmit={handleSaveConfig} className="p-4 bg-gradient-to-br from-purple-50/90 to-indigo-50/60 rounded-2xl border border-purple-200 mb-4 text-xs space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-purple-200/80">
              <span className="font-black text-purple-950 flex items-center gap-1.5 text-xs">
                <Settings className="w-4 h-4 text-purple-600" />
                <span>Cấu Hình OmniRouter AI (Mô hình: antigravity/gemini-3.8-flash-medium)</span>
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                OpenAI-Compatible
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                OmniRouter API Key:
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Nhập API key của OmniRouter..."
                  value={omniConfig.apiKey}
                  onChange={(e) => setOmniConfig({ ...omniConfig, apiKey: e.target.value })}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô hình AI (Model ID):
                </label>
                <input
                  type="text"
                  value={omniConfig.model}
                  onChange={(e) => setOmniConfig({ ...omniConfig, model: e.target.value })}
                  placeholder="antigravity/gemini-3.8-flash-medium"
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Endpoint URL / Gateway:
                </label>
                <input
                  type="text"
                  value={omniConfig.baseUrl}
                  onChange={(e) => setOmniConfig({ ...omniConfig, baseUrl: e.target.value })}
                  placeholder="https://api.omnirouter.ai/v1/chat/completions"
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                * Có thể lưu tại đây hoặc qua biến môi trường <code className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded font-mono">VITE_OMNIROUTER_API_KEY</code> trên Vercel.
              </span>
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition active:scale-95 shrink-0"
              >
                Lưu Cấu Hình
              </button>
            </div>

            {saveNotice && (
              <div className="text-emerald-700 font-bold text-[11px] bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveNotice}</span>
              </div>
            )}
          </form>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">
                Mô hình <span className="text-purple-600 font-mono">antigravity/gemini-3.8-flash-medium</span> đang phân tích...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Đang rà soát tiến độ m² lam sóng, deadline video agency và bảng công thợ qua OmniRouter
              </p>
            </div>
          </div>
        )}

        {/* Khi chưa tạo báo cáo */}
        {!loading && !report && (
          <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Bot className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">Chưa có bản báo cáo nào được tạo</p>
            <p className="text-xs text-slate-400 mt-1">
              Bấm vào <b>"Báo Cáo Tuần"</b> hoặc <b>"Báo Cáo Tháng"</b> ở trên để AI tạo ngay!
            </p>
          </div>
        )}

        {/* Hiển thị Báo Cáo AI */}
        {!loading && report && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header báo cáo */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {report.period === 'weekly' ? 'Báo cáo tuần' : 'Báo cáo tháng'}
                </span>
                <h4 className="font-black text-base text-slate-900 mt-1">{report.title}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                  <span>Lập lúc: {report.generatedAt}</span>
                  <span>•</span>
                  <span className="text-purple-700 font-bold font-mono">
                    Model: {report.modelUsed || 'antigravity/gemini-3.8-flash-medium'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCopyZalo}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã chép!' : 'Copy gửi Zalo'}</span>
              </button>
            </div>

            {/* 1. Đánh giá chung */}
            <div className="p-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 rounded-2xl border border-purple-200/80">
              <h5 className="font-extrabold text-xs text-purple-950 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>1. Tóm Tắt Chiến Lược Của Giám Đốc Vận Hành (AI)</span>
              </h5>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {report.executiveSummary}
              </p>
            </div>

            {/* 2. Khối Agency */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  <span>2. Khối MS Agency (Nội Dung & Video)</span>
                </span>
                <span className="text-xs font-black text-purple-600">
                  Hoàn thành: {report.agencySection.completionRate}
                </span>
              </h5>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Đã quay xong:</span>
                  <span className="font-black text-slate-800 text-sm">
                    {report.agencySection.videosShot} video
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Đã edit hoàn tất:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    {report.agencySection.videosEdited} video
                  </span>
                </div>
              </div>

              {report.agencySection.overdueTasks.length > 0 ? (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs mb-3">
                  <div className="font-bold text-rose-800 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cảnh báo việc trễ deadline ({report.agencySection.overdueTasks.length}):</span>
                  </div>
                  <ul className="list-disc list-inside text-rose-700 text-[11px] space-y-0.5">
                    {report.agencySection.overdueTasks.map((t, idx) => (
                      <li key={idx} className="truncate">{t}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất sắc! Toàn bộ video đều bám sát đúng hạn deadline.</span>
                </div>
              )}

              <p className="text-[11px] text-slate-600 italic">
                * Nhận xét: {report.agencySection.commentary}
              </p>
            </div>

            {/* 3. Khối Ốp Lam Sóng */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-600" />
                  <span>3. Khối MS Ốp Tường (Công Trình Lam Sóng)</span>
                </span>
                <span className="text-xs font-black text-orange-600">
                  {report.lamSongSection.totalM2Finished} / {report.lamSongSection.totalM2Planned} m²
                </span>
              </h5>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-500 block text-[10px]">Đã bàn giao:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {report.lamSongSection.completedSitesCount} công trình
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-500 block text-[10px]">Đang thi công:</span>
                  <span className="font-black text-orange-700 text-sm">
                    {report.lamSongSection.activeSitesCount} công trình
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-500 block text-[10px]">Tổng công thợ:</span>
                  <span className="font-black text-blue-700 text-sm">
                    {report.lamSongSection.workerManDays} công
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1">
                <p>• <b>Tiến độ thời gian:</b> {report.lamSongSection.durationAssessment}</p>
                <p>• <b>Đánh giá chất lượng:</b> {report.lamSongSection.commentary}</p>
              </div>
            </div>

            {/* 4. Tài chính & Quỹ Lương */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">DỰ TOÁN QUỸ LƯƠNG 2 KHỐI:</span>
                <span className="text-lg font-black text-slate-900">
                  {formatCurrency(report.financialSummary.estimatedPayroll)}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">{report.financialSummary.notes}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* 5. Khuyến nghị chiến lược */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
              <h5 className="font-extrabold text-xs text-amber-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>5. Đề Xuất Hành Động Cụ Thể Của AI Cho Ban Giám Đốc</span>
              </h5>
              <div className="space-y-1.5 text-xs text-amber-900 font-medium">
                {report.strategicRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
