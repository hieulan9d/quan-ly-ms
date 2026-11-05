import React, { useState } from 'react';
import { CompanyId, ConstructionSite, AgencyTask, Employee } from '../types';
import { formatDateVN } from '../services/db';
import {
  Layers,
  CheckCircle,
  Clock,
  Plus,
  Phone,
  MapPin,
  Camera,
  Calendar,
  Sparkles,
  Edit,
  Trash2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface WorkProgressManagerProps {
  currentCompany: CompanyId;
  sites: ConstructionSite[];
  tasks: AgencyTask[];
  employees: Employee[];
  isAdmin?: boolean;
  onRequireAdmin?: () => void;
  onSaveSite: (site: ConstructionSite) => void;
  onSaveTask: (task: AgencyTask) => void;
  onDeleteSite: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export const WorkProgressManager: React.FC<WorkProgressManagerProps> = ({
  currentCompany,
  sites,
  tasks,
  employees,
  isAdmin = false,
  onRequireAdmin,
  onSaveSite,
  onSaveTask,
  onDeleteSite,
  onDeleteTask,
}) => {
  const isAgency = currentCompany === 'agency';
  const companyEmployees = employees.filter((e) => e.companyId === currentCompany && e.active);

  // Modal states
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedSiteForUpdate, setSelectedSiteForUpdate] = useState<ConstructionSite | null>(null);
  const [addedM2, setAddedM2] = useState<number>(10);
  const [newPhotoCaption, setNewPhotoCaption] = useState<string>('');
  const [newPhotoStage, setNewPhotoStage] = useState<'khung_xuong' | 'dang_op' | 'nghiem_thu'>('dang_op');
  const [newPhotoFile, setNewPhotoFile] = useState<string | null>(null);

  // New site form state
  const [newSite, setNewSite] = useState<Partial<ConstructionSite>>({
    name: '',
    clientName: '',
    phone: '',
    address: '',
    totalAreaM2: 50,
    completedAreaM2: 0,
    panelType: 'Lam sóng Nano 4 sóng cao cấp',
    status: 'framing',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    notes: '',
  });

  // New task form state
  const [newTask, setNewTask] = useState<Partial<AgencyTask>>({
    title: '',
    client: '',
    assignedTo: companyEmployees[0]?.id || '',
    deadline: '',
    status: 'todo',
    priority: 'medium',
    notes: '',
  });

  // Handlers mở modal kiểm tra quyền Admin
  const handleOpenAddSite = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setShowAddSiteModal(true);
  };

  const handleOpenAddTask = () => {
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    setShowAddTaskModal(true);
  };

  // Handler update completed m2
  const handleUpdateM2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteForUpdate) return;

    const newCompleted = Math.min(
      selectedSiteForUpdate.totalAreaM2,
      selectedSiteForUpdate.completedAreaM2 + Number(addedM2)
    );

    const updatedSite: ConstructionSite = {
      ...selectedSiteForUpdate,
      completedAreaM2: newCompleted,
      status: newCompleted >= selectedSiteForUpdate.totalAreaM2 ? 'completed' : selectedSiteForUpdate.status,
    };

    // Nếu có tải kèm ảnh hiện trường
    if (newPhotoFile) {
      updatedSite.photos = [
        ...updatedSite.photos,
        {
          id: `p_${Date.now()}`,
          url: newPhotoFile,
          caption: newPhotoCaption || `Tiến độ thi công ngày ${formatDateVN(new Date().toISOString().split('T')[0])}`,
          stage: newPhotoStage,
          date: new Date().toISOString().split('T')[0],
        },
      ];
    }

    onSaveSite(updatedSite);
    setSelectedSiteForUpdate(null);
    setNewPhotoFile(null);
    setNewPhotoCaption('');
  };

  // Handler add new site
  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!newSite.name || !newSite.clientName) return;

    const site: ConstructionSite = {
      id: `site_${Date.now()}`,
      name: newSite.name!,
      clientName: newSite.clientName!,
      phone: newSite.phone || '',
      address: newSite.address || '',
      totalAreaM2: Number(newSite.totalAreaM2 || 0),
      completedAreaM2: 0,
      panelType: newSite.panelType || 'Lam sóng Nano cao cấp',
      estimatedDays: Number(newSite.estimatedDays || 5),
      actualDays: 1,
      status: (newSite.status as any) || 'framing',
      assignedWorkers: [],
      startDate: newSite.startDate || new Date().toISOString().split('T')[0],
      expectedEndDate: newSite.expectedEndDate || '',
      notes: newSite.notes || '',
      photos: [],
      dailySchedules: [],
    };

    onSaveSite(site);
    setShowAddSiteModal(false);
    setNewSite({
      name: '',
      clientName: '',
      phone: '',
      address: '',
      totalAreaM2: 50,
      completedAreaM2: 0,
      panelType: 'Lam sóng Nano 4 sóng cao cấp',
      status: 'framing',
    });
  };

  // Handler add new agency task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onRequireAdmin?.();
      return;
    }
    if (!newTask.title || !newTask.client) return;

    const task: AgencyTask = {
      id: `task_${Date.now()}`,
      title: newTask.title!,
      client: newTask.client!,
      assignedTo: newTask.assignedTo || companyEmployees[0]?.id || '',
      deadline: newTask.deadline || new Date().toISOString().split('T')[0],
      status: (newTask.status as any) || 'todo',
      priority: (newTask.priority as any) || 'medium',
      notes: newTask.notes || '',
    };

    onSaveTask(task);
    setShowAddTaskModal(false);
    setNewTask({
      title: '',
      client: '',
      assignedTo: companyEmployees[0]?.id || '',
      status: 'todo',
      priority: 'medium',
      notes: '',
    });
  };

  // Handle task status change
  const handleChangeTaskStatus = (task: AgencyTask, newStatus: AgencyTask['status']) => {
    onSaveTask({ ...task, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* ---------------- A. TIẾN ĐỘ THI CÔNG CÔNG TRÌNH ỐP TƯỜNG LAM SÓNG ---------------- */}
      {!isAgency && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                <span>Tiến Độ Các Công Trình Thi Công Lam Sóng</span>
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi khối lượng m² đã ốp, xem ảnh hiện trường thợ tải lên
              </p>
            </div>

            <button
              onClick={handleOpenAddSite}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Công Trình Mới</span>
            </button>
          </div>

          {/* Danh sách thẻ công trình */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {sites.map((site) => {
              const pct = site.totalAreaM2 > 0 ? Math.round((site.completedAreaM2 / site.totalAreaM2) * 100) : 0;
              const isCompleted = site.status === 'completed';

              return (
                <div
                  key={site.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition"
                >
                  {/* Site Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : site.status === 'installing'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isCompleted
                            ? '✓ Đã bàn giao'
                            : site.status === 'installing'
                            ? 'Đang ốp tấm'
                            : site.status === 'framing'
                            ? 'Bắn khung xương'
                            : 'Đang chuẩn bị'}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900 mt-1">
                          {site.name}
                        </h3>
                      </div>

                      <button
                        onClick={() => onDeleteSite(site.id)}
                        className="text-slate-300 hover:text-rose-500 p-1"
                        title="Xóa công trình"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{site.address}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <span>Chủ nhà: {site.clientName}</span>
                          {site.phone && (
                            <a
                              href={`tel:${site.phone}`}
                              className="text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{site.phone}</span>
                            </a>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Hạn: {formatDateVN(site.expectedEndDate) || 'Linh hoạt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Khối lượng m2 & Tiến độ */}
                  <div className="p-4 sm:p-5 bg-slate-50/60">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-700">Khối lượng hoàn thành:</span>
                      <span className="text-orange-600 text-sm">
                        {site.completedAreaM2} / {site.totalAreaM2} m² ({pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mb-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-700 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="text-xs text-slate-500 mb-3">
                      Vật liệu: <span className="font-semibold text-slate-700">{site.panelType}</span>
                    </div>

                    {/* Nút cập nhật m2 hôm nay */}
                    <button
                      onClick={() => {
                        setSelectedSiteForUpdate(site);
                        setAddedM2(10);
                      }}
                      className="w-full py-2 px-3 bg-white hover:bg-orange-50 border border-orange-300 text-orange-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-4 h-4 text-orange-600" />
                      <span>+ Cập nhật số m² & Đăng ảnh hiện trường</span>
                    </button>
                  </div>

                  {/* Ảnh nhật ký hiện trường */}
                  {site.photos && site.photos.length > 0 && (
                    <div className="p-4 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                        <span>Nhật ký ảnh công trình ({site.photos.length} ảnh):</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {site.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100"
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                              <span className="text-[10px] text-white font-medium line-clamp-1">
                                {photo.caption}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- B. TIẾN ĐỘ DỰ ÁN AGENCY (KANBAN BOARD) ---------------- */}
      {isAgency && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span>Bảng Tiến Độ Dự Án & Tasks Khách Hàng (Kanban)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi quy trình thực hiện công việc marketing từ lên ý tưởng đến hoàn thành
              </p>
            </div>

            <button
              onClick={handleOpenAddTask}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Task Công Việc Mới</span>
            </button>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(
              [
                { key: 'todo', label: 'Cần Làm (Todo)', color: 'border-slate-300 text-slate-700' },
                { key: 'in_progress', label: 'Đang Triển Khai', color: 'border-blue-400 text-blue-700' },
                { key: 'review', label: 'Chờ Khách Duyệt', color: 'border-amber-400 text-amber-700' },
                { key: 'done', label: '✓ Hoàn Thành', color: 'border-emerald-400 text-emerald-700' },
              ] as const
            ).map((column) => {
              const colTasks = tasks.filter((t) => t.status === column.key);

              return (
                <div
                  key={column.key}
                  className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200 flex flex-col min-h-[450px]"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200 font-bold text-xs">
                    <span className={column.color}>{column.label}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full text-slate-600 shadow-sm">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.map((task) => {
                      const emp = employees.find((e) => e.id === task.assignedTo);

                      return (
                        <div
                          key={task.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                              {task.client}
                            </span>
                            <span
                              className={`font-semibold ${
                                task.priority === 'high'
                                  ? 'text-rose-600'
                                  : task.priority === 'medium'
                                  ? 'text-amber-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {task.priority === 'high' ? 'Gấp' : 'Bình thường'}
                            </span>
                          </div>

                          <div className="font-bold text-sm text-slate-900">{task.title}</div>

                          {task.notes && (
                            <p className="text-xs text-slate-500 line-clamp-2">{task.notes}</p>
                          )}

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                            <span className="font-medium text-slate-600 truncate max-w-[110px]">
                              {emp?.name || 'Chưa gán'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Hạn: {formatDateVN(task.deadline)}
                            </span>
                          </div>

                          {/* Quick change status buttons */}
                          <div className="flex items-center gap-1 pt-1">
                            {column.key !== 'todo' && (
                              <button
                                onClick={() =>
                                  handleChangeTaskStatus(
                                    task,
                                    column.key === 'done'
                                      ? 'review'
                                      : column.key === 'review'
                                      ? 'in_progress'
                                      : 'todo'
                                  )
                                }
                                className="text-[10px] text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                              >
                                ← Lùi
                              </button>
                            )}

                            {column.key !== 'done' && (
                              <button
                                onClick={() =>
                                  handleChangeTaskStatus(
                                    task,
                                    column.key === 'todo'
                                      ? 'in_progress'
                                      : column.key === 'in_progress'
                                      ? 'review'
                                      : 'done'
                                  )
                                }
                                className="text-[10px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 ml-auto"
                              >
                                Tiến →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- MODAL CẬP NHẬT M² & ĐĂNG ẢNH CÔNG TRÌNH ---------------- */}
      {selectedSiteForUpdate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in">
            <h3 className="font-black text-base text-slate-900 mb-1">
              Cập Nhật Tiến Độ: {selectedSiteForUpdate.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập số mét vuông thợ đã ốp thêm hôm nay và tải ảnh nghiệm thu
            </p>

            <form onSubmit={handleUpdateM2} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số m² vừa ốp xong hôm nay:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={addedM2}
                    onChange={(e) => setAddedM2(Number(e.target.value))}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-bold text-slate-900"
                    required
                  />
                  <span className="text-sm font-bold text-slate-600">m²</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Hiện tại: {selectedSiteForUpdate.completedAreaM2} / {selectedSiteForUpdate.totalAreaM2} m² ➔ Sau cập nhật: {Math.min(selectedSiteForUpdate.totalAreaM2, selectedSiteForUpdate.completedAreaM2 + Number(addedM2))} m²
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giai đoạn thi công ảnh:
                </label>
                <select
                  value={newPhotoStage}
                  onChange={(e) => setNewPhotoStage(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="khung_xuong">Hệ khung xương sắt / gỗ</option>
                  <option value="dang_op">Đang ốp tấm lam sóng</option>
                  <option value="nghiem_thu">Hoàn thiện nẹp phào & nghiệm thu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chụp / Tải ảnh hiện trường từ iPhone:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setNewPhotoFile(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />

                {newPhotoFile && (
                  <div className="mt-2 h-24 rounded-xl overflow-hidden border border-slate-200">
                    <img src={newPhotoFile} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ghi chú cho bức ảnh:
                </label>
                <input
                  type="text"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="Ví dụ: Đã bắn xong nẹp trần phòng khách..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSiteForUpdate(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-md"
                >
                  Xác Nhận Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL THÊM CÔNG TRÌNH MỚI (LAM SÓNG) ---------------- */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-base text-slate-900 mb-1">Thêm Công Trình Mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập thông tin công trình ốp tường lam sóng để phân công thợ
            </p>

            <form onSubmit={handleCreateSite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên công trình:</label>
                <input
                  type="text"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  placeholder="VD: Biệt thự Louis City - P.Khách"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên chủ nhà:</label>
                  <input
                    type="text"
                    value={newSite.clientName}
                    onChange={(e) => setNewSite({ ...newSite, clientName: e.target.value })}
                    placeholder="VD: Anh Tuấn Anh"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại:</label>
                  <input
                    type="tel"
                    value={newSite.phone}
                    onChange={(e) => setNewSite({ ...newSite, phone: e.target.value })}
                    placeholder="VD: 0903..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ thi công:</label>
                <input
                  type="text"
                  value={newSite.address}
                  onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
                  placeholder="Số nhà, đường, quận/huyện, tỉnh..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tổng diện tích (m²):</label>
                  <input
                    type="number"
                    min={1}
                    value={newSite.totalAreaM2}
                    onChange={(e) => setNewSite({ ...newSite, totalAreaM2: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại tấm lam sóng:</label>
                  <input
                    type="text"
                    value={newSite.panelType}
                    onChange={(e) => setNewSite({ ...newSite, panelType: e.target.value })}
                    placeholder="VD: Lam sóng 4 sóng Nano vân gỗ..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu:</label>
                  <input
                    type="date"
                    value={newSite.startDate}
                    onChange={(e) => setNewSite({ ...newSite, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dự kiến hoàn thành:</label>
                  <input
                    type="date"
                    value={newSite.expectedEndDate}
                    onChange={(e) => setNewSite({ ...newSite, expectedEndDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-md"
                >
                  Lưu Công Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL THÊM TASK MỚI (AGENCY) ---------------- */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <h3 className="font-black text-base text-slate-900 mb-1">Thêm Việc Mới Cho Team</h3>
            <p className="text-xs text-slate-500 mb-4">Gán task cho nhân viên và đặt hạn chót</p>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên công việc:</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="VD: Thiết kế banner quảng cáo Facebook..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên khách hàng / Dự án:</label>
                <input
                  type="text"
                  value={newTask.client}
                  onChange={(e) => setNewTask({ ...newTask, client: e.target.value })}
                  placeholder="VD: VinFast, TocoTea..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gán cho nhân viên:</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    {companyEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hạn chót (Deadline):</label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mức độ ưu tiên:</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Bình thường</option>
                  <option value="high">Rất gấp (High Priority)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả chi tiết:</label>
                <textarea
                  rows={2}
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  placeholder="Yêu cầu cụ thể, link tài liệu..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-md"
                >
                  Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
