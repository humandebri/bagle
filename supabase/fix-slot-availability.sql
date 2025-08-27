-- time_slotsのis_availableを動的に更新する関数
CREATE OR REPLACE FUNCTION update_slot_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_reservations INTEGER;
  v_slot RECORD;
BEGIN
  -- 新規注文が作成された場合
  IF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    -- 該当スロットの予約数を計算
    SELECT COUNT(*) INTO v_total_reservations
    FROM orders
    WHERE dispatch_date = NEW.dispatch_date
      AND dispatch_time = NEW.dispatch_time
      AND payment_status != 'cancelled';
    
    -- スロット情報を取得
    SELECT * INTO v_slot
    FROM time_slots
    WHERE date = NEW.dispatch_date::DATE
      AND time = (NEW.dispatch_time || CASE WHEN LENGTH(NEW.dispatch_time) = 5 THEN ':00' ELSE '' END)::TIME;
    
    -- is_availableを更新
    IF FOUND THEN
      UPDATE time_slots
      SET is_available = (v_total_reservations < v_slot.max_capacity)
      WHERE date = NEW.dispatch_date::DATE
        AND time = v_slot.time;
    END IF;
  END IF;
  
  -- 注文がキャンセルされた場合
  IF TG_TABLE_NAME = 'orders' AND TG_OP = 'UPDATE' THEN
    IF NEW.payment_status = 'cancelled' AND OLD.payment_status != 'cancelled' THEN
      -- 該当スロットの予約数を計算
      SELECT COUNT(*) INTO v_total_reservations
      FROM orders
      WHERE dispatch_date = NEW.dispatch_date
        AND dispatch_time = NEW.dispatch_time
        AND payment_status != 'cancelled';
      
      -- スロット情報を取得
      SELECT * INTO v_slot
      FROM time_slots
      WHERE date = NEW.dispatch_date::DATE
        AND time = (NEW.dispatch_time || CASE WHEN LENGTH(NEW.dispatch_time) = 5 THEN ':00' ELSE '' END)::TIME;
      
      -- is_availableを更新
      IF FOUND THEN
        UPDATE time_slots
        SET is_available = (v_total_reservations < v_slot.max_capacity)
        WHERE date = NEW.dispatch_date::DATE
          AND time = v_slot.time;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- トリガーを作成
DROP TRIGGER IF EXISTS update_slot_availability_on_order_insert ON orders;
CREATE TRIGGER update_slot_availability_on_order_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_availability();

DROP TRIGGER IF EXISTS update_slot_availability_on_order_update ON orders;
CREATE TRIGGER update_slot_availability_on_order_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_availability();

-- current_bookingsフィールドを廃止予定とする（将来的に削除）
COMMENT ON COLUMN time_slots.current_bookings IS 'DEPRECATED: 使用しないでください。get_available_capacity関数を使用してください。';