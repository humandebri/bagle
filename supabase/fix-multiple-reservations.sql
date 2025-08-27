-- 複数人が同時に仮予約できるように修正
-- temporary_slot_reservationsテーブルを再作成（複数予約管理用）

-- 1. 仮予約管理テーブルを作成
CREATE TABLE IF NOT EXISTS slot_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(session_id, date, time)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_slot_reservations_expires_at 
ON slot_reservations(expires_at);

CREATE INDEX IF NOT EXISTS idx_slot_reservations_date_time 
ON slot_reservations(date, time);

-- 2. 期限切れの仮予約を自動解放する関数を修正
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM slot_reservations
  WHERE expires_at < NOW();
END;
$$;

-- 3. 時間枠の仮予約を作成する関数を修正
CREATE OR REPLACE FUNCTION reserve_time_slot(
  p_date DATE,
  p_time VARCHAR,
  p_session_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_time_value TIME;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_confirmed_orders INTEGER;
  v_temp_reservations INTEGER;
  v_existing_reservation RECORD;
BEGIN
  -- 期限切れを削除
  PERFORM cleanup_expired_reservations();
  
  -- 時間を正規化
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- 有効期限を設定（15分後）
  v_expires_at := NOW() + INTERVAL '15 minutes';
  
  -- スロット情報を取得
  SELECT * INTO v_slot
  FROM time_slots
  WHERE date = p_date AND time = v_time_value
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', '時間枠が見つかりません'
    );
  END IF;
  
  -- 確定済み注文数をカウント
  SELECT COUNT(*) INTO v_confirmed_orders
  FROM orders
  WHERE dispatch_date = p_date::TEXT
    AND dispatch_time = p_time::TEXT
    AND payment_status != 'cancelled';
  
  -- 現在の仮予約数をカウント（自分以外）
  SELECT COUNT(*) INTO v_temp_reservations
  FROM slot_reservations
  WHERE date = p_date 
    AND time = v_time_value
    AND expires_at > NOW()
    AND session_id != p_session_id;
  
  -- 利用可能かチェック（確定済み + 仮予約 < 最大容量）
  IF (v_confirmed_orders + v_temp_reservations) >= v_slot.max_capacity THEN
    -- 自分の予約があるかチェック
    SELECT * INTO v_existing_reservation
    FROM slot_reservations
    WHERE date = p_date 
      AND time = v_time_value
      AND session_id = p_session_id
      AND expires_at > NOW();
    
    IF FOUND THEN
      -- 既存の予約を延長
      UPDATE slot_reservations
      SET expires_at = v_expires_at
      WHERE id = v_existing_reservation.id;
      
      RETURN json_build_object(
        'success', true,
        'expires_at', v_expires_at::TEXT,
        'message', '予約を延長しました'
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'この時間枠は満員です'
      );
    END IF;
  END IF;
  
  -- 既存の予約をチェック
  SELECT * INTO v_existing_reservation
  FROM slot_reservations
  WHERE date = p_date 
    AND time = v_time_value
    AND session_id = p_session_id;
  
  IF FOUND THEN
    -- 既存の予約を更新（期限延長）
    UPDATE slot_reservations
    SET expires_at = v_expires_at
    WHERE id = v_existing_reservation.id;
  ELSE
    -- 新規予約を作成
    INSERT INTO slot_reservations (session_id, date, time, expires_at)
    VALUES (p_session_id, p_date, v_time_value, v_expires_at);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'expires_at', v_expires_at::TEXT,
    'message', '15分間仮予約しました'
  );
END;
$$;

-- 4. 仮予約を解放する関数
CREATE OR REPLACE FUNCTION release_time_slot_reservation(
  p_date DATE,
  p_time VARCHAR,
  p_session_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_time_value TIME;
BEGIN
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  DELETE FROM slot_reservations
  WHERE date = p_date 
    AND time = v_time_value
    AND session_id = p_session_id;
END;
$$;

-- 5. 利用可能枠数を取得する関数
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_date DATE,
  p_time VARCHAR,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_time_value TIME;
  v_confirmed_orders INTEGER;
  v_temp_reservations INTEGER;
  v_has_own_reservation BOOLEAN;
  v_available_capacity INTEGER;
BEGIN
  -- 期限切れを削除
  PERFORM cleanup_expired_reservations();
  
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- スロット情報を取得
  SELECT * INTO v_slot
  FROM time_slots
  WHERE date = p_date AND time = v_time_value;
  
  IF NOT FOUND OR NOT v_slot.is_available THEN
    RETURN json_build_object(
      'available', false,
      'capacity', 0,
      'message', '利用できません'
    );
  END IF;
  
  -- 確定済み注文数をカウント
  SELECT COUNT(*) INTO v_confirmed_orders
  FROM orders
  WHERE dispatch_date = p_date::TEXT
    AND dispatch_time = p_time::TEXT
    AND payment_status != 'cancelled';
  
  -- 仮予約数をカウント（全体）
  SELECT COUNT(*) INTO v_temp_reservations
  FROM slot_reservations
  WHERE date = p_date 
    AND time = v_time_value
    AND expires_at > NOW();
  
  -- 自分の予約があるかチェック
  v_has_own_reservation := FALSE;
  IF p_session_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM slot_reservations
      WHERE date = p_date 
        AND time = v_time_value
        AND session_id = p_session_id
        AND expires_at > NOW()
    ) INTO v_has_own_reservation;
  END IF;
  
  -- 利用可能枠数を計算
  v_available_capacity := v_slot.max_capacity - v_confirmed_orders - v_temp_reservations;
  
  -- 自分が予約を持っている場合は、その分を加算（二重カウント防止）
  IF v_has_own_reservation THEN
    v_available_capacity := v_available_capacity + 1;
  END IF;
  
  RETURN json_build_object(
    'available', v_available_capacity > 0 OR v_has_own_reservation,
    'capacity', GREATEST(0, v_available_capacity),
    'is_reserved_by_me', v_has_own_reservation,
    'temp_reservations', v_temp_reservations,
    'confirmed_orders', v_confirmed_orders,
    'message', CASE 
      WHEN v_available_capacity > 0 THEN '利用可能'
      WHEN v_has_own_reservation THEN '予約済み'
      ELSE '満員'
    END
  );
END;
$$;

-- 6. time_slotsテーブルから不要なカラムを削除
ALTER TABLE time_slots 
DROP COLUMN IF EXISTS reservation_session_id;

ALTER TABLE time_slots 
DROP COLUMN IF EXISTS reservation_expires_at;