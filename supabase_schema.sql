-- ==============================================================================
-- DATABASE SCHEMA: HỆ THỐNG QUẢN LÝ CHẤM CÔNG, TIẾN ĐỘ & TÍNH LƯƠNG CHO 2 CÔNG TY
-- (Agency & Thi Công Ốp Tường Lam Sóng)
-- Hướng dẫn: Copy toàn bộ nội dung file này dán vào SQL Editor trên Supabase và bấm RUN.
-- ==============================================================================

-- 1. BẢNG NHÂN VIÊN (EMPLOYEES)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL CHECK (company_id IN ('agency', 'lam_song')),
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,
    wage_type TEXT NOT NULL CHECK (wage_type IN ('daily', 'monthly', 'piecework')),
    base_rate NUMERIC NOT NULL DEFAULT 0, -- Tiền công nhật hoặc lương tháng
    ot_rate NUMERIC NOT NULL DEFAULT 0,   -- Tiền tăng ca mỗi giờ
    allowance NUMERIC NOT NULL DEFAULT 0, -- Phụ cấp xăng xe, ăn trưa
    avatar TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. BẢNG CHẤM CÔNG (ATTENDANCE)
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL CHECK (company_id IN ('agency', 'lam_song')),
    date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    check_out_time TIME,
    work_units NUMERIC NOT NULL DEFAULT 1, -- 1 công hoặc 0.5 công
    ot_hours NUMERIC NOT NULL DEFAULT 0,   -- Giờ tăng ca
    location_type TEXT NOT NULL CHECK (location_type IN ('office', 'remote', 'site')),
    site_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    photo_url TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'half_day', 'late', 'leave', 'absent')),
    verified_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. BẢNG CÔNG TRÌNH ỐP TƯỜNG LAM SÓNG (CONSTRUCTION SITES)
CREATE TABLE IF NOT EXISTS construction_sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    total_area_m2 NUMERIC NOT NULL DEFAULT 0,
    completed_area_m2 NUMERIC NOT NULL DEFAULT 0,
    panel_type TEXT,
    estimated_days NUMERIC NOT NULL DEFAULT 5, -- Dự tính bao nhiêu ngày xong
    actual_days NUMERIC NOT NULL DEFAULT 1,    -- Thực tế bao nhiêu ngày xong
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'framing', 'installing', 'finishing', 'completed')),
    assigned_workers JSONB DEFAULT '[]'::jsonb,
    daily_schedules JSONB DEFAULT '[]'::jsonb, -- Lịch làm việc ngày nào, ở đâu, ai làm, mấy giờ
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. BẢNG CONTENT CALENDAR THÁNG (AGENCY)
CREATE TABLE IF NOT EXISTS content_calendar (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'tiktok',
    month TEXT NOT NULL,
    shoot_date DATE,
    shooter_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    shoot_completed BOOLEAN NOT NULL DEFAULT FALSE,
    edit_deadline DATE NOT NULL,
    editor_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    edit_completed BOOLEAN NOT NULL DEFAULT FALSE,
    publish_date DATE,
    status TEXT NOT NULL DEFAULT 'shooting',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. BẢNG ẢNH NHẬT KÝ THI CÔNG HIỆN TRƯỜNG (SITE PHOTOS)
CREATE TABLE IF NOT EXISTS site_photos (
    id TEXT PRIMARY KEY,
    site_id TEXT REFERENCES construction_sites(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT,
    stage TEXT CHECK (stage IN ('khung_xuong', 'dang_op', 'nghiem_thu')),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. BẢNG CÔNG VIỆC AGENCY (AGENCY TASKS)
CREATE TABLE IF NOT EXISTS agency_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    assigned_to TEXT REFERENCES employees(id) ON DELETE SET NULL,
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    notes TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write construction_sites" ON construction_sites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write content_calendar" ON content_calendar FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write site_photos" ON site_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write agency_tasks" ON agency_tasks FOR ALL USING (true) WITH CHECK (true);

-- 7. BẢNG ĐỒNG BỘ DỮ LIỆU APP (app_records)
-- App lưu mỗi bản ghi (nhân viên, chấm công, công trình, lịch content...) thành 1 dòng JSON.
CREATE TABLE IF NOT EXISTS app_records (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (collection, id)
);
ALTER TABLE app_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write app_records" ON app_records FOR ALL USING (true) WITH CHECK (true);
