-- 管理者権限を設定するSQL
-- あなたのメールアドレスに置き換えてください

-- 1. まず現在のユーザーを確認
SELECT user_id, email, is_admin FROM profiles;

-- 2. 特定のユーザーに管理者権限を付与
-- 'your-email@example.com' を実際のメールアドレスに置き換えてください
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';

-- 3. 権限が付与されたか確認
SELECT user_id, email, is_admin FROM profiles WHERE email = 'your-email@example.com';