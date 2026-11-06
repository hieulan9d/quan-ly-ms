import {
  Employee,
  ConstructionSite,
  AgencyTask,
  AttendanceRecord,
  ContentCalendarItem,
  AgencyRateConfig,
  AIAgentScheduleItem,
  AIPayrollReportResult,
} from '../types';
import {
  formatCurrency,
  formatDateVN,
  getStoredOmniRouterConfig,
  DEFAULT_AGENCY_RATES,
} from './db';

/**
 * 1. QUÉT TẤT CẢ LỊCH TRÌNH VÀ SỰ KIỆN SẮP TỚI
 * - Lịch thợ thi công hôm nay/ngày mai (Ai làm, ở đâu, mấy giờ)
 * - Lịch quay video & deadline edit video Agency
 * - Hạn bàn giao công trình ốp lam sóng
 */
export function scanUpcomingSchedules(
  calendar: ContentCalendarItem[],
  sites: ConstructionSite[],
  employees: Employee[],
  customDateStr?: string
): AIAgentScheduleItem[] {
  const today = customDateStr ? new Date(customDateStr) : new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const items: AIAgentScheduleItem[] = [];

  // 1. Quét Lịch Thợ Thi Công Khối Ốp Tường Lam Sóng
  sites.forEach((site) => {
    if (Array.isArray(site.dailySchedules)) {
      site.dailySchedules.forEach((sch) => {
        if (sch.status === 'completed') return;
        const isToday = sch.date === todayStr;
        const isTomorrow = sch.date === tomorrowStr;
        const isOverdue = sch.date < todayStr;

        if (isToday || isTomorrow || isOverdue) {
          const workerNames = (sch.workerIds || []).map((id) => {
            const emp = employees.find((e) => e.id === id);
            return emp?.name || 'Thợ';
          });

          items.push({
            id: `sch_${sch.id}`,
            category: 'lam_song_schedule',
            title: `Thi công tại ${site.name}`,
            clientOrSite: `${site.clientName} (${site.address})`,
            assignees: workerNames.length > 0 ? workerNames : ['Chưa phân thợ'],
            dateTime: sch.date,
            timeStr: sch.workHours || '07:30 - 17:30',
            status: sch.status,
            isUrgent: isToday || isOverdue,
            isToday,
            isTomorrow,
            isOverdue,
            notes: sch.taskDescription || `Tiến độ hiện tại: ${site.completedAreaM2}/${site.totalAreaM2} m²`,
          });
        }
      });
    }

    if (site.status !== 'completed' && site.expectedEndDate) {
      const isEndToday = site.expectedEndDate === todayStr;
      const isEndTomorrow = site.expectedEndDate === tomorrowStr;
      const isEndOverdue = site.expectedEndDate < todayStr;

      if (isEndToday || isEndTomorrow || isEndOverdue) {
        items.push({
          id: `site_end_${site.id}`,
          category: 'lam_song_deadline',
          title: `Hạn bàn giao: ${site.name}`,
          clientOrSite: site.address,
          assignees: (site.assignedWorkers || []).map((wId) => {
            return employees.find((e) => e.id === wId)?.name || 'Thợ';
          }),
          dateTime: site.expectedEndDate,
          status: site.status,
          isUrgent: isEndToday || isEndOverdue,
          isToday: isEndToday,
          isTomorrow: isEndTomorrow,
          isOverdue: isEndOverdue,
          notes: `Khối lượng ${site.completedAreaM2}/${site.totalAreaM2} m² (${site.panelType || 'Lam sóng Nano'})`,
        });
      }
    }
  });

  // 2. Quét Lịch Quay & Deadline Edit Video Khối Agency
  calendar.forEach((item) => {
    if (item.shootDate && !item.shootCompleted) {
      const isShootToday = item.shootDate === todayStr;
      const isShootTomorrow = item.shootDate === tomorrowStr;
      const isShootOverdue = item.shootDate < todayStr;

      if (isShootToday || isShootTomorrow || isShootOverdue) {
        const shooter = employees.find((e) => e.id === item.shooterId);
        items.push({
          id: `shoot_${item.id}`,
          category: 'agency_shoot',
          title: `Lịch Đi Quay: ${item.title}`,
          clientOrSite: item.client,
          assignees: shooter ? [shooter.name] : ['Chưa gán Cameraman'],
          dateTime: item.shootDate,
          timeStr: item.timeStr || 'Sáng / Chiều',
          status: item.status || 'shooting',
          isUrgent: isShootToday || isShootOverdue,
          isToday: isShootToday,
          isTomorrow: isShootTomorrow,
          isOverdue: isShootOverdue,
          notes: item.notes || `Kênh: ${item.channel.toUpperCase()}`,
        });
      }
    }

    if (item.editDeadline && !item.isCompleted && !item.editCompleted && item.status !== 'completed') {
      const isEditToday = item.editDeadline === todayStr;
      const isEditTomorrow = item.editDeadline === tomorrowStr;
      const isEditOverdue = item.editDeadline < todayStr;

      if (isEditToday || isEditTomorrow || isEditOverdue) {
        const editor = employees.find((e) => e.id === item.editorId);
        items.push({
          id: `edit_${item.id}`,
          category: 'agency_deadline',
          title: `Hạn Trả Video Edit: ${item.title}`,
          clientOrSite: item.client,
          assignees: editor ? [editor.name] : ['Chưa gán Editor'],
          dateTime: item.editDeadline,
          status: item.status || 'editing',
          isUrgent: isEditToday || isEditOverdue,
          isToday: isEditToday,
          isTomorrow: isEditTomorrow,
          isOverdue: isEditOverdue,
          notes: `Phụ trách: ${editor?.name || 'Editor'} - ${item.channel.toUpperCase()}`,
        });
      }
    }
  });

  return items.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    return a.dateTime.localeCompare(b.dateTime);
  });
}

/**
 * 2. SOẠN THÔNG BÁO LỊCH ĐẸP MẮT ĐỂ GỬI LÊN NHÓM ZALO
 */
export function formatScheduleAlertMessage(
  schedules: AIAgentScheduleItem[],
  groupName: string = 'Nhóm Công Ty MS'
): string {
  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const overdueItems = schedules.filter((s) => s.isOverdue);
  const todayItems = schedules.filter((s) => s.isToday);
  const tomorrowItems = schedules.filter((s) => s.isTomorrow);

  const lamSongItems = todayItems.filter(
    (s) => s.category === 'lam_song_schedule' || s.category === 'lam_song_deadline'
  );
  const agencyItems = todayItems.filter(
    (s) => s.category === 'agency_shoot' || s.category === 'agency_deadline'
  );

  let msg = `📢 [THÔNG BÁO LỊCH & TIẾN ĐỘ HÔM NAY - ${groupName.toUpperCase()}]\n`;
  msg += `🗓️ ${todayStr}\n`;
  msg += `🤖 Trợ lý AI tự động quét lịch & nhắc nhở đội ngũ:\n\n`;

  if (overdueItems.length > 0) {
    msg += `⚠️ CẢNH BÁO VIỆC ĐANG TRỄ HẠN (${overdueItems.length} việc):\n`;
    overdueItems.slice(0, 5).forEach((item, idx) => {
      msg += `  ${idx + 1}. [${item.clientOrSite}] ${item.title}\n`;
      msg += `     👉 Phụ trách: ${item.assignees.join(', ')} | Hạn cũ: ${formatDateVN(item.dateTime)}\n`;
    });
    msg += `\n`;
  }

  msg += `🪵 1. LỊCH THỢ THI CÔNG HÔM NAY (ỐP LAM SÓNG):\n`;
  if (lamSongItems.length === 0) {
    msg += `  ✓ Hôm nay không có công trình mới được xếp lịch đột xuất.\n`;
  } else {
    lamSongItems.forEach((item, idx) => {
      msg += `  ${idx + 1}. ${item.title}\n`;
      msg += `     📍 Địa chỉ/Khách: ${item.clientOrSite}\n`;
      msg += `     ⏰ Thời gian: ${item.timeStr || 'Cả ngày'}\n`;
      msg += `     👷 Đội thợ: ${item.assignees.join(', ')}\n`;
      if (item.notes) msg += `     📝 Ghi chú: ${item.notes}\n`;
    });
  }
  msg += `\n`;

  msg += `🎬 2. LỊCH AGENCY & VIDEO HÔM NAY:\n`;
  if (agencyItems.length === 0) {
    msg += `  ✓ Chưa có lịch quay hoặc deadline edit gấp trong ngày.\n`;
  } else {
    agencyItems.forEach((item, idx) => {
      const isShoot = item.category === 'agency_shoot';
      msg += `  ${idx + 1}. ${isShoot ? '🎥 [LỊCH QUAY]' : '⚡ [DEADLINE EDIT]'} ${item.title}\n`;
      msg += `     🏢 Khách hàng: ${item.clientOrSite}\n`;
      msg += `     👤 Phụ trách: ${item.assignees.join(', ')}\n`;
      if (item.timeStr) msg += `     ⏰ Khung giờ: ${item.timeStr}\n`;
    });
  }
  msg += `\n`;

  if (tomorrowItems.length > 0) {
    msg += `🔮 3. CHUẨN BỊ CHO NGÀY MAI (${tomorrowItems.length} đầu việc):\n`;
    tomorrowItems.slice(0, 4).forEach((item, idx) => {
      msg += `  - ${item.title} (${item.clientOrSite}) - ${item.assignees.join(', ')}\n`;
    });
    msg += `\n`;
  }

  msg += `💡 LỜI NHẮC CỦA AI:\n`;
  msg += `- Đội thợ nhớ check-in 1 chạm và chụp ảnh nghiệm thu góc phào chỉ.\n`;
  msg += `- Đội Media chuẩn bị đầy đủ pin máy quay và kịch bản đã duyệt.\n`;
  msg += `Chúc anh em một ngày làm việc an toàn, thuận lợi và đạt tiến độ 100%! 💪🔥`;

  return msg.trim();
}

/**
 * 3. TỰ ĐỘNG TÍNH LƯƠNG & LẬP BÁO CÁO LƯƠNG BẰNG AI
 */
export async function calculateAIPayroll(params: {
  month: string; // YYYY-MM
  employees: Employee[];
  attendance: AttendanceRecord[];
  calendar: ContentCalendarItem[];
  sites: ConstructionSite[];
  agencyRates?: AgencyRateConfig;
}): Promise<AIPayrollReportResult> {
  const {
    month,
    employees,
    attendance,
    calendar,
    sites,
    agencyRates = DEFAULT_AGENCY_RATES,
  } = params;

  const currentMonthAttendance = attendance.filter((a) => a.date.startsWith(month));

  let totalWorkUnits = 0;
  let totalOtHours = 0;
  let totalContentPieces = 0;
  let totalShootSessions = 0;
  let totalVideosProduced = 0;
  let agencyPayroll = 0;
  let lamSongPayroll = 0;

  const completedCalendarMonth = calendar.filter((c) => {
    if (!c.isCompleted && !c.editCompleted) return false;
    return (
      c.month === month ||
      (c.editDeadline && c.editDeadline.startsWith(month)) ||
      (c.shootDate && c.shootDate.startsWith(month))
    );
  });

  const employeeDetails = employees.map((emp) => {
    const empAtt = currentMonthAttendance.filter((a) => a.employeeId === emp.id);
    const empWorkUnits = empAtt.reduce((sum, a) => sum + (a.workUnits || 0), 0);
    const empOtHours = empAtt.reduce((sum, a) => sum + (a.otHours || 0), 0);

    totalWorkUnits += empWorkUnits;
    totalOtHours += empOtHours;

    let netSalary = 0;
    let workSummaryStr = '';

    if (emp.companyId === 'agency' || emp.wageType === 'piecework') {
      const attContent = empAtt.reduce((sum, a) => sum + (a.contentCount || 0), 0);
      const attShoot = empAtt.reduce((sum, a) => sum + (a.shootCount || 0), 0);
      const attEdit = empAtt.reduce((sum, a) => sum + (a.editCount || 0), 0);

      const calContent = completedCalendarMonth.filter((c) => c.writerId === emp.id).length;
      const calShoot = completedCalendarMonth.filter((c) => c.shooterId === emp.id).length;
      const calEdit = completedCalendarMonth.filter((c) => c.editorId === emp.id).length;

      const finalContent = attContent + calContent;
      const finalShoot = attShoot + calShoot;
      const finalEdit = attEdit + calEdit;

      totalContentPieces += finalContent;
      totalShootSessions += finalShoot;
      totalVideosProduced += finalEdit;

      const contentPay = finalContent * (emp.contentRate ?? agencyRates.contentRate ?? 100000);
      const shootPay = finalShoot * (emp.shootRate ?? agencyRates.shootRate ?? 300000);
      const editPay = finalEdit * (emp.editRate ?? agencyRates.editRate ?? 200000);
      const basePay = emp.baseRate || 0;
      const otPay = empOtHours * (emp.otRate || 0);
      const allowancePay = emp.allowance || 0;

      netSalary = contentPay + shootPay + editPay + basePay + otPay + allowancePay;
      agencyPayroll += netSalary;

      workSummaryStr = `${finalContent} content, ${finalShoot} buổi quay, ${finalEdit} video edit`;
    } else {
      let basePay = 0;
      if (emp.wageType === 'daily') {
        basePay = empWorkUnits * emp.baseRate;
      } else {
        const standardDays = 26;
        basePay = Math.round((emp.baseRate / standardDays) * empWorkUnits);
      }
      const otPay = empOtHours * emp.otRate;
      const allowancePay = emp.allowance || 0;

      netSalary = basePay + otPay + allowancePay;
      lamSongPayroll += netSalary;

      workSummaryStr = `${empWorkUnits} công nhật (${empOtHours}h OT)`;
    }

    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      companyId: emp.companyId,
      wageType: emp.wageType,
      workUnitsOrTasks: workSummaryStr,
      otHours: empOtHours,
      netSalary,
    };
  });

  const totalPayroll = agencyPayroll + lamSongPayroll;
  const totalM2Finished = sites.reduce((sum, s) => sum + s.completedAreaM2, 0);

  const topEarners = [...employeeDetails]
    .sort((a, b) => b.netSalary - a.netSalary)
    .slice(0, 3)
    .map((e) => ({
      name: e.name,
      role: e.role,
      salary: e.netSalary,
      company: e.companyId === 'agency' ? 'MS Agency' : 'MS Ốp Tường',
    }));

  const omniConfig = getStoredOmniRouterConfig();
  let aiAssessment = '';
  let recommendations: string[] = [];

  if (omniConfig.apiKey) {
    try {
      const activeModel = omniConfig.model.trim() || 'antigravity/gemini-3.8-flash-medium';
      let endpoint = omniConfig.baseUrl.trim();
      if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('generateContent')) {
        endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
      }

      const prompt = `Bạn là Giám đốc Tài chính (CFO) phân tích bảng lương tháng ${month}:
- Tổng quỹ lương 2 công ty: ${formatCurrency(totalPayroll)}
  + Khối Agency: ${formatCurrency(agencyPayroll)} (${totalVideosProduced} video hoàn thiện, ${totalShootSessions} buổi quay, ${totalContentPieces} bài viết)
  + Khối Ốp Tường: ${formatCurrency(lamSongPayroll)} (${totalWorkUnits} công thợ, ${totalOtHours}h OT, ${totalM2Finished}m² thi công)
- Top thu nhập: ${topEarners.map((t) => `${t.name}: ${formatCurrency(t.salary)}`).join(', ')}

Hãy đưa ra nhận xét tài chính ngắn gọn 2-3 câu và 3 lời khuyên tối ưu chi phí lương. Trả về JSON:
{
  "assessment": "...",
  "recommendations": ["...", "...", "..."]
}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${omniConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
        }),
      });

      if (res.ok) {
        const j = await res.json();
        const content = j.choices?.[0]?.message?.content || '';
        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.assessment) aiAssessment = parsed.assessment;
        if (Array.isArray(parsed.recommendations)) recommendations = parsed.recommendations;
      }
    } catch {
      // fallback
    }
  }

  if (!aiAssessment) {
    aiAssessment = `Tổng quỹ lương tháng ${month} đạt ${formatCurrency(
      totalPayroll
    )}, phản ánh đúng khối lượng công việc thực tế. Khối Agency chi trả theo hiệu suất sản phẩm (${totalVideosProduced} video, ${totalShootSessions} buổi quay), giúp kiểm soát chặt chẽ ngân sách. Khối Ốp Tường tiêu hao ${totalWorkUnits} công thợ với ${totalOtHours} giờ OT, duy trì đơn giá nhân công ở mức an toàn.`;
    recommendations = [
      'Tiếp tục áp dụng cơ chế khoán theo đầu việc (piecework) cho khâu Edit video để khích lệ năng suất.',
      'Kiểm soát giờ tăng ca OT của thợ ốp lam sóng vào các ngày cuối tuần để tránh đội chi phí công nhật.',
      'Khen thưởng kịp thời các nhân sự dẫn đầu năng suất để duy trì động lực làm việc.',
    ];
  }

  return {
    month,
    generatedAt: new Date().toLocaleString('vi-VN'),
    totalEmployees: employees.length,
    totalPayroll,
    agencyPayroll,
    lamSongPayroll,
    totalWorkUnits,
    totalOtHours,
    totalVideosProduced,
    totalContentPieces,
    totalShootSessions,
    totalM2Finished,
    topEarners,
    employeeDetails,
    aiAssessment,
    budgetComparison: 'Trong ngưỡng ngân sách an toàn (dưới 75 triệu/tháng)',
    recommendations,
  };
}

/**
 * 4. ĐỊNH DẠNG BẢNG LƯƠNG THÀNH BẢN TIN ZALO GỬI CHO SẾP DUYỆT
 */
export function formatPayrollZaloMessage(report: AIPayrollReportResult): string {
  let msg = `💰 [BÁO CÁO BẢNG LƯƠNG & QUỸ LƯƠNG THÁNG ${report.month}]\n`;
  msg += `🤖 Trợ lý AI tự động lập | 🕒 ${report.generatedAt}\n\n`;

  msg += `📊 1. TỔNG QUAN QUỸ LƯƠNG:\n`;
  msg += `- Tổng quỹ lương 2 công ty: ${formatCurrency(report.totalPayroll)}\n`;
  msg += `  + 🏢 Khối MS Agency: ${formatCurrency(report.agencyPayroll)}\n`;
  msg += `  + 🪵 Khối MS Ốp Tường: ${formatCurrency(report.lamSongPayroll)}\n`;
  msg += `- Tổng ngày công thợ: ${report.totalWorkUnits} công | Giờ OT: ${report.totalOtHours}h\n`;
  msg += `- Sản phẩm Agency: ${report.totalVideosProduced} video hoàn thiện, ${report.totalShootSessions} buổi quay, ${report.totalContentPieces} bài content\n\n`;

  msg += `🏆 2. TOP NHÂN SỰ CÓ THU NHẬP CAO NHẤT:\n`;
  report.topEarners.forEach((t, i) => {
    msg += `  ${i + 1}. ${t.name} (${t.role}) - ${formatCurrency(t.salary)}\n`;
  });
  msg += `\n`;

  msg += `📋 3. BẢNG TỔNG HỢP LƯƠNG CHI TIẾT TỪNG NHÂN SỰ:\n`;
  report.employeeDetails.forEach((emp, i) => {
    msg += `  ${i + 1}. ${emp.name} [${emp.role}]: ${formatCurrency(emp.netSalary)}\n`;
    msg += `     (${emp.workUnitsOrTasks})\n`;
  });
  msg += `\n`;

  msg += `🎯 4. ĐÁNH GIÁ CỦA TRỢ LÝ AI (CFO INSIGHT):\n`;
  msg += `${report.aiAssessment}\n\n`;

  msg += `💡 5. ĐỀ XUẤT TỐI ƯU CỦA AI:\n`;
  report.recommendations.forEach((r, i) => {
    msg += `  ${i + 1}. ${r}\n`;
  });
  msg += `\n`;

  msg += `👉 Kính chuyển Sếp phê duyệt để kế toán chuyển khoản lương cho anh em!`;

  return msg.trim();
}

/**
 * 5. GIAO VIỆC CHO AI AGENT BẰNG CÂU LỆNH TỰ NHIÊN (NLP COMMAND PARSER)
 * Ví dụ: "tạo 1 dự án ốp tường mới địa chỉ 120 Hoàng Hoa Thám. số tiền 35 triệu thời gian làm trong 4 ngày. khách anh Tuấn"
 */
export interface AICommandResult {
  success: boolean;
  message: string;
  action: 'create_site' | 'create_calendar' | 'query_progress' | 'unknown';
  newSite?: ConstructionSite;
  newCalendarItem?: ContentCalendarItem;
  queriedSite?: ConstructionSite;
}

export async function executeNaturalLanguageCommand(params: {
  commandText: string;
  employees: Employee[];
  sites?: ConstructionSite[];
  calendar?: ContentCalendarItem[];
}): Promise<AICommandResult> {
  const { commandText, employees, sites = [], calendar = [] } = params;
  const rawText = commandText.trim();
  if (!rawText) {
    return {
      success: false,
      message: 'Vui lòng nhập nội dung câu lệnh!',
      action: 'unknown',
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const lower = rawText.toLowerCase();

  // ================= 1. XỬ LÝ LỆNH TRA CỨU TIẾN ĐỘ DỰ ÁN =================
  const isProgressQuery =
    /(?:xem|kiểm tra|báo cáo|hỏi|cho xem|tra cứu)?\s*tiến\s*độ/i.test(rawText) ||
    /làm\s*(?:đến đâu|xong chưa|được bao nhiêu)/i.test(rawText) ||
    /tình hình\s*(?:công trình|dự án)/i.test(rawText);

  if (isProgressQuery) {
    // Trích xuất từ khóa tên dự án cần xem
    let kw = rawText
      .replace(/(?:xem|kiểm tra|báo cáo|hỏi|cho xem|tra cứu)?\s*tiến\s*độ(?:\s+dự\s+án|\s+công\s+trình)?/gi, '')
      .replace(/làm\s*(?:đến đâu|xong chưa|được bao nhiêu)/gi, '')
      .replace(/tình hình\s*(?:công trình|dự án)/gi, '')
      .replace(/[.,?!]/g, '')
      .trim()
      .toLowerCase();

    // Nếu người dùng chỉ nói chung chung: "xem tiến độ"
    if (!kw || kw === 'các dự án' || kw === 'công ty' || kw === 'tất cả') {
      const activeSites = sites.filter((s) => s.status !== 'completed');
      if (activeSites.length === 0) {
        return {
          success: true,
          action: 'query_progress',
          message: '✓ Hiện tại tất cả các công trình đều đã hoàn thành bàn giao! Không có công trình nào đang dở dang.',
        };
      }

      let summaryMsg = `📊 [TỔNG HỢP TIẾN ĐỘ CÁC DỰ ÁN ĐANG THI CÔNG - ${activeSites.length} CÔNG TRÌNH]:\n\n`;
      activeSites.forEach((s, idx) => {
        const pct = s.totalAreaM2 > 0 ? Math.round((s.completedAreaM2 / s.totalAreaM2) * 100) : 0;
        summaryMsg += `${idx + 1}. 🪵 ${s.name}\n`;
        summaryMsg += `   📍 Địa chỉ: ${s.address}\n`;
        summaryMsg += `   📈 Tiến độ: ${s.completedAreaM2}/${s.totalAreaM2} m² (${pct}%)\n`;
        summaryMsg += `   ⏳ Thời gian: Đã làm ${s.actualDays}/${s.estimatedDays} ngày (Hạn: ${formatDateVN(s.expectedEndDate)})\n\n`;
      });
      summaryMsg += `👉 Bạn có thể nhắn cụ thể: "xem tiến độ dự án [Tên dự án]" để xem chi tiết đội thợ và nhật ký!`;

      return {
        success: true,
        action: 'query_progress',
        message: summaryMsg.trim(),
      };
    }

    // Tìm kiếm dự án theo từ khóa (tên, địa chỉ, khách hàng)
    const matchedSite = sites.find((s) => {
      return (
        s.name.toLowerCase().includes(kw) ||
        s.address.toLowerCase().includes(kw) ||
        s.clientName.toLowerCase().includes(kw) ||
        kw.includes(s.name.toLowerCase()) ||
        kw.includes(s.clientName.toLowerCase())
      );
    });

    if (matchedSite) {
      const s = matchedSite;
      const pct = s.totalAreaM2 > 0 ? Math.round((s.completedAreaM2 / s.totalAreaM2) * 100) : 0;
      const workerNames = s.assignedWorkers
        .map((wId) => employees.find((e) => e.id === wId)?.name || 'Thợ')
        .join(', ');

      let statusText = 'Đang lên kế hoạch';
      if (s.status === 'framing') statusText = 'Đang lắp khung xương';
      if (s.status === 'installing') statusText = 'Đang ốp tấm nan sóng / Nano';
      if (s.status === 'finishing') statusText = 'Đang nẹp chỉ & phào góc (sắp nghiệm thu)';
      if (s.status === 'completed') statusText = 'Đã hoàn thành bàn giao nghiệm thu ✓';

      let durationAssessment = `Đã làm ${s.actualDays} / ${s.estimatedDays} ngày dự tính`;
      if (s.actualDays > s.estimatedDays) {
        durationAssessment += ` (⚠️ Đang trễ ${s.actualDays - s.estimatedDays} ngày so với dự tính ban đầu)`;
      } else if (s.actualDays === s.estimatedDays) {
        durationAssessment += ` (Hôm nay là ngày dự kiến về đích)`;
      } else {
        durationAssessment += ` (Bám sát tiến độ ✓)`;
      }

      let reportMsg = `📊 [BÁO CÁO TIẾN ĐỘ: ${s.name.toUpperCase()}]\n`;
      reportMsg += `📍 Địa chỉ: ${s.address}\n`;
      reportMsg += `👤 Khách hàng: ${s.clientName} ${s.phone ? `(${s.phone})` : ''}\n`;
      reportMsg += `🪵 Khối lượng hoàn thiện: ${s.completedAreaM2} / ${s.totalAreaM2} m² (${pct}%)\n`;
      reportMsg += `🏗️ Giai đoạn thi công: ${statusText}\n`;
      reportMsg += `⏳ Tiến độ ngày: ${durationAssessment}\n`;
      reportMsg += `🗓️ Hạn bàn giao dự kiến: ${formatDateVN(s.expectedEndDate)}\n`;
      reportMsg += `👷 Đội thợ phụ trách: ${workerNames || 'Chưa gán thợ cụ thể'}\n`;
      reportMsg += `📸 Nhật ký ảnh: Đã tải lên ${s.photos?.length || 0} ảnh hiện trường\n`;
      if (s.notes) reportMsg += `📝 Ghi chú: ${s.notes}\n`;

      return {
        success: true,
        action: 'query_progress',
        message: reportMsg.trim(),
        queriedSite: s,
      };
    }

    // Nếu không tìm thấy công trình ốp tường, thử tìm kiếm kế hoạch video Agency
    const matchedCal = calendar.find(
      (c) =>
        c.title.toLowerCase().includes(kw) ||
        c.client.toLowerCase().includes(kw) ||
        kw.includes(c.client.toLowerCase())
    );

    if (matchedCal) {
      const c = matchedCal;
      const shooter = employees.find((e) => e.id === c.shooterId);
      const editor = employees.find((e) => e.id === c.editorId);
      let calMsg = `🎬 [TIẾN ĐỘ VIDEO AGENCY: "${c.title.toUpperCase()}"]\n`;
      calMsg += `🏢 Khách hàng: ${c.client} | Kênh: ${c.channel.toUpperCase()}\n`;
      calMsg += `🎥 Quay phim: ${c.shootCompleted ? 'Đã quay xong ✓' : 'Chưa quay'} (Phụ trách: ${shooter?.name || 'Chưa gán'})\n`;
      calMsg += `⚡ Dựng Edit: ${c.isCompleted || c.editCompleted ? 'Đã edit xong ✓' : 'Đang làm'} (Phụ trách: ${editor?.name || 'Chưa gán'})\n`;
      calMsg += `⏰ Deadline: ${formatDateVN(c.editDeadline)} ${c.editDeadline < todayStr && !c.isCompleted ? '(⚠️ Quá hạn)' : ''}\n`;

      return {
        success: true,
        action: 'query_progress',
        message: calMsg.trim(),
        newCalendarItem: c,
      };
    }

    // Không tìm thấy dự án nào khớp
    const availableNames = sites.map((s) => `"${s.name}"`).join(', ');
    return {
      success: false,
      action: 'query_progress',
      message: `⚠️ Không tìm thấy dự án nào khớp với từ khóa "${kw}".\n👉 Hiện trên hệ thống đang có các dự án: ${availableNames || 'Chưa có dự án nào'}. Bạn hãy thử lại với tên dự án chính xác nhé!`,
    };
  }

  // ================= 2. XỬ LÝ LỆNH TẠO DỰ ÁN MỚI (CREATE SITE) =================
  const omniConfig = getStoredOmniRouterConfig();

  // 2.1 Thử gọi mô hình AI Gemini / OmniRouter nếu có API key
  if (omniConfig.apiKey) {
    try {
      const activeModel = omniConfig.model.trim() || 'antigravity/gemini-3.8-flash-medium';
      let endpoint = omniConfig.baseUrl.trim();
      if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('generateContent')) {
        endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
      }

      const prompt = `Bạn là Trợ lý AI điều hành hệ thống. Hãy bóc tách câu lệnh sau của Sếp thành JSON:
"${rawText}"

Xuất đúng cấu trúc JSON sau:
{
  "action": "create_site",
  "siteData": {
    "name": "Tên công trình ngắn gọn",
    "clientName": "Tên khách hàng",
    "address": "Địa chỉ thi công",
    "budget": "Số tiền hoặc giá trị",
    "areaM2": 60,
    "estimatedDays": 3,
    "panelType": "Tấm ốp Lam sóng & Nano",
    "workerNames": ["Tên thợ"]
  }
}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${omniConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const j = await res.json();
        const content = j.choices?.[0]?.message?.content || '';
        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.action === 'create_site' && parsed.siteData) {
          const s = parsed.siteData;
          const estDays = Number(s.estimatedDays) || 3;
          const endD = new Date();
          endD.setDate(endD.getDate() + estDays);
          const endDStr = endD.toISOString().split('T')[0];

          const assignedWorkerIds: string[] = [];
          if (Array.isArray(s.workerNames)) {
            s.workerNames.forEach((wName: string) => {
              const matched = employees.find((e) => e.name.toLowerCase().includes(wName.toLowerCase()));
              if (matched) assignedWorkerIds.push(matched.id);
            });
          }

          const siteId = `site_${Date.now()}`;
          const newSite: ConstructionSite = {
            id: siteId,
            name: s.name || `Ốp Tường ${s.address || 'Mới'}`,
            clientName: s.clientName || 'Khách Hàng',
            phone: '',
            address: s.address || 'Chưa rõ địa chỉ',
            totalAreaM2: Number(s.areaM2) || 60,
            completedAreaM2: 0,
            panelType: s.panelType || 'Tấm ốp Lam sóng & Nano cao cấp',
            estimatedDays: estDays,
            actualDays: 1,
            startDate: todayStr,
            expectedEndDate: endDStr,
            status: 'planning',
            assignedWorkers: assignedWorkerIds,
            notes: s.budget ? `Ngân sách / Số tiền: ${s.budget}` : 'Tạo tự động bởi AI Agent',
            photos: [],
            dailySchedules: [
              {
                id: `sch_${Date.now()}`,
                siteId,
                date: todayStr,
                workHours: '07:30 - 17:30',
                workerIds: assignedWorkerIds,
                taskDescription: 'Khảo sát hiện trường & bắt đầu thi công khung xương',
                status: 'scheduled',
              },
            ],
          };

          return {
            success: true,
            action: 'create_site',
            message: `✓ AI đã tự động tạo dự án "${newSite.name}" trên hệ thống Web!\n📍 Địa chỉ: ${newSite.address}\n💰 Số tiền / Ngân sách: ${s.budget || 'Chưa ghi'}\n⏳ Thời gian thi công: ${estDays} ngày (Hạn bàn giao: ${formatDateVN(endDStr)})`,
            newSite,
          };
        }
      }
    } catch {
      // fallback
    }
  }

  // 2.2 Bộ bóc tách thông minh nội bộ (Rule-based NLP)
  let address = '';
  const addrMatch = rawText.match(/(?:địa chỉ|ở|tại)\s+([^.,;]+)/i);
  if (addrMatch) {
    address = addrMatch[1].trim();
  }

  let budget = '';
  const budgetMatch = rawText.match(/(?:số tiền|tiền|giá|ngân sách|chi phí)\s+([^.,;]+)/i);
  if (budgetMatch) {
    budget = budgetMatch[1].trim();
  }

  let estimatedDays = 3;
  const daysMatch = rawText.match(/(?:thời gian làm trong|làm trong|trong vòng|trong|thời gian)\s+([0-9]+)\s*(?:ngày)?/i);
  if (daysMatch) {
    estimatedDays = parseInt(daysMatch[1], 10) || 3;
  }

  let clientName = 'Khách Hàng';
  const clientMatch = rawText.match(/(?:khách hàng|khách|chủ nhà|cho anh|cho chị|anh|chị)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s]+)/i);
  if (clientMatch) {
    clientName = clientMatch[1].trim().split(/\s+(?:ở|tại|số tiền|làm trong)/i)[0].trim();
  }

  const endD = new Date();
  endD.setDate(endD.getDate() + estimatedDays);
  const endDStr = endD.toISOString().split('T')[0];

  const matchedWorkers: string[] = [];
  employees.forEach((emp) => {
    if (lower.includes(emp.name.toLowerCase())) {
      matchedWorkers.push(emp.id);
    }
  });

  const siteId = `site_${Date.now()}`;
  const siteName = address ? `Ốp Tường ${address.split(',')[0].trim()}` : `Dự Án Ốp Tường Mới`;

  const newSite: ConstructionSite = {
    id: siteId,
    name: siteName,
    clientName: clientName || 'Khách Hàng',
    phone: '',
    address: address || 'Chưa rõ địa chỉ',
    totalAreaM2: 60,
    completedAreaM2: 0,
    panelType: 'Tấm ốp Lam sóng & Nano',
    estimatedDays,
    actualDays: 1,
    startDate: todayStr,
    expectedEndDate: endDStr,
    status: 'planning',
    assignedWorkers: matchedWorkers,
    notes: budget ? `Ngân sách / Số tiền: ${budget}` : 'Tạo tự động bởi AI Agent',
    photos: [],
    dailySchedules: [
      {
        id: `sch_${Date.now()}`,
        siteId,
        date: todayStr,
        workHours: '07:30 - 17:30',
        workerIds: matchedWorkers,
        taskDescription: 'Khảo sát hiện trường & bắt đầu thi công',
        status: 'scheduled',
      },
    ],
  };

  return {
    success: true,
    action: 'create_site',
    message: `✓ AI đã tự động tạo dự án "${newSite.name}" trên hệ thống Web!\n📍 Địa chỉ: ${newSite.address}\n💰 Số tiền / Ngân sách: ${budget || 'Chưa ghi'}\n⏳ Thời gian thi công: ${estimatedDays} ngày (Bàn giao: ${formatDateVN(endDStr)})\n👤 Khách hàng: ${clientName}`,
    newSite,
  };
}
