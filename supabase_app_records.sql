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
