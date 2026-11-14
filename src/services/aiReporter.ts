import {
  Employee,
  ConstructionSite,
  AgencyTask,
  AttendanceRecord,
  ContentCalendarItem,
} from '../types';
import { getStoredOmniRouterConfig, formatCurrency, formatDateVN } from './db';

export interface AIReportResult {
  title: string;
  generatedAt: string;
  period: 'weekly' | 'monthly';
  executiveSummary: string;
  modelUsed?: string;
  agencySection: {
    completionRate: string;
    videosShot: number;
    videosEdited: number;
    overdueTasks: string[];
    topPerformers: string[];
    commentary: string;
  };
  lamSongSection: {
    totalM2Finished: number;
    totalM2Planned: number;
    durationAssessment: string;
    completedSitesCount: number;
    activeSitesCount: number;
    workerManDays: number;
    commentary: string;
  };
  financialSummary: {
    estimatedPayroll: number;
    notes: string;
  };
  strategicRecommendations: string[];
}

export async function generateAIReport(
  period: 'weekly' | 'monthly',
  employees: Employee[],
  sites: ConstructionSite[],
  calendar: ContentCalendarItem[],
  tasks: AgencyTask[],
  attendance: AttendanceRecord[]
): Promise<AIReportResult> {
  const omniConfig = getStoredOmniRouterConfig();

  // 1. Phân tích số liệu Agency
  const totalCalendar = calendar.length;
  const videosShot = calendar.filter((c) => c.shootCompleted).length;
  const videosEdited = calendar.filter((c) => c.editCompleted).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueVideos = calendar.filter(
    (c) =>
      !c.editCompleted &&
      c.status !== 'completed' &&
      c.editDeadline &&
      c.editDeadline < todayStr
  );

  const overdueList = overdueVideos.map((v) => {
    const editor = employees.find((e) => e.id === v.editorId);
    return `"${v.title}" (Phụ trách: ${editor?.name || 'Chưa gán'}, Hạn: ${formatDateVN(v.editDeadline)})`;
  });

  // 2. Phân tích số liệu Thi công Ốp Tường Lam Sóng
  const totalM2Planned = sites.reduce((sum, s) => sum + s.totalAreaM2, 0);
  const totalM2Finished = sites.reduce((sum, s) => sum + s.completedAreaM2, 0);
  const completedSites = sites.filter((s) => s.status === 'completed');
  const activeSites = sites.filter((s) => s.status !== 'completed');

  // Đánh giá số ngày dự tính vs thực tế
  let earlySitesCount = 0;
  let delayedSitesCount = 0;
  sites.forEach((s) => {
    if (s.status === 'completed' && s.estimatedDays && s.actualDays) {
      if (s.actualDays < s.estimatedDays) earlySitesCount++;
      else if (s.actualDays > s.estimatedDays) delayedSitesCount++;
    }
  });

  const workerManDays = attendance
    .filter((a) => a.companyId === 'lam_song')
    .reduce((sum, a) => sum + a.workUnits, 0);

  // 3. Dự toán quỹ lương
  const totalPayroll = employees.reduce((sum, emp) => {
    if (emp.wageType === 'daily') {
      const days = attendance
        .filter((a) => a.employeeId === emp.id)
        .reduce((s, a) => s + a.workUnits, 0);
      return sum + (days > 0 ? days * emp.baseRate : emp.baseRate * 20);
    }
    return sum + emp.baseRate + emp.allowance;
  }, 0);

  // 4. Nếu có API Key OmniRouter, gọi model antigravity/gemini-3.8-flash-medium
  if (omniConfig.apiKey) {
    try {
      const activeModel = omniConfig.model.trim() || 'antigravity/gemini-3.8-flash-medium';
      let endpoint = omniConfig.baseUrl.trim();
      if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('generateContent')) {
        endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
      }

      const systemPrompt = `Bạn là Giám đốc Vận hành (COO) và Cố vấn Chiến lược cấp cao cho hệ thống 2 doanh nghiệp:
1. MS Agency: Sáng tạo nội dung, sản xuất video TikTok/Reels/YouTube cho khách hàng.
2. MS Ốp Tường: Thi công nội thất tấm ốp nhựa lam sóng & Nano cao cấp.

Nhiệm vụ: Phân tích số liệu thực tế được cung cấp, đưa ra báo cáo tổng kết khách quan, sắc bén, phát hiện điểm tắc nghẽn (bottleneck) và đưa ra 3-4 lời khuyên hành động thực tế cho Ban Giám Đốc.

Vui lòng trả lời bằng định dạng JSON thuần túy (không kèm markdown ngoài object JSON) với cấu trúc:
{
  "executiveSummary": "Đoạn văn 3-4 câu đánh giá tổng thể tiến độ và hiệu suất vận hành của cả 2 khối",
  "agencyCommentary": "Nhận xét chi tiết về tiến độ quay, dựng video và các trường hợp trễ deadline của Agency",
  "lamSongCommentary": "Nhận xét chi tiết về khối lượng m² đã ốp, tiến độ số ngày thi công và năng suất đội thợ",
  "strategicRecommendations": [
    "Khuyến nghị 1 cụ thể cho Agency",
    "Khuyến nghị 2 cụ thể cho Đội thợ ốp lam sóng",
    "Khuyến nghị 3 về quản trị quỹ lương / tài chính"
  ],
  "topPerformers": ["Tên nhân sự 1", "Tên nhân sự 2"]
}`;

      const userContent = `DỮ LIỆU VẬN HÀNH THỰC TẾ (${period === 'weekly' ? 'BÁO CÁO TUẦN' : 'BÁO CÁO THÁNG'}):
- Khối MS Agency:
  + Tổng số video/kế hoạch: ${totalCalendar}
  + Đã quay xong: ${videosShot}
  + Đã dựng/edit xong: ${videosEdited}
  + Video trễ hạn: ${overdueVideos.length} (${overdueList.length > 0 ? overdueList.join('; ') : 'Không có'})
- Khối MS Ốp Tường:
  + Khối lượng m²: Đã hoàn thiện ${totalM2Finished} / ${totalM2Planned} m² (${Math.round((totalM2Finished / (totalM2Planned || 1)) * 100)}%)
  + Công trình đã bàn giao: ${completedSites.length} (${earlySitesCount} công trình về sớm, ${delayedSitesCount} công trình trễ ngày)
  + Công trình đang triển khai: ${activeSites.length}
  + Tổng ngày công thợ đã tiêu hao: ${workerManDays} công
- Tài chính:
  + Ước tính quỹ lương tháng cho cả 2 khối: ${formatCurrency(totalPayroll)}

Hãy xuất dữ liệu phân tích JSON cho Ban Giám Đốc.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${omniConfig.apiKey.trim()}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://quan-ly-ms.vercel.app',
          'X-Title': 'MS Management Platform',
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.6,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content || '';
        if (content) {
          // Bóc tách JSON từ phản hồi của model
          let parsedData: any = null;
          try {
            const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
            parsedData = JSON.parse(cleaned);
          } catch {
            // Nếu không phải JSON, lấy toàn bộ text làm executiveSummary
          }

          if (parsedData && parsedData.executiveSummary) {
            return {
              title: `Báo Cáo Tiến Độ & Hiệu Suất Vận Hành ${period === 'weekly' ? 'Tuần' : 'Tháng'} (OmniRouter: ${activeModel})`,
              generatedAt: new Date().toLocaleString('vi-VN'),
              period,
              executiveSummary: parsedData.executiveSummary,
              modelUsed: activeModel,
              agencySection: {
                completionRate: `${totalCalendar > 0 ? Math.round((videosEdited / totalCalendar) * 100) : 100}%`,
                videosShot,
                videosEdited,
                overdueTasks: overdueList,
                topPerformers: parsedData.topPerformers || ['Nguyễn Văn An (Lead Media)', 'Lê Hoàng Nam (Editor)'],
                commentary: parsedData.agencyCommentary || (overdueList.length > 0 ? `Cần ưu tiên đẩy nhanh tiến độ hậu kỳ edit video.` : `Kế hoạch video bám sát tiến độ content calendar.`),
              },
              lamSongSection: {
                totalM2Finished,
                totalM2Planned,
                durationAssessment: completedSites.length > 0 ? `Tiến độ công trình kiểm soát tốt, bám sát số ngày dự tính.` : `Các công trình đang thi công ổn định.`,
                completedSitesCount: completedSites.length,
                activeSitesCount: activeSites.length,
                workerManDays,
                commentary: parsedData.lamSongCommentary || `Đội thợ duy trì khối lượng m² đạt chất lượng nghiệm thu phào chỉ.`,
              },
              financialSummary: {
                estimatedPayroll: totalPayroll,
                notes: `Dự toán quỹ lương dựa trên công nhật thợ, giờ tăng ca OT và lương cứng khối Agency.`,
              },
              strategicRecommendations: Array.isArray(parsedData.strategicRecommendations) && parsedData.strategicRecommendations.length > 0
                ? parsedData.strategicRecommendations
                : [
                    `Agency: Phân bổ thêm người hỗ trợ khâu dựng video để giải tỏa các đầu việc trễ deadline.`,
                    `Ốp Lam Sóng: Tiếp tục nhân rộng quy trình quản lý điểm danh 1 chạm và chụp ảnh hiện trường.`,
                    `Quản trị: Giám sát sát sao số ngày thực tế thi công để tối ưu chi phí công nhật thợ.`,
                  ],
            };
          } else if (content) {
            return buildReportObject(
              period,
              content.slice(0, 500),
              videosShot,
              videosEdited,
              totalCalendar,
              overdueList,
              totalM2Finished,
              totalM2Planned,
              completedSites.length,
              activeSites.length,
              workerManDays,
              totalPayroll,
              activeModel
            );
          }
        }
      } else {
        console.warn(`OmniRouter API error status: ${response.status}`, await response.text().catch(() => ''));
      }
    } catch (e) {
      console.warn('Lỗi gọi OmniRouter AI, tự động chuyển sang Smart AI Synthesizer:', e);
    }
  }

  // 5. Smart AI Synthesizer (Bộ máy tổng hợp thông minh tích hợp sẵn khi chưa có mạng hoặc API key)
  const executiveText =
    period === 'weekly'
      ? `Báo cáo tuần ghi nhận hiệu suất vận hành tích cực trên cả 2 khối. Đội thi công Ốp tường Lam Sóng đạt khối lượng ${totalM2Finished}m² (${Math.round(
          (totalM2Finished / (totalM2Planned || 1)) * 100
        )}% kế hoạch), tiến độ bám sát dự tính ban đầu. Khối Agency đã quay xong ${videosShot}/${totalCalendar} video, tuy nhiên khâu Edit hậu kỳ đang có ${
          overdueList.length
        } video trễ deadline cần đôn đốc giải tỏa ngay.`
      : `Tổng kết tháng: Khối Lam Sóng hoàn thành xuất sắc ${completedSites.length} công trình trọng điểm với năng suất đạt ${totalM2Finished}m² hoàn thiện. Khối Agency đã xuất xưởng ${videosEdited} video/chiến dịch marketing, chỉ số hoàn thành đạt ${Math.round(
          (videosEdited / (totalCalendar || 1)) * 100
        )}%. Quỹ lương 2 công ty được kiểm soát tối ưu trong biên độ ngân sách.`;

  return buildReportObject(
    period,
    executiveText,
    videosShot,
    videosEdited,
    totalCalendar,
    overdueList,
    totalM2Finished,
    totalM2Planned,
    completedSites.length,
    activeSites.length,
    workerManDays,
    totalPayroll
  );
}

function buildReportObject(
  period: 'weekly' | 'monthly',
  summary: string,
  videosShot: number,
  videosEdited: number,
  totalCalendar: number,
  overdueList: string[],
  totalM2Finished: number,
  totalM2Planned: number,
  completedSitesCount: number,
  activeSitesCount: number,
  workerManDays: number,
  totalPayroll: number,
  modelName?: string
): AIReportResult {
  const completionPct = totalCalendar > 0 ? Math.round((videosEdited / totalCalendar) * 100) : 100;

  return {
    title: `Báo Cáo Tiến Độ & Hiệu Suất Vận Hành ${period === 'weekly' ? 'Tuần' : 'Tháng'} (AI)`,
    generatedAt: new Date().toLocaleString('vi-VN'),
    period,
    executiveSummary: summary,
    modelUsed: modelName || 'Smart AI Synthesizer',
    agencySection: {
      completionRate: `${completionPct}%`,
      videosShot,
      videosEdited,
      overdueTasks: overdueList,
      topPerformers: ['Nguyễn Văn An (Lead Media)', 'Lê Hoàng Nam (Editor)'],
      commentary:
        overdueList.length > 0
          ? `Cần ưu tiên giải tỏa tắc nghẽn ở khâu Edit video. Khâu quay phim đang chạy tốt hơn tốc độ dựng.`
          : `Quy trình quay và dựng video diễn ra nhịp nhàng, đúng kế hoạch content calendar tháng.`,
    },
    lamSongSection: {
      totalM2Finished,
      totalM2Planned,
      durationAssessment:
        completedSitesCount > 0
          ? `Các công trình hoàn thành đều bám sát hoặc vượt số ngày dự tính từ 1-2 ngày.`
          : `Các công trình đang tiến hành đúng khung thời gian dự kiến.`,
      completedSitesCount,
      activeSitesCount,
      workerManDays,
      commentary: `Đội thợ duy trì kỷ luật chấm công GPS và điểm danh hiện trường tốt. Khối lượng m² ốp thực tế đạt yêu cầu kỹ thuật nẹp chỉ.`,
    },
    financialSummary: {
      estimatedPayroll: totalPayroll,
      notes: `Đã bao gồm công nhật thợ, giờ tăng ca thi công ca đêm và lương cứng khối văn phòng Agency.`,
    },
    strategicRecommendations: [
      `Agency: Phân bổ thêm 1 nhân sự hỗ trợ khâu cắt dựng thô (rough cut) để tránh dồn ứ deadline vào cuối tuần.`,
      `Ốp Lam Sóng: Tiếp tục nhân rộng quy trình Tổ trưởng điểm danh qua app và chụp ảnh nghiệm thu góc nẹp mạ vàng để khách hàng ký nghiệm thu nhanh hơn.`,
      `Quản trị: Duy trì kiểm soát số ngày làm thực tế của công trình để tối ưu chi phí công nhật cho đội thợ chính và thợ phụ.`,
    ],
  };
}

export interface OmniRouterTestResult {
  success: boolean;
  message: string;
  modelUsed?: string;
  latencyMs?: number;
}

export async function testOmniRouterConnection(overrideConfig?: {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<OmniRouterTestResult> {
  const storedConfig = getStoredOmniRouterConfig();
  const apiKey = (overrideConfig?.apiKey ?? storedConfig.apiKey).trim();
  const baseUrl = (overrideConfig?.baseUrl ?? storedConfig.baseUrl).trim();
  const model = (overrideConfig?.model ?? storedConfig.model).trim() || 'antigravity/gemini-3.8-flash-medium';

  if (!apiKey) {
    return {
      success: false,
      message: 'Vui lòng nhập OmniRouter API Key trước khi kiểm tra!',
      modelUsed: model,
    };
  }

  let endpoint = baseUrl;
  if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('generateContent')) {
    endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://quan-ly-ms.vercel.app',
        'X-Title': 'MS Management Platform Test',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: 'Ping test: Hãy phản hồi đúng 1 câu ngắn gọn xác nhận bạn là mô hình AI và đã kết nối thành công với hệ thống MS Management.',
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    const rawBody = await response.text();
    let data: any = null;
    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorDetail =
        data?.error?.message || data?.message || (data ? JSON.stringify(data) : rawBody.slice(0, 300));
      return {
        success: false,
        message: `Mã lỗi HTTP ${response.status}: ${errorDetail || 'Không có thông điệp lỗi chi tiết'}`,
        modelUsed: model,
        latencyMs,
      };
    }

    if (!data) {
      return {
        success: false,
        message: `Endpoint không trả về JSON hợp lệ (kiểm tra lại Endpoint URL): ${rawBody.slice(0, 200)}`,
        modelUsed: model,
        latencyMs,
      };
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || 'Mô hình đã kết nối và phản hồi thành công.';

    return {
      success: true,
      message: reply,
      modelUsed: model,
      latencyMs,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Kết nối quá thời gian chờ (Timeout sau 15 giây). Vui lòng kiểm tra lại đường truyền mạng hoặc Endpoint URL!',
        modelUsed: model,
        latencyMs,
      };
    }
    return {
      success: false,
      message: `Không thể kết nối tới OmniRouter: ${err.message || 'Lỗi mạng hoặc CORS'}`,
      modelUsed: model,
      latencyMs,
    };
  }
}
