import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ConstructionSite, MaterialItem, SiteMaterials } from '../types';
import { formatCurrency, formatDateVN } from '../services/db';
import { Package, Plus, Trash2, Lock, Download, ClipboardCheck, AlertTriangle, TrendingDown } from 'lucide-react';

interface MaterialManagerProps {
  sites: ConstructionSite[];
  materials: SiteMaterials[];
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onSaveMaterials: (record: SiteMaterials) => void;
}

// Vật tư thường dùng khi ốp tường, bấm để thêm nhanh (định mức/m² chỉ là gợi ý, sửa lại theo thực tế)
const PRESETS: { name: string; unit: string; normPerM2: number }[] = [
  { name: 'Tấm lam sóng', unit: 'tấm', normPerM2: 0.35 },
  { name: 'Keo dán', unit: 'chai', normPerM2: 0.1 },
  { name: 'Đinh / ghim bắn', unit: 'hộp', normPerM2: 0.02 },
  { name: 'Nẹp kết thúc', unit: 'thanh', normPerM2: 0.15 },
  { name: 'Thanh khung xương', unit: 'thanh', normPerM2: 0.4 },
  { name: 'Vít', unit: 'hộp', normPerM2: 0.03 },
];

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export interface MaterialStat {
  total: number;              // mua đầu + bổ sung
  used: number | null;        // thực dùng = total - còn lại (null nếu chưa kiểm kê)
  expected: number;           // định mức × m² đã làm
  waste: number | null;       // hao hụt = thực dùng - định mức (null nếu thiếu dữ liệu)
  wastePct: number | null;
  extraPct: number;           // % mua bổ sung so với mua đầu
  totalCost: number;
  extraCost: number;
  leftoverCost: number;
  usedCost: number | null;
  expectedCost: number;
  wasteCost: number;
}

export function computeMaterialStat(item: MaterialItem, areaM2: number): MaterialStat {
  const total = num(item.purchased) + num(item.extra);
  const counted = item.remaining !== null && item.remaining !== undefined;
  const used = counted ? total - num(item.remaining) : null;
  const expected = num(item.normPerM2) * areaM2;
  const waste = used !== null && expected > 0 ? used - expected : null;
  const price = num(item.unitPrice);
  return {
    total,
    used,
    expected,
    waste,
    wastePct: waste !== null && expected > 0 ? (waste / expected) * 100 : null,
    extraPct: num(item.purchased) > 0 ? (num(item.extra) / num(item.purchased)) * 100 : 0,
    totalCost: total * price,
    extraCost: num(item.extra) * price,
    leftoverCost: counted ? num(item.remaining) * price : 0,
    usedCost: used !== null ? used * price : null,
    expectedCost: expected * price,
    wasteCost: waste !== null && waste > 0 ? waste * price : 0,
  };
}

export function computeSiteSummary(site: ConstructionSite, record?: SiteMaterials) {
  const area = site.completedAreaM2 > 0 ? site.completedAreaM2 : site.totalAreaM2;
  const items = record?.items || [];
  let totalCost = 0, extraCost = 0, leftoverCost = 0, usedCost = 0, expectedCost = 0, wasteCost = 0;
  let uncounted = 0, withNorm = 0;
  for (const it of items) {
    const st = computeMaterialStat(it, area);
    totalCost += st.totalCost;
    extraCost += st.extraCost;
    leftoverCost += st.leftoverCost;
    wasteCost += st.wasteCost;
    if (st.usedCost === null) uncounted++;
    else if (st.expected > 0) {
      // hiệu suất chỉ tính trên vật tư đã kiểm kê và có định mức
      usedCost += st.usedCost;
      expectedCost += st.expectedCost;
      withNorm++;
    }
  }
  const efficiency = withNorm > 0 && usedCost > 0 ? Math.min(100, (expectedCost / usedCost) * 100) : null;
  return { area, itemCount: items.length, totalCost, extraCost, leftoverCost, wasteCost, efficiency, uncounted };
}

const fmtQty = (n: number) => (Math.round(n * 100) / 100).toLocaleString('vi-VN');

export const MaterialManager: React.FC<MaterialManagerProps> = ({
  sites,
  materials,
  isAdmin = false,
  onRequireAdmin,
  onSaveMaterials,
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || '');
  const [view, setView] = useState<'site' | 'report'>('site');
  const [newItem, setNewItem] = useState({ name: '', unit: 'tấm', unitPrice: 0, purchased: 0, normPerM2: 0 });

  const site = sites.find((s) => s.id === selectedSiteId) || sites[0];
  const record: SiteMaterials | undefined = site ? materials.find((m) => m.siteId === site.id) : undefined;
  const items = record?.items || [];
  const area = site ? (site.completedAreaM2 > 0 ? site.completedAreaM2 : site.totalAreaM2) : 0;

  const guard = (fn: () => void) => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    fn();
  };

  const save = (nextItems: MaterialItem[], closedAt?: string | null) => {
    if (!site) return;
    const base: SiteMaterials = record || { id: `mat_${site.id}`, siteId: site.id, items: [] };
    const next: SiteMaterials = { ...base, items: nextItems };
    if (closedAt === null) delete next.closedAt;
    else if (closedAt) next.closedAt = closedAt;
    onSaveMaterials(next);
  };

  const updateItem = (id: string, patch: Partial<MaterialItem>) =>
    guard(() => save(items.map((i) => (i.id === id ? { ...i, ...patch } : i))));

  const addItem = (data: { name: string; unit: string; unitPrice: number; purchased: number; normPerM2: number }) =>
    guard(() => {
      if (!data.name.trim()) return;
      const item: MaterialItem = {
        id: `mi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: data.name.trim(),
        unit: data.unit.trim() || 'cái',
        unitPrice: num(data.unitPrice),
        purchased: num(data.purchased),
        extra: 0,
        remaining: null,
        normPerM2: num(data.normPerM2),
      };
      save([...items, item]);
      setNewItem({ name: '', unit: 'tấm', unitPrice: 0, purchased: 0, normPerM2: 0 });
    });

  const deleteItem = (id: string) =>
    guard(() => {
      if (window.confirm('Xóa vật tư này khỏi công trình?')) save(items.filter((i) => i.id !== id));
    });

  const toggleClosed = () =>
    guard(() => {
      if (record?.closedAt) {
        save(items, null);
        return;
      }
      const missing = items.filter((i) => i.remaining === null).length;
      if (missing > 0 && !window.confirm(`Còn ${missing} vật tư chưa nhập số lượng còn lại. Vẫn chốt?`)) return;
      save(items, new Date().toISOString().split('T')[0]);
    });

  const summary = site ? computeSiteSummary(site, record) : null;

  const allSummaries = useMemo(
    () => sites.map((s) => ({ site: s, record: materials.find((m) => m.siteId === s.id) })),
    [sites, materials]
  );

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const detail: (string | number)[][] = [
      ['Công trình', 'Vật tư', 'ĐVT', 'Đơn giá', 'Mua đầu DA', 'Mua bổ sung (thiếu)', 'Tổng nhập', 'Còn lại', 'Thực dùng', 'Định mức', 'Hao hụt', 'Hao hụt %', 'Giá trị hao hụt', 'Ghi chú'],
    ];
    const sum: (string | number)[][] = [
      ['Công trình', 'Diện tích m²', 'Số loại VT', 'Tổng tiền vật tư', 'Tiền mua bổ sung', 'Giá trị còn lại', 'Giá trị hao hụt', 'Hiệu suất %', 'Trạng thái chốt'],
    ];
    for (const { site: s, record: r } of allSummaries) {
      if (!r || r.items.length === 0) continue;
      const a = s.completedAreaM2 > 0 ? s.completedAreaM2 : s.totalAreaM2;
      for (const it of r.items) {
        const st = computeMaterialStat(it, a);
        detail.push([
          s.name, it.name, it.unit, it.unitPrice, it.purchased, it.extra, st.total,
          it.remaining ?? '', st.used ?? '', Math.round(st.expected * 100) / 100,
          st.waste !== null ? Math.round(st.waste * 100) / 100 : '',
          st.wastePct !== null ? Math.round(st.wastePct * 10) / 10 : '',
          Math.round(st.wasteCost), it.note || '',
        ]);
      }
      const ss = computeSiteSummary(s, r);
      sum.push([
        s.name, a, ss.itemCount, ss.totalCost, ss.extraCost, ss.leftoverCost, ss.wasteCost,
        ss.efficiency !== null ? Math.round(ss.efficiency * 10) / 10 : '',
        r.closedAt ? `Đã chốt ${formatDateVN(r.closedAt)}` : 'Đang thi công',
      ]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), 'Tổng hợp');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), 'Chi tiết vật tư');
    XLSX.writeFile(wb, `bao-cao-vat-tu-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const inputCls =
    'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white';

  if (sites.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-500 text-sm font-semibold border border-slate-200">
        Chưa có công trình nào. Hãy tạo công trình ở tab "Lịch Thợ" trước khi quản lý vật tư.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800">Quản Lý Vật Tư & Hao Hụt</h2>
          {!isAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Chỉ xem
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
            <button
              onClick={() => setView('site')}
              className={`px-3 py-1.5 rounded-md ${view === 'site' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
            >
              Theo công trình
            </button>
            <button
              onClick={() => setView('report')}
              className={`px-3 py-1.5 rounded-md ${view === 'report' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
            >
              Báo cáo tổng hợp
            </button>
          </div>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
          >
            <Download className="w-3.5 h-3.5" /> Xuất Excel
          </button>
        </div>
      </div>

      {view === 'report' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="text-left p-3">Công trình</th>
                <th className="text-right p-3">m²</th>
                <th className="text-right p-3">Tổng tiền VT</th>
                <th className="text-right p-3">Mua bổ sung</th>
                <th className="text-right p-3">Còn lại</th>
                <th className="text-right p-3">Hao hụt</th>
                <th className="text-right p-3">Hiệu suất</th>
                <th className="text-left p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {allSummaries.map(({ site: s, record: r }) => {
                const ss = computeSiteSummary(s, r);
                return (
                  <tr
                    key={s.id}
                    className="border-t border-slate-100 hover:bg-orange-50/40 cursor-pointer"
                    onClick={() => {
                      setSelectedSiteId(s.id);
                      setView('site');
                    }}
                  >
                    <td className="p-3 font-bold text-slate-800">{s.name}</td>
                    <td className="p-3 text-right">{fmtQty(ss.area)}</td>
                    <td className="p-3 text-right">{ss.itemCount ? formatCurrency(ss.totalCost) : '—'}</td>
                    <td className={`p-3 text-right ${ss.extraCost > 0 ? 'text-amber-600 font-bold' : ''}`}>
                      {ss.itemCount ? formatCurrency(ss.extraCost) : '—'}
                    </td>
                    <td className="p-3 text-right">{ss.itemCount ? formatCurrency(ss.leftoverCost) : '—'}</td>
                    <td className={`p-3 text-right ${ss.wasteCost > 0 ? 'text-red-600 font-bold' : ''}`}>
                      {ss.itemCount ? formatCurrency(ss.wasteCost) : '—'}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {ss.efficiency !== null ? `${ss.efficiency.toFixed(1)}%` : '—'}
                    </td>
                    <td className="p-3">
                      {!r || r.items.length === 0 ? (
                        <span className="text-slate-400">Chưa nhập</span>
                      ) : r.closedAt ? (
                        <span className="text-emerald-600 font-bold">Đã chốt {formatDateVN(r.closedAt)}</span>
                      ) : (
                        <span className="text-orange-600 font-bold">Đang thi công</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        site &&
        summary && (
          <>
            {/* Chọn công trình */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={site.id}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 font-semibold">
                Diện tích tính định mức: <b>{fmtQty(area)} m²</b>
                {site.completedAreaM2 > 0 ? ' (đã ốp xong)' : ' (tổng dự kiến)'}
              </span>
              <button
                onClick={toggleClosed}
                className={`ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold ${
                  record?.closedAt
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                {record?.closedAt ? `Đã chốt ${formatDateVN(record.closedAt)} (bấm để mở lại)` : 'Kết thúc dự án & chốt vật tư'}
              </button>
            </div>

            {/* Thẻ tổng hợp */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Tổng tiền vật tư', value: formatCurrency(summary.totalCost), cls: 'text-slate-800' },
                { label: 'Mua bổ sung (thiếu)', value: formatCurrency(summary.extraCost), cls: summary.extraCost > 0 ? 'text-amber-600' : 'text-slate-800' },
                { label: 'Giá trị còn lại', value: formatCurrency(summary.leftoverCost), cls: 'text-emerald-600' },
                { label: 'Giá trị hao hụt', value: formatCurrency(summary.wasteCost), cls: summary.wasteCost > 0 ? 'text-red-600' : 'text-slate-800' },
                { label: 'Hiệu suất sử dụng', value: summary.efficiency !== null ? `${summary.efficiency.toFixed(1)}%` : '—', cls: 'text-orange-600' },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] font-bold text-slate-500">{c.label}</div>
                  <div className={`text-base font-extrabold mt-1 ${c.cls}`}>{c.value}</div>
                </div>
              ))}
            </div>
            {summary.uncounted > 0 && items.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Còn {summary.uncounted} vật tư chưa nhập số lượng còn lại, chưa tính được thực dùng và hao hụt.
              </div>
            )}

            {/* Bảng vật tư */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs min-w-[920px]">
                <thead className="bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="text-left p-2.5">Vật tư</th>
                    <th className="p-2.5 w-16">ĐVT</th>
                    <th className="p-2.5 w-24">Đơn giá</th>
                    <th className="p-2.5 w-20">Mua đầu DA</th>
                    <th className="p-2.5 w-20">Mua thêm (thiếu)</th>
                    <th className="p-2.5 w-20">Còn lại</th>
                    <th className="p-2.5 w-20">Định mức /m²</th>
                    <th className="text-right p-2.5">Thực dùng</th>
                    <th className="text-right p-2.5">Hao hụt</th>
                    <th className="p-2.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400 font-semibold">
                        Chưa có vật tư. Thêm bên dưới hoặc bấm nhanh vật tư thường dùng.
                      </td>
                    </tr>
                  )}
                  {items.map((it) => {
                    const st = computeMaterialStat(it, area);
                    const wasteBad = st.waste !== null && st.waste > 0;
                    return (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="p-2">
                          <input
                            className={inputCls}
                            defaultValue={it.name}
                            key={it.id + it.name}
                            onBlur={(e) => e.target.value !== it.name && updateItem(it.id, { name: e.target.value })}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className={inputCls}
                            defaultValue={it.unit}
                            key={it.id + it.unit}
                            onBlur={(e) => e.target.value !== it.unit && updateItem(it.id, { unit: e.target.value })}
                          />
                        </td>
                        {(
                          [
                            ['unitPrice', it.unitPrice],
                            ['purchased', it.purchased],
                            ['extra', it.extra],
                            ['remaining', it.remaining],
                            ['normPerM2', it.normPerM2],
                          ] as [keyof MaterialItem, number | null][]
                        ).map(([field, val]) => (
                          <td key={field} className="p-2">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className={`${inputCls} text-right ${
                                field === 'extra' && num(val) > 0 ? 'bg-amber-50 border-amber-300' : ''
                              }`}
                              placeholder={field === 'remaining' ? 'chưa đếm' : '0'}
                              defaultValue={val === null ? '' : val}
                              key={it.id + field + String(val)}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (field === 'remaining') {
                                  const next = raw === '' ? null : num(raw);
                                  if (next !== it.remaining) updateItem(it.id, { remaining: next });
                                } else if (num(raw) !== val) {
                                  updateItem(it.id, { [field]: num(raw) } as Partial<MaterialItem>);
                                }
                              }}
                            />
                          </td>
                        ))}
                        <td className="p-2 text-right font-bold text-slate-700">
                          {st.used !== null ? `${fmtQty(st.used)} ${it.unit}` : '—'}
                          {st.expected > 0 && (
                            <div className="text-[10px] font-semibold text-slate-400">ĐM {fmtQty(st.expected)}</div>
                          )}
                        </td>
                        <td className={`p-2 text-right font-bold ${wasteBad ? 'text-red-600' : 'text-emerald-600'}`}>
                          {st.waste !== null ? (
                            <>
                              <span className="inline-flex items-center gap-1">
                                {wasteBad && <TrendingDown className="w-3 h-3 rotate-180" />}
                                {st.waste > 0 ? '+' : ''}
                                {fmtQty(st.waste)}
                              </span>
                              <div className="text-[10px] font-semibold">
                                {st.wastePct !== null ? `${st.wastePct > 0 ? '+' : ''}${st.wastePct.toFixed(1)}%` : ''}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => deleteItem(it.id)}
                            className="text-slate-400 hover:text-red-600"
                            title="Xóa vật tư"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Thêm vật tư */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-extrabold text-slate-700">Thêm vật tư mua đầu dự án</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setNewItem((n) => ({ ...n, name: p.name, unit: p.unit, normPerM2: p.normPerM2 }))}
                    className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-bold hover:bg-orange-100"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                <label className="col-span-2 text-[11px] font-bold text-slate-500">
                  Tên vật tư
                  <input className={inputCls} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                </label>
                <label className="text-[11px] font-bold text-slate-500">
                  ĐVT
                  <input className={inputCls} value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                </label>
                <label className="text-[11px] font-bold text-slate-500">
                  Đơn giá
                  <input type="number" min={0} className={inputCls} value={newItem.unitPrice || ''} onChange={(e) => setNewItem({ ...newItem, unitPrice: num(e.target.value) })} />
                </label>
                <label className="text-[11px] font-bold text-slate-500">
                  SL mua đầu
                  <input type="number" min={0} className={inputCls} value={newItem.purchased || ''} onChange={(e) => setNewItem({ ...newItem, purchased: num(e.target.value) })} />
                </label>
                <label className="text-[11px] font-bold text-slate-500">
                  Định mức /m²
                  <input type="number" min={0} step="any" className={inputCls} value={newItem.normPerM2 || ''} onChange={(e) => setNewItem({ ...newItem, normPerM2: num(e.target.value) })} />
                </label>
              </div>
              <button
                onClick={() => addItem(newItem)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm vật tư
              </button>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                Cách dùng: nhập số lượng mua đầu dự án, khi thiếu thì ghi vào cột "Mua thêm", kết thúc dự án đếm số còn lại rồi nhập vào cột "Còn lại".
                Thực dùng = mua đầu + mua thêm − còn lại. Hao hụt = thực dùng − (định mức × m²). Hiệu suất = định mức ÷ thực dùng.
              </p>
            </div>
          </>
        )
      )}
    </div>
  );
};
