import React, { useState } from 'react';
import { getStoredSupabaseConfig, saveSupabaseConfig } from '../services/db';
import { Cloud, Check, ExternalLink, X, Database, ShieldCheck, Copy } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900">
              Kết Nối Supabase Cloud & Triển Khai Vercel
            </h3>
            <p className="text-xs text-slate-500">Miễn phí 100% trọn đời cho doanh nghiệp của bạn</p>
          </div>
        </div>

        {/* Trạng thái hiện tại */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>Trạng thái hoạt động:</span>
            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {url && anonKey ? '✓ Đã kết nối Supabase Cloud' : '⚡ Đang lưu an toàn trên máy (Local)'}
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Ứng dụng hiện tại đã hoạt động đầy đủ, lưu trữ dữ liệu nhân sự, công nhật và tiến độ ngay trên trình duyệt của bạn. Khi bạn điền tài khoản Supabase dưới đây, dữ liệu sẽ tự động đồng bộ lên đám mây 24/7!
          </p>
        </div>

        {/* Hướng dẫn 3 bước cực nhanh */}
        <div className="space-y-3 mb-5 text-xs text-slate-600">
          <h4 className="font-bold text-slate-900 text-sm">3 Bước Đưa Lên Mạng Trong 5 Phút:</h4>
          
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
            <span className="font-bold text-blue-900">Bước 1: Tạo Database Supabase</span>
            <p className="mt-0.5">
              Vào <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> (bấm Sign in bằng Google), chọn <b>New Project</b>.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
            <span className="font-bold text-blue-900">Bước 2: Tạo Bảng Tự Động</span>
            <p className="mt-0.5">
              Mở mục <b>SQL Editor</b> trong Supabase, mở file <code>supabase_schema.sql</code> có sẵn trong thư mục dự án này, copy toàn bộ và dán vào rồi bấm <b>Run</b>. Tất cả bảng và bảo mật sẽ tự sinh!
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
            <span className="font-bold text-blue-900">Bước 3: Đưa lên Vercel</span>
            <p className="mt-0.5">
              Vào <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline inline-flex items-center gap-0.5">vercel.com <ExternalLink className="w-3 h-3" /></a>, chọn Import dự án này từ GitHub. Bạn sẽ nhận được đường link web có sẵn HTTPS để mở trên iPhone ngay lập tức!
            </p>
          </div>
        </div>

        {/* Form nhập cấu hình */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Project URL của Supabase:
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Anon Public API Key:
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
            />
          </div>

          {savedNotice && (
            <div className="p-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg text-center">
              ✓ Đã lưu cài đặt Supabase! Đang tải lại...
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
            >
              Lưu & Đồng Bộ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
