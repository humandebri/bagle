#!/bin/bash

# 営業日カレンダーAPI テストスクリプト

echo "=== 営業日カレンダーAPI テスト ==="
echo ""

# ベースURL
BASE_URL="http://localhost:3000"

# 1. 公開API - 営業日情報取得
echo "1. 公開API - 営業日情報取得"
echo "GET /api/business-calendar"
curl -s "$BASE_URL/api/business-calendar" | jq '.'
echo ""
echo "---"
echo ""

# 2. 管理API - 営業日一覧取得（認証が必要）
echo "2. 管理API - 営業日一覧取得"
echo "GET /api/admin/business-calendar/days?start=2025-01-01&end=2025-01-31"
echo "※ 管理者権限が必要です"
echo ""
echo "---"
echo ""

# 3. 管理API - 営業時間取得
echo "3. 管理API - 営業時間取得"
echo "GET /api/admin/business-calendar/hours"
echo "※ 管理者権限が必要です"
echo ""
echo "---"
echo ""

# 4. 管理API - 定期休業日取得
echo "4. 管理API - 定期休業日取得"
echo "GET /api/admin/business-calendar/recurring-holidays"
echo "※ 管理者権限が必要です"
echo ""

echo "=== テスト完了 ==="
echo ""
echo "注意："
echo "- 管理APIは認証が必要です"
echo "- ブラウザで管理者としてログインした状態でアクセスしてください"
echo "- または、適切な認証ヘッダーを付けてリクエストしてください"