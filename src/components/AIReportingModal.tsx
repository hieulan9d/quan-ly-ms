import React, { useState } from 'react';
import {
  Employee,
  ConstructionSite,
  AgencyTask,
  AttendanceRecord,
  ContentCalendarItem,
} from '../types';
import { generateAIReport, AIReportResult } from '../services/aiReporter';
import { getStoredGeminiApiKey, saveGeminiApiKey, formatCurrency } from '../services/db';
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
  Key
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

  // Gemini API Key config
  const [apiKey, setApiKey] = useState<string>(getStoredGeminiApiKey);
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [keySaved, setKeySaved] = useState<boolean>(false);

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

  // Lưu API Key
  const handleSaveKey = () => {
    saveGeminiApiKey(apiKey);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      setShowKeyInput(false);
    }, 1500);
  };

  // Sao chép nội dung báo cáo để gửi Zalo cho Sếp / Cổ đông / Nhóm công ty
  const handleCopyZalo = () => {
    if (!report) return;

    const text = `
📊 ${report.title.toUpperCase()}
🕒 Thời gian lập: ${report.generatedAt}

1. ĐÁNH GIÁ CHUNG:
${report.executiveSummary}

2. KHỐI AGENCY & TRUYỀN THÔNG:
- Tiến độ hoàn thành: ${report.agencySection.completionRate}
- Đã quay: ${report.agencySection.videosShot} video | Đã edit xong: ${report.agencySection.videosEdited} video
${
  report.agencySection.overdueTasks.length > 0
    ? `⚠️ Việc trễ hạn: ${report.agencySection.overdueTasks.join(', ')}`
    : '✓ Không có việc nào trễ hạn.'
}
- Đánh giá: ${report.agencySection.commentary}

3. KHỐI THI CÔNG ỐP TƯỜNG LAM SÓNG:
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-1.5">
              <span>Trợ Lý AI Phân Tích & Báo Cáo Tiến Độ</span>
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            </h3>
            <p className="text-xs text-slate-500">
              Tự động tổng hợp và đánh giá hiệu suất 2 công ty: Agency & Ốp Tường Lam Sóng
            </p>
          </div>
        </div>

        {/* Action button bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerate('weekly')}
              disabled={loading}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                period === 'weekly' && report
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Báo Cáo Hàng Tuần</span>
            </button>

            <button
              onClick={() => handleGenerate('monthly')}
              disabled={loading}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                period === 'monthly' && report
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Báo Cáo Hàng Tháng</span>
            </button>
          </div>

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? '✓ Đã cài Gemini API' : '+ Nhập Gemini Key'}</span>
          </button>
        </div>

        {/* Cấu hình Gemini Key (Tùy chọn) */}
        {showKeyInput && (
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 mb-4 text-xs">
            <label className="block font-bold text-purple-900 mb-1">
              Google Gemini API Key (Miễn phí từ Google AI Studio):
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-white border border-purple-300 rounded-lg px-2.5 py-1 text-xs"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="bg-purple-600 text-white font-bold px-3 py-1 rounded-lg text-xs hover:bg-purple-700"
              >
                Lưu
              </button>
            </div>
            {keySaved && <span className="text-emerald-700 text-[11px] font-bold block mt-1">✓ Đã lưu key!</span>}
            <span className="text-[11px] text-slate-500 block mt-1">
              * Không bắt buộc. Phần mềm đã có sẵn bộ máy AI Synthesizer phân tích dữ liệu tự động.
            </span>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Bot className="w-10 h-10 mx-auto text-purple-600 animate-bounce" />
            <p className="text-sm font-bold text-slate-700">Trí tuệ nhân tạo đang phân tích dữ liệu...</p>
            <p className="text-xs text-slate-400">Đang rà soát tiến độ m² lam sóng, deadline video agency và bảng công thợ</p>
          </div>
        )}

        {/* Report Content */}
        {!loading && !report && (
          <div className="text-center py-10 text-slate-400">
            <Bot className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Bấm vào nút trên để tạo báo cáo tự động bằng AI</p>
            <button
              onClick={() => handleGenerate('weekly')}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              + Tạo Báo Cáo Tuần Này Ngay
            </button>
          </div>
        )}

        {!loading && report && (
          <div className="space-y-4 text-xs sm:text-sm animate-in fade-in">
            {/* Top action: Copy to Zalo */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Lập lúc: {report.generatedAt}</span>
              <button
                onClick={handleCopyZalo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Đã sao chép vào bộ nhớ!' : 'Sao Chép Báo Cáo Gửi Zalo'}</span>
              </button>
            </div>

            {/* 1. Tóm tắt của AI */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200">
              <span className="text-xs font-black text-purple-900 block mb-1">
                1. ĐÁNH GIÁ CHUNG CỦA AI (EXECUTIVE SUMMARY):
              </span>
              <p className="text-slate-800 leading-relaxed font-medium">{report.executiveSummary}</p>
            </div>

            {/* 2. Khối Agency */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <Video className="w-4 h-4" />
                  <span>2. KHỐI AGENCY & NỘI DUNG:</span>
                </span>
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                  Hoàn thành: {report.agencySection.completionRate}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Video đã quay:</span>
                  <div className="font-black text-slate-900 text-base">{report.agencySection.videosShot} video</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500">Video đã edit xong:</span>
                  <div className="font-black text-emerald-600 text-base">{report.agencySection.videosEdited} video</div>
                </div>
              </div>

              {report.agencySection.overdueTasks.length > 0 ? (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <span className="font-bold flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cảnh báo việc trễ hạn:</span>
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {report.agencySection.overdueTasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Không có task nào trễ hạn. Đúng tiến độ!</span>
                </div>
              )}

              <p className="text-xs text-slate-600 italic pt-1">{report.agencySection.commentary}</p>
            </div>

            {/* 3. Khối Ốp Tường Lam Sóng */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="flex items-center gap-1.5 text-orange-700">
                  <Layers className="w-4 h-4" />
                  <span>3. KHỐI THI CÔNG ỐP LAM SÓNG:</span>
                </span>
                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">
                  {report.lamSongSection.totalM2Finished} / {report.lamSongSection.totalM2Planned} m²
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <span className="text-slate-500">Đã bàn giao:</span>
                  <div className="font-black text-emerald-600 text-base">{report.lamSongSection.completedSitesCount}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <span className="text-slate-500">Đang thi công:</span>
                  <div className="font-black text-orange-600 text-base">{report.lamSongSection.activeSitesCount}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <span className="text-slate-500">Công thợ đã tiêu:</span>
                  <div className="font-black text-slate-800 text-base">{report.lamSongSection.workerManDays} công</div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
                ⏱️ Đánh giá thời gian (Dự tính vs Thực tế): {report.lamSongSection.durationAssessment}
              </div>

              <p className="text-xs text-slate-600 italic pt-1">{report.lamSongSection.commentary}</p>
            </div>

            {/* 4. Tài chính & Quỹ lương */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">TẠM TÍNH QUỸ LƯƠNG 2 CÔNG TY:</span>
                <div className="text-xl font-black text-slate-900">
                  {formatCurrency(report.financialSummary.estimatedPayroll)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{report.financialSummary.notes}</div>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600 opacity-80" />
            </div>

            {/* 5. Đề xuất hành động chiến lược */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
              <span className="font-black text-emerald-900 block mb-1.5 flex items-center gap-1">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>5. ĐỀ XUẤT HÀNH ĐỘNG CỦA AI CHO GIÁM ĐỐC:</span>
              </span>
              <ul className="space-y-1 text-slate-700 pl-4 list-decimal font-medium">
                {report.strategicRecommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
        >
          Đóng Báo Cáo
        </button>
      </div>
    </div>
  );
};
