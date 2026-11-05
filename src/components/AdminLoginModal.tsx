import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { loginAdmin, changeAdminPassword, getAdminPassword } from '../services/auth';
import confetti from 'canvas-confetti';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPass, setNewPass] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (loginAdmin(password)) {
      try {
        confetti({ particleCount: 70, spread: 60 });
      } catch {}
      setSuccessMessage('Đăng nhập Quản Trị Viên (Admin) thành công!');
      setTimeout(() => {
        setSuccessMessage('');
        setPassword('');
        onLoginSuccess();
        onClose();
      }, 700);
    } else {
      setErrorMessage('Mật khẩu Admin không đúng! (Mật khẩu mặc định: 8888 hoặc admin)');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.trim().length < 4) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 4 ký tự!');
      return;
    }
    if (changeAdminPassword(newPass)) {
      setSuccessMessage('Đã đổi mật khẩu Admin thành công!');
      setTimeout(() => {
        setSuccessMessage('');
        setIsChangingPass(false);
        setNewPass('');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-200">
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

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {!isChangingPass ? (
          /* Form Đăng nhập Admin */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
              🔒 <b>Lưu ý:</b> Chỉ <b>Admin</b> mới có quyền chỉnh sửa bảng công, sửa tiền lương / đơn giá nhân viên, và sửa đổi ngân sách, KPI dự án của khách hàng.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nhập Mật Khẩu / Mã PIN Quản Trị:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập 8888 hoặc admin..."
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-black tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Quick Pin Buttons */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                <span>💡 Mật khẩu mặc định: <b className="text-amber-700 font-mono">8888</b> hoặc <b className="text-amber-700 font-mono">admin</b></span>
                <button
                  type="button"
                  onClick={() => setPassword('8888')}
                  className="text-amber-600 hover:text-amber-800 font-bold underline"
                >
                  Điền nhanh 8888
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <KeyRound className="w-4 h-4 text-slate-950" />
                <span>XÁC NHẬN ĐĂNG NHẬP ADMIN</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChangingPass(true)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 py-1 flex items-center justify-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Đổi mật khẩu Admin</span>
              </button>
            </div>
          </form>
        ) : (
          /* Form Đổi Mật khẩu Admin */
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nhập Mật Khẩu Admin Mới:
              </label>
              <input
                type="text"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Ví dụ: 9999 hoặc Matkhau123"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsChangingPass(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md"
              >
                LƯU MẬT KHẨU MỚI
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
