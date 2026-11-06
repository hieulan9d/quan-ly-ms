import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  Settings,
  Sparkles,
  LogOut
} from 'lucide-react';
import { loginAdmin, changeAdminPassword, isAdminLoggedIn } from '../services/auth';
import confetti from 'canvas-confetti';

interface AdminLoginModalProps {
  isOpen: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  onLogout?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  isAdmin = false,
  onClose,
  onLoginSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'change_password'>('login');
  
  // Login states
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  // Feedback states
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Khi mở modal, nếu đã đăng nhập Admin thì mở thẳng tab Đổi Mật Khẩu
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (isAdmin) {
        setActiveTab('change_password');
      } else {
        setActiveTab('login');
      }
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  // Xử lý đăng nhập Admin
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu Quản Trị Viên!');
      return;
    }

    if (loginAdmin(password)) {
      try {
        confetti({ particleCount: 70, spread: 60 });
      } catch {}
      setSuccessMessage('Đăng nhập Quản Trị Viên thành công!');
      setTimeout(() => {
        setSuccessMessage('');
        setPassword('');
        onLoginSuccess();
        onClose();
      }, 700);
    } else {
      setErrorMessage('Mật khẩu Quản Trị Viên không chính xác. Vui lòng thử lại!');
    }
  };

  // Xử lý đổi mật khẩu Admin
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 4 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeAdminPassword(currentPassword, newPassword);
      if (res.success) {
        try {
          confetti({ particleCount: 80, spread: 70 });
        } catch {}
        setSuccessMessage(res.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onLoginSuccess(); // Tự động cập nhật trạng thái Admin
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in fade-in border border-slate-100">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900 leading-tight">
              Quản Trị Viên (Admin)
            </h3>
            <p className="text-xs text-slate-500">
              Quyền quản trị bảng công, tiền lương & dự án
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Đăng Nhập</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('change_password');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'change_password'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Đổi Mật Khẩu</span>
          </button>
        </div>

        {/* Thông báo lỗi & thành công */}
        {errorMessage && (
          <div className="mb-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: FORM ĐĂNG NHẬP ADMIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
              🔒 <b>Lưu ý:</b> Chỉ <b>Quản Trị Viên</b> mới có quyền chỉnh sửa bảng công, sửa tiền lương / đơn giá nhân viên, và sửa đổi ngân sách, KPI dự án.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nhập Mật Khẩu Quản Trị Viên:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu Admin..."
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-11 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <KeyRound className="w-4 h-4 text-slate-950" />
                <span>XÁC NHẬN ĐĂNG NHẬP ADMIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('change_password');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 py-1 flex items-center justify-center gap-1 transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Bạn muốn đổi mật khẩu Admin? Nhấn vào đây</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: FORM ĐỔI MẬT KHẨU ADMIN */}
        {activeTab === 'change_password' && (
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium">
              🔑 Vui lòng nhập <b>mật khẩu hiện tại</b> để xác thực, sau đó nhập <b>mật khẩu mới</b> (tối thiểu 4 ký tự).
            </div>

            {/* Mật khẩu hiện tại */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật Khẩu Hiện Tại:
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-11 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  title={showCurrentPass ? 'Ẩn' : 'Hiện'}
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật Khẩu Mới:
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (ít nhất 4 ký tự)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-11 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  title={showNewPass ? 'Ẩn' : 'Hiện'}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Xác Nhận Lại Mật Khẩu Mới:
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-11 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  title={showConfirmPass ? 'Ẩn' : 'Hiện'}
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4 text-slate-950" />
                <span>{isSubmitting ? 'ĐANG CẬP NHẬT...' : 'LƯU MẬT KHẨU MỚI'}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-bold text-slate-600 hover:text-slate-900 py-1"
                >
                  ← Quay lại Đăng Nhập
                </button>

                {isAdmin && onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 py-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất Admin</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
