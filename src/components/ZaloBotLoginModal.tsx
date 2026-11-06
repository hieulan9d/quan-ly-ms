import React, { useEffect, useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchZaloBotStatus, ZaloBotStatus } from '../services/zaloService';

interface ZaloBotLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  botUrl?: string;
}

export const ZaloBotLoginModal: React.FC<ZaloBotLoginModalProps> = ({ isOpen, onClose, botUrl }) => {
  const [status, setStatus] = useState<ZaloBotStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const s = await fetchZaloBotStatus(botUrl);
        if (!cancelled) {
          setStatus(s);
          setError('');
        }
      } catch (e: any) {
        if (!cancelled) setError('Không kết nối được máy chủ bot (' + (e?.message || 'lỗi mạng') + ').');
      }
    };
    void poll();
    const timer = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, botUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">Đăng nhập Zalo cho Bot</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!error && !status && (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Đang kiểm tra...
          </div>
        )}

        {status?.zaloConnected && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5" /> Bot đã đăng nhập Zalo và đang hoạt động.
          </div>
        )}

        {status && !status.zaloConnected && (
          <div className="space-y-3">
            {status.qr ? (
              <>
                <img
                  src={'data:image/png;base64,' + status.qr}
                  alt="Mã QR đăng nhập Zalo"
                  className="mx-auto w-56 h-56 border border-slate-200 rounded-xl"
                />
                <ol className="text-xs text-slate-600 list-decimal pl-5 space-y-1">
                  <li>Mở Zalo trên điện thoại (nên dùng số phụ cho bot).</li>
                  <li>Bấm biểu tượng quét QR và quét mã trên.</li>
                  <li>Xác nhận đăng nhập trên điện thoại.</li>
                </ol>
                <p className="text-[11px] text-slate-400">Mã tự đổi khi hết hạn, trang tự cập nhật.</p>
              </>
            ) : (
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Đang tạo mã QR ({status.loginStatus})...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
