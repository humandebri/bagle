-- 予約の有効期限を管理するためのカラムを追加
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE;

-- 既存の未完了注文に対して有効期限を設定（作成から10分後）
UPDATE orders 
SET reservation_expires_at = created_at + INTERVAL '10 minutes'
WHERE payment_status = 'pending' 
  AND reservation_expires_at IS NULL;

-- インデックスを作成（期限切れチェックのパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_orders_reservation_expires_at 
ON orders(reservation_expires_at) 
WHERE payment_status = 'pending';