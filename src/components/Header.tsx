import React from 'react';
import { CompanyId } from '../types';
import { Building2, Hammer, Cloud, Sparkles, Bot, ShieldCheck, Lock, LogOut } from 'lucide-react';

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
  onOpenAIReportModal,
  onOpenAdminLogin,
  onAdminLogout,
}) => {
  const isAgency = currentCompany === 'agency';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-2 sm:py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md shrink-0 transition-colors ${
                isAgency
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-purple-200'
                  : 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-orange-200'
              }`}
            >
              {isAgency ? <Building2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Hammer className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-slate-900 truncate">
                  {isAgency ? 'MS angency' : 'MS ốp tường'}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full hidden xs:inline-block sm:inline-block ${
                    isAgency
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {isAgency ? 'Digital & Media' : 'Nội Thất & Dự Án'}
                </span>
              </div>
              <p className="text-[11px] lg:text-xs text-slate-500 hidden md:block truncate">
                Hệ thống Quản lý Chấm công, Tiến độ & Tính lương 2 Doanh nghiệp
              </p>
            </div>
          </div>

          {/* Action buttons & Company Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* NÚT ADMIN QUẢN TRỊ VIÊN */}
            {isAdmin ? (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 py-1 px-2 sm:px-2.5 rounded-xl shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] sm:text-xs font-black text-amber-900 hidden sm:inline">
                  👑 Admin
                </span>
                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="ml-0.5 text-[11px] font-bold text-slate-500 hover:text-rose-600 p-0.5 rounded hover:bg-amber-100 transition"
                  title="Đăng xuất khỏi quyền Admin (về chế độ nhân viên xem)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-black text-slate-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 sm:px-2.5 py-1.5 rounded-xl shadow-xs transition active:scale-95 whitespace-nowrap"
                title="Đăng nhập Admin để sửa bảng công, tiền lương và dự án"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="hidden sm:inline">Đăng Nhập Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            {/* NÚT AI BÁO CÁO TIẾN ĐỘ 2 CÔNG TY */}
            <button
              onClick={onOpenAIReportModal}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 sm:px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95 whitespace-nowrap"
              title="Trợ lý AI xuất báo cáo tiến độ tuần / tháng cho cả 2 công ty"
            >
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
              <span className="hidden md:inline">Báo Cáo AI</span>
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 hidden sm:inline" />
            </button>

            {/* Cloud Config Button */}
            <button
              onClick={onOpenSupabaseModal}
              className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition whitespace-nowrap"
              title="Cài đặt kết nối Supabase Cloud & Vercel"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Đám Mây</span>
            </button>

            {/* NÚT CHUYỂN ĐỔI 1 CHẠM GIỮA 2 CÔNG TY */}
            <div className="bg-slate-100 p-0.5 sm:p-1 rounded-xl flex items-center border border-slate-200 shadow-inner">
              <button
                onClick={() => onSwitchCompany('agency')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                  isAgency
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>MS angency</span>
              </button>

              <button
                onClick={() => onSwitchCompany('lam_song')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                  !isAgency
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hammer className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>MS ốp tường</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
