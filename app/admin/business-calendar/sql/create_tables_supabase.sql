-- Supabase用営業日カレンダーテーブル作成SQL

-- 営業日管理テーブル
CREATE TABLE IF NOT EXISTS business_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  is_special BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 営業時間管理テーブル（曜日別）
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(day_of_week)
);

-- 定期休業日パターンテーブル
CREATE TABLE IF NOT EXISTS recurring_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  pattern JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_business_days_updated_at BEFORE UPDATE ON business_days
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON business_hours
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recurring_holidays_updated_at BEFORE UPDATE ON recurring_holidays
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) を有効化
ALTER TABLE business_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_holidays ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 全員が読み取り可能
CREATE POLICY "Public read access for business_days" ON business_days
  FOR SELECT USING (true);

CREATE POLICY "Public read access for business_hours" ON business_hours
  FOR SELECT USING (true);

CREATE POLICY "Public read access for recurring_holidays" ON recurring_holidays
  FOR SELECT USING (true);

-- RLSポリシー: 管理者のみ書き込み可能
CREATE POLICY "Admin write access for business_days" ON business_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admin write access for business_hours" ON business_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admin write access for recurring_holidays" ON recurring_holidays
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 初期データ（営業時間）
INSERT INTO business_hours (day_of_week, open_time, close_time, is_closed)
VALUES 
  (0, '11:00', '13:00', false), -- 日曜
  (1, '11:00', '13:00', false), -- 月曜
  (2, '11:00', '13:00', false), -- 火曜
  (3, '11:00', '13:00', false), -- 水曜
  (4, NULL, NULL, true),        -- 木曜（定休日）
  (5, NULL, NULL, true),        -- 金曜（定休日）
  (6, NULL, NULL, true)         -- 土曜（定休日）
ON CONFLICT (day_of_week) DO NOTHING;

-- 初期データ（定期休業日）
INSERT INTO recurring_holidays (name, type, pattern, is_active)
VALUES 
  ('第4日曜日', 'monthly', '{"week": 4, "dayOfWeek": 0}', true)
ON CONFLICT DO NOTHING;

-- 今月のサンプル営業日データ（必要に応じて）
-- INSERT INTO business_days (date, is_open, is_special, notes)
-- VALUES 
--   ('2025-01-14', true, false, NULL),
--   ('2025-01-15', true, false, NULL),
--   ('2025-01-16', false, false, '設備メンテナンス'),
--   ('2025-01-17', true, false, NULL),
--   ('2025-01-18', true, false, NULL),
--   ('2025-01-19', true, false, NULL),
--   ('2025-01-20', true, true, '特別営業日')
-- ON CONFLICT (date) DO NOTHING;