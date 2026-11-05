const fs = require('fs');
const path = require('path');

const htmlPath = 'e:\\hệ thống content ai agent\\feel-chicken\\output\\2026-10\\thang-0510-0511\\Content-Calendar-FeelChicken-Thang-0510-0511.html';
const targetPath = path.resolve(__dirname, '..', 'src', 'data', 'feelChickenCalendar.ts');

const content = fs.readFileSync(htmlPath, 'utf8');
const match = content.match(/const DATA\s*=\s*(\{[\s\S]*?\});\s*(?:let|var|const|function|\n\s*const|\n\s*let)/);

if (!match) {
  console.error('Could not match DATA');
  process.exit(1);
}

const data = JSON.parse(match[1]);

const parsedItems = data.items.map((it, idx) => {
  let dateStr = '2026-10-15';
  if (it.ngay) {
    const [d, m] = it.ngay.split('/');
    const year = m === '01' ? '2027' : '2026';
    dateStr = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const isVideo = it.loai === 'Video' || (it.cv && it.cv.includes('video'));
  const shootD = new Date(dateStr);
  shootD.setDate(shootD.getDate() - (isVideo ? 2 : 1));
  const shootDate = shootD.toISOString().split('T')[0];

  const editD = new Date(dateStr);
  editD.setDate(editD.getDate() - 1);
  const editDeadline = editD.toISOString().split('T')[0];

  let channel = 'facebook';
  if (it.nen && it.nen.toLowerCase().includes('tiktok')) channel = 'tiktok';
  else if (it.nen && it.nen.toLowerCase().includes('youtube')) channel = 'youtube';

  const isCompleted = idx < 2;

  return {
    id: `cal_fc_${it.stt || idx + 1}`,
    stt: it.stt || String(idx + 1),
    title: it.tieude,
    client: 'Feel Chicken',
    channel: channel,
    month: '2026-10',
    dayOfWeek: it.thu || 'Thứ 2',
    dayNumber: it.ngay || '05/10',
    timeStr: it.gio || '10h30',
    loai: isVideo ? 'Video' : 'Bài đăng',
    truc: it.truc || 'series',
    score: it.score || { diem: 8.5, kl: 'Duyệt' },
    writerId: 'emp_ag_2', // Content: Trần Thị Mai
    shooterId: idx % 2 === 0 ? 'emp_ag_1' : 'emp_ag_3', // Quay: Nguyễn Văn An / Lê Hoàng Nam
    editorId: idx % 2 === 0 ? 'emp_ag_3' : 'emp_ag_1', // Edit: Lê Hoàng Nam / Nguyễn Văn An
    shootDate: shootDate,
    editDeadline: editDeadline,
    isCompleted: isCompleted,
    caption: it.caps?.[0]?.[1] || '',
    voiceText: it.voice || '',
    notes: it.note ? it.note.join('. ').replace(/\\*\\*/g, '') : '',
    publishDate: dateStr,
    status: isCompleted ? 'completed' : 'shooting',
    shootCompleted: idx < 6,
    editCompleted: isCompleted,
  };
});

// Sự kiện Lịch Quay & Lịch Edit bổ sung vào Thứ 2 (05/10) theo yêu cầu của bạn
const extraEvents = [
  {
    id: 'cal_fc_shoot_monday',
    stt: 'Q1',
    title: '🎬 Lịch đi quay: Quay video Mì Cay Hải Sản tại CS2',
    client: 'Feel Chicken',
    channel: 'tiktok',
    month: '2026-10',
    dayOfWeek: 'Thứ 2',
    dayNumber: '05/10',
    timeStr: '09h00',
    loai: 'Lịch quay',
    truc: 'series',
    writerId: 'emp_ag_2',
    shooterId: 'emp_ag_1',
    editorId: 'emp_ag_3',
    shootDate: '2026-10-05',
    editDeadline: '2026-10-05',
    isCompleted: false,
    notes: 'Quay cảnh bốc khói mì cay tô 55K tại CS2 (35 Trần Hữu Duyệt). Chuẩn bị đèn led và mic cài áo.',
    publishDate: '2026-10-05',
    status: 'shooting',
    shootCompleted: false,
    editCompleted: false,
  },
  {
    id: 'cal_fc_edit_monday',
    stt: 'E1',
    title: '✂️ Lịch edit: Dựng video Soi Menu #01 Đùi vs Cánh',
    client: 'Feel Chicken',
    channel: 'facebook',
    month: '2026-10',
    dayOfWeek: 'Thứ 2',
    dayNumber: '05/10',
    timeStr: '14h00',
    loai: 'Lịch edit',
    truc: 'series',
    writerId: 'emp_ag_2',
    shooterId: 'emp_ag_1',
    editorId: 'emp_ag_3',
    shootDate: '2026-10-04',
    editDeadline: '2026-10-06',
    isCompleted: false,
    notes: 'Dựng video so sánh Đùi 39K vs Cánh 35K, chèn âm thanh giòn rụm và nhạc xu hướng TikTok.',
    publishDate: '2026-10-05',
    status: 'editing',
    shootCompleted: true,
    editCompleted: false,
  },
];

// Chèn 2 sự kiện này vào cùng ngày Thứ 2 (05/10) ngay sau bài số 1
const combinedItems = [
  parsedItems[0],
  extraEvents[0],
  extraEvents[1],
  ...parsedItems.slice(1)
];

const tsContent = `import { ContentCalendarItem } from '../types';

export const FEEL_CHICKEN_SHOOTS: string[] = ${JSON.stringify(data.shoots, null, 2)};

export const FEEL_CHICKEN_TODOS: [string, string[]][] = ${JSON.stringify(data.todo, null, 2)};

export const FEEL_CHICKEN_ITEMS: ContentCalendarItem[] = ${JSON.stringify(combinedItems, null, 2)};
`;

fs.writeFileSync(targetPath, tsContent, 'utf8');
console.log('Successfully written feelChickenCalendar.ts with total items:', combinedItems.length);
