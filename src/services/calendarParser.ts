import * as XLSX from 'xlsx';
import { ContentCalendarItem } from '../types';

export interface ParsedCalendarData {
  clientName: string;
  monthRange: string;
  items: ContentCalendarItem[];
  rawShoots?: string[];
  rawTodos?: [string, string[]][];
  totalCount: number;
}

// ---------------- 1. BỘ ĐỌC TỪ FILE HTML (AI AGENT) ----------------
export function parseHtmlContentCalendar(htmlContent: string): ParsedCalendarData | null {
  try {
    const match = htmlContent.match(/const DATA\s*=\s*(\{[\s\S]*?\});\s*(?:let|var|const|function|\n\s*const|\n\s*let)/);
    if (!match) {
      console.warn('Cannot find const DATA in HTML');
      return null;
    }

    const jsonData = JSON.parse(match[1]);
    const rawItems = jsonData.items || [];
    const shoots = jsonData.shoots || [];
    const todos = jsonData.todo || [];

    let clientName = 'Feel Chicken';
    let monthRange = '2026-10';

    const titleMatch = htmlContent.match(/<h1>(.*?)<\/h1>/i);
    if (titleMatch) {
      const parts = titleMatch[1].split('·');
      clientName = parts[0]?.trim() || clientName;
    }

    const parsedItems: ContentCalendarItem[] = rawItems.map((item: any, index: number) => {
      let dateFormatted = '2026-10-15';
      if (item.ngay) {
        const [d, m] = item.ngay.split('/');
        const year = m === '01' ? '2027' : '2026';
        dateFormatted = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      const isVideo = item.loai === 'Video' || (item.cv && item.cv.includes('video'));
      
      const shootDateObj = new Date(dateFormatted);
      shootDateObj.setDate(shootDateObj.getDate() - (isVideo ? 2 : 1));
      const shootDateStr = shootDateObj.toISOString().split('T')[0];

      const editDateObj = new Date(dateFormatted);
      editDateObj.setDate(editDateObj.getDate() - 1);
      const editDateStr = editDateObj.toISOString().split('T')[0];

      let channel: 'tiktok' | 'facebook' | 'youtube' | 'website' = 'facebook';
      const nenLower = (item.nen || '').toLowerCase();
      if (nenLower.includes('tiktok')) channel = 'tiktok';
      else if (nenLower.includes('youtube')) channel = 'youtube';

      let notes = '';
      if (item.note && Array.isArray(item.note)) {
        notes = item.note.join('. ').replace(/\*\*/g, '');
      }

      return {
        id: `cal_fc_${item.stt || index + 1}_${Date.now()}`,
        stt: item.stt || String(index + 1),
        title: item.tieude || `Bài đăng #${item.stt}`,
        client: clientName,
        channel: channel,
        month: monthRange,
        dayOfWeek: item.thu || 'Thứ 2',
        dayNumber: item.ngay || '05/10',
        timeStr: item.gio || '10h30',
        loai: isVideo ? 'Video' : 'Bài đăng',
        truc: item.truc || 'series',
        score: item.score || { diem: 8.5, kl: 'Duyệt' },

        writerId: 'emp_ag_2', // Content: Mai
        shooterId: index % 2 === 0 ? 'emp_ag_1' : 'emp_ag_3', // Quay: An / Nam
        editorId: index % 2 === 0 ? 'emp_ag_3' : 'emp_ag_1', // Edit: Nam / An

        editDeadline: editDateStr,
        shootDate: shootDateStr,
        isCompleted: index < 5,

        caption: item.caps?.[0]?.[1] || '',
        voiceText: item.voice || '',
        notes: notes,
        publishDate: dateFormatted,
        status: index < 5 ? 'completed' : 'shooting',
      };
    });

    return {
      clientName,
      monthRange,
      items: parsedItems,
      rawShoots: shoots,
      rawTodos: todos,
      totalCount: parsedItems.length,
    };
  } catch (error) {
    console.error('Error parsing calendar HTML:', error);
    return null;
  }
}

// ---------------- 2. BỘ ĐỌC TỪ FILE EXCEL (.XLSX / .XLS / .CSV) ----------------
export function parseExcelCalendar(buffer: ArrayBuffer, clientName = 'Agency Client'): ContentCalendarItem[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) return [];

    const today = new Date().toISOString().split('T')[0];

    return rawRows.map((row, index) => {
      // Tìm các cột linh hoạt theo tên
      const title = row['Tiêu đề'] || row['Tiêu đề nội dung'] || row['Tên bài'] || row['Chủ đề'] || row['Title'] || row['Topic'] || `Nội dung #${index + 1}`;
      const dayRaw = String(row['Ngày'] || row['Ngày đăng'] || row['Date'] || row['Publish Date'] || '05/10').trim();
      const timeStr = String(row['Giờ'] || row['Khung giờ'] || row['Time'] || '10h30').trim();
      const loaiRaw = String(row['Loại'] || row['Định dạng'] || row['Type'] || 'Bài đăng').trim();
      const channelRaw = String(row['Kênh'] || row['Nền tảng'] || row['Platform'] || row['Channel'] || 'Facebook').toLowerCase();
      
      // Người thực hiện
      const writer = String(row['Content'] || row['Kịch bản'] || row['Người viết'] || row['Content:a'] || 'emp_ag_2').trim();
      const shooter = String(row['Quay'] || row['Quay phim'] || row['Media'] || row['Quay:b'] || 'emp_ag_1').trim();
      const editor = String(row['Edit'] || row['Dựng'] || row['Editor'] || row['Edit:B'] || 'emp_ag_3').trim();
      
      // Thời hạn & Trạng thái
      const deadlineRaw = String(row['Thời hạn'] || row['Hạn'] || row['Deadline'] || today).trim();
      const statusRaw = String(row['Trạng thái'] || row['Xong'] || row['Status'] || '').toLowerCase();
      const isCompleted = statusRaw.includes('xong') || statusRaw.includes('done') || statusRaw === 'true' || statusRaw === '1';

      // Chuẩn hóa ngày tháng dạng 05/10 -> YYYY-MM-DD
      let dateFormatted = today;
      let dayNumber = '05/10';
      let dayOfWeek = 'Thứ 2';

      if (dayRaw.includes('/')) {
        const parts = dayRaw.split('/');
        if (parts.length >= 2) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts.length === 3 ? parts[2] : '2026';
          dateFormatted = `${y}-${m}-${d}`;
          dayNumber = `${d}/${m}`;
        }
      } else if (dayRaw.includes('-')) {
        dateFormatted = dayRaw;
        const parts = dayRaw.split('-');
        if (parts.length === 3) dayNumber = `${parts[2]}/${parts[1]}`;
      }

      // Xác định thứ trong tuần
      try {
        const dObj = new Date(dateFormatted);
        const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        dayOfWeek = dayNames[dObj.getDay()] || 'Thứ 2';
      } catch {}

      // Chuẩn hóa kênh
      let channel: 'tiktok' | 'facebook' | 'youtube' | 'website' = 'facebook';
      if (channelRaw.includes('tiktok')) channel = 'tiktok';
      else if (channelRaw.includes('youtube')) channel = 'youtube';

      return {
        id: `cal_excel_${index + 1}_${Date.now()}`,
        stt: String(row['STT'] || index + 1),
        title: String(title),
        client: clientName,
        channel: channel,
        month: dateFormatted.slice(0, 7),
        dayOfWeek: dayOfWeek,
        dayNumber: dayNumber,
        timeStr: timeStr,
        loai: loaiRaw.toLowerCase().includes('video') ? 'Video' : 'Bài đăng',
        truc: 'series',
        score: { diem: 8.5, kl: 'Duyệt' },

        writerId: writer,
        shooterId: shooter,
        editorId: editor,

        editDeadline: deadlineRaw.includes('/') ? dateFormatted : deadlineRaw,
        shootDate: dateFormatted,
        isCompleted: isCompleted,

        notes: String(row['Ghi chú'] || row['Note'] || ''),
        publishDate: dateFormatted,
        status: isCompleted ? 'completed' : 'shooting',
      };
    });
  } catch (error) {
    console.error('Error parsing Excel:', error);
    return [];
  }
}

// ---------------- 3. BỘ ĐỌC TỪ LINK GOOGLE SHEET ----------------
export async function fetchAndParseGoogleSheet(sheetUrl: string): Promise<ContentCalendarItem[]> {
  // Trích xuất Spreadsheet ID từ link Google Sheet:
  // VD: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing
  const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error('Link Google Sheet không hợp lệ. Vui lòng kiểm tra lại định dạng link.');
  }

  const spreadsheetId = idMatch[1];
  
  // Trích xuất gid nếu có (mặc định tab đầu tiên là gid=0)
  let gid = '0';
  const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  // Google Sheet Export CSV URL
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(
      'Không thể tải Google Sheet. Hãy đảm bảo bạn đã bật quyền: "Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link can view).'
    );
  }

  const csvText = await response.text();
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Dùng chung logic parse
  const buffer = new TextEncoder().encode(csvText).buffer;
  return parseExcelCalendar(buffer, 'Google Sheet');
}

// ---------------- 4. TẢI FILE EXCEL MẪU CHUẨN ĐỂ SẾP / AGENCY NHẬP LIỆU ----------------
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      'STT': 1,
      'Ngày': '05/10/2026',
      'Giờ': '10h30',
      'Tiêu đề': '🍗 SOI MENU FEEL #01: ĐÙI 39K HAY CÁNH 35K – BẠN CHỌN PHE NÀO?',
      'Loại': 'Bài đăng',
      'Kênh': 'Facebook',
      'Content (a)': 'Trần Thị Mai',
      'Quay (b)': 'Nguyễn Văn An',
      'Edit (B)': 'Lê Hoàng Nam',
      'Thời hạn': '2026-11-04',
      'Trạng thái': 'Đã xong',
      'Ghi chú': 'Chụp trước CN 04/10. Ghim đầu trang 1 tuần.'
    },
    {
      'STT': 2,
      'Ngày': '07/10/2026',
      'Giờ': '16h30',
      'Tiêu đề': '🌧️ MƯA RỒI – SOI TÔ MÌ CAY HẢI SẢN 55K!',
      'Loại': 'Video',
      'Kênh': 'TikTok + Facebook',
      'Content (a)': 'Trần Thị Mai',
      'Quay (b)': 'Nguyễn Văn An',
      'Edit (B)': 'Lê Hoàng Nam',
      'Thời hạn': '2026-11-06',
      'Trạng thái': 'Chưa xong',
      'Ghi chú': 'Quay tại cơ sở 2, có vệt mưa cửa kính.'
    },
    {
      'STT': 3,
      'Ngày': '09/10/2026',
      'Giờ': '15h00',
      'Tiêu đề': '🧀 TOKBOKKI 39K – TOKBOKKI PHÔ MAI 40K: CHÊNH ĐÚNG 1 CÀNH?',
      'Loại': 'Bài đăng',
      'Kênh': 'Facebook',
      'Content (a)': 'Trần Thị Mai',
      'Quay (b)': 'Lê Hoàng Nam',
      'Edit (B)': 'Nguyễn Văn An',
      'Thời hạn': '2026-11-08',
      'Trạng thái': 'Chưa xong',
      'Ghi chú': 'Chụp kéo sợi phô mai que.'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KeHoachContent');
  XLSX.writeFile(workbook, 'Mau_Ke_Hoach_Content_Agency.xlsx');
}
