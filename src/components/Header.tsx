import React from 'react';
import { CompanyId } from '../types';
import { Building2, Hammer, Cloud, Smartphone, Sparkles, Bot, ShieldCheck, Lock, LogOut } from 'lucide-react';

interface HeaderProps {
  currentCompany: CompanyId;
  isAdmin: boolean;
  onSwitchCompany: (company: CompanyId) => void;
  onOpenSupabaseModal: () => void;
  onOpenMobileGuide: () => void;
  onOpenAIReportModal: () => void;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCompany,
  isAdmin,
  onSwitchCompany,
  onOpenSupabaseModal,
  onOpenMobileGuide,
  onOpenAIReportModal,
  onOpenAdminLogin,
  onAdminLogout,
}) => {
  const isAgency = currentCompany === 'agency';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md transition-colors ${
                isAgency
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-purple-200'
                  : 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-orange-200'
              }`}
            >
              {isAgency ? <Building2 className="w-5 h-5" /> : <Hammer className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  {isAgency ? 'AGENCY SÁNG TẠO' : 'THI CÔNG ỐP LAM SÓNG'}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    isAgency
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {isAgency ? 'Digital & Media' : 'Nội Thất & Dự Án'}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Hệ thống Quản lý Chấm công, Tiến độ & Tính lương 2 Doanh nghiệp
              </p>
            </div>
          </div>

          {/* Action buttons & Company Switcher */}
          <div className="flex items-center gap-2">
            {/* NÚT ADMIN QUẢN TRỊ VIÊN */}
            {isAdmin ? (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 py-1 px-2.5 rounded-xl shadow-xs">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-black text-amber-900 hidden sm:inline">
                  👑 Admin
                </span>
                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="ml-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 p-0.5 rounded hover:bg-amber-100 transition"
                  title="Đăng xuất khỏi quyền Admin (về chế độ nhân viên xem)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1.5 text-xs font-black text-slate-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 rounded-xl shadow-xs transition active:scale-95"
                title="Đăng nhập Admin để sửa bảng công, tiền lương và dự án"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Đăng Nhập Admin</span>
              </button>
            )}

            {/* NÚT AI BÁO CÁO TIẾN ĐỘ 2 CÔNG TY */}
            <button
              onClick={onOpenAIReportModal}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95"
              title="Trợ lý AI xuất báo cáo tiến độ tuần / tháng cho cả 2 công ty"
            >
              <Bot className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">Báo Cáo AI</span>
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
            </button>

            {/* Cloud Config Button */}
            <button
              onClick={onOpenSupabaseModal}
              className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition"
              title="Cài đặt kết nối Supabase Cloud & Vercel"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Đám Mây</span>
            </button>

            {/* NÚT CHUYỂN ĐỔI 1 CHẠM GIỮA 2 CÔNG TY */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-inner">
              <button
                onClick={() => onSwitchCompany('agency')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isAgency
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Agency</span>
              </button>

              <button
                onClick={() => onSwitchCompany('lam_song')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isAgency
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Ốp Lam Sóng</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
