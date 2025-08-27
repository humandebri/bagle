-- 時間枠の仮予約を管理するテーブル
CREATE TABLE IF NOT EXISTS temporary_slot_reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL, -- ユーザーセッションID
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 10分後に期限切れ
  UNIQUE(session_id, date, time) -- 同じセッションで同じ時間枠は1回だけ
);

-- 期限切れの仮予約を削除するインデックス
CREATE INDEX IF NOT EXISTS idx_temp_reservations_expires_at 
ON temporary_slot_reservations(expires_at);

-- 期限切れの仮予約を自動削除する関数
CREATE OR REPLACE FUNCTION cleanup_expired_temp_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 期限切れの仮予約を削除
  DELETE FROM temporary_slot_reservations
  WHERE expires_at < NOW();
END;
$$;

-- API呼び出し時に期限切れをクリーンアップするトリガー
CREATE OR REPLACE FUNCTION trigger_cleanup_temp_reservations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_expired_temp_reservations();
  RETURN NEW;
END;
$$;

-- temporary_slot_reservationsテーブルへのINSERT時にクリーンアップ
DROP TRIGGER IF EXISTS cleanup_on_temp_reservation_insert ON temporary_slot_reservations;
CREATE TRIGGER cleanup_on_temp_reservation_insert
  BEFORE INSERT ON temporary_slot_reservations
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_temp_reservations();
