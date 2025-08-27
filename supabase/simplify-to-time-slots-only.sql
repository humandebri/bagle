-- シンプルな設計に変更：time_slotsテーブルだけで管理

-- 1. temporary_slot_reservationsテーブルを削除
DROP TABLE IF EXISTS temporary_slot_reservations CASCADE;

-- 2. time_slotsテーブルに仮予約フィールドを追加
ALTER TABLE time_slots 
ADD COLUMN IF NOT EXISTS reservation_session_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- インデックスを追加（期限切れチェック用）
CREATE INDEX IF NOT EXISTS idx_time_slots_reservation_expires_at 
ON time_slots(reservation_expires_at) 
WHERE reservation_expires_at IS NOT NULL;

-- 3. 期限切れの仮予約を自動解放する関数
CREATE OR REPLACE FUNCTION cleanup_expired_time_slot_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 期限切れの仮予約を解放
  UPDATE time_slots
  SET 
    current_bookings = 0,
    reservation_session_id = NULL,
    reservation_expires_at = NULL
  WHERE 
    reservation_expires_at IS NOT NULL 
    AND reservation_expires_at < NOW();
END;
$$;

-- 4. 時間枠の仮予約を作成/更新する関数
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
BEGIN
  -- まず期限切れを解放
  PERFORM cleanup_expired_time_slot_reservations();
  
  -- timeを統一形式に変換
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
  FOR UPDATE; -- 行ロック
  
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
  
  -- 利用可能かチェック
  IF v_confirmed_orders >= v_slot.max_capacity THEN
    RETURN json_build_object(
      'success', false,
      'message', 'この時間枠は満員です'
    );
  END IF;
  
  -- 他のセッションが仮予約している場合
  IF v_slot.reservation_session_id IS NOT NULL 
     AND v_slot.reservation_session_id != p_session_id
     AND v_slot.reservation_expires_at > NOW() THEN
    RETURN json_build_object(
      'success', false,
      'message', '他のユーザーが予約中です'
    );
  END IF;
  
  -- 仮予約を設定
  UPDATE time_slots
  SET 
    current_bookings = 1,  -- 仮予約中を示す
    reservation_session_id = p_session_id,
    reservation_expires_at = v_expires_at
  WHERE date = p_date AND time = v_time_value;
  
  RETURN json_build_object(
    'success', true,
    'expires_at', v_expires_at::TEXT,
    'message', '15分間仮予約しました'
  );
END;
$$;

-- 5. 注文確定時に仮予約を解放する関数
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
  -- timeを統一形式に変換
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- 自分の仮予約を解放
  UPDATE time_slots
  SET 
    current_bookings = 0,
    reservation_session_id = NULL,
    reservation_expires_at = NULL
  WHERE 
    date = p_date 
    AND time = v_time_value
    AND reservation_session_id = p_session_id;
END;
$$;

-- 6. 利用可能な枠数を取得する関数（シンプル版）
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
  v_is_reserved BOOLEAN;
  v_available_capacity INTEGER;
BEGIN
  -- 期限切れを解放
  PERFORM cleanup_expired_time_slot_reservations();
  
  -- timeを統一形式に変換
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
  
  -- 仮予約状態をチェック
  v_is_reserved := v_slot.reservation_session_id IS NOT NULL 
                   AND v_slot.reservation_expires_at > NOW()
                   AND (p_session_id IS NULL OR v_slot.reservation_session_id != p_session_id);
  
  -- 利用可能枠数を計算
  v_available_capacity := v_slot.max_capacity - v_confirmed_orders;
  IF v_is_reserved THEN
    v_available_capacity := v_available_capacity - 1;
  END IF;
  
  RETURN json_build_object(
    'available', v_available_capacity > 0,
    'capacity', GREATEST(0, v_available_capacity),
    'is_reserved_by_me', v_slot.reservation_session_id = p_session_id,
    'message', CASE 
      WHEN v_available_capacity > 0 THEN '利用可能'
      WHEN v_is_reserved THEN '他のユーザーが予約中'
      ELSE '満員'
    END
  );
END;
$$;

-- 7. 既存の関数を削除
DROP FUNCTION IF EXISTS create_temporary_reservation CASCADE;
DROP FUNCTION IF EXISTS get_available_capacity CASCADE;
DROP FUNCTION IF EXISTS cleanup_temp_reservation_for_order CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_temp_reservations CASCADE;
DROP FUNCTION IF EXISTS increment_current_bookings CASCADE;
DROP FUNCTION IF EXISTS decrement_current_bookings CASCADE;