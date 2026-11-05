import React from 'react';
import { Smartphone, Share, PlusSquare, MapPin, Camera, X } from 'lucide-react';

interface IphoneGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IphoneGuideModal: React.FC<IphoneGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900">
              Cách Dùng Mượt Trên iPhone (PWA)
            </h3>
            <p className="text-xs text-slate-500">Cài đặt icon app ra màn hình chính trong 10 giây</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-slate-700">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Mở link web bằng Safari trên iPhone</span>
            </div>
            <p className="text-slate-600 pl-7">
              Dùng trình duyệt <b>Safari</b> mặc định của iPhone để mở đường link ứng dụng của bạn.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>Bấm nút Chia sẻ (Share)</span>
            </div>
            <p className="text-slate-600 pl-7 flex items-center gap-1.5">
              Ở thanh công cụ đáy Safari, bấm biểu tượng <Share className="w-4 h-4 text-blue-600 inline" /> (hình ô vuông có mũi tên chỉ lên).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Chọn "Thêm vào MH chính" (Add to Home Screen)</span>
            </div>
            <p className="text-slate-600 pl-7 flex items-center gap-1.5">
              Cuộn xuống và chọn <PlusSquare className="w-4 h-4 text-blue-600 inline" /> <b>"Thêm vào Màn hình chính"</b> rồi bấm <b>Thêm</b> ở góc trên cùng.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <span className="font-bold flex items-center gap-1 mb-1">
              ✓ Kết quả:
            </span>
            <p>
              Icon app sẽ xuất hiện ngay trên màn hình iPhone. Khi mở ra, app sẽ chạy toàn màn hình, mượt mà như app tải từ App Store, hỗ trợ định vị GPS và mở camera chụp ảnh trực tiếp tại hiện trường công trình!
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
        >
          Đã Hiểu, Đóng Hướng Dẫn
        </button>
      </div>
    </div>
  );
};
